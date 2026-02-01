/**
 * vanilla-shell - A POSIX-like shell in TypeScript for the browser
 * 
 * Based on mrsh (https://github.com/emersion/mrsh)
 * With virtual command support inspired by Vorpal.js
 */

export * from './shell/ast';
export * from './shell/shell';
export * from './shell/filesystem';
// Re-export specific items to avoid Command name clash with ast.ts
export { defineCommand, z, CommandRegistry } from './shell/commands';
export type {
  ShellCommand,
  CommandContext,
  CommandResult,
  CommandUsage,
  CommandDefinition,
  CommandSpec,
  OptionMeta,
  ParsedArgs,
} from './shell/commands';
export * from './parser/lexer';
export * from './parser/parser';
export { builtins } from './builtins';

import { Shell, ShellOptions } from './shell/shell';

/**
 * Create a new shell instance
 */
export function createShell(options?: ShellOptions): Shell {
  return new Shell(options);
}

export default Shell;
