/**
 * XTerm.js Demo for vanilla-shell
 * 
 * This module provides integration between vanilla-shell and XTerm.js
 * for a browser-based terminal experience.
 */

import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { Shell } from '../shell/shell';
import { fs, initFileSystem } from '../shell/filesystem';

export interface TerminalShellOptions {
  container: HTMLElement;
  welcomeMessage?: string;
  theme?: {
    background?: string;
    foreground?: string;
    cursor?: string;
    cursorAccent?: string;
    selection?: string;
  };
}

export class TerminalShell {
  private terminal: Terminal;
  private fitAddon: FitAddon;
  private shell!: Shell;
  private currentLine: string = '';
  private cursorPosition: number = 0;
  private history: string[] = [];
  private historyIndex: number = -1;
  private tempLine: string = '';

  /**
   * Create a new TerminalShell instance.
   * Use this static method instead of constructor to ensure async initialization.
   */
  static async create(options: TerminalShellOptions): Promise<TerminalShell> {
    // Initialize filesystem first
    await initFileSystem();
    
    const instance = new TerminalShell(options);
    return instance;
  }

  private constructor(options: TerminalShellOptions) {
    // Create terminal
    this.terminal = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: options.theme?.background || '#1e1e1e',
        foreground: options.theme?.foreground || '#d4d4d4',
        cursor: options.theme?.cursor || '#d4d4d4',
        cursorAccent: options.theme?.cursorAccent || '#1e1e1e',
        selectionBackground: options.theme?.selection || '#264f78',
      },
    });

    this.fitAddon = new FitAddon();
    this.terminal.loadAddon(this.fitAddon);

    // Create shell with terminal output
    this.shell = new Shell({
      stdout: (text: string) => this.write(text),
      stderr: (text: string) => this.write(text),
    });

    // Mount terminal
    this.terminal.open(options.container);
    this.fitAddon.fit();

    // Handle resize
    window.addEventListener('resize', () => {
      this.fitAddon.fit();
    });

    // Set up input handling
    this.setupInput();

    // Show welcome message
    if (options.welcomeMessage !== undefined) {
      this.write(options.welcomeMessage + '\r\n');
    } else {
      this.write('Welcome to vanilla-shell - A POSIX-like shell in the browser\r\n');
      this.write('Type "help" for available commands.\r\n\r\n');
    }

    // Create some demo files
    this.createDemoFiles();

    // Show initial prompt
    this.prompt();
  }

  private createDemoFiles() {
    try {
      fs.writeFileSync('/home/user/hello.txt', 'Hello, World!\nThis is a demo file.\n');
      fs.writeFileSync('/home/user/readme.md', '# vanilla-shell\n\nA POSIX-like shell for the browser.\n\n## Features\n- Full shell parsing\n- Virtual commands\n- Memory filesystem\n');
      fs.mkdirSync('/home/user/projects', { recursive: true });
      fs.writeFileSync('/home/user/projects/demo.js', 'console.log("Hello from vanilla-shell!");\n');
    } catch (e) {
      // Ignore errors (directories might already exist)
    }
  }

  private write(text: string) {
    // Convert \n to \r\n for terminal
    const normalized = text.replace(/(?<!\r)\n/g, '\r\n');
    this.terminal.write(normalized);
  }

  private prompt() {
    const promptStr = this.shell.getPrompt();
    this.write(promptStr);
    this.currentLine = '';
    this.cursorPosition = 0;
  }

  private setupInput() {
    this.terminal.onData((data) => {
      this.handleInput(data);
    });

    this.terminal.onKey(({ key, domEvent }) => {
      // Handle special keys that aren't caught by onData
      if (domEvent.key === 'Tab') {
        domEvent.preventDefault();
        this.handleTab();
      }
    });
  }

  private handleInput(data: string) {
    const code = data.charCodeAt(0);

    if (code === 13) {
      // Enter
      this.write('\r\n');
      this.handleCommand();
    } else if (code === 127 || code === 8) {
      // Backspace
      if (this.cursorPosition > 0) {
        this.currentLine = 
          this.currentLine.substring(0, this.cursorPosition - 1) + 
          this.currentLine.substring(this.cursorPosition);
        this.cursorPosition--;
        this.redrawLine();
      }
    } else if (code === 27) {
      // Escape sequences
      if (data.length === 3 && data[1] === '[') {
        switch (data[2]) {
          case 'A': // Up arrow
            this.historyUp();
            break;
          case 'B': // Down arrow
            this.historyDown();
            break;
          case 'C': // Right arrow
            if (this.cursorPosition < this.currentLine.length) {
              this.cursorPosition++;
              this.terminal.write(data);
            }
            break;
          case 'D': // Left arrow
            if (this.cursorPosition > 0) {
              this.cursorPosition--;
              this.terminal.write(data);
            }
            break;
        }
      } else if (data === '\x1b[3~') {
        // Delete key
        if (this.cursorPosition < this.currentLine.length) {
          this.currentLine = 
            this.currentLine.substring(0, this.cursorPosition) + 
            this.currentLine.substring(this.cursorPosition + 1);
          this.redrawLine();
        }
      }
    } else if (code === 3) {
      // Ctrl+C
      this.write('^C\r\n');
      this.currentLine = '';
      this.cursorPosition = 0;
      this.prompt();
    } else if (code === 4) {
      // Ctrl+D
      if (this.currentLine.length === 0) {
        this.write('exit\r\n');
        this.shell.exit(0);
      }
    } else if (code === 12) {
      // Ctrl+L - clear screen
      this.terminal.clear();
      this.prompt();
      this.write(this.currentLine);
    } else if (code === 1) {
      // Ctrl+A - move to beginning
      while (this.cursorPosition > 0) {
        this.terminal.write('\x1b[D');
        this.cursorPosition--;
      }
    } else if (code === 5) {
      // Ctrl+E - move to end
      while (this.cursorPosition < this.currentLine.length) {
        this.terminal.write('\x1b[C');
        this.cursorPosition++;
      }
    } else if (code === 21) {
      // Ctrl+U - clear line
      this.currentLine = '';
      this.cursorPosition = 0;
      this.redrawLine();
    } else if (code === 11) {
      // Ctrl+K - clear from cursor to end
      this.currentLine = this.currentLine.substring(0, this.cursorPosition);
      this.redrawLine();
    } else if (code >= 32) {
      // Printable character
      this.currentLine = 
        this.currentLine.substring(0, this.cursorPosition) + 
        data + 
        this.currentLine.substring(this.cursorPosition);
      this.cursorPosition += data.length;
      
      if (this.cursorPosition === this.currentLine.length) {
        this.write(data);
      } else {
        this.redrawLine();
      }
    }
  }

  private redrawLine() {
    // Move cursor to beginning of line
    this.terminal.write('\r');
    // Write prompt
    this.terminal.write(this.shell.getPrompt());
    // Write current line
    this.terminal.write(this.currentLine);
    // Clear to end of line
    this.terminal.write('\x1b[K');
    // Move cursor to correct position
    const moveBack = this.currentLine.length - this.cursorPosition;
    if (moveBack > 0) {
      this.terminal.write(`\x1b[${moveBack}D`);
    }
  }

  private async handleCommand() {
    const line = this.currentLine.trim();
    
    if (line) {
      // Add to history
      if (this.history[this.history.length - 1] !== line) {
        this.history.push(line);
      }
      this.historyIndex = -1;

      // Execute command
      await this.shell.execute(line);
    }

    if (this.shell.isRunning()) {
      this.prompt();
    }
  }

  private historyUp() {
    if (this.history.length === 0) return;

    if (this.historyIndex === -1) {
      this.tempLine = this.currentLine;
      this.historyIndex = this.history.length - 1;
    } else if (this.historyIndex > 0) {
      this.historyIndex--;
    } else {
      return;
    }

    this.currentLine = this.history[this.historyIndex];
    this.cursorPosition = this.currentLine.length;
    this.redrawLine();
  }

  private historyDown() {
    if (this.historyIndex === -1) return;

    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.currentLine = this.history[this.historyIndex];
    } else {
      this.historyIndex = -1;
      this.currentLine = this.tempLine;
    }

    this.cursorPosition = this.currentLine.length;
    this.redrawLine();
  }

  private handleTab() {
    // Simple tab completion
    const parts = this.currentLine.split(' ');
    const lastPart = parts[parts.length - 1];

    if (parts.length === 1) {
      // Command completion
      const commands = this.shell.listCommands();
      const matches = commands.filter(c => c.name.startsWith(lastPart));
      
      if (matches.length === 1) {
        this.currentLine = matches[0].name + ' ';
        this.cursorPosition = this.currentLine.length;
        this.redrawLine();
      } else if (matches.length > 1) {
        this.write('\r\n');
        this.write(matches.map(c => c.name).join('  ') + '\r\n');
        this.prompt();
        this.write(this.currentLine);
      }
    } else {
      // File completion
      const cwd = this.shell.getCwd();
      const fs = this.shell.getFs();
      
      try {
        // Determine the directory to list
        let dir = cwd;
        let prefix = lastPart;
        const lastSlash = lastPart.lastIndexOf('/');
        
        if (lastSlash !== -1) {
          const dirPart = lastPart.substring(0, lastSlash) || '/';
          dir = dirPart.startsWith('/') ? dirPart : `${cwd}/${dirPart}`;
          prefix = lastPart.substring(lastSlash + 1);
        }

        const entries = fs.readdirSync(dir);
        const matches = entries.filter(e => e.startsWith(prefix));

        if (matches.length === 1) {
          const match = matches[0];
          const fullPath = lastSlash !== -1 
            ? lastPart.substring(0, lastSlash + 1) + match
            : match;
          
          parts[parts.length - 1] = fullPath;
          
          // Add trailing slash for directories
          try {
            const stat = fs.statSync(`${dir}/${match}`);
            if (stat.isDirectory()) {
              parts[parts.length - 1] += '/';
            }
          } catch {}

          this.currentLine = parts.join(' ');
          this.cursorPosition = this.currentLine.length;
          this.redrawLine();
        } else if (matches.length > 1) {
          this.write('\r\n');
          this.write(matches.join('  ') + '\r\n');
          this.prompt();
          this.write(this.currentLine);
        }
      } catch (e) {
        // Ignore completion errors
      }
    }
  }

  /**
   * Get the shell instance for customization
   */
  getShell(): Shell {
    return this.shell;
  }

  /**
   * Get the terminal instance
   */
  getTerminal(): Terminal {
    return this.terminal;
  }

  /**
   * Focus the terminal
   */
  focus() {
    this.terminal.focus();
  }

  /**
   * Resize the terminal
   */
  fit() {
    this.fitAddon.fit();
  }

  /**
   * Dispose of resources
   */
  dispose() {
    this.terminal.dispose();
  }
}

export default TerminalShell;
