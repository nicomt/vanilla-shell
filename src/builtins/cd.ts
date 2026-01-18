import { VirtualCommand, defineCommand, CommandContext } from '../shell/commands';
import { resolvePath } from './utils';

// cd - change directory
export const cd: VirtualCommand = defineCommand(
  'cd',
  'Change the current directory',
  async (ctx: CommandContext) => {
    let target = ctx.args._[0];

    if (!target) {
      target = ctx.env.get('HOME') || '/home/user';
    } else if (target === '-') {
      target = ctx.env.get('OLDPWD') || ctx.cwd;
    } else if (target === '~') {
      target = ctx.env.get('HOME') || '/home/user';
    } else if (target.startsWith('~/')) {
      const home = ctx.env.get('HOME') || '/home/user';
      target = home + target.substring(1);
    }

    const newPath = resolvePath(ctx.cwd, target);

    try {
      const stat = ctx.fs.statSync(newPath);
      if (!stat.isDirectory()) {
        ctx.stderr(`cd: ${target}: Not a directory\n`);
        return 1;
      }
      
      ctx.env.set('OLDPWD', ctx.cwd);
      ctx.shell.setCwd(newPath);
      ctx.env.set('PWD', newPath);
      return 0;
    } catch (e) {
      ctx.stderr(`cd: ${target}: No such file or directory\n`);
      return 1;
    }
  }
);
