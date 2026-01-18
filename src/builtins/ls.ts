import { VirtualCommand, defineCommand, CommandContext } from '../shell/commands';
import { resolvePath } from './utils';

// ls - list directory contents
export const ls: VirtualCommand = defineCommand(
  'ls',
  'List directory contents',
  async (ctx: CommandContext) => {
    const showHidden = ctx.args.a || ctx.args.all;
    const longFormat = ctx.args.l;
    const paths = ctx.args._.length > 0 ? ctx.args._ : ['.'];

    for (const path of paths) {
      const resolvedPath = resolvePath(ctx.cwd, path);

      try {
        const stat = ctx.fs.statSync(resolvedPath);

        if (stat.isFile()) {
          ctx.stdout(path + '\n');
          continue;
        }

        if (paths.length > 1) {
          ctx.stdout(`${path}:\n`);
        }

        let entries = ctx.fs.readdirSync(resolvedPath);

        if (!showHidden) {
          entries = entries.filter(e => !e.startsWith('.'));
        }

        entries.sort();

        if (longFormat) {
          for (const entry of entries) {
            const entryPath = resolvePath(resolvedPath, entry);
            try {
              const entryStat = ctx.fs.statSync(entryPath);
              const type = entryStat.isDirectory() ? 'd' : '-';
              const size = entryStat.size.toString().padStart(8);
              ctx.stdout(`${type}rw-r--r-- ${size} ${entry}\n`);
            } catch {
              ctx.stdout(`?????????? ???????? ${entry}\n`);
            }
          }
        } else {
          ctx.stdout(entries.join('  ') + '\n');
        }

        if (paths.length > 1) {
          ctx.stdout('\n');
        }
      } catch (e) {
        ctx.stderr(`ls: cannot access '${path}': No such file or directory\n`);
        return 1;
      }
    }

    return 0;
  }
);
