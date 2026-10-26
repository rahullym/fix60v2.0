const signatures: { mime: string; extension: string; matches: (bytes: Buffer) => boolean }[] = [
  { mime: 'image/jpeg', extension: 'jpg', matches: (b) => b[0] === 0xff && b[1] === 0xd8 },
  {
    mime: 'image/png',
    extension: 'png',
    matches: (b) => b.subarray(0, 4).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47])),
  },
  {
    mime: 'image/webp',
    extension: 'webp',
    matches: (b) =>
      b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP',
  },
  {
    mime: 'image/heic',
    extension: 'heic',
    matches: (b) =>
      b.subarray(4, 8).toString() === 'ftyp' && /hei|mif|heix/.test(b.subarray(8, 12).toString()),
  },
  { mime: 'image/gif', extension: 'gif', matches: (b) => b.subarray(0, 3).toString() === 'GIF' },
];

export interface DecodedImage {
  bytes: Buffer;
  mime: string;
  extension: string;
}

/** Decodes base64 or a data URI and sniffs the real image type. Returns null if not an image. */
export function decodeBase64Image(input: string): DecodedImage | null {
  const payload = input.startsWith('data:') ? input.slice(input.indexOf(',') + 1) : input;
  const bytes = Buffer.from(payload.replace(/\s/g, ''), 'base64');
  if (bytes.length < 12) {
    return null;
  }
  const signature = signatures.find((candidate) => candidate.matches(bytes));
  return signature ? { bytes, mime: signature.mime, extension: signature.extension } : null;
}
