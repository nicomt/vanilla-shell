import { VirtualCommand, defineCommand, CommandContext } from '../shell/commands';

// env - print environment
export const env: VirtualCommand = defineCommand(
  'env',
  'Print environment variables',
  async (ctx: CommandContext) => {
    for (const [key, value] of ctx.env) {
      ctx.stdout(`${key}=${value}\n`);
    }
    return 0;
  }
);
