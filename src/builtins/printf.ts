import { VirtualCommand, defineCommand, CommandContext } from '../shell/commands';

// printf - format and print data
export const printf: VirtualCommand = defineCommand(
  'printf',
  'Format and print data',
  async (ctx: CommandContext) => {
    if (ctx.args._.length === 0) {
      return 0;
    }

    let format = ctx.args._[0];
    const args = ctx.args._.slice(1);
    let argIndex = 0;

    // Simple printf implementation
    const output = format.replace(/%([sdfcx%])/g, (match, specifier) => {
      if (specifier === '%') return '%';
      const arg = args[argIndex++] || '';
      switch (specifier) {
        case 's': return arg;
        case 'd': return parseInt(arg, 10).toString();
        case 'f': return parseFloat(arg).toString();
        case 'c': return arg[0] || '';
        case 'x': return parseInt(arg, 10).toString(16);
        default: return match;
      }
    });

    // Handle escape sequences
    const processed = output
      .replace(/\\n/g, '\n')
      .replace(/\\t/g, '\t')
      .replace(/\\r/g, '\r')
      .replace(/\\\\/g, '\\');

    ctx.stdout(processed);
    return 0;
  }
);
