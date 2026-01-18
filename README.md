# vanilla-shell

A lightweight, extensible shell for the browser built in TypeScript. Uses [ZenFS](https://github.com/zen-fs/core) with IndexedDB for persistent storage. Based on [mrsh](https://github.com/emersion/mrsh) with virtual command support inspired by [Vorpal.js](https://github.com/dthree/vorpal).

> 🎵 **This project was mostly vibecoded**

## Philosophy

**This is not a POSIX-accurate shell.** The built-in commands handle simple, common cases — they don't aim for full compatibility with their Unix counterparts. 

Instead, vanilla-shell prioritizes:

- **Easy extension with JavaScript** — register async functions as commands with a simple API
- **Deep browser integration** — explore the synergy between CLI workflows and DOM manipulation
- **Hackability over correctness** — a playground for experimenting with shell UX in the browser

### Looking for a "real" shell?

If you need binary compatibility or full POSIX compliance, check out these excellent alternatives:

| Project | Approach | Best For |
|---------|----------|----------|
| [WebVM](https://webvm.io/) | x86 JIT to Wasm (CheerpX) | Running unmodified Linux binaries |
| [v86](https://github.com/copy/v86) | Full x86 hardware emulation | Booting real OSes (Linux, Windows 98) |
| [JSLinux](https://bellard.org/jslinux/) | x86/RISC-V emulation | The OG browser Linux by Fabrice Bellard |
| [Runno](https://runno.dev/) | WASI runtime | Embedding code runners in docs |
| [Browsix](https://browsix.org/) | Unix syscalls in browser | Research, multi-process apps |

vanilla-shell is for when you want something lightweight, JS-native, and fun to extend

## Features

- **Shell Parsing**: POSIX-inspired shell grammar including:
  - Pipes (`|`) and command chains (`&&`, `||`)
  - I/O redirections (`>`, `>>`, `<`, `2>`, etc.)
  - Variable expansion (`$VAR`, `${VAR:-default}`)
  - Command substitution (`$(...)` and `` `...` ``)
  - Control flow (`if`/`then`/`else`/`fi`, `for`, `while`, `case`)
  - Subshells and brace groups

- **Persistent Virtual Filesystem**: Complete filesystem using ZenFS with IndexedDB
  - Create, read, edit, and delete files
  - Full directory structure support
  - **Persists across browser sessions and page reloads**

- **Virtual Commands**: Register TypeScript functions as shell commands
  - Declarative command definition with options and arguments
  - Automatic argument parsing
  - Built-in help generation

- **XTerm.js Integration**: Beautiful terminal emulation
  - Full keyboard support
  - Command history (up/down arrows)
  - Tab completion for commands and files
  - Cursor movement and editing

## Installation

```bash
npm install
```

## Development

```bash
# Start development server
npm run dev

# Type check
npm run typecheck

# Build for production
npm run build
```

## Usage

### Basic Shell Usage

```typescript
import { Shell } from 'vanilla-shell';

const shell = new Shell({
  stdout: (text) => console.log(text),
  stderr: (text) => console.error(text),
});

// Execute commands
await shell.execute('echo "Hello, World!"');
await shell.execute('ls -la');
await shell.execute('cat /home/user/file.txt');
```

### Registering Virtual Commands

```typescript
import { Shell } from 'vanilla-shell';

const shell = new Shell();

// Simple command
shell.command('greet')
  .description('Greet someone')
  .option('-n, --name', 'Name to greet', { hasValue: true })
  .action(async (ctx) => {
    const name = ctx.args.name || 'World';
    ctx.stdout(`Hello, ${name}!\n`);
    return 0;
  });

// Use the command
await shell.execute('greet --name Alice');
```

### XTerm.js Integration

```typescript
import { TerminalShell } from 'vanilla-shell/demo/terminal';

const terminal = await TerminalShell.create({
  container: document.getElementById('terminal')!,
  welcomeMessage: 'Welcome to my shell!',
});

// Access the shell for customization
const shell = terminal.getShell();
shell.command('custom')
  .description('My custom command')
  .action(async (ctx) => {
    ctx.stdout('Hello from custom command!\n');
    return 0;
  });
```

## Built-in Commands

| Command | Description |
|---------|-------------|
| `echo` | Print arguments |
| `pwd` | Print working directory |
| `cd` | Change directory |
| `ls` | List directory contents |
| `cat` | Display file contents |
| `mkdir` | Create directories |
| `rm` | Remove files/directories |
| `rmdir` | Remove empty directories |
| `touch` | Create empty files |
| `cp` | Copy files |
| `mv` | Move/rename files |
| `head` | Output first lines of files |
| `tail` | Output last lines of files |
| `wc` | Word, line, character count |
| `grep` | Search for patterns |
| `printf` | Format and print data |
| `export` | Set environment variables |
| `unset` | Remove environment variables |
| `env` | Print environment |
| `test` / `[` | Evaluate expressions |
| `true` | Return success |
| `false` | Return failure |
| `exit` | Exit the shell |
| `clear` | Clear the screen |
| `help` | Show available commands |

## Shell Features

### Variable Expansion

```bash
# Simple expansion
echo $HOME
echo ${USER}

# Default values
echo ${NAME:-default}
echo ${NAME:=assigned}

# String length
echo ${#PATH}

# Pattern removal
echo ${PATH%:*}
echo ${PATH#*:}
```

### Control Flow

```bash
# If statement
if test -f /home/user/file.txt; then
  cat /home/user/file.txt
else
  echo "File not found"
fi

# For loop
for i in a b c; do
  echo $i
done

# While loop
while test $count -lt 10; do
  count=$((count + 1))
done

# Case statement
case $var in
  a) echo "It's a";;
  b) echo "It's b";;
  *) echo "Unknown";;
esac
```

### Pipes and Redirections

```bash
# Pipes
cat file.txt | grep pattern | wc -l

# Output redirection
echo "Hello" > file.txt
echo "World" >> file.txt

# Input redirection
cat < input.txt
```

## Architecture

```
src/
├── shell/
│   ├── ast.ts         # Abstract Syntax Tree types
│   ├── shell.ts       # Main execution engine
│   ├── filesystem.ts  # ZenFS wrapper with IndexedDB
│   └── commands.ts    # Virtual command system
├── parser/
│   ├── lexer.ts       # Tokenizer
│   └── parser.ts      # Shell grammar parser
├── builtins/
│   └── index.ts       # Built-in commands
├── demo/
│   ├── terminal.ts    # XTerm.js integration
│   └── main.ts        # Demo entry point
└── index.ts           # Main exports
```

## Credits

- [mrsh](https://github.com/emersion/mrsh) - The original POSIX shell this is based on
- [Vorpal.js](https://github.com/dthree/vorpal) - Inspiration for the virtual command system
- [ZenFS](https://github.com/zen-fs/core) - Browser filesystem with IndexedDB persistence
- [XTerm.js](https://xtermjs.org/) - Terminal emulator for the browser

## License

MIT
