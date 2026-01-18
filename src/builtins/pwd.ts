import { VirtualCommand, defineCommand, CommandContext } from '../shell/commands';

// pwd - print working directory
export const pwd: VirtualCommand = defineCommand(
  'pwd',
  'Print the current working directory',
  async (ctx: CommandContext) => {
    ctx.stdout(ctx.cwd + '\n');
    return 0;
  }
);
