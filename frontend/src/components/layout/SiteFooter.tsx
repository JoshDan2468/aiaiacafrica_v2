import { BrochureDownload } from "@/components/common/BrochureDownload";
import { Link } from "react-router-dom";
import { Facebook, Instagram, Linkedin, Mail, MapPin, Music2, Phone, Youtube } from "lucide-react";
import { conference } from "@/data/conference";

const socialIcons = {
  LinkedIn: Linkedin,
  Instagram,
  Facebook,
  YouTube: Youtube,
  TikTok: Music2,
} as const;

const socialButtonClasses =
  "inline-flex size-9 items-center justify-center rounded-full bg-white/10 text-white transition-all duration-300 hover:bg-lime hover:text-mineral focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime";

const quickLinks = [
  { label: "Home", to: "/" },
  { label: "About", to: "/about" },
  { label: "Conferences", to: "/conferences" },
  { label: "Speakers", to: "/speakers" },
  { label: "Exhibition", to: "/exhibition" },
  { label: "Media", to: "/media" },
  { label: "Contact", to: "/contact" },
];

const participateLinks = [
  { label: "Delegate Registration", to: "/registration/delegate" },
  { label: "Sponsorship Enquiry", to: "/registration/sponsor" },
  { label: "Book a Stand / Exhibitor", to: "/exhibition" },
  { label: "Visitor Application", to: "/registration" },
  { label: "Abstract Submission", to: "/registration/abstract" },
];

const offices = [
  {
    city: "Lagos, Nigeria",
    address: "31 Ademola Street, Ikoyi, Lagos State, Nigeria",
  },
  {
    city: "Abuja, Nigeria",
    address: "Plot 3031 Mariam Ikejiani Clark Crescent, Asokoro, Abuja, FCT, Nigeria",
  },
  {
    city: "Richmond, Texas, USA",
    address: "77406, Richmond, Texas, USA",
  },
];

export function SiteFooter() {
  return (
    <footer className="on-navy relative overflow-hidden border-t border-white/10 bg-[#031008] pt-16 text-white sm:pt-20">
      {/* 3-7% Opacity Watermark Background Emblem */}
      <div
        className="pointer-events-none absolute -right-20 -top-20 z-0 select-none opacity-[0.04]"
        aria-hidden
      >
        <img
          src="/brand/aiaiac_logo.png"
          alt=""
          width="600"
          height="600"
          className="h-[36rem] w-[36rem] object-contain filter invert"
        />
      </div>

      <div className="shell relative z-10">
        {/* Top Footer Grid */}
        <div className="grid gap-10 border-b border-white/12 pb-14 sm:grid-cols-2 lg:grid-cols-5 lg:gap-8">
          {/* Column 1: Brand & Positioning */}
          <div className="lg:col-span-2">
            <Link to="/" className="inline-block">
              <img
                src="/brand/aiaiac_logo.png"
                alt="AIAIAC Africa"
                width="140"
                height="140"
                loading="lazy"
                className="h-14 w-auto object-contain mix-blend-screen"
              />
            </Link>
            <h3 className="mt-4 font-display text-lg font-extrabold tracking-tight text-white">
              AIAIAC Africa 2027
            </h3>
            <p className="mt-1 font-mono text-xs uppercase tracking-wider text-lime">
              Conference &amp; Innovation Showcase
            </p>
            <p className="mt-3 max-w-sm text-xs leading-relaxed text-white/70">
              Guarding Infrastructure, Powering Innovation, Securing Tomorrow. Connecting asset
              integrity, artificial intelligence, automation, and cybersecurity across West Africa.
            </p>

            <nav className="mt-6" aria-label="Social media channels">
              <ul className="flex flex-wrap gap-2">
                {conference.socialMedia.map((channel) => {
                  const Icon =
                    channel.platform === "X"
                      ? null
                      : socialIcons[channel.platform as keyof typeof socialIcons];

                  return (
                    <li key={channel.platform}>
                      <a
                        href={channel.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Visit AIAIAC Africa on ${channel.platform}`}
                        title={channel.platform}
                        className={socialButtonClasses}
                      >
                        {Icon ? (
                          <Icon className="size-4" aria-hidden="true" />
                        ) : (
                          <span
                            className="text-[0.85rem] font-bold leading-none"
                            aria-hidden="true"
                          >
                            X
                          </span>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </nav>
          </div>

          {/* Column 2: Quick Links */}
          <div>
            <h4 className="font-display text-sm font-bold uppercase tracking-wider text-lime">
              Navigation
            </h4>
            <ul className="mt-4 space-y-2.5">
              {quickLinks.map((item) => (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    className="inline-flex text-xs text-white/75 transition-colors hover:text-lime"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Column 3: Participate */}
          <div>
            <h4 className="font-display text-sm font-bold uppercase tracking-wider text-lime">
              Participate
            </h4>
            <ul className="mt-4 space-y-2.5">
              {participateLinks.map((item) => (
                <li key={item.label}>
                  <Link
                    to={item.to}
                    className="inline-flex text-xs text-white/75 transition-colors hover:text-lime"
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
              <li>
                <BrochureDownload
                  className="inline-flex min-h-11 items-center text-xs font-semibold text-white/80 transition-colors hover:text-lime focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime"
                  unavailableClassName="max-w-48 text-xs leading-5 text-white/65"
                />
              </li>
            </ul>
          </div>

          {/* Column 4: Event Date & Venue */}
          <div>
            <h4 className="font-display text-sm font-bold uppercase tracking-wider text-lime">
              Event Details
            </h4>
            <div className="mt-4 space-y-3">
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-widest text-white/50">
                  Dates
                </p>
                <p className="mt-0.5 text-sm font-bold text-white">{conference.dates}</p>
              </div>
              <div>
                <p className="text-[0.65rem] font-bold uppercase tracking-widest text-white/50">
                  Location
                </p>
                <p className="mt-0.5 text-sm font-bold text-white">{conference.venue}</p>
              </div>
            </div>
          </div>
        </div>

        {/* 3 Office Locations Grid */}
        <div className="border-b border-white/12 py-10">
          <h4 className="text-xs font-bold uppercase tracking-widest text-lime">
            Global Secretariat &amp; Office Locations
          </h4>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {offices.map((office) => (
              <div
                key={office.city}
                className="rounded-xl border border-white/10 bg-white/5 p-4 text-xs"
              >
                <div className="flex items-center gap-2 font-bold text-white">
                  <MapPin className="size-4 shrink-0 text-lime" />
                  <span>{office.city}</span>
                </div>
                <p className="mt-2 leading-relaxed text-white/70">{office.address}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Lower Organiser & Contact Section (3 Horizontal Levels) */}
        <div className="py-10">
          {/* LEVEL 1: Centered Organiser Identity */}
          <div className="flex flex-col items-center text-center">
            <img
              src="/brand/G-expert-logo-invert.png"
              alt="GExperts Global Events"
              width="140"
              height="50"
              loading="lazy"
              className="h-11 w-auto object-contain"
            />
            <h4 className="mt-3 font-display text-base font-extrabold tracking-tight text-white">
              GExperts Global Events
            </h4>
            <p className="mt-0.5 font-sans text-xs font-semibold uppercase tracking-wider text-lime">
              Official Event Organiser
            </p>
          </div>

          {/* FIRST HORIZONTAL SEPARATOR */}
          <div className="my-7 border-t border-dashed border-white/12 w-full" aria-hidden />

          {/* LEVEL 2: Contact Row (LEFT: Address | CENTER: Phone & Email | RIGHT: Social Icons) */}
          <div className="grid grid-cols-1 items-center gap-6 sm:grid-cols-3">
            {/* LEFT SIDE: Primary Lagos Office Address */}
            <div className="text-center sm:text-left">
              <p className="text-xs font-semibold leading-relaxed text-white/90">
                31 Ademola Street off Awolowo Road,
              </p>
              <p className="text-xs font-medium text-white/70">Ikoyi, Lagos</p>
            </div>

            {/* CENTER: Phone & Email (Centered on Page) */}
            <div className="flex flex-col items-center text-center space-y-1">
              <a
                href={`tel:${conference.contact.phone.replace(/\s+/g, "")}`}
                className="inline-flex items-center gap-2 font-display text-sm font-bold text-white transition-colors hover:text-lime"
              >
                <Phone className="size-4 text-lime shrink-0" />
                <span>{conference.contact.phone}</span>
              </a>
              <a
                href={`mailto:${conference.contact.email}`}
                className="inline-flex items-center gap-1.5 text-xs text-white/75 transition-colors hover:text-lime"
              >
                <Mail className="size-3.5 text-lime/80 shrink-0" />
                <span>{conference.contact.email}</span>
              </a>
            </div>

            {/* RIGHT SIDE: Outlined Social Media Icons */}
            <div className="flex justify-center sm:justify-end">
              <ul
                className="flex items-center gap-2.5"
                aria-label="Lower footer social media links"
              >
                {conference.socialMedia.map((channel) => {
                  const Icon =
                    channel.platform === "X"
                      ? null
                      : socialIcons[channel.platform as keyof typeof socialIcons];

                  return (
                    <li key={`lower-${channel.platform}`}>
                      <a
                        href={channel.url}
                        target="_blank"
                        rel="noreferrer"
                        aria-label={`Visit AIAIAC Africa on ${channel.platform}`}
                        title={channel.platform}
                        className="inline-flex size-8 items-center justify-center rounded-lg border border-white/15 bg-white/5 text-white/80 transition-all duration-300 hover:border-lime hover:bg-lime hover:text-mineral"
                      >
                        {Icon ? (
                          <Icon className="size-3.5" aria-hidden="true" />
                        ) : (
                          <span
                            className="text-[0.75rem] font-bold leading-none"
                            aria-hidden="true"
                          >
                            X
                          </span>
                        )}
                      </a>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>

          {/* SECOND HORIZONTAL SEPARATOR */}
          <div className="my-7 border-t border-dashed border-white/12 w-full" aria-hidden />

          {/* LEVEL 3: Short Centered Organiser Description */}
          <div className="mx-auto max-w-4xl text-center">
            <p className="text-xs leading-relaxed text-white/70 sm:text-sm">
              GExperts Global Events is the official event organiser of AIAIAC Africa, bringing
              together industry leaders, technical professionals and technology partners across
              asset integrity, artificial intelligence, automation and cybersecurity.
            </p>
          </div>
        </div>

        {/* Bottom Legal Bar */}
        <div className="flex flex-col items-center justify-between gap-4 py-6 font-mono text-[0.68rem] text-white/50 sm:flex-row">
          <p>© 2027 AIAIAC Africa. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link to="/about" className="transition-colors hover:text-white">
              Terms &amp; Conditions
            </Link>
            <Link to="/about" className="transition-colors hover:text-white">
              Privacy Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
