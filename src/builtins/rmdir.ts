import { defineCommand, z } from '../shell/commands';
import { resolvePath } from './utils';

export const rmdir = defineCommand({
  name: 'rmdir',
  description: 'Remove empty directories',
  category: 'filesystem',
  examples: [
    ['Remove empty directory', 'rmdir mydir'],
    ['Remove with parents', 'rmdir -p a/b/c'],
  ],
  parameters: z.object({
    parents: z.boolean().default(false).describe('Remove parent directories'),
    _: z.array(z.string()).default([]).describe('Directories to remove'),
  }),
  parameterAliases: {
    p: 'parents',
  },
  execute: async ({ parents, _ }, ctx) => {
    if (_.length === 0) {
      ctx.stderr('rmdir: missing operand\n');
      return 1;
    }

    for (const path of _) {
      const resolvedPath = resolvePath(ctx.cwd, path);

      try {
        const stats = await ctx.fs.promises.stat(resolvedPath);
        if (!stats.isDirectory()) {
          ctx.stderr(`rmdir: failed to remove '${path}': Not a directory\n`);
          return 1;
        }

        if (parents) {
          const parts = resolvedPath.split('/').filter((p) => p.length > 0);
          for (let i = parts.length; i > 0; i--) {
            const partPath = '/' + parts.slice(0, i).join('/');
            try {
              await ctx.fs.promises.rmdir(partPath);
            } catch (error) {
              if (error instanceof Error && 'code' in error) {
                const code = (error as NodeJS.ErrnoException).code;
                // Stop attempting to remove further parents on expected, non-fatal conditions.
                if (code === 'ENOENT' || code === 'ENOTEMPTY') {
                  break;
                }
              }
              throw error;
            }
          }
        } else {
          await ctx.fs.promises.rmdir(resolvedPath);
        }
      } catch (error) {
        if (error instanceof Error && 'code' in error) {
          const code = (error as NodeJS.ErrnoException).code;
          if (code === 'ENOENT') {
            ctx.stderr(`rmdir: failed to remove '${path}': No such file or directory\n`);
          } else if (code === 'ENOTEMPTY') {
            ctx.stderr(`rmdir: failed to remove '${path}': Directory not empty\n`);
          } else if (code === 'EACCES') {
            ctx.stderr(`rmdir: failed to remove '${path}': Permission denied\n`);
          } else {
            ctx.stderr(`rmdir: failed to remove '${path}': ${error.message}\n`);
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
