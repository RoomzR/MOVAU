export function parseScanCode(raw: string | null | undefined): string | null {
  if (!raw) {
    return null;
  }
  const trimmed = raw.trim();
  const fromUrl = trimmed.match(/\/scan\/([a-f0-9]{16,32})/i);
  if (fromUrl) {
    return fromUrl[1].toLowerCase();
  }
  const hex = trimmed.match(/^[a-f0-9]{16,32}$/i);
  return hex ? hex[0].toLowerCase() : null;
}
