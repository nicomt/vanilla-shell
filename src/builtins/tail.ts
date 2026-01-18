import { VirtualCommand, defineCommand, CommandContext } from '../shell/commands';
import { resolvePath } from './utils';

// tail - output last part of files
export const tail: VirtualCommand = defineCommand(
  'tail',
  'Output the last part of files',
  async (ctx: CommandContext) => {
    const lineCount = ctx.args.n ? parseInt(ctx.args.n as string, 10) : 10;

    // Helper function to output tail of content
    const outputTail = (content: string) => {
      let contentLines = content.split('\n');
      // Remove trailing empty element if content ends with newline
      if (contentLines.length > 0 && contentLines[contentLines.length - 1] === '') {
        contentLines = contentLines.slice(0, -1);
      }
      const output = contentLines.slice(-lineCount).join('\n');
      ctx.stdout(output + '\n');
    };

    // If no arguments, read from stdin (pipe input)
    if (ctx.args._.length === 0) {
      if (ctx.stdin) {
        outputTail(ctx.stdin);
        return 0;
      }
      ctx.stderr('tail: missing file operand\n');
      return 1;
    }

    for (const path of ctx.args._) {
      // Handle '-' to mean stdin
      if (path === '-') {
        if (ctx.stdin) {
          outputTail(ctx.stdin);
        }
        continue;
      }
      
      const resolvedPath = resolvePath(ctx.cwd, path);
      try {
        const content = ctx.fs.readFileSync(resolvedPath, 'utf8');
        outputTail(content);
      } catch {
        ctx.stderr(`tail: cannot open '${path}': No such file or directory\n`);
        return 1;
      }
    }

    return 0;
  },
  [{ name: 'n', short: 'n', description: 'Number of lines', hasValue: true }]
);
