import { useId } from "react";
import {
  conferenceBrochure,
  isSameOriginBrochure,
  type ConferenceBrochureAsset,
} from "@/data/conferenceBrochure";

export function BrochureDownload({
  label = "Download Brochure",
  className = "",
  unavailableClassName = "text-xs text-slate-600",
  asset = conferenceBrochure,
  onDownload,
}: {
  label?: string;
  className?: string;
  unavailableClassName?: string;
  asset?: ConferenceBrochureAsset | null;
  onDownload?: () => void;
}) {
  const descriptionId = useId();
  if (asset && isSameOriginBrochure(asset)) {
    return (
      <a href={asset.url} download={asset.filename} className={className} onClick={onDownload}>
        {label}
      </a>
    );
  }
  return (
    <div>
      <button
        type="button"
        disabled
        aria-describedby={descriptionId}
        className={`${className} cursor-not-allowed opacity-60`}
      >
        {label}
      </button>
      <p id={descriptionId} className={`mt-2 ${unavailableClassName}`}>
        The conference brochure is currently unavailable.
      </p>
    </div>
  );
}
