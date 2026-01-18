import { VirtualCommand, defineCommand, CommandContext } from '../shell/commands';
import { resolvePath } from './utils';

// cat - concatenate and print files
export const cat: VirtualCommand = defineCommand(
  'cat',
  'Concatenate and print files',
  async (ctx: CommandContext) => {
    // If no arguments, read from stdin (pipe input)
    if (ctx.args._.length === 0) {
      if (ctx.stdin) {
        ctx.stdout(ctx.stdin);
        return 0;
      }
      ctx.stderr('cat: missing file operand\n');
      return 1;
    }

    for (const path of ctx.args._) {
      // Handle '-' to mean stdin
      if (path === '-') {
        if (ctx.stdin) {
          ctx.stdout(ctx.stdin);
        }
        continue;
      }
      
      const resolvedPath = resolvePath(ctx.cwd, path);
      try {
        const content = ctx.fs.readFileSync(resolvedPath, 'utf8');
        ctx.stdout(content);
      } catch (e) {
        ctx.stderr(`cat: ${path}: No such file or directory\n`);
        return 1;
      }
    }

    return 0;
  }
);
