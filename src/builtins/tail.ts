import { defineCommand, z } from '../shell/commands';
import { resolvePath } from './utils';

export const tail = defineCommand({
  name: 'tail',
  description: 'Output the last part of files',
  category: 'text',
  examples: [
    ['Show last 10 lines', 'tail file.txt'],
    ['Show last 5 lines', 'tail -n 5 file.txt'],
  ],
  parameters: z.object({
    n: z.coerce.number().default(10).describe('Number of lines to output'),
    _: z.array(z.string()).default([]).describe('Files to read'),
  }),
  execute: async ({ n, _ }, ctx) => {
    if (_.length === 0) {
      ctx.stderr('tail: missing file operand\n');
      return 1;
    }

    const showFilenames = _.length > 1;

    for (let i = 0; i < _.length; i++) {
      const path = _[i];
      const resolvedPath = resolvePath(ctx.cwd, path);

      try {
        const content = await ctx.fs.promises.readFile(resolvedPath, 'utf8');
        const lines = content.split('\n');
        const output = lines.slice(-n).join('\n');

        if (showFilenames) {
          if (i > 0) ctx.stdout('\n');
          ctx.stdout(`==> ${path} <==\n`);
        }
        ctx.stdout(output);
        if (!output.endsWith('\n') && output.length > 0) {
          ctx.stdout('\n');
        }
      } catch (error) {
        if (error instanceof Error && 'code' in error) {
          const code = (error as NodeJS.ErrnoException).code;
          if (code === 'ENOENT') {
            ctx.stderr(`tail: cannot open '${path}' for reading: No such file or directory\n`);
          } else if (code === 'EISDIR') {
            ctx.stderr(`tail: error reading '${path}': Is a directory\n`);
          } else if (code === 'EACCES') {
            ctx.stderr(`tail: cannot open '${path}' for reading: Permission denied\n`);
          } else {
            ctx.stderr(`tail: cannot open '${path}': ${error.message}\n`);
          }
        } else {
          throw error;
        }
        return 1;
      }
    }

    return 0;
  },
});
