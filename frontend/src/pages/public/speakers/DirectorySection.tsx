import { useState, useMemo } from "react";
import { CircularPersonProfile } from "@/components/common/CircularPersonProfile";
import { advisoryBoardMembers } from "@/data/advisoryBoard";
import { technicalCommittees } from "@/data/committee";
import { organisingCommitteeMembers } from "@/data/organisingCommittee";
import { featuredSpeakers } from "@/data/speakers";
import type { RosterPerson } from "@/data/speakersRoster";
import { cn } from "@/lib/utils";

export type DirectoryCategory =
  | "Asset Integrity"
  | "Artificial Intelligence"
  | "Automation & Cybersecurity"
  | "Advisory Board"
  | "Organising Committee";

const DIRECTORY_CATEGORIES: DirectoryCategory[] = [
  "Asset Integrity",
  "Artificial Intelligence",
  "Automation & Cybersecurity",
  "Advisory Board",
  "Organising Committee",
];

interface DirectorySectionProps {
  searchQuery?: string;
  onSearchChange?: (query: string) => void;
  onSelectSpeaker?: (speaker: RosterPerson) => void;
}

export function DirectorySection({
  searchQuery = "",
  onSearchChange,
  onSelectSpeaker,
}: DirectorySectionProps) {
  const [activeCategory, setActiveCategory] = useState<DirectoryCategory>("Asset Integrity");

  // Normalized datasets per category (pure deduplicated lists)
  const categoryData = useMemo(() => {
    const assetIntegrityTc = technicalCommittees.find((t) => t.slug === "asset-integrity");
    const aiTc = technicalCommittees.find((t) => t.slug === "artificial-intelligence");
    const autoTc = technicalCommittees.find((t) => t.slug === "automation-cybersecurity");

    const assetIntegrity: RosterPerson[] = (assetIntegrityTc?.members || []).map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      organisation: m.organisation,
      organisationKey: m.organisationKey,
      countryCode: m.countryCode,
      image: m.image,
      track: "asset-integrity",
      categories: ["Asset Integrity"],
      bio: "Technical specialist on the AIAIAC Asset Integrity Committee reviewing inspection standards, asset lifecycle methodologies, and integrity engineering practices.",
    }));

    const artificialIntelligence: RosterPerson[] = (aiTc?.members || []).map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      organisation: m.organisation,
      organisationKey: m.organisationKey,
      countryCode: m.countryCode,
      image: m.image,
      track: "artificial-intelligence",
      categories: ["Artificial Intelligence"],
      bio: "Technical leader on the AIAIAC AI Committee evaluating machine learning models, predictive intelligence, and algorithmic operations in energy systems.",
    }));

    const automationCybersecurity: RosterPerson[] = (autoTc?.members || []).map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      organisation: m.organisation,
      organisationKey: m.organisationKey,
      countryCode: m.countryCode,
      image: m.image,
      track: "automation-cybersecurity",
      categories: ["Automation & Cybersecurity"],
      bio: "Automation and OT cybersecurity authority on the AIAIAC Committee advancing industrial resilience, SCADA protection, and control systems security.",
    }));

    const advisoryBoard: RosterPerson[] = advisoryBoardMembers.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      organisation: m.organisation,
      organisationKey: m.organisationKey,
      countryCode: m.countryCode,
      image: m.image,
      categories: ["Advisory Board"],
      bio: "Advisory Board Member providing high-level governance, strategic alignment, and regional industry engagement for AIAIAC Africa 2027.",
    }));

    const organisingCommittee: RosterPerson[] = organisingCommitteeMembers.map((m) => ({
      id: m.id,
      name: m.name,
      role: m.role,
      organisation: m.organisation,
      organisationKey: m.organisationKey,
      countryCode: m.countryCode,
      image: m.image,
      categories: ["Organising Committee"],
      bio: "Organising Committee leader managing conference logistics, corporate partnerships, and operational execution for AIAIAC Africa 2027.",
    }));

    return {
      "Asset Integrity": assetIntegrity,
      "Artificial Intelligence": artificialIntelligence,
      "Automation & Cybersecurity": automationCybersecurity,
      "Advisory Board": advisoryBoard,
      "Organising Committee": organisingCommittee,
    };
  }, []);

  // Combined pool for global search across all current conference people (no duplicates)
  const allCurrentPeople = useMemo(() => {
    const map = new Map<string, RosterPerson>();

    // 1. Featured Speakers
    featuredSpeakers.forEach((s) => {
      map.set(s.id, {
        id: s.id,
        name: s.name,
        role: s.role,
        organisation: s.organisation,
        organisationKey: s.organisationKey,
        countryCode: s.countryCode,
        image: s.image,
        track: s.track,
        categories: ["Featured Speakers"],
        bio: "Featured speaker presenting at AIAIAC Africa 2027.",
      });
    });

    // 2. Categories
    Object.values(categoryData).forEach((list) => {
      list.forEach((p) => {
        if (!map.has(p.id)) {
          map.set(p.id, p);
        }
      });
    });

    return Array.from(map.values());
  }, [categoryData]);

  // Live search filtering across all current people
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return allCurrentPeople.filter((p) => {
      const matchName = p.name.toLowerCase().includes(q);
      const matchOrg = p.organisation.toLowerCase().includes(q);
      const matchRole = p.role.toLowerCase().includes(q);
      const matchKey = p.organisationKey?.toLowerCase().includes(q) ?? false;
      return matchName || matchOrg || matchRole || matchKey;
    });
  }, [searchQuery, allCurrentPeople]);

  const isSearching = searchQuery.trim().length > 0;
  const currentList = isSearching ? searchResults : categoryData[activeCategory];

  return (
    <section id="directory" className="bg-[#E8EEE8] py-20 text-[#102C20] sm:py-24 lg:py-28">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
        {/* Section Header: Explore Speakers (No micro-label, Section 14) */}
        <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h2 className="font-display text-[32px] font-extrabold uppercase tracking-tight text-[#102C20] sm:text-[38px] lg:text-[44px]">
              {isSearching ? `Search Results (${searchResults.length})` : "Explore Speakers"}
            </h2>
            <p className="mt-3 text-base leading-[1.65] text-[#3E5246] sm:text-[17px]">
              {isSearching
                ? `Showing profiles matching "${searchQuery}". Clear search to return to category browsing.`
                : "Browse technical committee authorities, advisory leaders, and organising chairs shaping the 2027 conference."}
            </p>
          </div>

          {/* Directory Search & Filter Input */}
          <div className="w-full max-w-[340px] shrink-0">
            <div className="relative flex h-[46px] w-full items-center rounded-[12px] border border-[#CBD5C8] bg-white px-3.5 shadow-xs transition-colors focus-within:border-[#214A36] focus-within:ring-2 focus-within:ring-[#214A36]/15">
              <svg
                className="size-4 shrink-0 text-[#214A36]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => onSearchChange?.(e.target.value)}
                placeholder="Filter directory..."
                aria-label="Filter directory by name or organisation"
                className="ml-2.5 w-full bg-transparent text-sm font-medium text-[#102C20] placeholder-[#6B7D73] focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => onSearchChange?.("")}
                  className="ml-1 rounded-full p-1 text-[#6B7D73] hover:bg-[#F5F2E9] hover:text-[#102C20]"
                  aria-label="Clear filter"
                >
                  <svg className="size-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Category Navigation Bar (Section 15: Replaces content, does not append) */}
        {!isSearching && (
          <div className="mt-10 flex flex-wrap gap-2.5 sm:gap-3">
            {DIRECTORY_CATEGORIES.map((cat) => {
              const count = categoryData[cat]?.length || 0;
              const isActive = activeCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={cn(
                    "flex items-center gap-2 rounded-[12px] px-4 py-2.5 text-sm font-semibold transition-all duration-200 sm:px-5 sm:py-3 sm:text-[15px]",
                    isActive
                      ? "bg-[#102C20] text-[#F7F5EF] shadow-sm"
                      : "border border-[#214A36]/20 bg-white/70 text-[#214A36] hover:bg-white hover:text-[#102C20]",
                  )}
                >
                  <span>{cat}</span>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-xs font-bold",
                      isActive ? "bg-[#CADB7E] text-[#102C20]" : "bg-[#214A36]/10 text-[#214A36]",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Dynamic Display Area (Section 16: Automatically scales page height to selected category) */}
        {currentList.length === 0 ? (
          <div className="mt-16 flex flex-col items-center justify-center rounded-[16px] border border-[#CBD5C8] bg-white/60 p-12 text-center">
            <p className="text-lg font-bold text-[#102C20]">No profiles match your search</p>
            <p className="mt-2 text-sm text-[#4A5850]">
              Try searching for a different name, organisation, or committee discipline.
            </p>
          </div>
        ) : (
          <ul className="mt-14 grid grid-cols-2 gap-x-8 gap-y-14 sm:grid-cols-3 sm:gap-x-10 sm:gap-y-16 lg:grid-cols-4 lg:gap-x-12 lg:gap-y-20">
            {currentList.map((person) => (
              <li key={person.id} className="flex justify-center opacity-100">
                <CircularPersonProfile
                  name={person.name}
                  role={person.role}
                  organisation={person.organisation}
                  organisationKey={person.organisationKey}
                  countryCode={person.countryCode}
                  image={person.image}
                  tone="light"
                  size="directory"
                  onClick={() => onSelectSpeaker?.(person)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
