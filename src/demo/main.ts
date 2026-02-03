/**
 * Demo application for vanilla-shell
 */

import { TerminalShell } from './terminal';
import { defineCommand, z } from '../shell/commands';

// Initialize demo terminal
document.addEventListener('DOMContentLoaded', async () => {
  const container = document.getElementById('terminal');
  if (!container) {
    console.error('Terminal container not found');
    return;
  }

  // Create files for demo
  const demoFiles: Record<string, string> = {
    '/home/user/hello.txt': 'Hello, World!\nWelcome to vanilla-shell.\n',
    '/home/user/readme.md': '# vanilla-shell\n\nA POSIX-like shell in TypeScript for the browser.\n',
    '/home/user/numbers.txt': '1\n2\n3\n4\n5\n6\n7\n8\n9\n10\n',
    '/home/user/Documents/notes.txt': 'Some notes here.\n',
    '/home/user/Documents/todo.txt': '- Learn shell\n- Build things\n- Have fun\n',
    '/home/user/.bashrc': '# Bash configuration\nexport PS1="\\u@\\h:\\w$ "\n',
    '/home/user/.profile': '# Profile\nexport PATH="/bin:/usr/bin"\n',
  };

  // Initialize terminal
  const terminalShell = await TerminalShell.create({
    container,
    welcomeMessage: `
\x1b[1;36m                   _ _ _                 _          _ _ 
 __   ____ _ _ __ (_) | | __ _       ___| |__   ___| | |
 \\ \\ / / _\` | '_ \\| | | |/ _\` |_____/ __| '_ \\ / _ \\ | |
  \\ V / (_| | | | | | | | (_| |_____\\__ \\ | | |  __/ | |
   \\_/ \\__,_|_| |_|_|_|_|\\__,_|     |___/_| |_|\\___|_|_|
\x1b[0m
\x1b[33mA POSIX-like shell for the browser\x1b[0m
\x1b[90mType "help" for available commands.\x1b[0m
`,
  });

  // Get the shell for customization
  const shell = terminalShell.getShell();
  
  // Create demo files in the filesystem
  const fs = shell.getFs();
  for (const [path, content] of Object.entries(demoFiles)) {
    // Ensure parent directory exists
    const dir = path.substring(0, path.lastIndexOf('/'));
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
    fs.writeFileSync(path, content);
  }

  // Register some custom demo commands
  shell.registerCommand(defineCommand({
    name: 'welcome',
    description: 'Show the welcome message',
    category: 'demo',
    parameters: z.object({}),
    execute: async (_, ctx) => {
      ctx.stdout('\x1b[1;36mWelcome to vanilla-shell!\x1b[0m\n');
      ctx.stdout('This is a POSIX-like shell running entirely in your browser.\n');
      ctx.stdout('\n');
      ctx.stdout('Try some commands:\n');
      ctx.stdout('  \x1b[33mls\x1b[0m        - List files\n');
      ctx.stdout('  \x1b[33mcat hello.txt\x1b[0m - Read a file\n');
      ctx.stdout('  \x1b[33mecho $HOME\x1b[0m - Print environment variable\n');
      ctx.stdout('  \x1b[33mhelp\x1b[0m      - Show all commands\n');
      return 0;
    },
  }));

  shell.registerCommand(defineCommand({
    name: 'date',
    description: 'Display current date and time',
    category: 'demo',
    parameters: z.object({}),
    execute: async (_, ctx) => {
      ctx.stdout(new Date().toString() + '\n');
      return 0;
    },
  }));

  shell.registerCommand(defineCommand({
    name: 'whoami',
    description: 'Print the current user',
    category: 'demo',
    parameters: z.object({}),
    execute: async (_, ctx) => {
      ctx.stdout((ctx.env['USER'] || 'user') + '\n');
      return 0;
    },
  }));

  shell.registerCommand(defineCommand({
    name: 'hostname',
    description: 'Print the hostname',
    category: 'demo',
    parameters: z.object({}),
    execute: async (_, ctx) => {
      ctx.stdout((ctx.env['HOSTNAME'] || 'browser') + '\n');
      return 0;
    },
  }));

  shell.registerCommand(defineCommand({
    name: 'uname',
    description: 'Print system information',
    category: 'demo',
    parameters: z.object({
      a: z.boolean().default(false).describe('Print all information'),
      all: z.boolean().default(false).describe('Print all information'),
    }),
    execute: async ({ a, all }, ctx) => {
      if (all || a) {
        ctx.stdout('vanilla-shell browser 1.0.0 JavaScript Browser\n');
      } else {
        ctx.stdout('vanilla-shell\n');
      }
      return 0;
    },
  }));

  shell.registerCommand(defineCommand({
    name: 'calc',
    description: 'Simple calculator',
    category: 'demo',
    examples: [['Calculate expression', 'calc 2 + 2']],
    parameters: z.object({
      _: z.array(z.string()).default([]).describe('Mathematical expression'),
    }),
    execute: async ({ _ }, ctx) => {
      const expr = _.join(' ');
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
    },
  }));

  shell.registerCommand(defineCommand({
    name: 'cowsay',
    description: 'Have a cow say something',
    category: 'demo',
    examples: [['Say something', 'cowsay Hello world']],
    parameters: z.object({
      _: z.array(z.string()).default([]).describe('Message for the cow'),
    }),
    execute: async ({ _ }, ctx) => {
      const message = _.join(' ') || 'Moo!';
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
    },
  }));

  shell.registerCommand(defineCommand({
    name: 'figlet',
    description: 'Display text in ASCII art',
    category: 'demo',
    examples: [['Display text', 'figlet Hello']],
    parameters: z.object({
      _: z.array(z.string()).default([]).describe('Text to display'),
    }),
    execute: async ({ _ }, ctx) => {
      const text = _.join(' ') || 'Hello';
      // Simple ASCII art for demo
      const letters: { [key: string]: string[] } = {
        'h': ['#   #', '#   #', '#####', '#   #', '#   #'],
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
    },
  }));

  shell.registerCommand(defineCommand({
    name: 'sl',
    description: 'Steam locomotive',
    category: 'demo',
    hidden: true,
    parameters: z.object({}),
    execute: async (_, ctx) => {
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
    },
  }));

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
