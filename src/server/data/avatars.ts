import { keys, kv } from '@/server/data/store';
import type { StoredBytes } from '@/server/data/kv';

/**
 * Avatar storage and, more importantly, avatar sanitising.
 *
 * An uploaded file is never stored as it arrived. The bytes are sniffed, decoded
 * by sharp, resized, and re-encoded to WebP with all metadata dropped. That means
 * a file that claims `image/png` but carries a polyglot payload, an SVG with a
 * script in it, or a JPEG with an EXIF block full of someone's GPS coordinates
 * cannot survive the round trip: whatever comes out is a freshly encoded raster
 * produced by our own encoder.
 */
export const AVATAR_MAX_BYTES = 5 * 1024 * 1024;
export const AVATAR_SIZE = 512;
export const AVATAR_CONTENT_TYPE = 'image/webp';

/** Accepted container formats, decided by signature rather than by the request. */
const SIGNATURES: ReadonlyArray<{ format: string; test: (b: Buffer) => boolean }> = [
  { format: 'jpeg', test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { format: 'png', test: (b) => b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) },
  {
    format: 'webp',
    test: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WEBP',
  },
  { format: 'gif', test: (b) => b.subarray(0, 3).toString('latin1') === 'GIF' },
  // HEIC/HEIF arrive from iPhone photo pickers; sharp only decodes them when
  // libvips was built with the codec, so a failure here is reported honestly
  // rather than pretending the format is unsupported.
  { format: 'heif', test: (b) => b.subarray(4, 8).toString('latin1') === 'ftyp' },
];

export class AvatarRejectedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AvatarRejectedError';
  }
}

function sniff(bytes: Buffer): string {
  if (bytes.length < 16) throw new AvatarRejectedError('That file is too small to be an image.');
  const match = SIGNATURES.find((candidate) => candidate.test(bytes));
  if (!match) throw new AvatarRejectedError('Use a JPEG, PNG, WebP, GIF or HEIC image.');
  return match.format;
}

/**
 * Decodes, squares and re-encodes an upload.
 *
 * `limitInputPixels` caps decompression work so a small file describing a
 * 60000×60000 canvas cannot exhaust the function's memory, and `animated: false`
 * keeps a multi-thousand-frame GIF from becoming a multi-second decode.
 */
export async function processAvatar(input: Buffer): Promise<Buffer> {
  if (input.length > AVATAR_MAX_BYTES) {
    throw new AvatarRejectedError('Images must be 5 MB or smaller.');
  }
  sniff(input);

  const { default: sharp } = await import('sharp');
  try {
    return await sharp(input, { limitInputPixels: 40_000_000, animated: false })
      .rotate()
      .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: 'cover', position: 'centre', withoutEnlargement: false })
      .webp({ quality: 82, effort: 4 })
      .toBuffer();
  } catch {
    // The reason is deliberately vague to the caller and never includes the
    // decoder's message, which can echo file contents.
    throw new AvatarRejectedError('That image could not be processed. Try a different file.');
  }
}

export const avatars = {
  async get(userId: string): Promise<StoredBytes | null> {
    return kv().getBytes(keys.avatar(userId));
  },

  async put(userId: string, bytes: Buffer): Promise<void> {
    await kv().setBytes(keys.avatar(userId), bytes, AVATAR_CONTENT_TYPE);
  },

  async delete(userId: string): Promise<void> {
    await kv().delete(keys.avatar(userId));
  },
};
