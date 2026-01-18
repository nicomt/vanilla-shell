/**
 * Main entry point for the XTerm.js demo
 */

import { TerminalShell } from './terminal';
import '@xterm/xterm/css/xterm.css';

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('terminal');
  if (!container) {
    console.error('Terminal container not found');
    return;
  }

  // Create terminal shell (async to initialize filesystem)
  const terminalShell = await TerminalShell.create({
    container,
    welcomeMessage: `
\x1b[1;36m     _                              _     
    (_)___       _ __ ___  _ __ ___| |__  
    | / __|_____| '_ \` _ \\| '__/ __| '_ \\ 
    | \\__ \\_____| | | | | | |  \\__ \\ | | |
   _/ |___/     |_| |_| |_|_|  |___/_| |_|
  |__/                                     
\x1b[0m
\x1b[33mA POSIX-like shell for the browser\x1b[0m
\x1b[90mType "help" for available commands.\x1b[0m
`,
    theme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#00d4ff',
    },
  });

  // Get the shell for customization
  const shell = terminalShell.getShell();

  // Register some custom demo commands
  shell.command('welcome')
    .description('Show the welcome message')
    .action(async (ctx) => {
      ctx.stdout('\x1b[1;36mWelcome to vanilla-shell!\x1b[0m\n');
      ctx.stdout('This is a POSIX-like shell running entirely in your browser.\n');
      ctx.stdout('\n');
      ctx.stdout('Try some commands:\n');
      ctx.stdout('  \x1b[33mls\x1b[0m        - List files\n');
      ctx.stdout('  \x1b[33mcat hello.txt\x1b[0m - Read a file\n');
      ctx.stdout('  \x1b[33mecho $HOME\x1b[0m - Print environment variable\n');
      ctx.stdout('  \x1b[33mhelp\x1b[0m      - Show all commands\n');
      return 0;
    });

  shell.command('date')
    .description('Display current date and time')
    .action(async (ctx) => {
      ctx.stdout(new Date().toString() + '\n');
      return 0;
    });

  shell.command('whoami')
    .description('Print the current user')
    .action(async (ctx) => {
      ctx.stdout((ctx.env.get('USER') || 'user') + '\n');
      return 0;
    });

  shell.command('hostname')
    .description('Print the hostname')
    .action(async (ctx) => {
      ctx.stdout((ctx.env.get('HOSTNAME') || 'browser') + '\n');
      return 0;
    });

  shell.command('uname')
    .description('Print system information')
    .option('-a, --all', 'Print all information')
    .action(async (ctx) => {
      if (ctx.args.all || ctx.args.a) {
        ctx.stdout('vanilla-shell browser 1.0.0 JavaScript Browser\n');
      } else {
        ctx.stdout('vanilla-shell\n');
      }
      return 0;
    });

  shell.command('calc')
    .description('Simple calculator')
    .usage('calc <expression>')
    .action(async (ctx) => {
      const expr = ctx.args._.join(' ');
      if (!expr) {
        ctx.stderr('calc: missing expression\n');
        return 1;
      }
      try {
        // Safe evaluation for simple math
        const sanitized = expr.replace(/[^0-9+\-*/%().\s]/g, '');
        const result = new Function(`return (${sanitized})`)();
        ctx.stdout(`${result}\n`);
        return 0;
      } catch (e: any) {
        ctx.stderr(`calc: ${e.message}\n`);
        return 1;
      }
    });

  shell.command('cowsay')
    .description('Have a cow say something')
    .action(async (ctx) => {
      const message = ctx.args._.join(' ') || 'Moo!';
      const padding = message.length + 2;
      
      ctx.stdout(' ' + '_'.repeat(padding) + '\n');
      ctx.stdout('< ' + message + ' >\n');
      ctx.stdout(' ' + '-'.repeat(padding) + '\n');
      ctx.stdout('        \\   ^__^\n');
      ctx.stdout('         \\  (oo)\\_______\n');
      ctx.stdout('            (__)\\       )\\/\\\n');
      ctx.stdout('                ||----w |\n');
      ctx.stdout('                ||     ||\n');
      return 0;
    });

  shell.command('figlet')
    .description('Display text in ASCII art')
    .action(async (ctx) => {
      const text = ctx.args._.join(' ') || 'Hello';
      // Simple ASCII art for demo
      const letters: { [key: string]: string[] } = {
        'H': ['#   #', '#   #', '#####', '#   #', '#   #'],
        'e': ['#####', '#    ', '#### ', '#    ', '#####'],
        'l': ['#    ', '#    ', '#    ', '#    ', '#####'],
        'o': [' ### ', '#   #', '#   #', '#   #', ' ### '],
      };

      for (let row = 0; row < 5; row++) {
        let line = '';
        for (const char of text.toLowerCase()) {
          if (letters[char]) {
            line += letters[char][row] + '  ';
          } else {
            line += '      ';
          }
        }
        ctx.stdout(line + '\n');
      }
      return 0;
    });

  shell.command('sl')
    .description('Steam locomotive')
    .hidden()
    .action(async (ctx) => {
      ctx.stdout('      ====        ________                ___________ \n');
      ctx.stdout('  _D _|  |_______/        \\__I_I_____===__|_________| \n');
      ctx.stdout('   |(_)---  |   H\\________/ |   |        =|___ ___|\n');
      ctx.stdout('   /     |  |   H  |  |     |   |         ||_| |_||\n');
      ctx.stdout('  |      |  |   H  |__--------------------| [___] |\n');
      ctx.stdout('  | ________|___H__/__|_____/[][]~\\_______|       |\n');
      ctx.stdout('  |/ |   |-----------I_____I [][] []  D   |=======|\n');
      ctx.stdout('__/ =| o |=-O=====O=====O=====O \\ ____Y___________|__\n');
      ctx.stdout(' \\_/ \\__/  \\__/  \\__/  \\__/  \\__/   \\_/              \n');
      return 0;
    });

  // Set custom environment
  shell.setEnv('USER', 'user');
  shell.setEnv('HOSTNAME', 'browser');
  shell.setEnv('PS1', '\\u@\\h:\\w$ ');

  // Focus the terminal
  terminalShell.focus();

  // Update terminal title based on cwd
  const titleElement = document.querySelector('.terminal-title');
  if (titleElement) {
    const updateTitle = () => {
      titleElement.textContent = `vanilla-shell — ${shell.getCwd()}`;
    };
    
    // Update title periodically (simple approach)
    setInterval(updateTitle, 500);
  }

  // Export for debugging
  (window as any).shell = shell;
  (window as any).terminalShell = terminalShell;
});
