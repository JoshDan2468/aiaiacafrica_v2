import { useEffect } from "react";

export interface BreadcrumbItem {
  name: string;
  item: string;
}

export interface SEOProps {
  title?: string | undefined;
  description?: string | undefined;
  canonical?: string | undefined;
  image?: string | undefined;
  type?: "website" | "article" | "profile" | undefined;
  schema?: Record<string, unknown> | Array<Record<string, unknown>> | undefined;
  noindex?: boolean | undefined;
}

const DEFAULT_SITE_NAME = "AIAIAC Africa 2027";
const DEFAULT_DOMAIN = "https://aiac-africa.com";
const DEFAULT_TITLE = "AIAIAC Africa 2027 | Asset Integrity, AI, Automation & Cybersecurity";
const DEFAULT_DESCRIPTION =
  "AIAIAC Africa 2027 brings together leaders in asset integrity, artificial intelligence, automation and cybersecurity in Lagos, Nigeria, 22–23 June 2027.";
const DEFAULT_IMAGE = `${DEFAULT_DOMAIN}/brand/aiaiac.png`;

function setMetaTag(attributeName: "name" | "property", attributeValue: string, content: string) {
  let element = document.querySelector<HTMLMetaElement>(
    `meta[${attributeName}="${attributeValue}"]`,
  );
  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attributeName, attributeValue);
    document.head.appendChild(element);
  }
  element.setAttribute("content", content);
}

function setCanonicalLink(href: string) {
  let link = document.querySelector<HTMLLinkElement>("link[rel='canonical']");
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", href);
}

function setJsonLdScript(schema?: Record<string, unknown> | Array<Record<string, unknown>>) {
  const SCRIPT_ID = "seo-structured-data";
  const existingScript = document.getElementById(SCRIPT_ID);

  if (!schema) {
    if (existingScript) existingScript.remove();
    return;
  }

  const script = existingScript || document.createElement("script");
  script.id = SCRIPT_ID;
  script.setAttribute("type", "application/ld+json");
  script.textContent = JSON.stringify(schema);

  if (!existingScript) {
    document.head.appendChild(script);
  }
}

export function SEO({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  canonical = "/",
  image = DEFAULT_IMAGE,
  type = "website",
  schema,
  noindex = false,
}: SEOProps) {
  const fullCanonical = canonical.startsWith("http")
    ? canonical
    : `${DEFAULT_DOMAIN}${canonical.startsWith("/") ? canonical : `/${canonical}`}`;

  const fullImageUrl = image.startsWith("http")
    ? image
    : `${DEFAULT_DOMAIN}${image.startsWith("/") ? image : `/${image}`}`;

  useEffect(() => {
    // 1. Page Title
    document.title = title;

    // 2. Meta Description
    setMetaTag("name", "description", description);

    // 3. Robots
    setMetaTag("name", "robots", noindex ? "noindex, nofollow" : "index, follow");

    // 4. Canonical
    setCanonicalLink(fullCanonical);

    // 5. Open Graph
    setMetaTag("property", "og:title", title);
    setMetaTag("property", "og:description", description);
    setMetaTag("property", "og:url", fullCanonical);
    setMetaTag("property", "og:image", fullImageUrl);
    setMetaTag("property", "og:type", type);
    setMetaTag("property", "og:site_name", DEFAULT_SITE_NAME);

    // 6. Twitter / X Card
    setMetaTag("name", "twitter:card", "summary_large_image");
    setMetaTag("name", "twitter:title", title);
    setMetaTag("name", "twitter:description", description);
    setMetaTag("name", "twitter:image", fullImageUrl);

    // 7. Structured Data (JSON-LD)
    setJsonLdScript(schema);

    return () => {
      // Optional cleanup on unmount
    };
  }, [title, description, fullCanonical, fullImageUrl, type, schema, noindex]);

  return null;
}

/**
 * Pre-built confirmed schemas for the conference and organisation
 */
export const confirmedEventSchema = {
  "@context": "https://schema.org",
  "@type": "Event",
  name: "AIAIAC Africa 2027",
  description:
    "The premier Asset Integrity, Artificial Intelligence, Automation & Cybersecurity Conference in Lagos, Nigeria.",
  startDate: "2027-06-22",
  endDate: "2027-06-23",
  eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
  eventStatus: "https://schema.org/EventScheduled",
  location: {
    "@type": "Place",
    name: "Lagos, Nigeria",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Lagos",
      addressCountry: "NG",
    },
  },
  image: [`${DEFAULT_DOMAIN}/brand/aiaiac.png`],
  organizer: {
    "@type": "Organization",
    name: "GExperts Global Events",
    url: DEFAULT_DOMAIN,
  },
  url: `${DEFAULT_DOMAIN}/`,
};

export const confirmedOrgSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "AIAIAC Africa 2027",
  url: DEFAULT_DOMAIN,
  logo: `${DEFAULT_DOMAIN}/brand/aiaiac-emblem.png`,
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+234 701 493 4538",
    contactType: "customer service",
    email: "aiaiac@aiac-africa.com",
  },
  sameAs: [
    "https://www.instagram.com/aiaiac_africa/",
    "https://lnkd.in/etrvZF9i",
    "https://x.com/AiaiacAfrica",
    "https://www.youtube.com/@aiacafrica",
    "https://www.facebook.com/aiac.africa",
    "https://vm.tiktok.com/ZS9B2jJraoyyW-2SgRm/",
  ],
};

export function createBreadcrumbSchema(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((crumb, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: crumb.name,
      item: crumb.item.startsWith("http") ? crumb.item : `${DEFAULT_DOMAIN}${crumb.item}`,
    })),
  };
}
