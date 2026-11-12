"use client";
import { translate } from "@/i18n/translate";

import { StepFormNavigation } from "@/components/ui/step-form-navigation";
import { useId, useLayoutEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextField } from "@/components/ui/text-field";
import { SelectField } from "@/components/ui/select-field";
import { cardStyle, primaryButton, secondaryButton } from "@/components/ui/styles";
import { businessErrorMessage } from "@/lib/api/form-errors";
import { ApiError } from "@/lib/api/error";
import { manualDefaults, manualFields, manualFormSchema, toManualInput, typeLabels } from "../manual-fields";
import { useInputAction } from "../queries";
import type { ManualRecord, ManualSaved, RecordType } from "../schemas";

const inputSteps: Record<RecordType, { label: string; keys: string[] }[]> = {
  CONTRACT: [{ label: translate("caseInputs.manualForm_wage_information_input"), keys: ["hourlyWage", "monthlyBasePay"] }],
  ATTENDANCE: [{ label: translate("caseInputs.manualForm_work"), keys: ["workDate", "clockIn", "clockOut"] }, { label: translate("caseInputs.manualForm_time"), keys: ["breakMinutes"] }],
  PAYSLIP: [{ label: translate("caseInputs.manualForm_total_input"), keys: ["grossPay", "totalDeductions", "netPay"] }, { label: translate("caseInputs.manualForm_payment_deduction_detail"), keys: ["paymentItems", "deductionItems"] }, { label: translate("caseInputs.manualForm_work_wage"), keys: ["hourlyWage", "basePay", "workedMinutes"] }],
  DEPOSIT: [{ label: translate("caseInputs.manualForm_payment_count_amount"), keys: ["paymentMethod", "transactionDate", "amount"] }, { label: translate("caseInputs.manualForm_inputSteps_dEPOSIT_label2"), keys: ["sender", "memo"] }],
};
export function ManualForm({ caseId, type, periodStart, periodEnd, initial, onSaved }: { caseId: number; type: RecordType; periodStart: string; periodEnd: string; initial?: ManualRecord; onSaved: (receipt: ManualSaved) => void }) {
  const id = useId(); const mutation = useInputAction(caseId); const locked = useRef(false); const summary = useRef<HTMLParagraphElement>(null);
  const [step, setStep] = useState(0);
  const steps = inputSteps[type];
  const [failure, setFailure] = useState("");
  const form = useForm({ resolver: zodResolver(manualFormSchema(type, periodStart, periodEnd)), defaultValues: manualDefaults(type, initial?.data) });
  const { register, handleSubmit, setError, setFocus, formState: { errors, isSubmitting, isDirty } } = form;
  useLayoutEffect(() => { if (isSubmitting) return; const field = Object.keys(errors.values ?? {})[0]; if (field) setFocus(`values.${field}`); else if (failure) summary.current?.focus(); }, [errors, failure, isSubmitting, setFocus, step]);
  return <form aria-label={translate("caseInputs.manualForm_manual_input", { value1: typeLabels[type] })} className={`${cardStyle} min-w-0 space-y-5`} noValidate onSubmit={event => { if (step !== steps.length) { event.preventDefault(); setStep(step + 1); return; } void handleSubmit(async ({ values }) => {
    if (locked.current) return; locked.current = true; setFailure("");
    try {
      const body = toManualInput(type, values, initial?.data);
      const result = await mutation.mutateAsync(initial ? { type: "update", recordId: initial.recordId, body } : { type: "create", body });
      if (result && "recordId" in result) onSaved(result as ManualSaved);
    } catch (error) {
      if (error instanceof ApiError && error.status === 422) for (const e of error.fieldErrors) {
        const key = e.field.split(".").at(-1)!;
        if (manualFields[type].some(f => f.key === key)) { setError(`values.${key}`, { message: e.reason }); setStep(steps.findIndex(s => s.keys.includes(key))); }
      }
      setFailure(businessErrorMessage(error));
    } finally { locked.current = false; }
  }, invalid => { const field = Object.keys(invalid.values ?? {})[0]; if (field) setStep(steps.findIndex(s => s.keys.includes(field))); })(event); }}>
    <h2 className="text-title font-bold">{typeLabels[type]} {initial ? translate("common.edit") : translate("caseInputs.manualForm_manual_input_2")}</h2><p>{translate("caseInputs.manualForm_original_document_none_select_item_confirm_input")}</p>
    {type === "ATTENDANCE" && <p>{translate("caseInputs.manualForm_work_input_time", { value1: periodStart, value2: periodEnd })}</p>}
    {type === "PAYSLIP" && <p>{translate("caseInputs.manualForm_payment_deduction_list_subtotal_sum_none_confirm")}</p>}
    {type === "DEPOSIT" && <p>{translate("caseInputs.manualForm_count_user_transaction_case_allocation_manual_list")}</p>}
    <p className="text-muted">{isDirty ? translate("caseInputs.manualForm_save_change") : translate("caseInputs.manualForm_input_confirm_step_save")}</p>
    <StepFormNavigation steps={[...steps.map(s => s.label), translate("caseInputs.manualForm_confirm")]} current={step} onChange={setStep} busy={isSubmitting} errors={steps.map(s => s.keys.some(key => !!errors.values?.[key]))} />
    {step === steps.length && <section aria-label={translate("caseInputs.manualForm_input_content_confirm")} className="space-y-3"><h3 className="font-bold">{translate("caseInputs.manualForm_save_confirm")}</h3><dl className="grid gap-3 sm:grid-cols-2">{manualFields[type].map(f => <div key={f.key}><dt className="text-muted">{f.label}</dt><dd className="break-words">{form.getValues(`values.${f.key}`) || translate("caseInputs.manualForm_confirm_2")}</dd></div>)}</dl></section>}
    {[true, false].map(required => { const fields = manualFields[type].filter(f => !!f.required === required); return fields.length > 0 && <fieldset hidden={step === steps.length || !fields.some(f => steps[step]?.keys.includes(f.key))} key={String(required)} className="min-w-0 space-y-5 border-t border-border pt-5"><legend className="px-2 font-bold">{required ? translate("caseInputs.manualForm_count_input") : translate("caseInputs.manualForm_select_input_item")}</legend><div className="grid min-w-0 gap-5 min-[951px]:grid-cols-2">{fields.map(f => {
      const props = { id: `${id}-${f.key}`, label: `${f.label} · ${f.required ? translate("caseInputs.manualForm_count") : translate("caseInputs.manualForm_select_confirm")}`, disabled: isSubmitting, required: f.required, error: errors.values?.[f.key]?.message, ...register(`values.${f.key}`) };
      return <div key={f.key} hidden={step === steps.length || !steps[step]?.keys.includes(f.key)}>{f.kind === "method" ? <SelectField key={f.key} {...props}><option value="">{translate("caseInputs.manualForm_select")}</option><option value="BANK_TRANSFER">{translate("caseInputs.manualForm_bankAccount")}</option><option value="CASH">{translate("caseInputs.manualForm_cash")}</option></SelectField> : <TextField key={f.key} {...props} type={f.kind === "date" ? "date" : f.kind === "datetime" ? "datetime-local" : "text"} step={f.kind === "datetime" ? "1" : undefined} inputMode={f.kind === "money" || f.kind === "minutes" ? "numeric" : undefined} placeholder={f.kind === "list" ? translate("caseInputs.manualForm_placeholder_div") : undefined} />}</div>;
    })}</div></fieldset>; })}
    {failure && <p tabIndex={-1} role="alert" ref={summary}>{failure}</p>}{step === steps.length && <button className={primaryButton} disabled={isSubmitting} type="submit">{isSubmitting ? translate("caseInputs.manualForm_save") : initial ? translate("caseInputs.manualForm_manual_edit_save") : translate("caseInputs.manualForm_manual_record_save")}</button>}
    <button type="button" className={secondaryButton} disabled={isSubmitting} onClick={() => { form.reset(); setFailure(""); }}>{translate("caseInputs.manualForm_input_cancel")}</button>
    {initial && <details><summary className="min-h-11 cursor-pointer font-bold">{translate("caseInputs.manualForm_edit_save")}</summary><p>{translate("caseInputs.manualForm_type_record_all_field_select_confirm")}</p></details>}
  </form>;
}
