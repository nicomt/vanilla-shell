import { cat } from './cat';
import { cd } from './cd';
import { clear } from './clear';
import { cp } from './cp';
import { echo } from './echo';
import { env } from './env';
import { exit } from './exit';
import { exportCmd } from './export';
import { falseCmd } from './false';
import { grep } from './grep';
import { head } from './head';
import { help } from './help';
import { ls } from './ls';
import { mkdir } from './mkdir';
import { mv } from './mv';
import { printf } from './printf';
import { pwd } from './pwd';
import { rm } from './rm';
import { rmdir } from './rmdir';
import { tail } from './tail';
import { test } from './test';
import { touch } from './touch';
import { trueCmd } from './true';
import { unset } from './unset';
import { wc } from './wc';

export const builtins = [
  cat,
  cd,
  clear,
  cp,
  echo,
  env,
  exit,
  exportCmd,
  falseCmd,
  grep,
  head,
  help,
  ls,
  mkdir,
  mv,
  printf,
  pwd,
  rm,
  rmdir,
  tail,
  test,
  touch,
  trueCmd,
  unset,
  wc,
];

export default builtins;

export {
  cat,
  cd,
  clear,
  cp,
  echo,
  env,
  exit,
  exportCmd,
  falseCmd,
  grep,
  head,
  help,
  ls,
  mkdir,
  mv,
  printf,
  pwd,
  rm,
  rmdir,
  tail,
  test,
  touch,
  trueCmd,
  unset,
  wc,
};
