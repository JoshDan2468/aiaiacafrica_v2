import { Link } from "react-router-dom";
import { AnimatedSection } from "@/components/common/AnimatedSection";

interface MediaResource {
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  isDownload: boolean;
  downloadFilename?: string;
}

const resources: readonly MediaResource[] = [
  {
    title: "Official AIAIAC Logo Kit",
    description:
      "High-resolution vector emblem and dark/light logo files for press, media publishing, and accredited broadcast use.",
    actionLabel: "Download Logo Kit",
    href: "/brand/aiaiac-logo-light.png",
    isDownload: true,
    downloadFilename: "aiaiac-official-logo.png",
  },
  {
    title: "Conference Highlight Video",
    description:
      "Broadcast-quality MP4 video recording highlighting plenary addresses, exhibition demonstrations, and delegate interactions.",
    actionLabel: "Download Video File",
    href: "/assets/aiaiac-2027/videos/aiaiac-previous-conference.mp4",
    isDownload: true,
    downloadFilename: "aiaiac-highlights.mp4",
  },
  {
    title: "Media Accreditation & Press Access",
    description:
      "Accreditation guidelines and credential requests for accredited journalists, technical editors, and media correspondents.",
    actionLabel: "Apply for Accreditation",
    href: "/contact?type=media",
    isDownload: false,
  },
];

export function MediaResourcesSection() {
  return (
    <section className="bg-[#EAEFEA] py-20 text-[#102C20] sm:py-24 lg:py-28">
      <div className="shell">
        <AnimatedSection once className="max-w-3xl">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#102C20] sm:text-4xl lg:text-[44px]">
            Media Resources
          </h2>
          <p className="mt-4 text-[16.5px] leading-relaxed text-[#3F5347] sm:text-[17px]">
            Official downloadable materials and accreditation access for journalists, industry
            publications, and media partners.
          </p>
        </AnimatedSection>

        {/* Clean Structured Resource Layout - Light neutral surface, minimal radius, no heavy border/shadow */}
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((item) => (
            <div
              key={item.title}
              className="flex h-full flex-col justify-between rounded-[16px] border border-[#D5DDD5] bg-[#FFFFFF] p-7 sm:p-8"
            >
              <div>
                <h3 className="font-display text-[19px] font-bold tracking-tight text-[#102C20]">
                  {item.title}
                </h3>
                <p className="mt-3 text-[15px] leading-relaxed text-[#4A5D52]">
                  {item.description}
                </p>
              </div>

              <div className="mt-8 pt-2">
                {item.isDownload ? (
                  <a
                    href={item.href}
                    download={item.downloadFilename}
                    className="inline-flex h-[48px] w-full items-center justify-center rounded-[14px] bg-[#173D2D] px-5 text-[15px] font-semibold text-[#F7F5EF] transition-colors hover:bg-[#102C20] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2D]"
                  >
                    <span>{item.actionLabel}</span>
                  </a>
                ) : (
                  <Link
                    to={item.href}
                    className="inline-flex h-[48px] w-full items-center justify-center rounded-[14px] bg-[#173D2D] px-5 text-[15px] font-semibold text-[#F7F5EF] transition-colors hover:bg-[#102C20] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2D]"
                  >
                    <span>{item.actionLabel}</span>
                  </Link>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
