import { VirtualCommand, defineCommand, CommandContext } from '../shell/commands';

// echo - print arguments
export const echo: VirtualCommand = defineCommand(
  'echo',
  'Display a line of text',
  async (ctx: CommandContext) => {
    let noNewline = false;
    let interpretEscapes = false;
    let args = ctx.args._;

    // Process options
    let i = 0;
    while (i < args.length) {
      if (args[i] === '-n') {
        noNewline = true;
        i++;
      } else if (args[i] === '-e') {
        interpretEscapes = true;
        i++;
      } else if (args[i] === '-E') {
        interpretEscapes = false;
        i++;
      } else {
        break;
      }
    }

    let output = args.slice(i).join(' ');

    if (interpretEscapes) {
      output = output
        .replace(/\\n/g, '\n')
        .replace(/\\t/g, '\t')
        .replace(/\\r/g, '\r')
        .replace(/\\\\/g, '\\');
    }

    ctx.stdout(noNewline ? output : output + '\n');
    return 0;
  }
);
