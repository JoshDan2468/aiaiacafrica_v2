import { Link } from "react-router-dom";

export function NotFoundSection() {
  return (
    <main className="on-navy flex min-h-screen items-center justify-center bg-mineral px-5">
      <section className="max-w-md text-center">
        <p className="eyebrow text-emerald">Navigation error</p>
        <h1 className="display-xl mt-6 text-white">404</h1>
        <h2 className="mt-5 font-display text-2xl font-bold text-white">Page not found</h2>
        <p className="mt-4 text-sm leading-relaxed text-white/60">
          The page you&apos;re looking for does not exist or has moved.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex min-h-12 items-center justify-center bg-emerald px-7 text-xs font-semibold uppercase tracking-[0.14em] text-mineral"
        >
          Go home
        </Link>
      </section>
    </main>
  );
}
