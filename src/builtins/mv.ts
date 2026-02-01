import { defineCommand, z } from '../shell/commands';
import { resolvePath } from './utils';

export const mv = defineCommand({
  name: 'mv',
  description: 'Move or rename files and directories',
  category: 'filesystem',
  examples: [
    ['Rename file', 'mv old.txt new.txt'],
    ['Move to directory', 'mv file.txt /path/to/dir/'],
    ['Move multiple files', 'mv file1.txt file2.txt dir/'],
  ],
  parameters: z.object({
    _: z.array(z.string()).default([]).describe('Source and destination paths'),
  }),
  execute: async ({ _ }, ctx) => {
    if (_.length < 2) {
      ctx.stderr('mv: missing file operand\n');
      return 1;
    }

    const sources = _.slice(0, -1);
    const dest = _[_.length - 1];
    const resolvedDest = resolvePath(ctx.cwd, dest);

    let destIsDir = false;
    try {
      const destStats = await ctx.fs.promises.stat(resolvedDest);
      destIsDir = destStats.isDirectory();
    } catch (error) {
      if (!(error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT')) {
        throw error;
      }
      // Destination doesn't exist, which is fine
    }

    if (sources.length > 1 && !destIsDir) {
      ctx.stderr(`mv: target '${dest}' is not a directory\n`);
      return 1;
    }

    for (const source of sources) {
      const resolvedSource = resolvePath(ctx.cwd, source);

      try {
        await ctx.fs.promises.stat(resolvedSource);

        const basename = resolvedSource.split('/').pop() || resolvedSource;
        const targetPath = destIsDir
          ? resolvedDest === '/'
            ? '/' + basename
            : resolvedDest + '/' + basename
          : resolvedDest;

        await ctx.fs.promises.rename(resolvedSource, targetPath);
      } catch (error) {
        if (error instanceof Error && 'code' in error) {
          const code = (error as NodeJS.ErrnoException).code;
          if (code === 'ENOENT') {
            ctx.stderr(`mv: cannot stat '${source}': No such file or directory\n`);
          } else if (code === 'EACCES') {
            ctx.stderr(`mv: cannot move '${source}': Permission denied\n`);
          } else {
            ctx.stderr(`mv: cannot move '${source}': ${error.message}\n`);
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
