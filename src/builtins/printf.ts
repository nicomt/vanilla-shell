import { defineCommand, z } from '../shell/commands';

export const printf = defineCommand({
  name: 'printf',
  description: 'Format and print data',
  category: 'text',
  examples: [
    ['Print with format', 'printf "%s\\n" hello'],
    ['Print with newline', 'printf "Hello %s\\n" world'],
    ['Print number', 'printf "%d\\n" 42'],
  ],
  parameters: z.object({
    _: z.array(z.string()).default([]).describe('Format string and arguments'),
  }),
  execute: async ({ _ }, ctx) => {
    if (_.length === 0) {
      return 0;
    }

    const format = _[0];
    const args = _.slice(1);

    let argIndex = 0;
    let result = '';
    let i = 0;

    while (i < format.length) {
      if (format[i] === '\\') {
        i++;
        if (i < format.length) {
          switch (format[i]) {
            case 'n':
              result += '\n';
              break;
            case 't':
              result += '\t';
              break;
            case 'r':
              result += '\r';
              break;
            case '\\':
              result += '\\';
              break;
            default:
              result += format[i];
          }
        }
      } else if (format[i] === '%') {
        i++;
        if (i < format.length) {
          const arg = args[argIndex] || '';
          switch (format[i]) {
            case 's':
              result += arg;
              argIndex++;
              break;
            case 'd':
            case 'i':
              result += parseInt(arg, 10) || 0;
              argIndex++;
              break;
            case 'f':
              result += parseFloat(arg) || 0;
              argIndex++;
              break;
            case 'x':
              result += (parseInt(arg, 10) || 0).toString(16);
              argIndex++;
              break;
            case 'X':
              result += (parseInt(arg, 10) || 0).toString(16).toUpperCase();
              argIndex++;
              break;
            case 'o':
              result += (parseInt(arg, 10) || 0).toString(8);
              argIndex++;
              break;
            case '%':
              result += '%';
              break;
            default:
              result += format[i];
          }
        }
      } else {
        result += format[i];
      }
      i++;
    }

    ctx.stdout(result);
    return 0;
  },
});
