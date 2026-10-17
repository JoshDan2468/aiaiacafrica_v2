import { Link } from "react-router-dom";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const actionVariants = cva(
  "group inline-flex items-center justify-center gap-2.5 font-sans font-bold tracking-tight transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-emerald disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "rounded-xl bg-[#CFEA3B] text-[#102C20] font-bold shadow-xs hover:bg-[#b8d62c] active:translate-y-0.5",
        outline:
          "rounded-xl border border-white/25 bg-transparent text-white hover:border-white/50 hover:bg-white/10 active:translate-y-0.5",
        secondary:
          "rounded-xl bg-[#173D2D] text-[#F7F5EF] font-semibold hover:bg-[#102C20] active:translate-y-0.5",
        ghost: "rounded-xl text-current hover:text-[#CFEA3B] hover:bg-white/5",
        solidNavy:
          "rounded-xl bg-[#071C13] text-[#F7F5EF] hover:bg-[#123326] active:translate-y-0.5",
        text: "p-0 text-current hover:text-[#CFEA3B] underline-offset-4 hover:underline",
        textAction:
          "p-0 text-current hover:text-[#CFEA3B] font-semibold inline-flex items-center gap-1.5",
      },
      size: {
        sm: "h-10 px-4 text-xs sm:text-sm",
        md: "h-[50px] px-6 text-sm sm:text-base",
        lg: "h-[54px] px-8 text-base",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

type ActionProps = VariantProps<typeof actionVariants> & {
  children: ReactNode;
  className?: string | undefined;
  hideArrow?: boolean | undefined;
};

export function ActionLink({
  to,
  href,
  current = false,
  children,
  variant,
  size,
  className,
  hideArrow = false,
}: ActionProps & { to?: string; href?: string; current?: boolean }) {
  const classes = cn(actionVariants({ variant, size }), className);
  const content = (
    <>
      <span className="relative z-10">{children}</span>
      {!hideArrow && (
        <span
          aria-hidden
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/10 text-current transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5"
        >
          ↗
        </span>
      )}
    </>
  );

  if (to) {
    return (
      <Link to={to} className={classes} aria-current={current ? "page" : undefined}>
        {content}
      </Link>
    );
  }

  return (
    <a href={href} className={classes}>
      {content}
    </a>
  );
}

export function ActionButton({
  children,
  variant,
  size,
  className,
  hideArrow = false,
  ...props
}: ActionProps & ComponentProps<"button">) {
  return (
    <button className={cn(actionVariants({ variant, size }), className)} {...props}>
      <span className="relative z-10">{children}</span>
      {!hideArrow && (
        <span
          aria-hidden
          className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-black/10 text-current transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-0.5"
        >
          ↗
        </span>
      )}
    </button>
  );
}
