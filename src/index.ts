/**
 * vanilla-shell - A POSIX-like shell in TypeScript for the browser
 * 
 * Based on mrsh (https://github.com/emersion/mrsh)
 * With virtual command support inspired by Vorpal.js
 */

export * from './shell/ast';
export * from './shell/shell';
export * from './shell/filesystem';
export * from './shell/commands';
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
