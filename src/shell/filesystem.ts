/**
 * Virtual file system using ZenFS with IndexedDB backend for browser persistence
 */

import { fs, configureSingle } from '@zenfs/core';
import { IndexedDB } from '@zenfs/dom';

// Re-export the ZenFS fs object directly for full API access
export { fs };

/**
 * Async filesystem interface used by commands (preferred)
 */
export interface AsyncFileSystem {
  readFile(path: string, encoding: BufferEncoding): Promise<string>;
  readFile(path: string): Promise<Buffer>;
  writeFile(path: string, data: string | Buffer): Promise<void>;
  appendFile(path: string, data: string | Buffer): Promise<void>;
  readdir(path: string): Promise<string[]>;
  mkdir(path: string, options?: { recursive?: boolean }): Promise<string | void | undefined>;
  rmdir(path: string): Promise<void>;
  stat(path: string): Promise<{ isFile(): boolean; isDirectory(): boolean; size: number; mtime: Date }>;
  access(path: string): Promise<void>;
  unlink(path: string): Promise<void>;
  rename(oldPath: string, newPath: string): Promise<void>;
  copyFile(src: string, dest: string): Promise<void>;
  realpath(path: string): Promise<string>;
}

/**
 * Minimal filesystem interface used by the shell (sync for compatibility)
 */
export interface FileSystemInterface {
  readFileSync(path: string, options: BufferEncoding): string;
  readFileSync(path: string, options?: { flag?: string } | null): Buffer;
  writeFileSync(path: string, data: string | Buffer): void;
  appendFileSync(path: string, data: string | Buffer): void;
  readdirSync(path: string): string[];
  mkdirSync(path: string, options?: { recursive?: boolean }): void;
  rmdirSync(path: string): void;
  statSync(path: string): { isFile(): boolean; isDirectory(): boolean; size: number; mtime: Date };
  existsSync(path: string): boolean;
  unlinkSync(path: string): void;
  renameSync(oldPath: string, newPath: string): void;
  copyFileSync(src: string, dest: string): void;
  realpathSync(path: string): string | Buffer;
  /** Async filesystem methods (preferred) */
  promises: AsyncFileSystem;
}

// Initialization state
let initPromise: Promise<void> | null = null;
let initialized = false;

/**
 * Initialize the filesystem with IndexedDB backend
 * Call this before using synchronous fs methods
 */
export async function initFileSystem(): Promise<void> {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      await configureSingle({ backend: IndexedDB });
      
      // Ensure basic directory structure exists
      for (const dir of ['/home', '/home/user', '/tmp', '/bin']) {
        try {
          await fs.promises.mkdir(dir, { recursive: true });
        } catch {
          // Directory may already exist
        }
      }
      
      initialized = true;
    } catch (error) {
      console.error('Failed to initialize IndexedDB filesystem:', error);
      throw error;
    }
  })();

  return initPromise;
}

/**
 * Check if filesystem is initialized
 */
export function isInitialized(): boolean {
  return initialized;
}

/**
 * Reset the filesystem (clear all files and recreate directory structure)
 */
export async function resetFileSystem(): Promise<void> {
  await initFileSystem();
  
  const removeRecursive = async (path: string): Promise<void> => {
    const entries = await fs.promises.readdir(path);
    for (const entry of entries) {
      const fullPath = path === '/' ? '/' + entry : path + '/' + entry;
      const stats = await fs.promises.stat(fullPath);
      if (stats.isDirectory()) {
        await removeRecursive(fullPath);
        await fs.promises.rmdir(fullPath);
      } else {
        await fs.promises.unlink(fullPath);
      }
    }
  };

  try {
    await removeRecursive('/');
  } catch {
    // Ignore errors during reset
  }

  // Recreate directory structure
  for (const dir of ['/home', '/home/user', '/tmp', '/bin']) {
    await fs.promises.mkdir(dir, { recursive: true });
  }
}
