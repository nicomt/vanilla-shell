import { VirtualCommand, defineCommand, CommandContext } from '../shell/commands';

// clear - clear screen (sends escape sequence)
export const clear: VirtualCommand = defineCommand(
  'clear',
  'Clear the terminal screen',
  async (ctx: CommandContext) => {
    ctx.stdout('\x1b[2J\x1b[H');
    return 0;
  }
);
