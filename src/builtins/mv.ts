import { VirtualCommand, defineCommand, CommandContext } from '../shell/commands';
import { resolvePath } from './utils';

// mv - move/rename files
export const mv: VirtualCommand = defineCommand(
  'mv',
  'Move or rename files',
  async (ctx: CommandContext) => {
    if (ctx.args._.length < 2) {
      ctx.stderr('mv: missing file operand\n');
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
      ctx.stderr(`mv: target '${dest}' is not a directory\n`);
      return 1;
    }

    for (const src of sources) {
      const resolvedSrc = resolvePath(ctx.cwd, src);
      try {
        const targetPath = destIsDir ? resolvePath(resolvedDest, src.split('/').pop()!) : resolvedDest;
        ctx.fs.renameSync(resolvedSrc, targetPath);
      } catch (e: any) {
        ctx.stderr(`mv: cannot move '${src}': ${e.message}\n`);
        return 1;
      }
    }

    return 0;
  }
);
