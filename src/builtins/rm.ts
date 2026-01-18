import { VirtualCommand, defineCommand, CommandContext } from '../shell/commands';
import { resolvePath } from './utils';

// rm - remove files
export const rm: VirtualCommand = defineCommand(
  'rm',
  'Remove files or directories',
  async (ctx: CommandContext) => {
    const recursive = ctx.args.r || ctx.args.R || ctx.args.recursive;
    const force = ctx.args.f || ctx.args.force;

    if (ctx.args._.length === 0) {
      if (!force) {
        ctx.stderr('rm: missing operand\n');
        return 1;
      }
      return 0;
    }

    const removeRecursive = (path: string): void => {
      const stat = ctx.fs.statSync(path);
      if (stat.isDirectory()) {
        const entries = ctx.fs.readdirSync(path);
        for (const entry of entries) {
          removeRecursive(resolvePath(path, entry));
        }
        ctx.fs.rmdirSync(path);
      } else {
        ctx.fs.unlinkSync(path);
      }
    };

    for (const path of ctx.args._) {
      const resolvedPath = resolvePath(ctx.cwd, path);
      try {
        const stat = ctx.fs.statSync(resolvedPath);
        if (stat.isDirectory()) {
          if (!recursive) {
            ctx.stderr(`rm: cannot remove '${path}': Is a directory\n`);
            return 1;
          }
          removeRecursive(resolvedPath);
        } else {
          ctx.fs.unlinkSync(resolvedPath);
        }
      } catch (e: any) {
        if (!force) {
          ctx.stderr(`rm: cannot remove '${path}': No such file or directory\n`);
          return 1;
        }
      }
    }

    return 0;
  }
);
