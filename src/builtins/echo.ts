import { defineCommand, z } from '../shell/commands';

export const echo = defineCommand({
  name: 'echo',
  description: 'Display a line of text',
  category: 'text',
  examples: [
    ['Print text', 'echo hello world'],
    ['Print without newline', 'echo -n hello'],
    ['Interpret escapes', 'echo -e "hello\\nworld"'],
  ],
  parameters: z.object({
    n: z.boolean().default(false).describe('Do not output trailing newline'),
    e: z.boolean().default(false).describe('Enable interpretation of backslash escapes'),
    E: z.boolean().default(false).describe('Disable interpretation of backslash escapes'),
    _: z.array(z.string()).default([]).describe('Strings to output'),
  }),
  execute: async ({ n, e, E, _ }, ctx) => {
    let output = _.join(' ');

    // -e enables escape interpretation (unless -E is also set)
    if (e && !E) {
      output = output
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\\\/g, '\\');
    }

    ctx.stdout(output);
    if (!n) {
      ctx.stdout('\n');
    }

    return 0;
  },
});
