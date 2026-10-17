export const ABSTRACT_MAX_WORDS = 500;

/** Words are non-empty runs separated by one or more Unicode whitespace characters. */
export function countAbstractWords(value: string): number {
  const normalized = value.trim();
  return normalized ? normalized.split(/\s+/u).length : 0;
}
