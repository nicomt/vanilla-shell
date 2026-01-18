import { VirtualCommand, defineCommand, CommandContext } from '../shell/commands';
import { resolvePath } from './utils';

// mkdir - make directories
export const mkdir: VirtualCommand = defineCommand(
  'mkdir',
  'Create directories',
  async (ctx: CommandContext) => {
    const recursive = ctx.args.p || ctx.args.parents;

    if (ctx.args._.length === 0) {
      ctx.stderr('mkdir: missing operand\n');
      return 1;
    }

    for (const path of ctx.args._) {
      const resolvedPath = resolvePath(ctx.cwd, path);
      try {
        ctx.fs.mkdirSync(resolvedPath, { recursive: !!recursive });
      } catch (e: any) {
        if (e.code === 'EEXIST' && recursive) {
          continue;
        }
        ctx.stderr(`mkdir: cannot create directory '${path}': ${e.message}\n`);
        return 1;
      }
    }

    return 0;
  }
);
