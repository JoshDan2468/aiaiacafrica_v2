import { cn } from "@/lib/utils";

export function AuroraBackground({ className }: { className?: string }) {
  return (
    <div className={cn("aurora-field", className)} aria-hidden="true">
      <span className="aurora-field__band aurora-field__band--one" />
      <span className="aurora-field__band aurora-field__band--two" />
      <span className="aurora-field__band aurora-field__band--three" />
    </div>
  );
}
