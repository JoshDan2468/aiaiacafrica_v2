import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowUpRight, X } from "lucide-react";
import { Link } from "react-router-dom";
import { BrochureDownload } from "@/components/common/BrochureDownload";

const dismissalKey = "aiaiac:welcome:2027:dismissed";
let dismissedInMemory = false;

function wasDismissed() {
  try {
    return dismissedInMemory || sessionStorage.getItem(dismissalKey) === "true";
  } catch {
    return dismissedInMemory;
  }
}

export function WelcomeModal() {
  const [open, setOpen] = useState(() => !wasDismissed());
  const dismiss = () => {
    dismissedInMemory = true;
    try {
      sessionStorage.setItem(dismissalKey, "true");
    } catch {
      // A session-memory fallback keeps dismissal functional when storage is blocked.
    }
    setOpen(false);
  };
  return (
    <Dialog.Root open={open} onOpenChange={(nextOpen) => !nextOpen && dismiss()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[1000] bg-[#05190F]/75 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[1001] max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-[620px] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-white/15 bg-[#05190F] p-7 text-white shadow-2xl sm:p-12"
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            const main = document.getElementById("main-content");
            if (main) {
              main.setAttribute("tabindex", "-1");
              main.focus({ preventScroll: true });
            }
          }}
        >
          <Dialog.Close
            aria-label="Close welcome message"
            className="absolute right-4 top-4 flex size-11 items-center justify-center rounded-md text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime"
          >
            <X className="size-5" aria-hidden="true" />
          </Dialog.Close>
          <img
            src="/brand/aiaiac_logo.png"
            alt="AIAIAC Africa"
            className="h-16 w-auto object-contain"
          />
          <p className="mt-8 text-xs font-bold uppercase tracking-[0.18em] text-lime">
            Ideas that advance industry
          </p>
          <Dialog.Title className="mt-3 max-w-md font-display text-4xl font-extrabold leading-[1.1] tracking-tight sm:text-5xl">
            Welcome to AIAIAC 2027
          </Dialog.Title>
          <Dialog.Description className="mt-5 max-w-md text-base leading-7 text-white/80">
            Explore opportunities to contribute to the Asset Integrity, Artificial Intelligence,
            Automation and Cybersecurity Conference.
          </Dialog.Description>
          <div className="mt-8 space-y-4 border-t border-white/15 pt-7">
            <Link
              to="/registration/abstract"
              onClick={dismiss}
              className="flex min-h-12 items-center justify-between gap-4 rounded-md bg-lime px-5 py-3 text-sm font-bold text-[#05190F] transition-colors hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime"
            >
              Submit an Abstract <ArrowUpRight className="size-5" aria-hidden="true" />
            </Link>
            <BrochureDownload
              label="Download Conference Brochure"
              className="flex min-h-12 w-full items-center justify-center gap-3 rounded-md border border-white/30 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-lime"
              unavailableClassName="text-xs leading-5 text-white/75"
              onDownload={dismiss}
            />
          </div>
          <p className="mt-7 text-xs font-semibold tracking-wide text-white/65">
            22–23 June 2027 · Lagos, Nigeria
          </p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
