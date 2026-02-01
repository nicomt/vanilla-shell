import { defineCommand, z } from '../shell/commands';
import { resolvePath } from './utils';

export const rm = defineCommand({
  name: 'rm',
  description: 'Remove files or directories',
  category: 'filesystem',
  examples: [
    ['Remove a file', 'rm file.txt'],
    ['Remove directory recursively', 'rm -r mydir'],
    ['Force remove without errors', 'rm -rf mydir'],
  ],
  parameters: z.object({
    recursive: z.boolean().default(false).describe('Remove directories recursively'),
    force: z.boolean().default(false).describe('Ignore nonexistent files'),
    _: z.array(z.string()).default([]).describe('Files or directories to remove'),
  }),
  parameterAliases: {
    r: 'recursive',
    R: 'recursive',
    f: 'force',
  },
  execute: async ({ recursive, force, _ }, ctx) => {
    if (_.length === 0) {
      ctx.stderr('rm: missing operand\n');
      return 1;
    }

    const removeRecursive = async (path: string): Promise<void> => {
      const stats = await ctx.fs.promises.stat(path);
      if (stats.isDirectory()) {
        const entries = await ctx.fs.promises.readdir(path);
        for (const entry of entries) {
          await removeRecursive(path === '/' ? '/' + entry : path + '/' + entry);
        }
        await ctx.fs.promises.rmdir(path);
      } else {
        await ctx.fs.promises.unlink(path);
      }
    };

    for (const path of _) {
      const resolvedPath = resolvePath(ctx.cwd, path);
      try {
        const stats = await ctx.fs.promises.stat(resolvedPath);
        if (stats.isDirectory()) {
          if (!recursive) {
            ctx.stderr(`rm: cannot remove '${path}': Is a directory\n`);
            return 1;
          }
          await removeRecursive(resolvedPath);
        } else {
          await ctx.fs.promises.unlink(resolvedPath);
        }
      } catch (error) {
        if (error instanceof Error && 'code' in error) {
          const code = (error as NodeJS.ErrnoException).code;
          if (code === 'ENOENT') {
            if (!force) {
              ctx.stderr(`rm: cannot remove '${path}': No such file or directory\n`);
              return 1;
            }
          } else if (code === 'EACCES') {
            ctx.stderr(`rm: cannot remove '${path}': Permission denied\n`);
            return 1;
          } else if (code === 'ENOTEMPTY') {
            ctx.stderr(`rm: cannot remove '${path}': Directory not empty\n`);
            return 1;
          } else {
            ctx.stderr(`rm: cannot remove '${path}': ${error.message}\n`);
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
