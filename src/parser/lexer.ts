/**
 * Lexer/Tokenizer for shell commands
 * Converts input string into tokens for the parser
 */

export enum TokenType {
  Word = 'word',
  Operator = 'operator',
  NewLine = 'newline',
  EOF = 'eof',
  IoNumber = 'io_number',
}

export interface Token {
  type: TokenType;
  value: string;
  position: {
    offset: number;
    line: number;
    column: number;
  };
}

const OPERATORS = [
  '&&', '||', ';;', '<<-', '<<', '>>', '<&', '>&', '<>', '>|',
  '|', '&', ';', '<', '>', '(', ')', '{', '}', '\n',
];

const RESERVED_WORDS = [
  'if', 'then', 'else', 'elif', 'fi',
  'do', 'done', 'case', 'esac', 'while', 'until', 'for',
  'in', '!', '{', '}',
];

export class Lexer {
  private input: string;
  private pos: number = 0;
  private line: number = 1;
  private column: number = 1;

  constructor(input: string) {
    this.input = input;
  }

  private peek(ahead: number = 0): string {
    return this.input[this.pos + ahead] || '';
  }

  private advance(): string {
    const ch = this.input[this.pos++] || '';
    if (ch === '\n') {
      this.line++;
      this.column = 1;
    } else {
      this.column++;
    }
    return ch;
  }

  private skipWhitespace(): void {
    while (this.pos < this.input.length) {
      const ch = this.peek();
      if (ch === ' ' || ch === '\t') {
        this.advance();
      } else if (ch === '\\' && this.peek(1) === '\n') {
        // Line continuation
        this.advance();
        this.advance();
      } else {
        break;
      }
    }
  }

  private skipComment(): void {
    if (this.peek() === '#') {
      while (this.pos < this.input.length && this.peek() !== '\n') {
        this.advance();
      }
    }
  }

  private currentPosition() {
    return {
      offset: this.pos,
      line: this.line,
      column: this.column,
    };
  }

  private readOperator(): Token | null {
    const position = this.currentPosition();

    // Try to match longest operator first
    for (const op of OPERATORS) {
      let matches = true;
      for (let i = 0; i < op.length; i++) {
        if (this.peek(i) !== op[i]) {
          matches = false;
          break;
        }
      }
      if (matches) {
        for (let i = 0; i < op.length; i++) {
          this.advance();
        }
        if (op === '\n') {
          return { type: TokenType.NewLine, value: '\n', position };
        }
        return { type: TokenType.Operator, value: op, position };
      }
    }

    return null;
  }

  private readSingleQuotedString(): string {
    let result = "'";
    this.advance(); // Skip opening quote

    while (this.pos < this.input.length) {
      const ch = this.advance();
      result += ch;
      if (ch === "'") {
        break;
      }
    }

    return result;
  }

  private readDoubleQuotedString(): string {
    let result = '"';
    this.advance(); // Skip opening quote

    while (this.pos < this.input.length) {
      const ch = this.peek();
      if (ch === '\\') {
        result += this.advance();
        if (this.pos < this.input.length) {
          result += this.advance();
        }
      } else if (ch === '"') {
        result += this.advance();
        break;
      } else {
        result += this.advance();
      }
    }

    return result;
  }

  private isMetacharacter(ch: string): boolean {
    return '|&;<>()$`\\"\' \t\n'.includes(ch);
  }

  private readWord(): Token {
    const position = this.currentPosition();
    let value = '';

    while (this.pos < this.input.length) {
      const ch = this.peek();

      if (ch === "'") {
        value += this.readSingleQuotedString();
      } else if (ch === '"') {
        value += this.readDoubleQuotedString();
      } else if (ch === '\\') {
        value += this.advance();
        if (this.pos < this.input.length && this.peek() !== '\n') {
          value += this.advance();
        } else if (this.peek() === '\n') {
          this.advance(); // Skip the newline (line continuation)
        }
      } else if (ch === '$') {
        value += this.readParameter();
      } else if (ch === '`') {
        value += this.readBackquote();
      } else if (this.isMetacharacter(ch)) {
        break;
      } else {
        value += this.advance();
      }
    }

    return { type: TokenType.Word, value, position };
  }

  private readParameter(): string {
    let result = this.advance(); // $

    if (this.peek() === '(') {
      if (this.peek(1) === '(') {
        // Arithmetic expansion $((...))
        result += this.advance(); // (
        result += this.advance(); // (
        let depth = 2;
        while (this.pos < this.input.length && depth > 0) {
          const ch = this.peek();
          if (ch === '(') depth++;
          else if (ch === ')') depth--;
          result += this.advance();
        }
      } else {
        // Command substitution $(...)
        result += this.advance(); // (
        let depth = 1;
        while (this.pos < this.input.length && depth > 0) {
          const ch = this.peek();
          if (ch === '(') depth++;
          else if (ch === ')') depth--;
          if (ch === "'" || ch === '"') {
            if (ch === "'") result += this.readSingleQuotedString();
            else result += this.readDoubleQuotedString();
          } else {
            result += this.advance();
          }
        }
      }
    } else if (this.peek() === '{') {
      // Parameter expansion ${...}
      result += this.advance(); // {
      while (this.pos < this.input.length && this.peek() !== '}') {
        result += this.advance();
      }
      if (this.peek() === '}') {
        result += this.advance();
      }
    } else {
      // Simple variable $name or $@, $*, etc
      const special = '@*#?-$!0123456789';
      if (special.includes(this.peek())) {
        result += this.advance();
      } else {
        while (this.pos < this.input.length) {
          const ch = this.peek();
          if (/[a-zA-Z0-9_]/.test(ch)) {
            result += this.advance();
          } else {
            break;
          }
        }
      }
    }

    return result;
  }

  private readBackquote(): string {
    let result = this.advance(); // `

    while (this.pos < this.input.length && this.peek() !== '`') {
      if (this.peek() === '\\') {
        result += this.advance();
        if (this.pos < this.input.length) {
          result += this.advance();
        }
      } else {
        result += this.advance();
      }
    }

    if (this.peek() === '`') {
      result += this.advance();
    }

    return result;
  }

  public nextToken(): Token {
    this.skipWhitespace();
    this.skipComment();
    this.skipWhitespace();

    if (this.pos >= this.input.length) {
      return { type: TokenType.EOF, value: '', position: this.currentPosition() };
    }

    // Check for IO number (digit followed by < or >)
    const position = this.currentPosition();
    if (/[0-9]/.test(this.peek())) {
      const next = this.peek(1);
      if (next === '<' || next === '>') {
        const digit = this.advance();
        return { type: TokenType.IoNumber, value: digit, position };
      }
    }

    // Try to read operator
    const op = this.readOperator();
    if (op) {
      return op;
    }

    // Read word
    return this.readWord();
  }

  public tokenize(): Token[] {
    const tokens: Token[] = [];
    let token: Token;

    do {
      token = this.nextToken();
      tokens.push(token);
    } while (token.type !== TokenType.EOF);

    return tokens;
  }

  public peekToken(): Token {
    const savedPos = this.pos;
    const savedLine = this.line;
    const savedColumn = this.column;

    const token = this.nextToken();

    this.pos = savedPos;
    this.line = savedLine;
    this.column = savedColumn;

    return token;
  }
}

export function isReservedWord(word: string): boolean {
  return RESERVED_WORDS.includes(word);
}
