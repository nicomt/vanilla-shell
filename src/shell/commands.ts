/**
 * Virtual Command System (Vorpal-style)
 * Allows registering TypeScript functions as shell commands
 */

export interface CommandArgs {
  [key: string]: string | string[] | boolean | undefined;
  _: string[]; // Positional arguments
}

export interface CommandContext {
  args: CommandArgs;
  stdout: (text: string) => void;
  stderr: (text: string) => void;
  stdin: string; // Pipe input from previous command
  env: Map<string, string>;
  cwd: string;
  fs: import('./filesystem').FileSystemInterface;
  shell: import('./shell').Shell;
}

export type CommandAction = (context: CommandContext) => Promise<number> | number;

export interface CommandOption {
  name: string;
  short?: string;
  description: string;
  required?: boolean;
  hasValue?: boolean;
  defaultValue?: string;
}

export interface VirtualCommand {
  name: string;
  description: string;
  usage?: string;
  options: CommandOption[];
  action: CommandAction;
  aliases: string[];
  hidden: boolean;
}

export class CommandRegistry {
  private commands: Map<string, VirtualCommand> = new Map();
  private aliases: Map<string, string> = new Map();

  /**
   * Register a new virtual command
   */
  command(name: string): CommandBuilder {
    return new CommandBuilder(this, name);
  }

  /**
   * Register a command directly
   */
  register(command: VirtualCommand): void {
    this.commands.set(command.name, command);
    for (const alias of command.aliases) {
      this.aliases.set(alias, command.name);
    }
  }

  /**
   * Get a command by name or alias
   */
  get(name: string): VirtualCommand | undefined {
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
  list(): VirtualCommand[] {
    return Array.from(this.commands.values());
  }

  /**
   * Get visible commands (non-hidden)
   */
  listVisible(): VirtualCommand[] {
    return this.list().filter(cmd => !cmd.hidden);
  }

  /**
   * Parse arguments for a command
   */
  parseArgs(command: VirtualCommand, args: string[]): CommandArgs {
    const result: CommandArgs = { _: [] };
    let i = 0;

    while (i < args.length) {
      const arg = args[i];

      if (arg.startsWith('--')) {
        const eqIndex = arg.indexOf('=');
        if (eqIndex !== -1) {
          const name = arg.substring(2, eqIndex);
          const value = arg.substring(eqIndex + 1);
          result[name] = value;
        } else {
          const name = arg.substring(2);
          const option = command.options.find(o => o.name === name);
          if (option?.hasValue && i + 1 < args.length) {
            result[name] = args[++i];
          } else {
            result[name] = true;
          }
        }
      } else if (arg.startsWith('-') && arg.length === 2) {
        const short = arg[1];
        const option = command.options.find(o => o.short === short);
        if (option) {
          if (option.hasValue && i + 1 < args.length) {
            result[option.name] = args[++i];
          } else {
            result[option.name] = true;
          }
        } else {
          result[short] = true;
        }
      } else {
        result._.push(arg);
      }

      i++;
    }

    // Apply default values
    for (const option of command.options) {
      if (result[option.name] === undefined && option.defaultValue !== undefined) {
        result[option.name] = option.defaultValue;
      }
    }

    return result;
  }
}

export class CommandBuilder {
  private registry: CommandRegistry;
  private command: VirtualCommand;

  constructor(registry: CommandRegistry, name: string) {
    this.registry = registry;
    this.command = {
      name,
      description: '',
      options: [],
      action: async () => 0,
      aliases: [],
      hidden: false,
    };
  }

  /**
   * Set command description
   */
  description(desc: string): this {
    this.command.description = desc;
    return this;
  }

  /**
   * Set usage string
   */
  usage(usage: string): this {
    this.command.usage = usage;
    return this;
  }

  /**
   * Add an alias
   */
  alias(name: string): this {
    this.command.aliases.push(name);
    return this;
  }

  /**
   * Add an option
   */
  option(name: string, description: string, options?: Partial<CommandOption>): this {
    const opt: CommandOption = {
      name: name.replace(/^--?/, ''),
      description,
      ...options,
    };

    // Parse short option from name like "-n, --name"
    const match = name.match(/^-(\w),\s*--(\w+)/);
    if (match) {
      opt.short = match[1];
      opt.name = match[2];
    } else if (name.startsWith('--')) {
      opt.name = name.substring(2);
    } else if (name.startsWith('-') && name.length === 2) {
      opt.short = name[1];
      opt.name = name[1];
    }

    this.command.options.push(opt);
    return this;
  }

  /**
   * Mark command as hidden (won't show in help)
   */
  hidden(): this {
    this.command.hidden = true;
    return this;
  }

  /**
   * Set the action handler
   */
  action(fn: CommandAction): this {
    this.command.action = fn;
    this.registry.register(this.command);
    return this;
  }
}

// Utility function to create a simple command
export function defineCommand(
  name: string,
  description: string,
  action: CommandAction,
  options: CommandOption[] = []
): VirtualCommand {
  return {
    name,
    description,
    options,
    action,
    aliases: [],
    hidden: false,
  };
}
