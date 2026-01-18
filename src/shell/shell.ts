/**
 * Shell - Main execution engine
 * Executes parsed AST using memfs and virtual commands
 */

import { parse } from '../parser/parser';
import {
  Program,
  CommandList,
  AndOrList,
  AndOrType,
  Pipeline,
  Command,
  CommandType,
  SimpleCommand,
  Word,
  WordType,
  WordString,
  WordParameter,
  WordList,
  WordCommand,
  WordArithmetic,
  ParameterOp,
  IoRedirect,
  IoRedirectOp,
  IfClause,
  ForClause,
  LoopClause,
  CaseClause,
  BraceGroup,
  Subshell,
} from './ast';
import { fs, type FileSystemInterface } from './filesystem';
import { CommandRegistry, CommandContext, VirtualCommand } from './commands';
import builtins from '../builtins';

export interface ShellOptions {
  fs?: FileSystemInterface;
  cwd?: string;
  env?: Map<string, string>;
  stdout?: (text: string) => void;
  stderr?: (text: string) => void;
  stdin?: () => Promise<string>;
}

export interface ShellState {
  lastExitCode: number;
  running: boolean;
  cwd: string;
}

export class Shell {
  private fs: FileSystemInterface;
  private env: Map<string, string>;
  private cwd: string;
  private commands: CommandRegistry;
  private state: ShellState;
  private stdout: (text: string) => void;
  private stderr: (text: string) => void;
  private stdin: () => Promise<string>;
  private aliases: Map<string, string>;
  private functions: Map<string, Command>;
  private pipeBuffer: string = '';

  constructor(options: ShellOptions = {}) {
    this.fs = options.fs || fs;
    this.env = options.env || new Map();
    this.cwd = options.cwd || '/home/user';
    this.stdout = options.stdout || console.log;
    this.stderr = options.stderr || console.error;
    this.stdin = options.stdin || (() => Promise.resolve(''));
    
    this.commands = new CommandRegistry();
    this.aliases = new Map();
    this.functions = new Map();
    
    this.state = {
      lastExitCode: 0,
      running: true,
      cwd: this.cwd,
    };

    // Initialize environment
    if (!this.env.has('HOME')) {
      this.env.set('HOME', '/home/user');
    }
    if (!this.env.has('PWD')) {
      this.env.set('PWD', this.cwd);
    }
    if (!this.env.has('PATH')) {
      this.env.set('PATH', '/bin:/usr/bin');
    }
    if (!this.env.has('PS1')) {
      this.env.set('PS1', '$ ');
    }

    // Register builtins
    for (const builtin of builtins) {
      this.commands.register(builtin);
    }

    // Register test as [ command alias
    this.commands.register({
      ...builtins.find(b => b.name === 'test')!,
      name: '[',
      aliases: [],
    });
  }

  /**
   * Register a virtual command
   */
  command(name: string) {
    return this.commands.command(name);
  }

  /**
   * Register a command directly
   */
  registerCommand(command: VirtualCommand) {
    this.commands.register(command);
  }

  /**
   * Get a command by name
   */
  getCommand(name: string): VirtualCommand | undefined {
    return this.commands.get(name);
  }

  /**
   * List all commands
   */
  listCommands(): VirtualCommand[] {
    return this.commands.listVisible();
  }

  /**
   * Set the current working directory
   */
  setCwd(path: string) {
    this.cwd = path;
    this.state.cwd = path;
    this.env.set('PWD', path);
  }

  /**
   * Get the current working directory
   */
  getCwd(): string {
    return this.cwd;
  }

  /**
   * Get environment variable
   */
  getEnv(name: string): string | undefined {
    return this.env.get(name);
  }

  /**
   * Set environment variable
   */
  setEnv(name: string, value: string) {
    this.env.set(name, value);
  }

  /**
   * Get the filesystem
   */
  getFs(): FileSystemInterface {
    return this.fs;
  }

  /**
   * Get last exit code
   */
  getLastExitCode(): number {
    return this.state.lastExitCode;
  }

  /**
   * Check if shell is running
   */
  isRunning(): boolean {
    return this.state.running;
  }

  /**
   * Exit the shell
   */
  exit(code: number = 0) {
    this.state.running = false;
    this.state.lastExitCode = code;
  }

  /**
   * Get the prompt string
   */
  getPrompt(): string {
    let prompt = this.env.get('PS1') || '$ ';
    
    // Expand common prompt escapes
    prompt = prompt
      .replace(/\\w/g, this.cwd.replace(this.env.get('HOME') || '', '~'))
      .replace(/\\W/g, this.cwd.split('/').pop() || '/')
      .replace(/\\u/g, this.env.get('USER') || 'user')
      .replace(/\\h/g, this.env.get('HOSTNAME') || 'localhost')
      .replace(/\\$/g, '$');

    return prompt;
  }

  /**
   * Execute a command string
   */
  async execute(input: string): Promise<number> {
    try {
      const program = parse(input);
      return await this.runProgram(program);
    } catch (e: any) {
      this.stderr(`mrsh: ${e.message}\n`);
      this.state.lastExitCode = 2;
      return 2;
    }
  }

  /**
   * Run a parsed program
   */
  private async runProgram(program: Program): Promise<number> {
    let exitCode = 0;

    for (const commandList of program.commands) {
      exitCode = await this.runCommandList(commandList);
      if (!this.state.running) break;
    }

    this.state.lastExitCode = exitCode;
    return exitCode;
  }

  /**
   * Run a command list
   */
  private async runCommandList(commandList: CommandList): Promise<number> {
    const exitCode = await this.runAndOrList(commandList.andOrList);
    
    // Handle async execution (background jobs not fully implemented for browser)
    if (commandList.async) {
      // In a real implementation, this would run in background
      // For browser, we just run synchronously
    }

    return exitCode;
  }

  /**
   * Run an and-or list
   */
  private async runAndOrList(andOrList: AndOrList): Promise<number> {
    let exitCode = await this.runPipeline(andOrList.first);

    for (const item of andOrList.rest) {
      if (item.type === AndOrType.And) {
        if (exitCode === 0) {
          exitCode = await this.runPipeline(item.pipeline);
        }
      } else if (item.type === AndOrType.Or) {
        if (exitCode !== 0) {
          exitCode = await this.runPipeline(item.pipeline);
        }
      }
    }

    return exitCode;
  }

  /**
   * Run a pipeline
   */
  private async runPipeline(pipeline: Pipeline): Promise<number> {
    let exitCode = 0;

    if (pipeline.commands.length === 1) {
      exitCode = await this.runCommand(pipeline.commands[0]);
    } else {
      // Pipeline with multiple commands
      let input = '';
      
      for (let i = 0; i < pipeline.commands.length; i++) {
        const isLast = i === pipeline.commands.length - 1;
        const cmd = pipeline.commands[i];
        
        // Set up pipe
        let output = '';
        const savedStdout = this.stdout;
        
        if (!isLast) {
          this.stdout = (text: string) => { output += text; };
        }
        
        // For non-first commands, inject pipe input
        this.pipeBuffer = input;
        
        exitCode = await this.runCommand(cmd);
        
        this.stdout = savedStdout;
        input = output;
      }
      
      this.pipeBuffer = '';
    }

    if (pipeline.negation) {
      exitCode = exitCode === 0 ? 1 : 0;
    }

    return exitCode;
  }

  /**
   * Run a command
   */
  private async runCommand(command: Command): Promise<number> {
    switch (command.type) {
      case CommandType.Simple:
        return this.runSimpleCommand(command as SimpleCommand);
      case CommandType.BraceGroup:
        return this.runBraceGroup(command as BraceGroup);
      case CommandType.Subshell:
        return this.runSubshell(command as Subshell);
      case CommandType.If:
        return this.runIfClause(command as IfClause);
      case CommandType.For:
        return this.runForClause(command as ForClause);
      case CommandType.Loop:
        return this.runLoopClause(command as LoopClause);
      case CommandType.Case:
        return this.runCaseClause(command as CaseClause);
      default:
        this.stderr(`mrsh: unsupported command type: ${command.type}\n`);
        return 1;
    }
  }

  /**
   * Run a simple command
   */
  private async runSimpleCommand(cmd: SimpleCommand): Promise<number> {
    // Handle redirections first (store for later)
    const redirects = cmd.redirects;

    // Apply assignments
    for (const assignment of cmd.assignments) {
      const value = await this.expandWord(assignment.value);
      if (!cmd.name) {
        // No command - just set the variable
        this.env.set(assignment.name, value);
      }
    }

    // If no command name, just return success (assignments only)
    if (!cmd.name) {
      return 0;
    }

    // Expand command name
    const cmdName = await this.expandWord(cmd.name);

    // Check for alias
    const aliasValue = this.aliases.get(cmdName);
    if (aliasValue) {
      return this.execute(aliasValue + ' ' + (await Promise.all(cmd.arguments.map(a => this.expandWord(a)))).join(' '));
    }

    // Check for function
    const func = this.functions.get(cmdName);
    if (func) {
      // TODO: Set positional parameters and run function
      return this.runCommand(func);
    }

    // Expand arguments
    const args = await Promise.all(cmd.arguments.map(a => this.expandWord(a)));

    // Set up redirections
    let savedStdout = this.stdout;
    let savedStderr = this.stderr;
    let redirectOutput = '';
    let redirectFile: string | null = null;
    let appendMode = false;

    for (const redirect of redirects) {
      const target = await this.expandWord(redirect.name);
      
      switch (redirect.op) {
        case IoRedirectOp.Great:
        case IoRedirectOp.Clobber:
          redirectFile = this.resolvePath(target);
          appendMode = false;
          this.stdout = (text: string) => { redirectOutput += text; };
          break;
        case IoRedirectOp.DGreat:
          redirectFile = this.resolvePath(target);
          appendMode = true;
          this.stdout = (text: string) => { redirectOutput += text; };
          break;
        case IoRedirectOp.GreatAnd:
          if (target === '1') {
            // >&1 - no change
          } else if (target === '2') {
            this.stdout = this.stderr;
          }
          break;
        case IoRedirectOp.Less:
          // Input redirection - read file into pipe buffer
          try {
            this.pipeBuffer = this.fs.readFileSync(this.resolvePath(target), 'utf8') as string;
          } catch {
            this.stderr(`mrsh: ${target}: No such file or directory\n`);
            return 1;
          }
          break;
      }
    }

    // Look up command
    const virtualCmd = this.commands.get(cmdName);
    let exitCode: number;

    if (virtualCmd) {
      const parsedArgs = this.commands.parseArgs(virtualCmd, args);
      
      const context: CommandContext = {
        args: parsedArgs,
        stdout: this.stdout,
        stderr: this.stderr,
        stdin: this.pipeBuffer, // Pass pipe input to command
        env: this.env,
        cwd: this.cwd,
        fs: this.fs,
        shell: this,
      };

      try {
        exitCode = await virtualCmd.action(context);
      } catch (e: any) {
        this.stderr(`${cmdName}: ${e.message}\n`);
        exitCode = 1;
      }
    } else {
      this.stderr(`mrsh: ${cmdName}: command not found\n`);
      exitCode = 127;
    }

    // Write redirect output to file
    if (redirectFile) {
      try {
        if (appendMode) {
          this.fs.appendFileSync(redirectFile, redirectOutput);
        } else {
          this.fs.writeFileSync(redirectFile, redirectOutput);
        }
      } catch (e: any) {
        this.stderr(`mrsh: ${redirectFile}: ${e.message}\n`);
        exitCode = 1;
      }
    }

    // Restore stdout/stderr
    this.stdout = savedStdout;
    this.stderr = savedStderr;

    this.state.lastExitCode = exitCode;
    return exitCode;
  }

  /**
   * Run a brace group
   */
  private async runBraceGroup(group: BraceGroup): Promise<number> {
    let exitCode = 0;
    for (const cmd of group.body) {
      exitCode = await this.runCommandList(cmd);
      if (!this.state.running) break;
    }
    return exitCode;
  }

  /**
   * Run a subshell
   */
  private async runSubshell(subshell: Subshell): Promise<number> {
    // Save state
    const savedEnv = new Map(this.env);
    const savedCwd = this.cwd;

    let exitCode = 0;
    for (const cmd of subshell.body) {
      exitCode = await this.runCommandList(cmd);
      if (!this.state.running) break;
    }

    // Restore state (subshell changes don't affect parent)
    this.env = savedEnv;
    this.cwd = savedCwd;

    return exitCode;
  }

  /**
   * Run an if clause
   */
  private async runIfClause(ifClause: IfClause): Promise<number> {
    // Run condition
    let conditionResult = 0;
    for (const cmd of ifClause.condition) {
      conditionResult = await this.runCommandList(cmd);
    }

    if (conditionResult === 0) {
      // Condition is true
      let exitCode = 0;
      for (const cmd of ifClause.body) {
        exitCode = await this.runCommandList(cmd);
        if (!this.state.running) break;
      }
      return exitCode;
    } else if (ifClause.elseClause) {
      // Run else clause
      return this.runCommand(ifClause.elseClause);
    }

    return 0;
  }

  /**
   * Run a for clause
   */
  private async runForClause(forClause: ForClause): Promise<number> {
    const words = forClause.hasIn
      ? await Promise.all(forClause.words.map(w => this.expandWord(w)))
      : ['$1', '$2', '$3']; // Default to positional params

    let exitCode = 0;

    for (const word of words) {
      this.env.set(forClause.name, word);

      for (const cmd of forClause.body) {
        exitCode = await this.runCommandList(cmd);
        if (!this.state.running) break;
      }
    }

    return exitCode;
  }

  /**
   * Run a loop clause (while/until)
   */
  private async runLoopClause(loop: LoopClause): Promise<number> {
    let exitCode = 0;

    while (this.state.running) {
      // Run condition
      let conditionResult = 0;
      for (const cmd of loop.condition) {
        conditionResult = await this.runCommandList(cmd);
      }

      // Check condition (inverted for until)
      const shouldContinue = loop.isUntil
        ? conditionResult !== 0
        : conditionResult === 0;

      if (!shouldContinue) break;

      // Run body
      for (const cmd of loop.body) {
        exitCode = await this.runCommandList(cmd);
        if (!this.state.running) break;
      }
    }

    return exitCode;
  }

  /**
   * Run a case clause
   */
  private async runCaseClause(caseClause: CaseClause): Promise<number> {
    const word = await this.expandWord(caseClause.word);
    let exitCode = 0;

    for (const item of caseClause.items) {
      for (const pattern of item.patterns) {
        const patternStr = await this.expandWord(pattern);
        
        // Convert glob pattern to regex
        const regex = new RegExp(
          '^' + patternStr
            .replace(/[.+^${}()|[\]\\]/g, '\\$&')
            .replace(/\*/g, '.*')
            .replace(/\?/g, '.') + '$'
        );

        if (regex.test(word)) {
          for (const cmd of item.body) {
            exitCode = await this.runCommandList(cmd);
            if (!this.state.running) break;
          }
          return exitCode;
        }
      }
    }

    return exitCode;
  }

  /**
   * Expand a word (variable substitution, etc.)
   */
  private async expandWord(word: Word): Promise<string> {
    switch (word.type) {
      case WordType.String:
        return (word as WordString).value;

      case WordType.Parameter:
        return this.expandParameter(word as WordParameter);

      case WordType.List: {
        const list = word as WordList;
        const parts = await Promise.all(list.children.map(c => this.expandWord(c)));
        return parts.join('');
      }

      case WordType.Command: {
        const cmdWord = word as WordCommand;
        if (cmdWord.program) {
          // Capture output
          let output = '';
          const savedStdout = this.stdout;
          this.stdout = (text: string) => { output += text; };
          await this.runProgram(cmdWord.program);
          this.stdout = savedStdout;
          return output.replace(/\n$/, '');
        }
        return '';
      }

      case WordType.Arithmetic: {
        const arith = word as WordArithmetic;
        const expr = await this.expandWord(arith.body);
        try {
          // Simple arithmetic evaluation (safe for basic expressions)
          const result = this.evaluateArithmetic(expr);
          return result.toString();
        } catch {
          return '0';
        }
      }

      default:
        return '';
    }
  }

  /**
   * Expand a parameter
   */
  private expandParameter(param: WordParameter): string {
    let value = this.getVariable(param.name);

    switch (param.op) {
      case ParameterOp.None:
        return value;

      case ParameterOp.Minus:
        // ${param:-word} - use default if unset or null
        if (!value || (param.colon && value === '')) {
          return param.arg ? this.expandWordSync(param.arg) : '';
        }
        return value;

      case ParameterOp.Equal:
        // ${param:=word} - assign default if unset or null
        if (!value || (param.colon && value === '')) {
          const defaultValue = param.arg ? this.expandWordSync(param.arg) : '';
          this.env.set(param.name, defaultValue);
          return defaultValue;
        }
        return value;

      case ParameterOp.QMark:
        // ${param:?word} - error if unset or null
        if (!value || (param.colon && value === '')) {
          const msg = param.arg ? this.expandWordSync(param.arg) : 'parameter not set';
          this.stderr(`mrsh: ${param.name}: ${msg}\n`);
          return '';
        }
        return value;

      case ParameterOp.Plus:
        // ${param:+word} - use alternative if set and non-null
        if (value && (!param.colon || value !== '')) {
          return param.arg ? this.expandWordSync(param.arg) : '';
        }
        return '';

      case ParameterOp.LeadingHash:
        // ${#param} - string length
        return value.length.toString();

      case ParameterOp.Percent:
      case ParameterOp.DPercent:
      case ParameterOp.Hash:
      case ParameterOp.DHash:
        // Pattern removal - simplified implementation
        if (param.arg) {
          const pattern = this.expandWordSync(param.arg);
          const regex = new RegExp(
            pattern
              .replace(/[.+^${}()|[\]\\]/g, '\\$&')
              .replace(/\*/g, '.*')
              .replace(/\?/g, '.')
          );

          if (param.op === ParameterOp.Percent || param.op === ParameterOp.DPercent) {
            // Remove suffix
            return value.replace(new RegExp(regex.source + '$'), '');
          } else {
            // Remove prefix
            return value.replace(new RegExp('^' + regex.source), '');
          }
        }
        return value;

      default:
        return value;
    }
  }

  /**
   * Synchronous word expansion (for nested expansion)
   */
  private expandWordSync(word: Word): string {
    if (word.type === WordType.String) {
      return (word as WordString).value;
    }
    // For complex words, we'd need async - return empty for now
    return '';
  }

  /**
   * Get a variable value
   */
  private getVariable(name: string): string {
    // Special parameters
    switch (name) {
      case '?':
        return this.state.lastExitCode.toString();
      case '$':
        return '1'; // PID (simulated)
      case '!':
        return '1'; // Last background PID (simulated)
      case '-':
        return ''; // Shell options
      case '#':
        return '0'; // Number of positional params
      case '*':
      case '@':
        return ''; // All positional params
      case '0':
        return 'mrsh';
      default:
        return this.env.get(name) || '';
    }
  }

  /**
   * Evaluate an arithmetic expression
   */
  private evaluateArithmetic(expr: string): number {
    // First expand any variables
    const expanded = expr.replace(/\$(\w+)/g, (_, name) => {
      return this.getVariable(name);
    });

    // Simple and safe arithmetic evaluation
    // Only allow numbers and basic operators
    const sanitized = expanded.replace(/[^0-9+\-*/%() ]/g, '');
    
    try {
      // Use Function instead of eval for slightly better safety
      // Still only safe because we sanitized the input
      const result = new Function(`return (${sanitized})`)();
      return typeof result === 'number' ? Math.floor(result) : 0;
    } catch {
      return 0;
    }
  }

  /**
   * Resolve a path relative to cwd
   */
  private resolvePath(path: string): string {
    if (path.startsWith('/')) {
      return this.normalizePath(path);
    }
    if (path.startsWith('~')) {
      const home = this.env.get('HOME') || '/home/user';
      return this.normalizePath(home + path.substring(1));
    }
    return this.normalizePath(`${this.cwd}/${path}`);
  }

  /**
   * Normalize a path
   */
  private normalizePath(path: string): string {
    const parts = path.split('/').filter(p => p && p !== '.');
    const result: string[] = [];
    
    for (const part of parts) {
      if (part === '..') {
        result.pop();
      } else {
        result.push(part);
      }
    }
    
    return '/' + result.join('/');
  }

  /**
   * Set an alias
   */
  setAlias(name: string, value: string) {
    this.aliases.set(name, value);
  }

  /**
   * Remove an alias
   */
  unsetAlias(name: string) {
    this.aliases.delete(name);
  }

  /**
   * Define a function
   */
  defineFunction(name: string, body: Command) {
    this.functions.set(name, body);
  }
}

export default Shell;
