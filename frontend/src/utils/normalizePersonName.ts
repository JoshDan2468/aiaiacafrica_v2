/**
 * AIAIAC Person Name Normalizer
 * Normalizes display names and image filenames into a stable comparable slug.
 *
 * Rules:
 * 1. Remove file extension (.webp, .jpg, .jpeg, .png, .avif)
 * 2. Trim whitespace and convert to lowercase
 * 3. Normalize apostrophes (’ -> ') and quotation marks
 * 4. Strip professional titles and prefixes (Dr, Engr, Engineer, Prof, Professor, Mr, Mrs, Ms, FNSE, FNIPR, Arc, Surv, Chief, Elder, etc.)
 * 5. Strip bracketed title annotations like (Dr.), (Engr.), (Dr)
 * 6. Replace punctuation/special characters with spaces
 * 7. Convert space-separated tokens into a stable hyphenated slug
 */
export function normalizePersonName(name: string): string {
  if (!name) return "";

  // 1. Remove file extensions
  let str = name.replace(/\.(webp|jpg|jpeg|png|avif)$/i, "");

  // 2. Normalize apostrophes and quotes
  str = str.replace(/[’'`]/g, "'");

  // 3. Remove role suffixes like '- Conference Director'
  str = str.replace(/-\s*(conference director|director|chair|member).*/gi, " ");

  // 4. Split camelCase / PascalCase tokens (e.g. IkennaIkonta -> Ikenna Ikonta)
  str = str.replace(/([a-z])([A-Z])/g, "$1 $2");

  // 5. Remove professional titles and prefixes (case-insensitive word boundary match)
  const titleRegex =
    /\b(dr|engr|engineer|egnr|prof|professor|mr|mrs|ms|fnse|fnipr|arc|surv|chief|elder|high chief)\b/gi;
  str = str.replace(titleRegex, " ");

  // 6. Remove bracketed text and remaining non-alphanumeric characters
  str = str.replace(/[()]/g, " ");
  str = str.replace(/[^a-zA-Z0-9]/g, " ");

  // 7. Tokenize, filter, and join with single hyphens
  const tokens = str
    .toLowerCase()
    .split(/\s+/)
    .filter((token) => token.length > 0);

  return tokens.join("-");
}
