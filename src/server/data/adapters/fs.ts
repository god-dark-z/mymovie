import { mkdir, readFile, readdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, posix, sep } from 'node:path';
import { randomBytes } from 'node:crypto';
import { assertSafeKey, StorageUnavailableError, type KeyValueStore, type StoredBytes } from '@/server/data/kv';

/**
 * Filesystem store for local development.
 *
 * One envelope format covers both JSON records and binary blobs, which keeps the
 * adapter small enough to be obviously correct — avatars are re-encoded to a few
 * hundred kilobytes before they get here, so base64 in a JSON file is not a
 * problem worth extra code to avoid.
 *
 * Writes go to a temporary name and are renamed into place, so an interrupted
 * `next dev` cannot leave a half-written account record behind.
 *
 * This driver is never selected on Netlify: a function's filesystem is read-only
 * apart from a per-container `/tmp`, so it would look like it worked and then
 * lose every account.
 */
interface Envelope {
  kind: 'json' | 'bytes';
  contentType?: string;
  value?: unknown;
  base64?: string;
}

export function createFsStore(dataDir: string): KeyValueStore {
  const root = join(dataDir, 'kv');
  const pathFor = (key: string): string => join(root, `${key.split('/').join(sep)}.json`);

  const readEnvelope = async (key: string): Promise<Envelope | null> => {
    assertSafeKey(key);
    try {
      return JSON.parse(await readFile(pathFor(key), 'utf8')) as Envelope;
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'ENOENT') return null;
      if (code === 'EACCES' || code === 'EPERM' || code === 'EROFS') {
        throw new StorageUnavailableError('The local account store is not writable.');
      }
      return null;
    }
  };

  const write = async (key: string, envelope: Envelope): Promise<void> => {
    assertSafeKey(key);
    const target = pathFor(key);
    await mkdir(dirname(target), { recursive: true });
    const temp = `${target}.${randomBytes(6).toString('hex')}.tmp`;
    try {
      await writeFile(temp, JSON.stringify(envelope), 'utf8');
      await rename(temp, target);
    } catch (error) {
      await rm(temp, { force: true }).catch(() => undefined);
      const code = (error as { code?: string }).code;
      if (code === 'EACCES' || code === 'EPERM' || code === 'EROFS' || code === 'ENOSPC') {
        throw new StorageUnavailableError('The local account store is not writable.');
      }
      throw error;
    }
  };

  const walk = async (dir: string, prefix: string, out: string[]): Promise<void> => {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await walk(join(dir, entry.name), posix.join(prefix, entry.name), out);
      } else if (entry.name.endsWith('.json') && !entry.name.endsWith('.tmp')) {
        out.push(posix.join(prefix, entry.name.slice(0, -'.json'.length)));
      }
    }
  };

  return {
    driver: 'fs',

    async getJson<T>(key: string): Promise<T | null> {
      const envelope = await readEnvelope(key);
      return envelope?.kind === 'json' ? ((envelope.value ?? null) as T | null) : null;
    },

    async setJson(key: string, value: unknown): Promise<void> {
      await write(key, { kind: 'json', value });
    },

    async getBytes(key: string): Promise<StoredBytes | null> {
      const envelope = await readEnvelope(key);
      if (envelope?.kind !== 'bytes' || !envelope.base64) return null;
      return {
        bytes: Buffer.from(envelope.base64, 'base64'),
        contentType: envelope.contentType ?? 'application/octet-stream',
      };
    },

    async setBytes(key: string, bytes: Buffer, contentType: string): Promise<void> {
      await write(key, { kind: 'bytes', contentType, base64: bytes.toString('base64') });
    },

    async delete(key: string): Promise<void> {
      assertSafeKey(key);
      await rm(pathFor(key), { force: true });
    },

    async list(prefix: string): Promise<string[]> {
      const clean = prefix.endsWith('/') ? prefix.slice(0, -1) : prefix;
      if (clean.length > 0) assertSafeKey(clean);
      const out: string[] = [];
      await walk(join(root, clean.split('/').join(sep)), clean, out);
      return out.sort();
    },
  };
}
