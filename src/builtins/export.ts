import { defineCommand, z } from '../shell/commands';

export const exportCmd = defineCommand({
  name: 'export',
  description: 'Set environment variables',
  category: 'environment',
  examples: [
    ['Set variable', 'export VAR=value'],
    ['Export existing', 'export PATH'],
  ],
  parameters: z.object({
    _: z.array(z.string()).default([]).describe('Variable assignments'),
  }),
  execute: async ({ _ }, ctx) => {
    if (_.length === 0) {
      // Show exported variables
      for (const [key, value] of Object.entries(ctx.env)) {
        ctx.stdout(`export ${key}="${value}"\n`);
      }
      return 0;
    }

    for (const arg of _) {
      const eqIndex = arg.indexOf('=');
      if (eqIndex !== -1) {
        const key = arg.substring(0, eqIndex);
        const value = arg.substring(eqIndex + 1);
        ctx.setEnv(key, value);
      } else {
        // Just mark as exported (already in env)
        const value = ctx.env[arg];
        if (value !== undefined) {
          ctx.setEnv(arg, value);
        }
      }
    }

    return 0;
  },
});

export { exportCmd as export };
