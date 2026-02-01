import { defineCommand, z } from '../shell/commands';

export const unset = defineCommand({
  name: 'unset',
  description: 'Unset environment variables',
  category: 'environment',
  examples: [['Remove variable', 'unset VAR']],
  parameters: z.object({
    _: z.array(z.string()).default([]).describe('Variable names to unset'),
  }),
  execute: async ({ _ }, ctx) => {
    for (const name of _) {
      ctx.unsetEnv(name);
    }
    return 0;
  },
});
