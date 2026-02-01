import { defineCommand, z } from '../shell/commands';

export const env = defineCommand({
  name: 'env',
  description: 'Display environment variables',
  category: 'environment',
  examples: [['Show all variables', 'env']],
  parameters: z.object({}),
  execute: async (_params, ctx) => {
    for (const [key, value] of Object.entries(ctx.env)) {
      ctx.stdout(`${key}=${value}\n`);
    }
    return 0;
  },
});
