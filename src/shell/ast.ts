/**
 * AST types for the shell parser
 * Based on mrsh's include/mrsh/ast.h
 */

export interface Position {
  offset: number;
  line: number;
  column: number;
}

export interface Range {
  begin: Position;
  end: Position;
}

export enum NodeType {
  Program = 'program',
  CommandList = 'command_list',
  AndOrList = 'and_or_list',
  Pipeline = 'pipeline',
  Command = 'command',
  Word = 'word',
}

export enum WordType {
  String = 'string',
  Parameter = 'parameter',
  Command = 'command',
  Arithmetic = 'arithmetic',
  List = 'list',
}

export enum ParameterOp {
  None = 'none',
  Minus = 'minus',           // ${parameter:-word}
  Equal = 'equal',           // ${parameter:=word}
  QMark = 'qmark',           // ${parameter:?word}
  Plus = 'plus',             // ${parameter:+word}
  LeadingHash = 'leading_hash', // ${#parameter}
  Percent = 'percent',       // ${parameter%word}
  DPercent = 'dpercent',     // ${parameter%%word}
  Hash = 'hash',             // ${parameter#word}
  DHash = 'dhash',           // ${parameter##word}
}

export interface Word {
  type: WordType;
}

export interface WordString extends Word {
  type: WordType.String;
  value: string;
  singleQuoted: boolean;
  splitFields: boolean;
  range?: Range;
}

export interface WordParameter extends Word {
  type: WordType.Parameter;
  name: string;
  op: ParameterOp;
  colon: boolean;
  arg?: Word;
}

export interface WordCommand extends Word {
  type: WordType.Command;
  program?: Program;
  backQuoted: boolean;
}

export interface WordArithmetic extends Word {
  type: WordType.Arithmetic;
  body: Word;
}

export interface WordList extends Word {
  type: WordType.List;
  children: Word[];
  doubleQuoted: boolean;
}

export enum IoRedirectOp {
  Less = '<',           // <
  Great = '>',          // >
  Clobber = '>|',       // >|
  DGreat = '>>',        // >>
  LessAnd = '<&',       // <&
  GreatAnd = '>&',      // >&
  LessGreat = '<>',     // <>
  DLess = '<<',         // <<
  DLessDash = '<<-',    // <<-
}

export interface IoRedirect {
  ioNumber: number; // -1 if unspecified
  op: IoRedirectOp;
  name: Word;
  hereDocument?: Word[];
}

export interface Assignment {
  name: string;
  value: Word;
}

export enum CommandType {
  Simple = 'simple',
  BraceGroup = 'brace_group',
  Subshell = 'subshell',
  If = 'if',
  For = 'for',
  Loop = 'loop', // while or until
  Case = 'case',
  Function = 'function',
}

export interface Command {
  type: CommandType;
}

export interface SimpleCommand extends Command {
  type: CommandType.Simple;
  name?: Word;
  arguments: Word[];
  redirects: IoRedirect[];
  assignments: Assignment[];
}

export interface BraceGroup extends Command {
  type: CommandType.BraceGroup;
  body: CommandList[];
}

export interface Subshell extends Command {
  type: CommandType.Subshell;
  body: CommandList[];
}

export interface IfClause extends Command {
  type: CommandType.If;
  condition: CommandList[];
  body: CommandList[];
  elseClause?: Command;
}

export interface ForClause extends Command {
  type: CommandType.For;
  name: string;
  hasIn: boolean;
  words: Word[];
  body: CommandList[];
}

export interface LoopClause extends Command {
  type: CommandType.Loop;
  isUntil: boolean;
  condition: CommandList[];
  body: CommandList[];
}

export interface CaseItem {
  patterns: Word[];
  body: CommandList[];
}

export interface CaseClause extends Command {
  type: CommandType.Case;
  word: Word;
  items: CaseItem[];
}

export interface FunctionDefinition extends Command {
  type: CommandType.Function;
  name: string;
  body: Command;
}

export enum AndOrType {
  And = '&&',
  Or = '||',
}

export interface Pipeline {
  negation: boolean;
  commands: Command[];
}

export interface AndOrList {
  first: Pipeline;
  rest: Array<{ type: AndOrType; pipeline: Pipeline }>;
}

export interface CommandList {
  andOrList: AndOrList;
  async: boolean;
}

export interface Program {
  commands: CommandList[];
}

// Helper functions to create AST nodes
export function createWordString(value: string, singleQuoted = false): WordString {
  return {
    type: WordType.String,
    value,
    singleQuoted,
    splitFields: false,
  };
}

export function createWordParameter(name: string, op = ParameterOp.None): WordParameter {
  return {
    type: WordType.Parameter,
    name,
    op,
    colon: false,
  };
}

export function createWordList(children: Word[], doubleQuoted = false): WordList {
  return {
    type: WordType.List,
    children,
    doubleQuoted,
  };
}

export function createSimpleCommand(
  name?: Word,
  args: Word[] = [],
  redirects: IoRedirect[] = [],
  assignments: Assignment[] = []
): SimpleCommand {
  return {
    type: CommandType.Simple,
    name,
    arguments: args,
    redirects,
    assignments,
  };
}

export function createPipeline(commands: Command[], negation = false): Pipeline {
  return { negation, commands };
}

export function createAndOrList(first: Pipeline): AndOrList {
  return { first, rest: [] };
}

export function createCommandList(andOrList: AndOrList, async = false): CommandList {
  return { andOrList, async };
}

export function createProgram(commands: CommandList[]): Program {
  return { commands };
}
