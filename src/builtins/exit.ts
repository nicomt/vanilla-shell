import { defineCommand, z } from '../shell/commands';

export const exit = defineCommand({
  name: 'exit',
  description: 'Exit the shell',
  category: 'control',
  examples: [
    ['Exit with success', 'exit'],
    ['Exit with code', 'exit 1'],
  ],
  parameters: z.object({
    _: z.array(z.string()).default([]).describe('Exit code'),
  }),
  execute: async ({ _ }, ctx) => {
    const code = _.length > 0 ? parseInt(_[0], 10) || 0 : 0;
    ctx.exit(code);
    return code;
  },
});
