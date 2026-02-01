import { defineCommand, z } from '../shell/commands';
import { resolvePath } from './utils';

export const cat = defineCommand({
  name: 'cat',
  description: 'Concatenate and print files',
  category: 'filesystem',
  examples: [
    ['Display file contents', 'cat file.txt'],
    ['Concatenate multiple files', 'cat file1.txt file2.txt'],
  ],
  parameters: z.object({
    _: z.array(z.string()).default([]).describe('Files to concatenate'),
  }),
  execute: async ({ _ }, ctx) => {
    if (_.length === 0) {
      if (ctx.stdin) {
        ctx.stdout(ctx.stdin);
      }
      return 0;
    }

    for (const path of _) {
      if (path === '-') {
        if (ctx.stdin) ctx.stdout(ctx.stdin);
        continue;
      }

      const resolvedPath = resolvePath(ctx.cwd, path);
      try {
        const content = await ctx.fs.promises.readFile(resolvedPath, 'utf8');
        ctx.stdout(content);
      } catch (error) {
        if (error instanceof Error && 'code' in error) {
          const code = (error as NodeJS.ErrnoException).code;
          if (code === 'ENOENT') {
            ctx.stderr(`cat: ${path}: No such file or directory\n`);
          } else if (code === 'EISDIR') {
            ctx.stderr(`cat: ${path}: Is a directory\n`);
          } else if (code === 'EACCES') {
            ctx.stderr(`cat: ${path}: Permission denied\n`);
          } else {
            ctx.stderr(`cat: ${path}: ${error.message}\n`);
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
