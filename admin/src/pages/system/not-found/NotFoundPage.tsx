import { SEO } from "@/components/common/SEO";
import { NotFoundSection } from "./NotFoundSection";

export function NotFoundPage() {
  return <NotFoundSection />;
  return (
    <>
      <SEO title="404 Page Not Found | AIAIAC Africa 2027" noindex={true} />
      <NotFoundSection />
    </>
  );
}
