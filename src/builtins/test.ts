import { defineCommand, z } from '../shell/commands';
import { resolvePath } from './utils';

export const test = defineCommand({
  name: 'test',
  description: 'Evaluate conditional expressions',
  category: 'control',
  examples: [
    ['Test file exists', 'test -e file.txt'],
    ['Test is directory', 'test -d mydir'],
    ['Test string not empty', 'test -n "$VAR"'],
    ['String equality', 'test "$A" = "$B"'],
    ['Numeric comparison', 'test 5 -gt 3'],
  ],
  parameters: z.object({
    _: z.array(z.string()).default([]).describe('Expression to evaluate'),
  }),
  execute: async ({ _ }, ctx) => {
    if (_.length === 0) {
      return 1; // Empty test is false
    }

    const args = [..._];

    // Handle [ ] syntax - remove trailing ]
    if (args[args.length - 1] === ']') {
      args.pop();
    }

    // Unary tests
    if (args.length === 2) {
      const [op, arg] = args;
      const path = resolvePath(ctx.cwd, arg);

      switch (op) {
        case '-e': // File exists
        case '-a': // File exists (deprecated)
          try {
            await ctx.fs.promises.stat(path);
            return 0;
          } catch {
            return 1;
          }
        case '-f': // Regular file
          try {
            const stats = await ctx.fs.promises.stat(path);
            return stats.isFile() ? 0 : 1;
          } catch {
            return 1;
          }
        case '-d': // Directory
          try {
            const stats = await ctx.fs.promises.stat(path);
            return stats.isDirectory() ? 0 : 1;
          } catch {
            return 1;
          }
        case '-r': // Readable
        case '-w': // Writable
        case '-x': // Executable
          try {
            await ctx.fs.promises.access(path);
            return 0;
          } catch {
            return 1;
          }
        case '-s': // File exists and size > 0
          try {
            const stats = await ctx.fs.promises.stat(path);
            return stats.size > 0 ? 0 : 1;
          } catch {
            return 1;
          }
        case '-n': // String has length > 0
          return arg.length > 0 ? 0 : 1;
        case '-z': // String has length 0
          return arg.length === 0 ? 0 : 1;
      }
    }

    // Binary tests
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

    // Single argument - true if non-empty string
    if (args.length === 1) {
      return args[0].length > 0 ? 0 : 1;
    }

    ctx.stderr('test: invalid expression\n');
    return 2;
  },
});
