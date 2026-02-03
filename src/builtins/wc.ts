import { defineCommand, z } from '../shell/commands';
import { resolvePath } from './utils';

export const wc = defineCommand({
  name: 'wc',
  description: 'Print newline, word, and byte counts',
  category: 'text',
  examples: [
    ['Count all metrics', 'wc file.txt'],
    ['Count lines only', 'wc -l file.txt'],
    ['Count words only', 'wc -w file.txt'],
  ],
  parameters: z.object({
    l: z.boolean().default(false).describe('Print line count'),
    w: z.boolean().default(false).describe('Print word count'),
    c: z.boolean().default(false).describe('Print byte count'),
    m: z.boolean().default(false).describe('Print character count'),
    _: z.array(z.string()).default([]).describe('Files to count'),
  }),
  execute: async ({ l, w, c, m, _ }, ctx) => {
    // If no flags, show all
    const showAll = !l && !w && !c && !m;
    const showLines = l || showAll;
    const showWords = w || showAll;
    const showBytes = c || showAll;
    const showChars = m;

    if (_.length === 0) {
      ctx.stderr('wc: missing file operand\n');
      return 1;
    }

    let totalLines = 0;
    let totalWords = 0;
    let totalBytes = 0;
    let totalChars = 0;

    for (const path of _) {
      const resolvedPath = resolvePath(ctx.cwd, path);

      try {
        const content = await ctx.fs.promises.readFile(resolvedPath, 'utf8');
        const lines = content.split('\n').length - (content.endsWith('\n') ? 1 : 0);
        const words = content.split(/\s+/).filter((w) => w.length > 0).length;
        const bytes = new TextEncoder().encode(content).length;
        const chars = content.length;

        totalLines += lines;
        totalWords += words;
        totalBytes += bytes;
        totalChars += chars;

        const parts: string[] = [];
        if (showLines) parts.push(lines.toString().padStart(8));
        if (showWords) parts.push(words.toString().padStart(8));
        if (showBytes) parts.push(bytes.toString().padStart(8));
        if (showChars) parts.push(chars.toString().padStart(8));
        parts.push(path);

        ctx.stdout(parts.join(' ') + '\n');
      } catch (error) {
        if (error instanceof Error && 'code' in error) {
          const code = (error as NodeJS.ErrnoException).code;
          if (code === 'ENOENT') {
            ctx.stderr(`wc: ${path}: No such file or directory\n`);
          } else if (code === 'EISDIR') {
            ctx.stderr(`wc: ${path}: Is a directory\n`);
          } else if (code === 'EACCES') {
            ctx.stderr(`wc: ${path}: Permission denied\n`);
          } else {
            ctx.stderr(`wc: ${path}: ${error.message}\n`);
          }
        } else {
          throw error;
        }
        return 1;
      }
    }

    if (_.length > 1) {
      const parts: string[] = [];
      if (showLines) parts.push(totalLines.toString().padStart(8));
      if (showWords) parts.push(totalWords.toString().padStart(8));
      if (showBytes) parts.push(totalBytes.toString().padStart(8));
      if (showChars) parts.push(totalChars.toString().padStart(8));
      parts.push('total');

      ctx.stdout(parts.join(' ') + '\n');
    }

    return 0;
  },
});
