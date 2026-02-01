import { defineCommand, z } from '../shell/commands';
import { resolvePath } from './utils';

export const ls = defineCommand({
  name: 'ls',
  description: 'List directory contents',
  category: 'filesystem',
  examples: [
    ['List current directory', 'ls'],
    ['Show hidden files', 'ls -a'],
    ['Long format with details', 'ls -l'],
  ],
  parameters: z.object({
    all: z.boolean().default(false).describe('Show hidden files'),
    l: z.boolean().default(false).describe('Use long listing format'),
    _: z.array(z.string()).default([]).describe('Directories to list'),
  }),
  parameterAliases: {
    a: 'all',
  },
  execute: async ({ all, l, _ }, ctx) => {
    const paths = _.length > 0 ? _ : ['.'];
    const multiplePaths = paths.length > 1;

    for (let i = 0; i < paths.length; i++) {
      const path = paths[i];
      const resolvedPath = resolvePath(ctx.cwd, path);

      try {
        const stats = await ctx.fs.promises.stat(resolvedPath);
        
        if (stats.isFile()) {
          if (l) {
            ctx.stdout(`-rw-r--r-- 1 user user ${stats.size.toString().padStart(8)} ${path}\n`);
          } else {
            ctx.stdout(`${path}\n`);
          }
          continue;
        }

        if (multiplePaths) {
          if (i > 0) ctx.stdout('\n');
          ctx.stdout(`${path}:\n`);
        }

        const entries = await ctx.fs.promises.readdir(resolvedPath);
        const filtered = all ? entries : entries.filter(e => !e.startsWith('.'));
        const sorted = filtered.sort();

        if (l) {
          for (const entry of sorted) {
            const entryPath = resolvedPath === '/' ? '/' + entry : resolvedPath + '/' + entry;
            try {
              const entryStats = await ctx.fs.promises.stat(entryPath);
              const isDir = entryStats.isDirectory();
              const perms = isDir ? 'drwxr-xr-x' : '-rw-r--r--';
              const size = entryStats.size?.toString().padStart(8) || '       0';
              ctx.stdout(`${perms} 1 user user ${size} ${entry}\n`);
            } catch (error) {
              if (error instanceof Error && 'code' in error) {
                ctx.stdout(`?????????? ? ?    ?           ? ${entry}\n`);
              } else {
                throw error;
              }
            }
          }
        } else {
          ctx.stdout(sorted.join('  ') + '\n');
        }
      } catch (error) {
        if (error instanceof Error && 'code' in error) {
          const code = (error as NodeJS.ErrnoException).code;
          if (code === 'ENOENT') {
            ctx.stderr(`ls: cannot access '${path}': No such file or directory\n`);
          } else if (code === 'EACCES') {
            ctx.stderr(`ls: cannot access '${path}': Permission denied\n`);
          } else {
            ctx.stderr(`ls: cannot access '${path}': ${error.message}\n`);
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
