import { defineCommand, z } from '../shell/commands';
import { resolvePath } from './utils';

export const mkdir = defineCommand({
  name: 'mkdir',
  description: 'Create directories',
  category: 'filesystem',
  examples: [
    ['Create a directory', 'mkdir newdir'],
    ['Create nested directories', 'mkdir -p path/to/dir'],
  ],
  parameters: z.object({
    parents: z.boolean().default(false).describe('Create parent directories as needed'),
    _: z.array(z.string()).describe('Directories to create'),
  }),
  parameterAliases: {
    p: 'parents',
  },
  execute: async ({ parents, _ }, ctx) => {
    if (_.length === 0) {
      ctx.stderr('mkdir: missing operand\n');
      return 1;
    }

    for (const path of _) {
      const resolvedPath = resolvePath(ctx.cwd, path);
      try {
        await ctx.fs.promises.mkdir(resolvedPath, { recursive: parents });
      } catch (error) {
        if (error instanceof Error && 'code' in error) {
          const code = (error as NodeJS.ErrnoException).code;
          if (code === 'EEXIST' && !parents) {
            ctx.stderr(`mkdir: cannot create directory '${path}': File exists\n`);
            return 1;
          } else if (code === 'EACCES') {
            ctx.stderr(`mkdir: cannot create directory '${path}': Permission denied\n`);
            return 1;
          } else if (code !== 'EEXIST') {
            ctx.stderr(`mkdir: cannot create directory '${path}': ${error.message}\n`);
            return 1;
          }
        } else {
          throw error;
        }
      }
    }

    return 0;
  },
});
