import { VirtualCommand, defineCommand, CommandContext } from '../shell/commands';
import { resolvePath } from './utils';

// touch - create empty file or update timestamp
export const touch: VirtualCommand = defineCommand(
  'touch',
  'Create empty files or update timestamps',
  async (ctx: CommandContext) => {
    if (ctx.args._.length === 0) {
      ctx.stderr('touch: missing file operand\n');
      return 1;
    }

    for (const path of ctx.args._) {
      const resolvedPath = resolvePath(ctx.cwd, path);
      try {
        if (!ctx.fs.existsSync(resolvedPath)) {
          ctx.fs.writeFileSync(resolvedPath, '');
        }
        // Note: memfs doesn't support utimes, so we just ensure the file exists
      } catch (e: any) {
        ctx.stderr(`touch: cannot touch '${path}': ${e.message}\n`);
        return 1;
      }
    }

    return 0;
  }
);
