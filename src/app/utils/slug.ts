/**
 * Turns a name into a URL-friendly slug, e.g. "Cox's Bazar" -> "cox-s-bazar".
 * Non-Latin letters (such as Bengali) are kept as-is.
 */
export const toSlug = (name: string): string =>
  name
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-") // any run of non letters/digits -> "-"
    .replace(/^-|-$/g, ""); // trim leading/trailing "-"
