import { VirtualCommand, defineCommand, CommandContext } from '../shell/commands';

// export - set environment variables
export const exportCmd: VirtualCommand = defineCommand(
  'export',
  'Set environment variables',
  async (ctx: CommandContext) => {
    if (ctx.args._.length === 0) {
      // Print all exported variables
      for (const [key, value] of ctx.env) {
        ctx.stdout(`export ${key}="${value}"\n`);
      }
      return 0;
    }

    for (const arg of ctx.args._) {
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        const name = arg.substring(0, eqIndex);
        const value = arg.substring(eqIndex + 1);
        ctx.env.set(name, value);
      } else {
        // Just mark as exported (already in env)
        if (!ctx.env.has(arg)) {
          ctx.env.set(arg, '');
        }
      }
    }

    return 0;
  }
);
