import { VirtualCommand, defineCommand, CommandContext } from '../shell/commands';
import { resolvePath } from './utils';

// grep - search for patterns
export const grep: VirtualCommand = defineCommand(
  'grep',
  'Search for patterns in files',
  async (ctx: CommandContext) => {
    const ignoreCase = ctx.args.i;
    const invertMatch = ctx.args.v;
    const lineNumbers = ctx.args.n;
    const countOnly = ctx.args.c;

    if (ctx.args._.length < 1) {
      ctx.stderr('grep: missing pattern\n');
      return 1;
    }

    const pattern = ctx.args._[0];
    const files = ctx.args._.slice(1);

    const flags = ignoreCase ? 'i' : '';
    const regex = new RegExp(pattern, flags);
    let found = false;

    // If no files specified, read from stdin (pipe input)
    if (files.length === 0) {
      if (!ctx.stdin) {
        ctx.stderr('grep: missing file operand\n');
        return 1;
      }
      
      const lines = ctx.stdin.split('\n');
      let matchCount = 0;

      for (let i = 0; i < lines.length; i++) {
        const match = regex.test(lines[i]);
        if (match !== !!invertMatch) {
          matchCount++;
          if (!countOnly) {
            const lineNum = lineNumbers ? `${i + 1}:` : '';
            ctx.stdout(`${lineNum}${lines[i]}\n`);
          }
          found = true;
        }
      }

      if (countOnly) {
        ctx.stdout(`${matchCount}\n`);
      }
      
      return found ? 0 : 1;
    }

    for (const path of files) {
      // Handle '-' to mean stdin
      if (path === '-') {
        if (ctx.stdin) {
          const lines = ctx.stdin.split('\n');
          let matchCount = 0;

          for (let i = 0; i < lines.length; i++) {
            const match = regex.test(lines[i]);
            if (match !== !!invertMatch) {
              matchCount++;
              if (!countOnly) {
                const prefix = files.length > 1 ? `(stdin):` : '';
                const lineNum = lineNumbers ? `${i + 1}:` : '';
                ctx.stdout(`${prefix}${lineNum}${lines[i]}\n`);
              }
              found = true;
            }
          }

          if (countOnly) {
            const prefix = files.length > 1 ? `(stdin):` : '';
            ctx.stdout(`${prefix}${matchCount}\n`);
          }
        }
        continue;
      }
      
      const resolvedPath = resolvePath(ctx.cwd, path);
      try {
        const content = ctx.fs.readFileSync(resolvedPath, 'utf8');
        const lines = content.split('\n');
        let matchCount = 0;

        for (let i = 0; i < lines.length; i++) {
          const match = regex.test(lines[i]);
          if (match !== !!invertMatch) {
            matchCount++;
            if (!countOnly) {
              const prefix = files.length > 1 ? `${path}:` : '';
              const lineNum = lineNumbers ? `${i + 1}:` : '';
              ctx.stdout(`${prefix}${lineNum}${lines[i]}\n`);
            }
            found = true;
          }
        }

        if (countOnly) {
          const prefix = files.length > 1 ? `${path}:` : '';
          ctx.stdout(`${prefix}${matchCount}\n`);
        }
      } catch {
        ctx.stderr(`grep: ${path}: No such file or directory\n`);
      }
    }

    return found ? 0 : 1;
  },
  [
    { name: 'i', short: 'i', description: 'Ignore case', hasValue: false },
    { name: 'v', short: 'v', description: 'Invert match', hasValue: false },
    { name: 'n', short: 'n', description: 'Line numbers', hasValue: false },
    { name: 'c', short: 'c', description: 'Count only', hasValue: false },
  ]
);
