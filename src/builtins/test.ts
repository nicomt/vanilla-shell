import { VirtualCommand, defineCommand, CommandContext } from '../shell/commands';
import { resolvePath } from './utils';

// test / [ - evaluate conditional expressions
export const test: VirtualCommand = defineCommand(
  'test',
  'Evaluate conditional expressions',
  async (ctx: CommandContext) => {
    const args = [...ctx.args._];

    // Remove trailing ] if present (for [ command)
    if (args[args.length - 1] === ']') {
      args.pop();
    }

    if (args.length === 0) {
      return 1;
    }

    // Single argument - true if non-empty
    if (args.length === 1) {
      return args[0].length > 0 ? 0 : 1;
    }

    // Two arguments
    if (args.length === 2) {
      if (args[0] === '!') {
        return args[1].length > 0 ? 1 : 0;
      }
      if (args[0] === '-n') {
        return args[1].length > 0 ? 0 : 1;
      }
      if (args[0] === '-z') {
        return args[1].length === 0 ? 0 : 1;
      }
      if (args[0] === '-e' || args[0] === '-f' || args[0] === '-d') {
        const path = resolvePath(ctx.cwd, args[1]);
        try {
          const stat = ctx.fs.statSync(path);
          if (args[0] === '-d') return stat.isDirectory() ? 0 : 1;
          if (args[0] === '-f') return stat.isFile() ? 0 : 1;
          return 0; // -e: exists
        } catch {
          return 1;
        }
      }
    }

    // Three arguments
    if (args.length === 3) {
      const [left, op, right] = args;
      switch (op) {
        case '=':
        case '==':
          return left === right ? 0 : 1;
        case '!=':
          return left !== right ? 0 : 1;
        case '-eq':
          return parseInt(left, 10) === parseInt(right, 10) ? 0 : 1;
        case '-ne':
          return parseInt(left, 10) !== parseInt(right, 10) ? 0 : 1;
        case '-lt':
          return parseInt(left, 10) < parseInt(right, 10) ? 0 : 1;
        case '-le':
          return parseInt(left, 10) <= parseInt(right, 10) ? 0 : 1;
        case '-gt':
          return parseInt(left, 10) > parseInt(right, 10) ? 0 : 1;
        case '-ge':
          return parseInt(left, 10) >= parseInt(right, 10) ? 0 : 1;
      }
    }

    return 1;
  }
);
