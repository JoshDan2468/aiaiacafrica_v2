import { useState, useEffect, useCallback } from "react";
import { AnimatedSection } from "@/components/common/AnimatedSection";
import gallery1 from "@/data/AIAC_images/image20.jpg";
import gallery2 from "@/data/AIAC_images/image4.jpg";
import gallery3 from "@/data/AIAC_images/image16.jpg";
import gallery4 from "@/data/AIAC_images/image30.jpg";
import gallery5 from "@/data/AIAC_images/image27.jpg";
import gallery6 from "@/data/AIAC_images/image1.jpg";

interface GalleryImage {
  src: string;
  alt: string;
}

const galleryImages: readonly GalleryImage[] = [
  {
    src: gallery1,
    alt: "AIAIAC Africa executive leadership and international conference delegates",
  },
  {
    src: gallery2,
    alt: "Main plenary hall assembly and audience during opening remarks",
  },
  {
    src: gallery3,
    alt: "Keynote presentation addressing digital transformation and industrial resilience",
  },
  {
    src: gallery4,
    alt: "Technical track session exploring asset integrity management and inspection",
  },
  {
    src: gallery5,
    alt: "Automation and cybersecurity panel dialogue with energy stakeholders",
  },
  {
    src: gallery6,
    alt: "Specialist speaker delivering technical case study on the plenary stage",
  },
];

export function GallerySection() {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const handleClose = useCallback(() => {
    setActiveIndex(null);
  }, []);

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) =>
      prev !== null ? (prev - 1 + galleryImages.length) % galleryImages.length : null,
    );
  }, []);

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev !== null ? (prev + 1) % galleryImages.length : null));
  }, []);

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (activeIndex === null) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
      else if (e.key === "ArrowLeft") handlePrev();
      else if (e.key === "ArrowRight") handleNext();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeIndex, handleClose, handlePrev, handleNext]);

  const leadImage = galleryImages[0];
  const subImage1 = galleryImages[1];
  const subImage2 = galleryImages[2];
  const remainingImages = galleryImages.slice(3);
  const activeImage = activeIndex !== null ? galleryImages[activeIndex] : null;

  return (
    <section className="bg-[#FFFFFF] py-20 text-[#102C20] sm:py-24 lg:py-28">
      <div className="shell">
        <AnimatedSection once className="max-w-3xl">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-[#102C20] sm:text-4xl lg:text-[44px]">
            Photo Gallery
          </h2>
          <p className="mt-4 text-[16.5px] leading-relaxed text-[#3F5347] sm:text-[17px]">
            Visual documentation of keynote addresses, technical tracks, exhibition engagements, and
            executive networking from AIAIAC Africa.
          </p>
        </AnimatedSection>

        {/* Editorial Image Composition - All images render at full opacity: 1 without fade */}
        <div className="mt-12 space-y-6">
          {/* Row 1: Large Dominant Anchor + 2 Stacked Supporting Photos */}
          <div className="grid gap-6 lg:grid-cols-12">
            {leadImage && (
              <div className="lg:col-span-7">
                <button
                  type="button"
                  onClick={() => setActiveIndex(0)}
                  aria-label={`View photo 1 in lightbox: ${leadImage.alt}`}
                  className="group relative block h-full w-full overflow-hidden rounded-[20px] bg-[#0A2619] opacity-100 shadow-md ring-1 ring-black/5 transition-transform duration-300 hover:scale-[1.008] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2D]"
                >
                  <img
                    src={leadImage.src}
                    alt={leadImage.alt}
                    width="1440"
                    height="900"
                    loading="eager"
                    decoding="async"
                    style={{ opacity: 1 }}
                    className="h-[340px] w-full object-cover opacity-100 sm:h-[440px] lg:h-[480px]"
                  />
                </button>
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2 lg:col-span-5 lg:grid-cols-1">
              {subImage1 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setActiveIndex(1)}
                    aria-label={`View photo 2 in lightbox: ${subImage1.alt}`}
                    className="group relative block w-full overflow-hidden rounded-[20px] bg-[#0A2619] opacity-100 shadow-md ring-1 ring-black/5 transition-transform duration-300 hover:scale-[1.008] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2D]"
                  >
                    <img
                      src={subImage1.src}
                      alt={subImage1.alt}
                      width="800"
                      height="500"
                      loading="eager"
                      decoding="async"
                      style={{ opacity: 1 }}
                      className="h-[200px] w-full object-cover opacity-100 sm:h-[210px] lg:h-[228px]"
                    />
                  </button>
                </div>
              )}

              {subImage2 && (
                <div>
                  <button
                    type="button"
                    onClick={() => setActiveIndex(2)}
                    aria-label={`View photo 3 in lightbox: ${subImage2.alt}`}
                    className="group relative block w-full overflow-hidden rounded-[20px] bg-[#0A2619] opacity-100 shadow-md ring-1 ring-black/5 transition-transform duration-300 hover:scale-[1.008] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2D]"
                  >
                    <img
                      src={subImage2.src}
                      alt={subImage2.alt}
                      width="800"
                      height="500"
                      loading="eager"
                      decoding="async"
                      style={{ opacity: 1 }}
                      className="h-[200px] w-full object-cover opacity-100 sm:h-[210px] lg:h-[228px]"
                    />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Row 2: 3 Balanced Supporting Photos */}
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {remainingImages.map((item, idx) => (
              <div key={item.alt}>
                <button
                  type="button"
                  onClick={() => setActiveIndex(idx + 3)}
                  aria-label={`View photo ${idx + 4} in lightbox: ${item.alt}`}
                  className="group relative block w-full overflow-hidden rounded-[20px] bg-[#0A2619] opacity-100 shadow-md ring-1 ring-black/5 transition-transform duration-300 hover:scale-[1.008] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#173D2D]"
                >
                  <img
                    src={item.src}
                    alt={item.alt}
                    width="800"
                    height="500"
                    loading="eager"
                    decoding="async"
                    style={{ opacity: 1 }}
                    className="h-[220px] w-full object-cover opacity-100 sm:h-[240px] lg:h-[260px]"
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Accessible Lightbox Modal */}
      {activeImage && activeIndex !== null && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Image Lightbox"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm sm:p-6"
        >
          {/* Close Backdrop */}
          <div className="absolute inset-0" onClick={handleClose} aria-hidden="true" />

          <div className="relative z-10 max-h-[90vh] max-w-5xl">
            <img
              src={activeImage.src}
              alt={activeImage.alt}
              className="max-h-[80vh] w-auto rounded-[14px] object-contain opacity-100 shadow-2xl ring-1 ring-white/10"
              style={{ opacity: 1 }}
            />
            <p className="mt-3 text-center text-sm font-medium text-white/80">{activeImage.alt}</p>

            {/* Controls */}
            <div className="mt-4 flex items-center justify-between">
              <span className="text-xs font-semibold text-white/60">
                {activeIndex + 1} of {galleryImages.length}
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Previous photograph"
                  className="rounded-[10px] bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                >
                  Previous
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next photograph"
                  className="rounded-[10px] bg-white/10 px-4 py-2 text-xs font-semibold text-white transition-colors hover:bg-white/20"
                >
                  Next
                </button>
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Close lightbox"
                  className="rounded-[10px] bg-[#CFEA3B] px-4 py-2 text-xs font-bold text-[#102C20] transition-colors hover:bg-[#bfe028]"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
