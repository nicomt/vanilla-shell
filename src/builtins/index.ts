/**
 * Built-in shell commands
 * Re-exports all commands from individual modules
 */

import { VirtualCommand } from '../shell/commands';

// Import individual commands
export { echo } from './echo';
export { pwd } from './pwd';
export { cd } from './cd';
export { ls } from './ls';
export { cat } from './cat';
export { mkdir } from './mkdir';
export { rm } from './rm';
export { rmdir } from './rmdir';
export { touch } from './touch';
export { cp } from './cp';
export { mv } from './mv';
export { exportCmd } from './export';
export { unset } from './unset';
export { env } from './env';
export { trueCmd } from './true';
export { falseCmd } from './false';
export { exit } from './exit';
export { clear } from './clear';
export { head } from './head';
export { tail } from './tail';
export { wc } from './wc';
export { grep } from './grep';
export { printf } from './printf';
export { test } from './test';
export { help } from './help';

// Import for building the builtins array
import { echo } from './echo';
import { pwd } from './pwd';
import { cd } from './cd';
import { ls } from './ls';
import { cat } from './cat';
import { mkdir } from './mkdir';
import { rm } from './rm';
import { rmdir } from './rmdir';
import { touch } from './touch';
import { cp } from './cp';
import { mv } from './mv';
import { exportCmd } from './export';
import { unset } from './unset';
import { env } from './env';
import { trueCmd } from './true';
import { falseCmd } from './false';
import { exit } from './exit';
import { clear } from './clear';
import { head } from './head';
import { tail } from './tail';
import { wc } from './wc';
import { grep } from './grep';
import { printf } from './printf';
import { test } from './test';
import { help } from './help';

// All builtin commands
export const builtins: VirtualCommand[] = [
  echo,
  pwd,
  cd,
  ls,
  cat,
  mkdir,
  rm,
  rmdir,
  touch,
  cp,
  mv,
  exportCmd,
  unset,
  env,
  trueCmd,
  falseCmd,
  exit,
  clear,
  head,
  tail,
  wc,
  grep,
  printf,
  test,
  help,
];

export default builtins;
