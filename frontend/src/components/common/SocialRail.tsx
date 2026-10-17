import { Facebook, Instagram, Linkedin, Music2, Youtube } from "lucide-react";
import { activeSocialLinks } from "@/data/socialLinks";

function renderSocialIcon(platform: string) {
  switch (platform.toLowerCase()) {
    case "linkedin":
      return <Linkedin className="size-4" aria-hidden="true" />;
    case "instagram":
      return <Instagram className="size-4" aria-hidden="true" />;
    case "facebook":
      return <Facebook className="size-4" aria-hidden="true" />;
    case "youtube":
      return <Youtube className="size-4" aria-hidden="true" />;
    case "tiktok":
      return <Music2 className="size-4" aria-hidden="true" />;
    case "x":
    case "twitter":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className="size-3.5 fill-current">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      );
    default:
      return null;
  }
}

export function SocialRail() {
  if (activeSocialLinks.length === 0) {
    return null;
  }

  return (
    <aside
      aria-label="Social media channels"
      className="fixed left-3.5 top-1/2 z-40 hidden -translate-y-1/2 flex-col items-center gap-2 rounded-full border border-[#214A36]/80 bg-[#071C13]/90 p-1.5 shadow-2xl backdrop-blur-md md:flex lg:left-5"
    >
      <span className="sr-only">Connect with AIAIAC Africa on social media</span>
      <ul className="flex flex-col items-center gap-1.5">
        {activeSocialLinks.map((link) => (
          <li key={link.platform}>
            <a
              href={link.url}
              target="_blank"
              rel="noreferrer noopener"
              aria-label={link.label}
              title={link.platform}
              className="group relative flex size-8.5 items-center justify-center rounded-full bg-[#0D2C20] text-[#F6F4EC] transition-all duration-200 hover:scale-110 hover:bg-[#CFEA3B] hover:text-[#071C13] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#CFEA3B]"
            >
              {renderSocialIcon(link.platform)}
              <span className="pointer-events-none absolute left-full ml-3 hidden whitespace-nowrap rounded-md bg-[#071C13] px-2 py-1 text-[0.7rem] font-medium tracking-wide text-[#F6F4EC] shadow-md border border-[#214A36] group-hover:block">
                {link.platform}
              </span>
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
}
