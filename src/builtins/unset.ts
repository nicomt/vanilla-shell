import { VirtualCommand, defineCommand, CommandContext } from '../shell/commands';

// unset - remove environment variables
export const unset: VirtualCommand = defineCommand(
  'unset',
  'Remove environment variables',
  async (ctx: CommandContext) => {
    for (const name of ctx.args._) {
      ctx.env.delete(name);
    }
    return 0;
  }
);
