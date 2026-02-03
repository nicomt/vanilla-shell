import { defineCommand, z } from '../shell/commands';
import { resolvePath } from './utils';

export const grep = defineCommand({
  name: 'grep',
  description: 'Search for patterns in files',
  category: 'text',
  examples: [
    ['Search pattern in file', 'grep pattern file.txt'],
    ['Case insensitive', 'grep -i pattern file.txt'],
    ['Show line numbers', 'grep -n pattern file.txt'],
    ['Invert match', 'grep -v pattern file.txt'],
  ],
  parameters: z.object({
    i: z.boolean().default(false).describe('Ignore case'),
    v: z.boolean().default(false).describe('Invert match'),
    n: z.boolean().default(false).describe('Show line numbers'),
    c: z.boolean().default(false).describe('Count matching lines'),
    l: z.boolean().default(false).describe('List filenames only'),
    _: z.array(z.string()).default([]).describe('Pattern and files'),
  }),
  execute: async ({ i, v, n, c, l, _ }, ctx) => {
    if (_.length === 0) {
      ctx.stderr('grep: missing pattern\n');
      return 1;
    }

    const pattern = _[0];
    const files = _.slice(1);

    if (files.length === 0) {
      ctx.stderr('grep: missing file operand\n');
      return 1;
    }

    const flags = i ? 'gi' : 'g';
    let regex: RegExp;
    try {
      regex = new RegExp(pattern, flags);
    } catch {
      ctx.stderr(`grep: invalid regular expression: ${pattern}\n`);
      return 1;
    }

    const showFilenames = files.length > 1;
    let found = false;

    for (const path of files) {
      const resolvedPath = resolvePath(ctx.cwd, path);

      try {
        const content = await ctx.fs.promises.readFile(resolvedPath, 'utf8');
        const lines = content.split('\n');
        let matchCount = 0;

        for (let lineNum = 0; lineNum < lines.length; lineNum++) {
          const line = lines[lineNum];
          const matches = regex.test(line);
          regex.lastIndex = 0; // Reset for global regex

          if (matches !== v) {
            found = true;
            matchCount++;

            if (!c && !l) {
              const prefix = showFilenames ? `${path}:` : '';
              const linePrefix = n ? `${lineNum + 1}:` : '';
              ctx.stdout(`${prefix}${linePrefix}${line}\n`);
            }
          }
        }

        if (c) {
          const prefix = showFilenames ? `${path}:` : '';
          ctx.stdout(`${prefix}${matchCount}\n`);
        } else if (l && matchCount > 0) {
          ctx.stdout(`${path}\n`);
        }
      } catch (error) {
        if (error instanceof Error && 'code' in error) {
          const code = (error as NodeJS.ErrnoException).code;
          if (code === 'ENOENT') {
            ctx.stderr(`grep: ${path}: No such file or directory\n`);
          } else if (code === 'EISDIR') {
            ctx.stderr(`grep: ${path}: Is a directory\n`);
          } else if (code === 'EACCES') {
            ctx.stderr(`grep: ${path}: Permission denied\n`);
          } else {
            ctx.stderr(`grep: ${path}: ${error.message}\n`);
          }
        } else {
          throw error;
        }
        return 1;
      }
    }

    return found ? 0 : 1;
  },
});
