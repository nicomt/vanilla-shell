import { VirtualCommand, defineCommand, CommandContext } from '../shell/commands';
import { resolvePath } from './utils';

// rmdir - remove empty directories
export const rmdir: VirtualCommand = defineCommand(
  'rmdir',
  'Remove empty directories',
  async (ctx: CommandContext) => {
    if (ctx.args._.length === 0) {
      ctx.stderr('rmdir: missing operand\n');
      return 1;
    }

    for (const path of ctx.args._) {
      const resolvedPath = resolvePath(ctx.cwd, path);
      try {
        ctx.fs.rmdirSync(resolvedPath);
      } catch (e: any) {
        ctx.stderr(`rmdir: failed to remove '${path}': ${e.message}\n`);
        return 1;
      }
    }

    return 0;
  }
);
