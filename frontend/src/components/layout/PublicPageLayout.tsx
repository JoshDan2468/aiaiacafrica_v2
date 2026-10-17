import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";
import { ConferenceAssistant } from "@/components/assistant/ConferenceAssistant";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { SocialRail } from "@/components/common/SocialRail";
import { SEO } from "@/components/common/SEO";

export interface PublicPageLayoutProps {
  children: ReactNode;
  title: string;
  description: string;
  canonical?: string;
  image?: string;
  type?: "website" | "article" | "profile";
  schema?: Record<string, unknown> | Array<Record<string, unknown>>;
  noindex?: boolean;
}

export function PublicPageLayout({
  children,
  title,
  description,
  canonical,
  image,
  type = "website",
  schema,
  noindex = false,
}: PublicPageLayoutProps) {
  const { pathname } = useLocation();
  const pageCanonical = canonical || pathname;

  return (
    <>
      <SEO
        title={title}
        description={description}
        canonical={pageCanonical}
        image={image}
        type={type}
        schema={schema}
        noindex={noindex}
      />
      <a
        href="#main-content"
        className="fixed left-4 top-4 z-70 flex min-h-11 -translate-y-24 items-center bg-emerald px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-mineral transition-transform focus:translate-y-0"
      >
        Skip to content
      </a>
      <SiteHeader />
      <SocialRail />
      <main id="main-content">{children}</main>
      <SiteFooter />
      <ConferenceAssistant />
    </>
  );
}
