/**
 * Shell parser
 * Parses tokens into an AST
 * Based on mrsh's parser implementation
 */

import { Lexer, Token, TokenType, isReservedWord } from './lexer';
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
  Assignment,
  IfClause,
  ForClause,
  LoopClause,
  CaseClause,
  CaseItem,
  BraceGroup,
  Subshell,
  FunctionDefinition,
  createProgram,
  createCommandList,
  createAndOrList,
  createPipeline,
  createSimpleCommand,
  createWordString,
} from '../shell/ast';

export class Parser {
  private lexer: Lexer;
  private currentToken: Token;
  private peekedToken: Token | null = null;

  constructor(input: string) {
    this.lexer = new Lexer(input);
    this.currentToken = this.lexer.nextToken();
  }

  private peek(): Token {
    if (!this.peekedToken) {
      this.peekedToken = this.lexer.nextToken();
    }
    return this.peekedToken;
  }

  private advance(): Token {
    const current = this.currentToken;
    if (this.peekedToken) {
      this.currentToken = this.peekedToken;
      this.peekedToken = null;
    } else {
      this.currentToken = this.lexer.nextToken();
    }
    return current;
  }

  private expect(type: TokenType, value?: string): Token {
    if (this.currentToken.type !== type) {
      throw new Error(`Expected ${type}, got ${this.currentToken.type} at line ${this.currentToken.position.line}`);
    }
    if (value !== undefined && this.currentToken.value !== value) {
      throw new Error(`Expected '${value}', got '${this.currentToken.value}' at line ${this.currentToken.position.line}`);
    }
    return this.advance();
  }

  private match(type: TokenType, value?: string): boolean {
    if (this.currentToken.type !== type) {
      return false;
    }
    if (value !== undefined && this.currentToken.value !== value) {
      return false;
    }
    return true;
  }

  private accept(type: TokenType, value?: string): boolean {
    if (this.match(type, value)) {
      this.advance();
      return true;
    }
    return false;
  }

  private skipNewlines(): void {
    while (this.match(TokenType.NewLine)) {
      this.advance();
    }
  }

  private linebreak(): void {
    while (this.match(TokenType.NewLine)) {
      this.advance();
    }
  }

  public parse(): Program {
    const commands: CommandList[] = [];
    this.linebreak();

    while (!this.match(TokenType.EOF)) {
      const cmd = this.parseCommandList();
      if (cmd) {
        commands.push(cmd);
      }
      
      // Handle separator
      if (this.match(TokenType.NewLine) || this.accept(TokenType.Operator, ';')) {
        this.linebreak();
      } else if (!this.match(TokenType.EOF)) {
        break;
      }
    }

    return createProgram(commands);
  }

  private parseCommandList(): CommandList | null {
    const andOrList = this.parseAndOrList();
    if (!andOrList) {
      return null;
    }

    let async = false;
    if (this.accept(TokenType.Operator, '&')) {
      async = true;
    }

    return createCommandList(andOrList, async);
  }

  private parseAndOrList(): AndOrList | null {
    const first = this.parsePipeline();
    if (!first) {
      return null;
    }

    const andOrList = createAndOrList(first);

    while (true) {
      let type: AndOrType | null = null;
      if (this.accept(TokenType.Operator, '&&')) {
        type = AndOrType.And;
      } else if (this.accept(TokenType.Operator, '||')) {
        type = AndOrType.Or;
      } else {
        break;
      }

      this.linebreak();
      const pipeline = this.parsePipeline();
      if (!pipeline) {
        throw new Error('Expected pipeline after && or ||');
      }

      andOrList.rest.push({ type, pipeline });
    }

    return andOrList;
  }

  private parsePipeline(): Pipeline | null {
    let negation = false;
    if (this.match(TokenType.Word) && this.currentToken.value === '!') {
      negation = true;
      this.advance();
    }

    const commands: Command[] = [];
    const first = this.parseCommand();
    if (!first) {
      if (negation) {
        throw new Error('Expected command after !');
      }
      return null;
    }
    commands.push(first);

    while (this.accept(TokenType.Operator, '|')) {
      this.linebreak();
      const cmd = this.parseCommand();
      if (!cmd) {
        throw new Error('Expected command after |');
      }
      commands.push(cmd);
    }

    return createPipeline(commands, negation);
  }

  private parseCommand(): Command | null {
    // Check for compound commands
    if (this.match(TokenType.Operator, '{')) {
      return this.parseBraceGroup();
    }
    if (this.match(TokenType.Operator, '(')) {
      return this.parseSubshell();
    }
    if (this.match(TokenType.Word)) {
      const word = this.currentToken.value;
      if (word === 'if') return this.parseIfClause();
      if (word === 'for') return this.parseForClause();
      if (word === 'while') return this.parseLoopClause(false);
      if (word === 'until') return this.parseLoopClause(true);
      if (word === 'case') return this.parseCaseClause();
    }

    return this.parseSimpleCommand();
  }

  private parseSimpleCommand(): SimpleCommand | null {
    const assignments: Assignment[] = [];
    const redirects: IoRedirect[] = [];

    // Parse prefix (assignments and redirects)
    while (true) {
      const redirect = this.parseIoRedirect();
      if (redirect) {
        redirects.push(redirect);
        continue;
      }

      const assignment = this.parseAssignment();
      if (assignment) {
        assignments.push(assignment);
        continue;
      }

      break;
    }

    // Parse command name
    let name: Word | undefined;
    if (this.match(TokenType.Word) && !isReservedWord(this.currentToken.value)) {
      name = this.parseWord() ?? undefined;
    }

    if (!name && assignments.length === 0 && redirects.length === 0) {
      return null;
    }

    // Parse arguments and suffix redirects
    const args: Word[] = [];
    while (true) {
      const redirect = this.parseIoRedirect();
      if (redirect) {
        redirects.push(redirect);
        continue;
      }

      if (this.match(TokenType.Word) && !isReservedWord(this.currentToken.value)) {
        const arg = this.parseWord();
        if (arg) {
          args.push(arg);
          continue;
        }
      }

      break;
    }

    return createSimpleCommand(name, args, redirects, assignments);
  }

  private parseAssignment(): Assignment | null {
    if (!this.match(TokenType.Word)) {
      return null;
    }

    const word = this.currentToken.value;
    const eqIndex = word.indexOf('=');
    if (eqIndex <= 0) {
      return null;
    }

    // Check if it's a valid variable name before =
    const name = word.substring(0, eqIndex);
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(name)) {
      return null;
    }

    this.advance();
    const valueStr = word.substring(eqIndex + 1);
    const value = createWordString(valueStr);

    return { name, value };
  }

  private parseIoRedirect(): IoRedirect | null {
    let ioNumber = -1;

    if (this.match(TokenType.IoNumber)) {
      ioNumber = parseInt(this.currentToken.value, 10);
      this.advance();
    }

    let op: IoRedirectOp | null = null;
    const opValue = this.currentToken.value;

    if (this.match(TokenType.Operator)) {
      switch (opValue) {
        case '<': op = IoRedirectOp.Less; break;
        case '>': op = IoRedirectOp.Great; break;
        case '>>': op = IoRedirectOp.DGreat; break;
        case '<&': op = IoRedirectOp.LessAnd; break;
        case '>&': op = IoRedirectOp.GreatAnd; break;
        case '<>': op = IoRedirectOp.LessGreat; break;
        case '>|': op = IoRedirectOp.Clobber; break;
        case '<<': op = IoRedirectOp.DLess; break;
        case '<<-': op = IoRedirectOp.DLessDash; break;
      }
    }

    if (!op) {
      return null;
    }

    this.advance();

    // Parse filename/target
    if (!this.match(TokenType.Word)) {
      throw new Error('Expected word after IO redirect operator');
    }

    const name = this.parseWord();
    if (!name) {
      throw new Error('Expected word after IO redirect operator');
    }

    return { ioNumber, op, name };
  }

  private parseWord(): Word | null {
    if (!this.match(TokenType.Word)) {
      return null;
    }

    const value = this.currentToken.value;
    this.advance();

    return this.parseWordValue(value);
  }

  private parseWordValue(value: string): Word {
    // Check if it contains special expansions
    if (value.includes('$') || value.includes('`') || value.includes('"') || value.includes("'")) {
      return this.parseComplexWord(value);
    }

    return createWordString(value);
  }

  private parseComplexWord(value: string): Word {
    const children: Word[] = [];
    let current = '';
    let i = 0;
    let inDoubleQuote = false;

    const flushCurrent = () => {
      if (current) {
        children.push(createWordString(current));
        current = '';
      }
    };

    while (i < value.length) {
      const ch = value[i];

      if (ch === "'" && !inDoubleQuote) {
        flushCurrent();
        const start = i;
        i++; // Skip opening quote
        let quoted = '';
        while (i < value.length && value[i] !== "'") {
          quoted += value[i++];
        }
        i++; // Skip closing quote
        const ws = createWordString(quoted, true);
        children.push(ws);
      } else if (ch === '"') {
        if (!inDoubleQuote) {
          flushCurrent();
          inDoubleQuote = true;
          i++;
        } else {
          flushCurrent();
          inDoubleQuote = false;
          i++;
        }
      } else if (ch === '$') {
        flushCurrent();
        const param = this.parseParameterFromString(value, i);
        children.push(param.word);
        i = param.end;
      } else if (ch === '`' && !inDoubleQuote) {
        flushCurrent();
        const cmd = this.parseBackquoteFromString(value, i);
        children.push(cmd.word);
        i = cmd.end;
      } else if (ch === '\\') {
        i++;
        if (i < value.length) {
          current += value[i++];
        }
      } else {
        current += value[i++];
      }
    }

    flushCurrent();

    if (children.length === 1) {
      return children[0];
    }

    return {
      type: WordType.List,
      children,
      doubleQuoted: false,
    } as WordList;
  }

  private parseParameterFromString(value: string, start: number): { word: Word; end: number } {
    let i = start + 1; // Skip $

    if (i >= value.length) {
      return { word: createWordString('$'), end: i };
    }

    const ch = value[i];

    if (ch === '(') {
      if (value[i + 1] === '(') {
        // Arithmetic $((...))
        i += 2;
        let depth = 2;
        let body = '';
        while (i < value.length && depth > 0) {
          if (value[i] === '(') depth++;
          else if (value[i] === ')') depth--;
          if (depth > 0) body += value[i];
          i++;
        }
        return {
          word: { type: WordType.Arithmetic, body: createWordString(body) } as WordArithmetic,
          end: i,
        };
      } else {
        // Command substitution $(...)
        i++;
        let depth = 1;
        let body = '';
        while (i < value.length && depth > 0) {
          if (value[i] === '(') depth++;
          else if (value[i] === ')') depth--;
          if (depth > 0) body += value[i];
          i++;
        }
        return {
          word: { type: WordType.Command, program: undefined, backQuoted: false } as WordCommand,
          end: i,
        };
      }
    } else if (ch === '{') {
      // ${...} parameter expansion
      i++;
      let name = '';
      let op = ParameterOp.None;
      let colon = false;
      let arg: Word | undefined;

      // Check for # prefix
      if (value[i] === '#' && value[i + 1] !== '}') {
        if (/[a-zA-Z_]/.test(value[i + 1]) || /[0-9]/.test(value[i + 1])) {
          op = ParameterOp.LeadingHash;
          i++;
        }
      }

      // Read name
      while (i < value.length && /[a-zA-Z0-9_]/.test(value[i])) {
        name += value[i++];
      }

      // Check for operator
      if (i < value.length && value[i] !== '}') {
        if (value[i] === ':') {
          colon = true;
          i++;
        }
        if (i < value.length) {
          switch (value[i]) {
            case '-': op = ParameterOp.Minus; i++; break;
            case '=': op = ParameterOp.Equal; i++; break;
            case '?': op = ParameterOp.QMark; i++; break;
            case '+': op = ParameterOp.Plus; i++; break;
            case '%':
              if (value[i + 1] === '%') { op = ParameterOp.DPercent; i += 2; }
              else { op = ParameterOp.Percent; i++; }
              break;
            case '#':
              if (value[i + 1] === '#') { op = ParameterOp.DHash; i += 2; }
              else { op = ParameterOp.Hash; i++; }
              break;
          }

          // Read arg until }
          let argStr = '';
          while (i < value.length && value[i] !== '}') {
            argStr += value[i++];
          }
          if (argStr) {
            arg = createWordString(argStr);
          }
        }
      }

      if (value[i] === '}') i++;

      return {
        word: { type: WordType.Parameter, name, op, colon, arg } as WordParameter,
        end: i,
      };
    } else {
      // Simple $name or special parameter
      const special = '@*#?-$!0123456789';
      if (special.includes(ch)) {
        return {
          word: { type: WordType.Parameter, name: ch, op: ParameterOp.None, colon: false } as WordParameter,
          end: i + 1,
        };
      }

      let name = '';
      while (i < value.length && /[a-zA-Z0-9_]/.test(value[i])) {
        name += value[i++];
      }

      if (!name) {
        return { word: createWordString('$'), end: i };
      }

      return {
        word: { type: WordType.Parameter, name, op: ParameterOp.None, colon: false } as WordParameter,
        end: i,
      };
    }
  }

  private parseBackquoteFromString(value: string, start: number): { word: Word; end: number } {
    let i = start + 1; // Skip `
    let body = '';

    while (i < value.length && value[i] !== '`') {
      if (value[i] === '\\') {
        i++;
        if (i < value.length) {
          body += value[i++];
        }
      } else {
        body += value[i++];
      }
    }

    if (i < value.length) i++; // Skip closing `

    return {
      word: { type: WordType.Command, program: undefined, backQuoted: true } as WordCommand,
      end: i,
    };
  }

  private parseBraceGroup(): BraceGroup {
    this.expect(TokenType.Operator, '{');
    this.linebreak();

    const body = this.parseCompoundList();

    this.expect(TokenType.Operator, '}');

    return { type: CommandType.BraceGroup, body };
  }

  private parseSubshell(): Subshell {
    this.expect(TokenType.Operator, '(');
    this.linebreak();

    const body = this.parseCompoundList();

    this.expect(TokenType.Operator, ')');

    return { type: CommandType.Subshell, body };
  }

  private parseCompoundList(): CommandList[] {
    const commands: CommandList[] = [];
    this.linebreak();

    while (!this.match(TokenType.EOF)) {
      // Check for closing tokens
      if (this.match(TokenType.Operator, '}') ||
          this.match(TokenType.Operator, ')') ||
          (this.match(TokenType.Word) && 
           ['then', 'else', 'elif', 'fi', 'do', 'done', 'esac'].includes(this.currentToken.value))) {
        break;
      }

      const cmd = this.parseCommandList();
      if (cmd) {
        commands.push(cmd);
      }

      if (this.match(TokenType.NewLine) || this.accept(TokenType.Operator, ';')) {
        this.linebreak();
      } else {
        break;
      }
    }

    return commands;
  }

  private parseIfClause(): IfClause {
    this.expect(TokenType.Word, 'if');
    this.linebreak();

    const condition = this.parseCompoundList();

    this.expect(TokenType.Word, 'then');
    this.linebreak();

    const body = this.parseCompoundList();

    let elseClause: Command | undefined;
    if (this.match(TokenType.Word) && this.currentToken.value === 'elif') {
      elseClause = this.parseIfClause();
    } else if (this.accept(TokenType.Word, 'else')) {
      this.linebreak();
      const elseBody = this.parseCompoundList();
      elseClause = { type: CommandType.BraceGroup, body: elseBody } as BraceGroup;
    }

    this.expect(TokenType.Word, 'fi');

    return { type: CommandType.If, condition, body, elseClause };
  }

  private parseForClause(): ForClause {
    this.expect(TokenType.Word, 'for');

    if (!this.match(TokenType.Word)) {
      throw new Error('Expected variable name after for');
    }
    const name = this.advance().value;

    this.linebreak();

    let hasIn = false;
    const words: Word[] = [];

    if (this.accept(TokenType.Word, 'in')) {
      hasIn = true;
      while (this.match(TokenType.Word) && !isReservedWord(this.currentToken.value)) {
        const word = this.parseWord();
        if (word) words.push(word);
      }
    }

    // Expect separator
    if (!this.accept(TokenType.Operator, ';')) {
      this.linebreak();
    }

    this.expect(TokenType.Word, 'do');
    this.linebreak();

    const body = this.parseCompoundList();

    this.expect(TokenType.Word, 'done');

    return { type: CommandType.For, name, hasIn, words, body };
  }

  private parseLoopClause(isUntil: boolean): LoopClause {
    this.expect(TokenType.Word, isUntil ? 'until' : 'while');
    this.linebreak();

    const condition = this.parseCompoundList();

    this.expect(TokenType.Word, 'do');
    this.linebreak();

    const body = this.parseCompoundList();

    this.expect(TokenType.Word, 'done');

    return { type: CommandType.Loop, isUntil, condition, body };
  }

  private parseCaseClause(): CaseClause {
    this.expect(TokenType.Word, 'case');

    const word = this.parseWord();
    if (!word) {
      throw new Error('Expected word after case');
    }

    this.linebreak();
    this.expect(TokenType.Word, 'in');
    this.linebreak();

    const items: CaseItem[] = [];

    while (!this.match(TokenType.Word) || this.currentToken.value !== 'esac') {
      if (this.match(TokenType.EOF)) {
        throw new Error('Unexpected EOF in case');
      }

      // Parse pattern(s)
      const patterns: Word[] = [];
      this.accept(TokenType.Operator, '('); // Optional opening paren

      do {
        const pattern = this.parseWord();
        if (pattern) patterns.push(pattern);
      } while (this.accept(TokenType.Operator, '|'));

      this.expect(TokenType.Operator, ')');
      this.linebreak();

      const body = this.parseCompoundList();

      items.push({ patterns, body });

      if (this.accept(TokenType.Operator, ';;')) {
        this.linebreak();
      } else {
        break;
      }
    }

    this.expect(TokenType.Word, 'esac');

    return { type: CommandType.Case, word, items };
  }
}

export function parse(input: string): Program {
  const parser = new Parser(input);
  return parser.parse();
}
