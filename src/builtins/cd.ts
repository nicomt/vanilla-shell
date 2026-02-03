import { defineCommand, z } from '../shell/commands';
import { resolvePath } from './utils';

export const cd = defineCommand({
  name: 'cd',
  description: 'Change the current directory',
  category: 'filesystem',
  examples: [
    ['Go home', 'cd'],
    ['Go to parent', 'cd ..'],
    ['Absolute path', 'cd /home/user'],
  ],
  parameters: z.object({
    _: z.array(z.string()).default([]).describe('Directory to change to'),
  }),
  execute: async ({ _ }, ctx) => {
    let target: string;

    if (_.length === 0 || _[0] === '~') {
      target = ctx.env['HOME'] || '/';
    } else if (_[0] === '-') {
      target = ctx.env['OLDPWD'] || ctx.cwd;
    } else {
      target = _[0];
    }

    const resolvedPath = resolvePath(ctx.cwd, target);

    try {
      const stats = await ctx.fs.promises.stat(resolvedPath);
      if (!stats.isDirectory()) {
        ctx.stderr(`cd: not a directory: ${_[0]}\n`);
        return 1;
      }
      ctx.setEnv('OLDPWD', ctx.cwd);
      ctx.shell.setCwd(resolvedPath);
      return 0;
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (code === 'ENOENT') {
          ctx.stderr(`cd: no such file or directory: ${_[0]}\n`);
        } else if (code === 'EACCES') {
          ctx.stderr(`cd: permission denied: ${_[0]}\n`);
        } else {
          ctx.stderr(`cd: ${_[0]}: ${error.message}\n`);
        }
      } else {
        throw error;
      }
      return 1;
    }
  },
});
