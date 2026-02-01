import { defineCommand, z } from '../shell/commands';

export const clear = defineCommand({
  name: 'clear',
  description: 'Clear the terminal screen',
  category: 'terminal',
  examples: [['Clear screen', 'clear']],
  parameters: z.object({}),
  execute: async (_params, ctx) => {
    // ANSI escape sequence to clear screen and move cursor to home
    ctx.stdout('\x1b[2J\x1b[H');
    return 0;
  },
});
