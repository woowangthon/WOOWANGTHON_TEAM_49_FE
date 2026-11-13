"use client";
import { ScanLine, CheckCircle2 } from "lucide-react";
import { useTranslation } from "@/i18n/use-translation";
import type { DocumentDto } from "../../schemas";
export function ReviewStatusBadges({processing,review}:{processing:DocumentDto["processingStatus"];review:string}) {
 const {translate}=useTranslation();
 const failed=processing==="FAILED";
 const active=processing==="UPLOADED"||processing==="PROCESSING";
 const badge="inline-flex items-center gap-1 rounded-full border px-3 py-1 text-sm font-bold";
 return <span className="flex flex-wrap gap-2" data-review-status-badges>
  <span className={`${badge} ${failed?"border-danger text-danger-foreground":"border-line bg-neutral-soft"}`}><ScanLine size={15} aria-hidden="true"/>{translate(failed?"documents.badgeFailed":active?"documents.badgeProcessing":"documents.badgeExtracted")}</span>
  <span className={`${badge} ${review==="CONFIRMED"?"border-success text-success-foreground":"border-line bg-neutral-soft"}`}><CheckCircle2 size={15} aria-hidden="true"/>{!["CONFIRMED","IN_PROGRESS","NOT_STARTED"].includes(review)?review:translate(review==="CONFIRMED"?"documents.badgeConfirmed":review==="IN_PROGRESS"?"documents.badgeReviewing":"documents.badgeNotStarted")}</span>
 </span>;
}
