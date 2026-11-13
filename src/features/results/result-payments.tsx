"use client";
import { useState } from "react";
import { useCase } from "@/features/cases/queries";
import { PaymentScreen } from "@/features/payments/payment-screen";
import { useTranslation } from "@/i18n/use-translation";
export function ResultPayments({caseId}: {caseId: number}) {
  const [open, setOpen] = useState(false);
  const context = useCase(caseId);
  const {translate} = useTranslation();
  return <details id="payment-management" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary className="min-h-11 cursor-pointer py-3">{translate("results.managePayments")}</summary>
    {open && context.data && <PaymentScreen workplaceId={context.data.workplaceId} caseId={caseId} inputVersion={context.data.inputVersion}/>}
  </details>;
}
