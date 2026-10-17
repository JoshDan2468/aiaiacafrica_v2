import { Reveal } from "@/components/common/Reveal";
import { mediaItems } from "@/data/media";

export function Media() {
  const [lead, ...supporting] = mediaItems;

  if (!lead) return null;

  return (
    <section id="media" className="relative overflow-hidden bg-background py-24 lg:py-32">
      <img
        src="/brand/aiaiac-emblem.png"
        alt=""
        aria-hidden
        loading="lazy"
        className="technical-seal -bottom-40 -right-32 hidden lg:block"
      />
      <div className="shell relative">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <Reveal className="lg:col-span-7">
            <p className="eyebrow text-emerald-deep">Experience / Media</p>
            <h2 className="display-lg mt-6 text-mineral">Inside the exchange</h2>
          </Reveal>
          <Reveal delay={0.1} className="lg:col-span-4 lg:col-start-9">
            <p className="text-base leading-relaxed text-muted-foreground">{lead.caption}</p>
          </Reveal>
        </div>

        <div className="mt-14 grid gap-4 lg:grid-cols-12 lg:grid-rows-[16rem_16rem]">
          <Reveal className="lg:col-span-8 lg:row-span-2">
            <figure className="image-cut group relative h-[30rem] overflow-hidden bg-mineral lg:h-[33rem]">
              <img
                src={lead.src}
                alt={lead.caption}
                width={lead.width}
                height={lead.height}
                loading="lazy"
                decoding="async"
                className="h-full w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.025]"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-mineral/86 p-5 text-sm text-white/78">
                {lead.caption}
              </figcaption>
            </figure>
          </Reveal>

          {supporting.slice(0, 2).map((item, index) => (
            <Reveal key={item.id} delay={0.08 + index * 0.08} className="lg:col-span-4">
              <figure className="group relative h-[18rem] overflow-hidden bg-mineral lg:h-full">
                <img
                  src={item.src}
                  alt={item.caption}
                  width={item.width}
                  height={item.height}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover transition-transform duration-[1.2s] ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-mineral/85 to-transparent" />
                <figcaption className="absolute inset-x-0 bottom-0 p-5 text-xs leading-relaxed text-white/75">
                  {item.caption}
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>

        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {supporting.slice(2).map((item, index) => (
            <Reveal as="li" key={item.id} delay={index * 0.08}>
              <figure className="group relative aspect-[16/8] overflow-hidden bg-mineral">
                <img
                  src={item.src}
                  alt={item.caption}
                  width={item.width}
                  height={item.height}
                  loading="lazy"
                  decoding="async"
                  className="h-full w-full object-cover opacity-85 transition-[transform,opacity] duration-700 group-hover:scale-[1.025] group-hover:opacity-100"
                />
              </figure>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
