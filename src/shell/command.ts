/**
 * Command System - Type-safe command definitions with Zod validation
 * 
 * Designed for LLM agent tool integration (compatible with openai-agents-js)
 * Inspired by clipanion's clean API design
 */

import { z, ZodObject, ZodRawShape, ZodTypeAny, ZodDefault, ZodOptional } from 'zod';
import type { FileSystemInterface } from './filesystem';
import type { Shell } from './shell';

// ============================================================================
// Core Types
// ============================================================================

/**
 * Parameter alias mapping: maps alternate names to canonical names
 * Example: { 'r': 'recursive', 'R': 'recursive', 'f': 'force' }
 */
export type ParameterAliases = Record<string, string>;

// ============================================================================
// Core Types
// ============================================================================

/**
 * Execution context provided to command handlers
 */
export interface CommandContext {
  /** Write to stdout */
  stdout: (text: string) => void;
  /** Write to stderr */
  stderr: (text: string) => void;
  /** Pipe input from previous command */
  stdin: string;
  /** Environment variables (object form for easy access) */
  env: Record<string, string>;
  /** Current working directory */
  cwd: string;
  /** Virtual filesystem interface */
  fs: FileSystemInterface;
  /** Shell instance for advanced operations */
  shell: Shell;
  /** Set an environment variable */
  setEnv: (name: string, value: string) => void;
  /** Unset an environment variable */
  unsetEnv: (name: string) => void;
  /** Exit the shell */
  exit: (code: number) => void;
}

/**
 * Result of command execution (always async)
 */
export type CommandResult = Promise<number>;

/**
 * Option type definitions for schema generation
 */
export type OptionType = 'string' | 'boolean' | 'number' | 'array';

/**
 * Metadata for a single option/parameter
 */
export interface OptionMeta {
  name: string;
  short?: string;
  description: string;
  type: OptionType;
  required: boolean;
  defaultValue?: unknown;
}

/**
 * Usage information for documentation and help
 */
export interface CommandUsage {
  category?: string;
  description: string;
  details?: string;
  examples?: Array<[string, string]>;
}

/**
 * Complete command definition for external use (LLM tools, help, etc.)
 */
export interface CommandDefinition {
  name: string;
  aliases: string[];
  usage: CommandUsage;
  options: OptionMeta[];
  hidden: boolean;
  parametersSchema: ZodObject<ZodRawShape>;
  jsonSchema: object;
}

// ============================================================================
// Command Definition
// ============================================================================

/**
 * Options for defining a command
 */
export interface CommandSpec<TParams extends ZodRawShape> {
  /** Command name */
  name: string;
  /** Command aliases */
  aliases?: string[];
  /** Short description */
  description: string;
  /** Detailed description */
  details?: string;
  /** Category for grouping */
  category?: string;
  /** Usage examples as [description, command] tuples */
  examples?: Array<[string, string]>;
  /** Parameter schema using Zod */
  parameters: ZodObject<TParams>;
  /** 
   * Parameter aliases: maps alternate names to canonical parameter names
   * Example: { 'r': 'recursive', 'R': 'recursive', 'f': 'force' }
   */
  parameterAliases?: ParameterAliases;
  /** Command execution handler (async) */
  execute: (params: z.infer<ZodObject<TParams>>, ctx: CommandContext) => CommandResult;
  /** Whether command is hidden */
  hidden?: boolean;
}

/**
 * A command instance
 */
export interface ShellCommand<TParams extends ZodRawShape = ZodRawShape> {
  /** Command name */
  readonly name: string;
  /** Command aliases */
  readonly aliases: string[];
  /** Short description */
  readonly description: string;
  /** Category for grouping */
  readonly category: string;
  /** Usage examples */
  readonly examples: Array<[string, string]>;
  /** Usage information (grouped) */
  readonly usage: CommandUsage;
  /** Zod parameter schema */
  readonly parameters: ZodObject<TParams>;
  /** Parameter aliases mapping */
  readonly parameterAliases: ParameterAliases;
  /** Execute function (async) */
  readonly execute: (params: z.infer<ZodObject<TParams>>, ctx: CommandContext) => CommandResult;
  /** Whether command is hidden */
  readonly hidden: boolean;
  /** Get the full command definition */
  getDefinition(): CommandDefinition;
  /** Convert to openai-agents-js compatible tool format */
  asTool(): {
    name: string;
    description: string;
    parameters: ZodObject<TParams>;
    execute: (params: z.infer<ZodObject<TParams>>) => CommandResult;
  };
}

/**
 * Define a command with type-safe parameters
 * 
 * @example
 * const echo = defineCommand({
 *   name: 'echo',
 *   description: 'Display a line of text',
 *   parameters: z.object({
 *     text: z.array(z.string()).default([]).describe('Text to display'),
 *     n: z.boolean().default(false).describe('Do not output trailing newline'),
 *   }),
 *   execute: ({ text, n }, ctx) => {
 *     ctx.stdout(text.join(' '));
 *     if (!n) ctx.stdout('\n');
 *     return 0;
 *   },
 * });
 */
export function defineCommand<TParams extends ZodRawShape>(
  spec: CommandSpec<TParams>
): ShellCommand<TParams> {
  const usage: CommandUsage = {
    description: spec.description,
    details: spec.details,
    category: spec.category,
    examples: spec.examples,
  };

  return {
    name: spec.name,
    aliases: spec.aliases ?? [],
    description: spec.description,
    category: spec.category ?? 'other',
    examples: spec.examples ?? [],
    usage,
    parameters: spec.parameters,
    parameterAliases: spec.parameterAliases ?? {},
    execute: spec.execute,
    hidden: spec.hidden ?? false,

    getDefinition(): CommandDefinition {
      const options = extractSchemaMetadata(spec.parameters);
      
      return {
        name: spec.name,
        aliases: spec.aliases ?? [],
        usage,
        options,
        hidden: spec.hidden ?? false,
        parametersSchema: spec.parameters,
        jsonSchema: zodToJsonSchema(spec.parameters, options),
      };
    },

    asTool() {
      return {
        name: spec.name,
        description: spec.description,
        parameters: spec.parameters,
        execute: (params) => spec.execute(params, null as unknown as CommandContext),
      };
    },
  };
}

// ============================================================================
// Schema Utilities
// ============================================================================

/**
 * Extract metadata from a Zod schema
 */
function extractSchemaMetadata(schema: ZodObject<ZodRawShape>): OptionMeta[] {
  const options: OptionMeta[] = [];
  const shape = schema.shape;

  for (const [key, fieldSchema] of Object.entries(shape)) {
    const zodSchema = fieldSchema as ZodTypeAny;
    const description = zodSchema.description ?? '';
    const { type, required, defaultValue } = analyzeZodType(zodSchema);

    options.push({
      name: key,
      description,
      type,
      required,
      defaultValue,
    });
  }

  return options;
}

/**
 * Get the type name from a Zod schema (works with both Zod 3 and 4)
 */
function getZodTypeName(schema: ZodTypeAny): string {
  const s = schema as any;
  // Zod 4 uses _zod structure
  if (s?._zod?.def?.type) {
    return s._zod.def.type;
  }
  // Zod 3 uses _def.typeName
  if (s?._def?.typeName) {
    return s._def.typeName;
  }
  // Check constructor name as fallback
  return s?.constructor?.name || 'unknown';
}

/**
 * Get the inner type from a wrapped Zod schema
 */
function getZodInnerType(schema: ZodTypeAny): ZodTypeAny | null {
  const s = schema as any;
  // Zod 4
  if (s?._zod?.def?.innerType) {
    return s._zod.def.innerType;
  }
  // Zod 3
  if (s?._def?.innerType) {
    return s._def.innerType;
  }
  return null;
}

/**
 * Get the default value from a Zod default schema
 */
function getZodDefaultValue(schema: ZodTypeAny): unknown {
  const s = schema as any;
  // Zod 4
  if (s?._zod?.def?.defaultValue !== undefined) {
    if (typeof s._zod.def.defaultValue === 'function') {
      return s._zod.def.defaultValue();
    }
    return s._zod.def.defaultValue;
  }
  // Zod 3
  if (s?._def?.defaultValue !== undefined) {
    if (typeof s._def.defaultValue === 'function') {
      return s._def.defaultValue();
    }
    return s._def.defaultValue;
  }
  return undefined;
}

/**
 * Analyze a Zod type to extract metadata
 */
function analyzeZodType(schema: ZodTypeAny): {
  type: OptionType;
  required: boolean;
  defaultValue?: unknown;
} {
  let currentSchema = schema;
  let required = true;
  let defaultValue: unknown;

  // Unwrap optional/default/nullable
  while (currentSchema) {
    const typeName = getZodTypeName(currentSchema);
    
    if (typeName === 'default' || typeName === 'ZodDefault') {
      defaultValue = getZodDefaultValue(currentSchema);
      const inner = getZodInnerType(currentSchema);
      if (!inner) break;
      currentSchema = inner;
      required = false;
    } else if (typeName === 'optional' || typeName === 'ZodOptional') {
      required = false;
      const inner = getZodInnerType(currentSchema);
      if (!inner) break;
      currentSchema = inner;
    } else if (typeName === 'nullable' || typeName === 'ZodNullable') {
      required = false;
      const inner = getZodInnerType(currentSchema);
      if (!inner) break;
      currentSchema = inner;
    } else {
      break;
    }
  }

  // Determine base type
  const typeName = getZodTypeName(currentSchema);
  let type: OptionType = 'string';
  
  if (typeName === 'boolean' || typeName === 'ZodBoolean') {
    type = 'boolean';
  } else if (typeName === 'number' || typeName === 'ZodNumber') {
    type = 'number';
  } else if (typeName === 'array' || typeName === 'ZodArray') {
    type = 'array';
  }

  return { type, required, defaultValue };
}

/**
 * Convert Zod schema to JSON Schema (for LLM tool integration)
 */
function zodToJsonSchema(
  schema: ZodObject<ZodRawShape>,
  options: OptionMeta[]
): object {
  const properties: Record<string, object> = {};
  const required: string[] = [];

  for (const opt of options) {
    const prop: Record<string, unknown> = {
      description: opt.description,
    };

    if (opt.type === 'array') {
      prop.type = 'array';
      prop.items = { type: 'string' };
    } else {
      prop.type = opt.type;
    }
    
    if (opt.defaultValue !== undefined) {
      prop.default = opt.defaultValue;
    }

    properties[opt.name] = prop;
    
    if (opt.required) {
      required.push(opt.name);
    }
  }

  return {
    type: 'object',
    properties,
    required: required.length > 0 ? required : undefined,
    additionalProperties: false,
  };
}

// ============================================================================
// Exports
// ============================================================================

export { z } from 'zod';
