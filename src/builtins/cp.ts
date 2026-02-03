import { defineCommand, z } from '../shell/commands';
import { resolvePath } from './utils';

export const cp = defineCommand({
  name: 'cp',
  description: 'Copy files and directories',
  category: 'filesystem',
  examples: [
    ['Copy file', 'cp source.txt dest.txt'],
    ['Copy to directory', 'cp file.txt /path/to/dir/'],
    ['Copy directory recursively', 'cp -r srcdir destdir'],
  ],
  parameters: z.object({
    recursive: z.boolean().default(false).describe('Copy directories recursively'),
    _: z.array(z.string()).default([]).describe('Source and destination paths'),
  }),
  parameterAliases: {
    r: 'recursive',
    R: 'recursive',
  },
  execute: async ({ recursive, _ }, ctx) => {
    if (_.length < 2) {
      ctx.stderr('cp: missing file operand\n');
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
      ctx.stderr(`cp: target '${dest}' is not a directory\n`);
      return 1;
    }

    const copyRecursive = async (src: string, dst: string): Promise<void> => {
      const stats = await ctx.fs.promises.stat(src);
      if (stats.isDirectory()) {
        await ctx.fs.promises.mkdir(dst, { recursive: true });
        const entries = await ctx.fs.promises.readdir(src);
        for (const entry of entries) {
          const srcPath = src === '/' ? '/' + entry : src + '/' + entry;
          const dstPath = dst === '/' ? '/' + entry : dst + '/' + entry;
          await copyRecursive(srcPath, dstPath);
        }
      } else {
        const content = await ctx.fs.promises.readFile(src, 'utf8');
        await ctx.fs.promises.writeFile(dst, content);
      }
    };

    for (const source of sources) {
      const resolvedSource = resolvePath(ctx.cwd, source);

      try {
        const srcStats = await ctx.fs.promises.stat(resolvedSource);

        if (srcStats.isDirectory() && !recursive) {
          ctx.stderr(`cp: -r not specified; omitting directory '${source}'\n`);
          return 1;
        }

        const basename = resolvedSource.split('/').pop() || resolvedSource;
        const targetPath = destIsDir
          ? resolvedDest === '/'
            ? '/' + basename
            : resolvedDest + '/' + basename
          : resolvedDest;

        if (srcStats.isDirectory()) {
          await copyRecursive(resolvedSource, targetPath);
        } else {
          const content = await ctx.fs.promises.readFile(resolvedSource, 'utf8');
          await ctx.fs.promises.writeFile(targetPath, content);
        }
      } catch (error) {
        if (error instanceof Error && 'code' in error) {
          const code = (error as NodeJS.ErrnoException).code;
          if (code === 'ENOENT') {
            ctx.stderr(`cp: cannot stat '${source}': No such file or directory\n`);
          } else if (code === 'EACCES') {
            ctx.stderr(`cp: cannot copy '${source}': Permission denied\n`);
          } else {
            ctx.stderr(`cp: cannot copy '${source}': ${error.message}\n`);
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
