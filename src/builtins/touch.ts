import { defineCommand, z } from '../shell/commands';
import { resolvePath } from './utils';

export const touch = defineCommand({
  name: 'touch',
  description: 'Create empty files or update timestamps',
  category: 'filesystem',
  examples: [
    ['Create empty file', 'touch newfile.txt'],
    ['Create multiple files', 'touch file1.txt file2.txt'],
  ],
  parameters: z.object({
    _: z.array(z.string()).default([]).describe('Files to create or update'),
  }),
  execute: async ({ _ }, ctx) => {
    if (_.length === 0) {
      ctx.stderr('touch: missing file operand\n');
      return 1;
    }

    for (const path of _) {
      const resolvedPath = resolvePath(ctx.cwd, path);
      try {
        await ctx.fs.promises.access(resolvedPath);
        // File exists - in a real implementation we'd update timestamp
        // For now, we just verify it exists
      } catch (error) {
        if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') {
          // File doesn't exist, create it
          try {
            await ctx.fs.promises.writeFile(resolvedPath, '');
          } catch (writeError) {
            if (writeError instanceof Error && 'code' in writeError) {
              const code = (writeError as NodeJS.ErrnoException).code;
              if (code === 'ENOENT') {
                ctx.stderr(`touch: cannot touch '${path}': No such file or directory\n`);
              } else if (code === 'EACCES') {
                ctx.stderr(`touch: cannot touch '${path}': Permission denied\n`);
              } else {
                ctx.stderr(`touch: cannot touch '${path}': ${writeError.message}\n`);
              }
            } else {
              throw writeError;
            }
            return 1;
          }
        } else {
          throw error;
        }
      }
    }

    return 0;
  },
});
