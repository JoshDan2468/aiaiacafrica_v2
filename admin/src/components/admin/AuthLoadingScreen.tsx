import { LoaderCircle } from "./adminIcons";

export function AuthLoadingScreen() {
  return (
    <main
      className="flex min-h-screen items-center justify-center bg-bone px-6 text-mineral"
      aria-busy="true"
      aria-live="polite"
    >
      <div className="flex items-center gap-3 border-l-2 border-lime pl-4">
        <LoaderCircle className="size-5 animate-spin text-forest" aria-hidden="true" />
        <p className="text-sm font-semibold">Verifying administrator session…</p>
      </div>
    </main>
  );
}
