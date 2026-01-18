import { VirtualCommand, defineCommand, CommandContext } from '../shell/commands';

// exit - exit shell
export const exit: VirtualCommand = defineCommand(
  'exit',
  'Exit the shell',
  async (ctx: CommandContext) => {
    const code = ctx.args._[0] ? parseInt(ctx.args._[0], 10) : 0;
    ctx.shell.exit(isNaN(code) ? 0 : code);
    return code;
  }
);
