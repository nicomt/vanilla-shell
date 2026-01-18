import { VirtualCommand, defineCommand, CommandContext } from '../shell/commands';
import { resolvePath } from './utils';

// cp - copy files
export const cp: VirtualCommand = defineCommand(
  'cp',
  'Copy files and directories',
  async (ctx: CommandContext) => {
    const recursive = ctx.args.r || ctx.args.R || ctx.args.recursive;

    if (ctx.args._.length < 2) {
      ctx.stderr('cp: missing file operand\n');
      return 1;
    }

    const sources = ctx.args._.slice(0, -1);
    const dest = ctx.args._[ctx.args._.length - 1];
    const resolvedDest = resolvePath(ctx.cwd, dest);

    let destIsDir = false;
    try {
      const stat = ctx.fs.statSync(resolvedDest);
      destIsDir = stat.isDirectory();
    } catch {}

    if (sources.length > 1 && !destIsDir) {
      ctx.stderr(`cp: target '${dest}' is not a directory\n`);
      return 1;
    }

    const copyRecursive = (src: string, dst: string): void => {
      const stat = ctx.fs.statSync(src);
      if (stat.isDirectory()) {
        try {
          ctx.fs.mkdirSync(dst, { recursive: true });
        } catch {}
        const entries = ctx.fs.readdirSync(src);
        for (const entry of entries) {
          copyRecursive(resolvePath(src, entry), resolvePath(dst, entry));
        }
      } else {
        ctx.fs.copyFileSync(src, dst);
      }
    };

    for (const src of sources) {
      const resolvedSrc = resolvePath(ctx.cwd, src);
      try {
        const stat = ctx.fs.statSync(resolvedSrc);
        const targetPath = destIsDir ? resolvePath(resolvedDest, src.split('/').pop()!) : resolvedDest;

        if (stat.isDirectory()) {
          if (!recursive) {
            ctx.stderr(`cp: -r not specified; omitting directory '${src}'\n`);
            return 1;
          }
          copyRecursive(resolvedSrc, targetPath);
        } else {
          ctx.fs.copyFileSync(resolvedSrc, targetPath);
        }
      } catch (e: any) {
        ctx.stderr(`cp: cannot stat '${src}': No such file or directory\n`);
        return 1;
      }
    }

    return 0;
  }
);
