"use client";
import Link from "next/link";
import { useTranslation } from "@/i18n/use-translation";

export function resultReasonCodes(value: unknown): string[] {
  const codes = new Set<string>();
  function visit(item: unknown) {
    if (!item || typeof item !== "object") return;
    if (Array.isArray(item)) { item.forEach(visit); return; }
    const record = item as Record<string, unknown>;
    if (typeof record.reasonCode === "string") codes.add(record.reasonCode);
    if (Array.isArray(record.reasonCodes)) record.reasonCodes.forEach(code => { if(typeof code === "string") codes.add(code); });
    Object.values(record).forEach(visit);
  }
  visit(value);
  return [...codes];
}
export function ResultReasons({caseId, data}: {caseId: number; data: unknown}) {
  const {translate} = useTranslation();
  const codes = resultReasonCodes(data);
  const mapping = {
    ITEM_SCOPE_INCOMPLETE: ["results.reasonItemScope", "review"],
    PAYMENT_SCOPE_UNCONFIRMED: ["results.reasonPaymentScope", "review"],
    DUPLICATE_TRANSACTION: ["results.reasonDuplicate", "result#payment-management"],
    SOURCE_PERIOD_MISMATCH: ["results.reasonPeriod", "review"],
    FIELD_MISSING: ["results.reasonField", "conditions"],
  } as const;
  return codes.length ? <ul className="space-y-2 break-words">{codes.map(code => {
    const known = Object.hasOwn(mapping, code) ? mapping[code as keyof typeof mapping] : undefined;
    return <li key={code}><span>{known ? <Link className="underline" href={`/cases/${caseId}/${known[1]}`}>{translate(known[0])}</Link> : translate("results.reasonFallback")}</span> <span>({code})</span></li>;
  })}</ul> : null;
}
