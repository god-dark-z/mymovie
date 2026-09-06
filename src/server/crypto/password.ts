import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';

const scrypt = promisify(scryptCallback) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

/**
 * Password hashing with scrypt from Node's own crypto module.
 *
 * scrypt is one of the memory-hard functions OWASP accepts for password storage
 * alongside Argon2id and bcrypt, and it is the only one available without a
 * native addon — which matters here because the same code has to run on a
 * Netlify Function without a compile step that could fail at deploy time.
 *
 * The work factors are written into the stored string, so raising them later
 * does not invalidate anybody's password: `verifyPassword` reports when a hash
 * used weaker settings and the login route silently re-hashes.
 *
 * N=2^16, r=8, p=2 is one of the parameter sets OWASP lists as equivalent to its
 * N=2^17, r=8, p=1 minimum. It was chosen over the latter because it needs 64
 * MiB rather than 128 MiB per attempt, which doubles how many logins a
 * 1 GB serverless container can hash at once for the same cost per guess.
 */
const PARAMS = { N: 1 << 16, r: 8, p: 2 } as const;
const KEY_LENGTH = 32;
const SALT_LENGTH = 16;
/** Node refuses when 128*N*r approaches `maxmem`, so leave headroom. */
const MAX_MEM = 96 * 1024 * 1024;

const b64 = (buffer: Buffer): string => buffer.toString('base64url');

export interface PasswordHashParts {
  N: number;
  r: number;
  p: number;
  salt: Buffer;
  hash: Buffer;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const derived = await scrypt(password, salt, KEY_LENGTH, { ...PARAMS, maxmem: MAX_MEM });
  return `scrypt$N=${PARAMS.N},r=${PARAMS.r},p=${PARAMS.p}$${b64(salt)}$${b64(derived)}`;
}

function parse(stored: string): PasswordHashParts | null {
  const [scheme, params, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !params || !salt || !hash) return null;

  const numbers = new Map<string, number>();
  for (const pair of params.split(',')) {
    const [key, value] = pair.split('=');
    const parsed = Number.parseInt(value ?? '', 10);
    if (!key || !Number.isFinite(parsed) || parsed <= 0) return null;
    numbers.set(key, parsed);
  }

  const N = numbers.get('N');
  const r = numbers.get('r');
  const p = numbers.get('p');
  if (!N || !r || !p) return null;
  // Refuse absurd stored parameters rather than letting a corrupted record
  // allocate gigabytes inside a request.
  if (128 * N * r * p > MAX_MEM * 4) return null;

  return { N, r, p, salt: Buffer.from(salt, 'base64url'), hash: Buffer.from(hash, 'base64url') };
}

export interface PasswordVerification {
  valid: boolean;
  /** True when the stored hash used weaker parameters than we now use. */
  needsRehash: boolean;
}

export async function verifyPassword(password: string, stored: string): Promise<PasswordVerification> {
  const parts = parse(stored);
  if (!parts) return { valid: false, needsRehash: false };

  const derived = await scrypt(password, parts.salt, parts.hash.length, {
    N: parts.N,
    r: parts.r,
    p: parts.p,
    maxmem: Math.max(MAX_MEM, 128 * parts.N * parts.r * parts.p + (1 << 20)),
  });

  const valid = derived.length === parts.hash.length && timingSafeEqual(derived, parts.hash);
  const needsRehash = parts.N < PARAMS.N || parts.r < PARAMS.r || parts.p < PARAMS.p;
  return { valid, needsRehash };
}
