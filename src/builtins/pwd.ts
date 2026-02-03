import { defineCommand, z } from '../shell/commands';

export const pwd = defineCommand({
  name: 'pwd',
  description: 'Print working directory',
  category: 'filesystem',
  examples: [['Print current directory', 'pwd']],
  parameters: z.object({}),
  execute: async (_params, ctx) => {
    ctx.stdout(ctx.cwd + '\n');
    return 0;
  },
});
