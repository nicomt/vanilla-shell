/**
 * Shared utility functions for builtin commands
 */

// Helper to resolve path
export function resolvePath(cwd: string, path: string): string {
  if (path.startsWith('/')) {
    return normalizePath(path);
  }
  return normalizePath(`${cwd}/${path}`);
}

export function normalizePath(path: string): string {
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
