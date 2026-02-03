/**
 * Command Registry - Manages registered commands
 */

import type { ZodRawShape } from 'zod';

// Re-export everything from command.ts
export {
  defineCommand,
  z,
} from './command';

export type {
  ShellCommand,
  CommandContext,
  CommandResult,
  CommandUsage,
  CommandDefinition,
  CommandSpec,
  OptionMeta,
  ParameterAliases,
} from './command';

// For backwards compatibility, also export ShellCommand as Command
export { type ShellCommand as Command } from './command';

import type { ShellCommand, CommandContext } from './command';

// Global registry for commands (used by help and other commands)
let globalRegistry: Map<string, ShellCommand> | null = null;

/**
 * Set the global registry (called during shell initialization)
 */
export function setGlobalRegistry(registry: Map<string, ShellCommand>): void {
  globalRegistry = registry;
}

/**
 * Get the global command registry
 */
export function getRegistry(): Map<string, ShellCommand> {
  if (!globalRegistry) {
    throw new Error('Command registry not initialized');
  }
  return globalRegistry;
}

/**
 * Parsed command arguments from shell input
 */
export interface ParsedArgs {
  [key: string]: string | string[] | boolean | undefined;
  /** Positional arguments */
  _: string[];
}

/**
 * Registry for shell commands
 */
export class CommandRegistry {
  private commands = new Map<string, ShellCommand>();
  private aliases = new Map<string, string>();

  /**
   * Register a command
   */
  register<T extends ZodRawShape>(command: ShellCommand<T>): void {
    this.commands.set(command.name, command as unknown as ShellCommand);
    for (const alias of command.aliases) {
      this.aliases.set(alias, command.name);
    }
  }

  /**
   * Get the internal command map (for global registry)
   */
  getCommandMap(): Map<string, ShellCommand> {
    return this.commands;
  }

  /**
   * Get a command by name or alias
   */
  get(name: string): ShellCommand | undefined {
    const realName = this.aliases.get(name) || name;
    return this.commands.get(realName);
  }

  /**
   * Check if a command exists
   */
  has(name: string): boolean {
    return this.commands.has(name) || this.aliases.has(name);
  }

  /**
   * Remove a command
   */
  remove(name: string): boolean {
    const command = this.commands.get(name);
    if (command) {
      for (const alias of command.aliases) {
        this.aliases.delete(alias);
      }
      return this.commands.delete(name);
    }
    return false;
  }

  /**
   * Get all registered commands
   */
  list(): ShellCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get visible commands (non-hidden)
   */
  listVisible(): ShellCommand[] {
    return this.list().filter(cmd => !cmd.hidden);
  }

  /**
   * Parse shell arguments into typed params for a command
   * Applies parameter aliases before validation
   */
  parseArgs(command: ShellCommand, args: string[]): ParsedArgs {
    const result: ParsedArgs = { _: [] };
    const options = command.getDefinition().options;
    const paramAliases = command.parameterAliases;
    let i = 0;

    while (i < args.length) {
      const arg = args[i];

      if (arg.startsWith('--')) {
        const eqIndex = arg.indexOf('=');
        if (eqIndex !== -1) {
          const rawName = arg.substring(2, eqIndex);
          const name = paramAliases[rawName] ?? rawName;
          const value = arg.substring(eqIndex + 1);
          result[name] = value;
        } else {
          const rawName = arg.substring(2);
          const name = paramAliases[rawName] ?? rawName;
          const opt = options.find(o => o.name === name);
          if (opt?.type !== 'boolean' && i + 1 < args.length) {
            result[name] = args[++i];
          } else {
            result[name] = true;
          }
        }
      } else if (arg.startsWith('-') && arg.length === 2) {
        const short = arg[1];
        // Check if short flag is an alias
        const canonicalName = paramAliases[short];
        if (canonicalName) {
          const opt = options.find(o => o.name === canonicalName);
          if (opt?.type !== 'boolean' && i + 1 < args.length) {
            result[canonicalName] = args[++i];
          } else {
            result[canonicalName] = true;
          }
        } else {
          const opt = options.find(o => o.short === short);
          if (opt) {
            if (opt.type !== 'boolean' && i + 1 < args.length) {
              result[opt.name] = args[++i];
            } else {
              result[opt.name] = true;
            }
          } else {
            result[short] = true;
          }
        }
      } else {
        result._.push(arg);
      }

      i++;
    }

    return result;
  }

  /**
   * Execute a command with parsed args and context
   */
  async execute(
    command: ShellCommand,
    parsedArgs: ParsedArgs,
    ctx: CommandContext
  ): Promise<number> {
    // Build params object from parsed args and schema
    const params = command.parameters.parse(parsedArgs);
    return command.execute(params, ctx);
  }
}
