import heroEventImage from "@/data/AIAC_images/image1.jpg";

interface HeroSectionProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function HeroSection({ searchQuery, onSearchChange }: HeroSectionProps) {
  return (
    <header className="relative min-h-[440px] w-full overflow-hidden bg-[#F5F2E9] pb-16 pt-32 text-[#102C20] sm:pb-20 sm:pt-36 lg:min-h-[500px] lg:pb-24 lg:pt-40">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-8 lg:px-12">
        <div className="grid items-center gap-10 lg:grid-cols-12 lg:gap-14">
          {/* Left Column: Heading, Meta, Narrative & Search Bar (~60%) */}
          <div className="lg:col-span-7">
            <h1 className="font-display text-[44px] font-extrabold uppercase leading-[0.96] tracking-tight text-[#102C20] sm:text-[56px] lg:text-[68px]">
              Speakers
            </h1>
            <p className="mt-5 max-w-[620px] text-base leading-[1.68] text-[#3E5246] sm:text-[17px] lg:text-[18px]">
              Meet the industry leaders, technical specialists, and committee chairs contributing to
              AIAIAC Africa 2027.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1 text-[15px] font-semibold text-[#1B4332] sm:text-[16px]">
              <span>22–23 June 2027</span>
              <span className="text-[#1B4332]/40">•</span>
              <span>Lagos, Nigeria</span>
            </div>

            {/* Prominent Search Bar (Near the Top, Section 4) */}
            <div className="mt-8 max-w-[540px]">
              <div className="relative flex h-[52px] w-full items-center rounded-[14px] border border-[#CBD5C8] bg-white px-4 shadow-xs transition-colors focus-within:border-[#214A36] focus-within:ring-2 focus-within:ring-[#214A36]/15">
                <svg
                  className="size-5 shrink-0 text-[#214A36]"
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
                  onChange={(e) => onSearchChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      document.getElementById("directory")?.scrollIntoView({ behavior: "smooth" });
                    }
                  }}
                  placeholder="Search by name or organisation..."
                  aria-label="Search speakers by name or organisation"
                  className="ml-3 w-full bg-transparent text-sm font-medium text-[#102C20] placeholder-[#6B7D73] focus:outline-none sm:text-base"
                />
                {searchQuery && (
                  <div className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        document
                          .getElementById("directory")
                          ?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="hidden items-center rounded-md bg-[#214A36] px-2.5 py-1 text-xs font-semibold text-[#F7F5EF] hover:bg-[#102C20] sm:inline-flex"
                      aria-label="View search results in directory"
                    >
                      View results ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => onSearchChange("")}
                      className="rounded-full p-1 text-[#6B7D73] hover:bg-[#F5F2E9] hover:text-[#102C20]"
                      aria-label="Clear search query"
                    >
                      <svg className="size-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M6 18L18 6M6 6l12 12"
                        />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Substantial Real Event Image Crop (~40%, Section 3) */}
          <div className="hidden lg:col-span-5 lg:block">
            <div className="relative overflow-hidden rounded-[16px] bg-[#EBE6DC] shadow-xl">
              <img
                src={heroEventImage}
                alt="AIAIAC technical conference session in progress"
                width={720}
                height={480}
                loading="eager"
                decoding="async"
                className="h-[340px] w-full object-cover object-center"
              />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
