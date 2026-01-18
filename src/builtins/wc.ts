import { VirtualCommand, defineCommand, CommandContext } from '../shell/commands';
import { resolvePath } from './utils';

// wc - word, line, character count
export const wc: VirtualCommand = defineCommand(
  'wc',
  'Print newline, word, and byte counts',
  async (ctx: CommandContext) => {
    const countLines = ctx.args.l;
    const countWords = ctx.args.w;
    const countChars = ctx.args.c;
    const all = !countLines && !countWords && !countChars;

    // Helper function to count and output
    const countContent = (content: string, name: string) => {
      const lines = content.split('\n').length - (content.endsWith('\n') ? 1 : 0);
      const words = content.split(/\s+/).filter(w => w.length > 0).length;
      const chars = content.length;

      const parts: string[] = [];
      if (all || countLines) parts.push(lines.toString().padStart(8));
      if (all || countWords) parts.push(words.toString().padStart(8));
      if (all || countChars) parts.push(chars.toString().padStart(8));
      if (name) parts.push(name);

      ctx.stdout(parts.join(' ') + '\n');
    };

    // If no arguments, read from stdin (pipe input)
    if (ctx.args._.length === 0) {
      if (ctx.stdin) {
        countContent(ctx.stdin, '');
        return 0;
      }
      ctx.stderr('wc: missing file operand\n');
      return 1;
    }

    for (const path of ctx.args._) {
      // Handle '-' to mean stdin
      if (path === '-') {
        if (ctx.stdin) {
          countContent(ctx.stdin, '-');
        }
        continue;
      }
      
      const resolvedPath = resolvePath(ctx.cwd, path);
      try {
        const content = ctx.fs.readFileSync(resolvedPath, 'utf8');
        countContent(content, path);
      } catch {
        ctx.stderr(`wc: ${path}: No such file or directory\n`);
        return 1;
      }
    }

    return 0;
  },
  [
    { name: 'l', short: 'l', description: 'Count lines', hasValue: false },
    { name: 'w', short: 'w', description: 'Count words', hasValue: false },
    { name: 'c', short: 'c', description: 'Count characters', hasValue: false },
  ]
);
