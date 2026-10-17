export interface PersonWithPortrait {
  id: string;
  name: string;
  image?: string | null;
}

/**
 * Shared portrait resolver function.
 * Reads the explicit image path for a person.
 * Returns the trimmed image path if non-empty, or null if unmapped/missing,
 * triggering the 2-letter initials fallback avatar.
 * NEVER returns another person's portrait image.
 */
export function getPersonPortrait(person: PersonWithPortrait): string | null {
  if (!person.image || person.image.trim() === "") {
    return null;
  }
  return person.image.trim();
}

/**
 * Development utility to audit duplicate portrait assignments across a group of people.
 * Logs a console warning if two different people are assigned the exact same portrait file.
 */
export function auditDuplicatePortraits(
  people: PersonWithPortrait[],
  contextName = "People Group",
): { duplicates: Array<{ path: string; members: string[] }> } {
  const pathMap = new Map<string, string[]>();

  for (const p of people) {
    const portrait = getPersonPortrait(p);
    if (portrait) {
      const existing = pathMap.get(portrait) ?? [];
      existing.push(p.name);
      pathMap.set(portrait, existing);
    }
  }

  const duplicates: Array<{ path: string; members: string[] }> = [];
  for (const [path, members] of pathMap.entries()) {
    if (members.length > 1) {
      duplicates.push({ path, members });
      if (typeof console !== "undefined" && console.warn) {
        console.warn(
          `[Portrait Audit Warning] Duplicate portrait assignment in ${contextName}: ${members.join(
            " and ",
          )} are both assigned "${path}"`,
        );
      }
    }
  }

  return { duplicates };
}
