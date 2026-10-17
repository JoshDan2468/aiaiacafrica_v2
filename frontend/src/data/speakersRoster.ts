import { advisoryBoardMembers } from "./advisoryBoard";
import { technicalCommittees, technicalChairman } from "./committee";
import { organisingCommitteeMembers } from "./organisingCommittee";
import { allSpeakers, keynotes, previousEditionSpeakers } from "./speakers";
import { getPersonImage } from "@/utils/personImageResolver";

export type SpeakerCategory =
  | "All"
  | "Keynote"
  | "Keynote Speaker"
  | "Featured"
  | "Featured Speakers"
  | "Advisory Board"
  | "Asset Integrity"
  | "Artificial Intelligence"
  | "Automation & Cybersecurity"
  | "Organising Committee"
  | "Previous Speakers";

export interface RosterPerson {
  id: string;
  name: string;
  role: string;
  organisation: string;
  organisationKey?: string | undefined;
  countryCode?: string | undefined;
  image?: string | undefined;
  categories: SpeakerCategory[];
  bio?: string | undefined;
  track?: string | undefined;
}

const rosterMap = new Map<string, RosterPerson>();

function addPerson(
  id: string,
  person: {
    name: string;
    role: string;
    organisation: string;
    organisationKey?: string | undefined;
    countryCode?: string | undefined;
    image?: string | undefined;
    track?: string | undefined;
    bio?: string | undefined;
  },
  category: SpeakerCategory,
) {
  const existing = rosterMap.get(id);
  if (existing) {
    if (!existing.categories.includes(category)) {
      existing.categories.push(category);
    }
    if (!existing.image && person.image) {
      existing.image = person.image;
    }
    if (!existing.organisationKey && person.organisationKey) {
      existing.organisationKey = person.organisationKey;
    }
    if (!existing.countryCode && person.countryCode) {
      existing.countryCode = person.countryCode;
    }
    if (!existing.track && person.track) {
      existing.track = person.track;
    }
    if (!existing.bio && person.bio) {
      existing.bio = person.bio;
    }
  } else {
    rosterMap.set(id, {
      id,
      name: person.name,
      role: person.role,
      organisation: person.organisation,
      organisationKey: person.organisationKey,
      countryCode: person.countryCode,
      image: person.image,
      track: person.track,
      bio: person.bio,
      categories: ["All", category],
    });
  }
}

// 1. Technical Chairman
addPerson(
  "technical-chairman",
  {
    name: technicalChairman.name,
    role: "Technical Committee Chairman & Commercial Manager",
    organisation: technicalChairman.organisation,
    organisationKey: technicalChairman.organisationKey,
    countryCode: "NG",
    image: technicalChairman.image,
    track: "asset-integrity",
  },
  "Asset Integrity",
);

// 2. Keynote Speaker (Dr. James Makinde Only)
keynotes.forEach((speaker) => {
  addPerson(
    speaker.id,
    {
      name: speaker.name,
      role: speaker.role,
      organisation: speaker.organisation,
      organisationKey: speaker.organisationKey,
      countryCode: speaker.countryCode,
      image: speaker.image,
      track: speaker.track,
      bio: `Distinguished keynote speaker contributing high-level strategic and operational perspectives to AIAIAC Africa 2027.`,
    },
    "Keynote",
  );
});

// 3. Featured & Directory Speakers
allSpeakers.forEach((speaker) => {
  let category: SpeakerCategory = "Featured";
  if (speaker.keynote) {
    category = "Keynote";
  } else if (speaker.track === "asset-integrity") {
    category = "Asset Integrity";
  } else if (speaker.track === "automation-cybersecurity") {
    category = "Automation & Cybersecurity";
  } else {
    category = "Featured Speakers";
  }

  addPerson(
    speaker.id,
    {
      name: speaker.name,
      role: speaker.role,
      organisation: speaker.organisation,
      organisationKey: speaker.organisationKey,
      countryCode: speaker.countryCode,
      image: speaker.image,
      track: speaker.track,
      bio: `Industry authority and technical speaker at AIAIAC Africa 2027 representing ${speaker.organisation}.`,
    },
    category,
  );
});

// 4. Technical Committees
technicalCommittees.forEach((tc) => {
  let category: SpeakerCategory = "Asset Integrity";
  if (tc.slug === "artificial-intelligence") {
    category = "Artificial Intelligence";
  } else if (tc.slug === "automation-cybersecurity") {
    category = "Automation & Cybersecurity";
  }

  tc.members.forEach((member) => {
    const resolvedImage =
      member.image ||
      getPersonImage({
        section: `technical-committees/${tc.slug}`,
        personName: member.name,
        personSlug: member.id,
      });

    addPerson(
      member.id,
      {
        name: member.name,
        role: member.role,
        organisation: member.organisation,
        organisationKey: member.organisationKey,
        countryCode: member.countryCode,
        image: resolvedImage,
        track: tc.slug,
        bio: `Member of the AIAIAC ${tc.name}, responsible for reviewing technical papers, panel sessions, and conference operational standards.`,
      },
      category,
    );
  });
});

// 5. Advisory Board
advisoryBoardMembers.forEach((member) => {
  addPerson(
    member.id,
    {
      name: member.name,
      role: member.role,
      organisation: member.organisation,
      organisationKey: member.organisationKey,
      countryCode: member.countryCode,
      image: member.image,
      bio: `Advisory Board Member providing high-level governance and strategic direction for AIAIAC Africa 2027.`,
    },
    "Advisory Board",
  );
});

// 6. Organising Committee
organisingCommitteeMembers.forEach((member) => {
  const resolvedImage =
    member.image ||
    getPersonImage({
      section: "organising-committee",
      personName: member.name,
      personSlug: member.id,
    });

  addPerson(
    member.id,
    {
      name: member.name,
      role: member.role,
      organisation: member.organisation,
      organisationKey: member.organisationKey,
      countryCode: member.countryCode,
      image: resolvedImage,
      bio: `Organising Committee leader driving conference delivery, stakeholder engagement, and operational execution for AIAIAC Africa 2027.`,
    },
    "Organising Committee",
  );
});

export const unifiedSpeakersRoster: readonly RosterPerson[] = Array.from(rosterMap.values());

/**
 * Preserved Historical Edition Speakers (25 speakers)
 * Kept separate from current-edition directory.
 */
export const previousSpeakersList: readonly RosterPerson[] = previousEditionSpeakers.map((s) => ({
  id: `prev-${s.id}`,
  name: s.name,
  role: s.role,
  organisation: s.organisation,
  organisationKey: s.organisationKey,
  countryCode: s.countryCode,
  image: s.image,
  track: s.track,
  categories: ["Previous Speakers"],
  bio: `Distinguished speaker who presented at a previous edition of the Asset Integrity, Artificial Intelligence, Automation & Cybersecurity conference.`,
}));
