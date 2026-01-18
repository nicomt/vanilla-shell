import { VirtualCommand, defineCommand, CommandContext } from '../shell/commands';

// help - show available commands
export const help: VirtualCommand = defineCommand(
  'help',
  'Display help for commands',
  async (ctx: CommandContext) => {
    const cmdName = ctx.args._[0];

    if (cmdName) {
      const cmd = ctx.shell.getCommand(cmdName);
      if (cmd) {
        ctx.stdout(`${cmd.name}: ${cmd.description}\n`);
        if (cmd.usage) {
          ctx.stdout(`Usage: ${cmd.usage}\n`);
        }
        if (cmd.options.length > 0) {
          ctx.stdout('\nOptions:\n');
          for (const opt of cmd.options) {
            const short = opt.short ? `-${opt.short}, ` : '    ';
            ctx.stdout(`  ${short}--${opt.name.padEnd(15)} ${opt.description}\n`);
          }
        }
        return 0;
      } else {
        ctx.stderr(`help: no help topics match '${cmdName}'\n`);
        return 1;
      }
    }

    ctx.stdout('Available commands:\n\n');
    const commands = ctx.shell.listCommands();
    for (const cmd of commands) {
      ctx.stdout(`  ${cmd.name.padEnd(15)} ${cmd.description}\n`);
    }
    ctx.stdout('\nType "help <command>" for more information.\n');
    return 0;
  }
);
