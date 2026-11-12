"use client";
import { useId, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { TextField } from "@/components/ui/text-field";
import { primaryButton, secondaryButton } from "@/components/ui/styles";
import { ApiError } from "@/lib/api/error";
import { applyBusinessFormError } from "@/lib/api/form-errors";
import { useFormErrorFocus } from "@/hooks/use-form-error-focus";
import { useCase } from "@/features/cases/queries";
import { linkFormSchema, type LinkDto } from "../schemas";
import { useDocumentAction } from "../queries";
import { documentError } from "../view-models";
export function LinkForm({ caseId, documentId, link, inputVersion, onDone }: { caseId: number; documentId: number; link?: LinkDto; inputVersion: number; onDone: () => void }) {
  const id = useId();
  const mutation = useDocumentAction();
  const latest = useCase(caseId);
  const [version, setVersion] = useState(inputVersion);
  const [conflict, setConflict] = useState(false);
  const { register, handleSubmit, setFocus, formState: { errors, isSubmitting }, setError } = useForm({ resolver: zodResolver(linkFormSchema), defaultValues: { purpose: link?.purpose ?? "", applicableFrom: link?.applicableFrom ?? "", applicableTo: link?.applicableTo ?? "" } });
  const summary = useFormErrorFocus(errors, isSubmitting, setFocus, ["purpose", "applicableFrom", "applicableTo"]);
  return <form aria-label={link ? "연결 정보 수정" : "기존 원본 연결"} className="mt-4 space-y-4" onSubmit={handleSubmit(async values => {
    if (conflict) return;
    const body = { purpose: values.purpose, applicableFrom: values.applicableFrom || null, applicableTo: values.applicableTo || null, expectedInputVersion: version };
    try {
      await mutation.mutateAsync(link ? { type: "update", caseId, linkId: link.linkId, body } : { type: "connect", caseId, documentId, body });
      onDone();
    } catch (error) {
      if (error instanceof ApiError && error.errorCode === "INPUT_VERSION_CONFLICT") setConflict(true);
      applyBusinessFormError(error, setError, ["purpose", "applicableFrom", "applicableTo"]);
      setError("root.server", { message: documentError(error) });
    }
  })}>
    <TextField id={`${id}-purpose`} label="연결 목적" list={`${id}-purposes`} placeholder="사용 목적을 입력하거나 선택" disabled={isSubmitting} error={errors.purpose?.message} maxLength={100} {...register("purpose")} />
    <datalist id={`${id}-purposes`}><option value="CONTRACT_FOR_PERIOD">산정기간에 적용할 계약서</option></datalist>
    <p className="text-caption text-muted">이 자료를 내역에서 사용하는 목적을 입력하거나 선택해 주세요.</p>
    <div className="grid min-w-0 gap-4 sm:grid-cols-2">
      <TextField id={`${id}-from`} label="적용 시작일 (선택)" type="date" disabled={isSubmitting} error={errors.applicableFrom?.message} {...register("applicableFrom")} />
      <TextField id={`${id}-to`} label="적용 종료일 (선택)" type="date" disabled={isSubmitting} error={errors.applicableTo?.message} {...register("applicableTo")} />
    </div>
    {errors.root?.server && <p ref={summary} tabIndex={-1} role="alert">{errors.root.server.message}</p>}
    {conflict && <button type="button" className={secondaryButton} disabled={latest.isFetching} onClick={async () => { const result = await latest.refetch(); if (result.data && !result.isError) { setVersion(result.data.inputVersion); setConflict(false); } }}>최신 버전 확인 후 현재 입력으로 다시 편집</button>}
    <div className="flex flex-wrap gap-3"><button type="submit" disabled={isSubmitting || conflict} className={primaryButton}>{isSubmitting ? "저장 중" : link ? "연결 정보 저장" : "이 원본 연결"}</button><button type="button" onClick={onDone} disabled={isSubmitting} className={secondaryButton}>닫기</button></div>
  </form>;
}
