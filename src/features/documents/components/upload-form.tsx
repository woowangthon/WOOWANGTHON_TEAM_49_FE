"use client";
import { useEffect, useId, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UploadCloud } from "lucide-react";
import { SelectField } from "@/components/ui/select-field";
import { cardStyle, primaryButton, secondaryButton } from "@/components/ui/styles";
import { documentTypes, uploadSchema, type DocumentContext } from "../schemas";
import { useDocumentAction } from "../queries";
import { documentError, typeLabels } from "../view-models";
import { validateFile, validateImageDimensions } from "../file-validation";
const formSchema = z.object({ documentType: z.enum(documentTypes) });
export function UploadForm({ context, disabled = false }: { context: Exclude<DocumentContext, {kind: "library"}>; disabled?: boolean }) {
  const id = useId();
  const [file, setFile] = useState<File>();
  const [message, setMessage] = useState("");
  const [candidates, setCandidates] = useState<number[]>([]);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const mounted = useRef(true);
  const input = useRef<HTMLInputElement>(null);
  const mutation = useDocumentAction();
  const { register, handleSubmit } = useForm({ resolver: zodResolver(formSchema), defaultValues: { documentType: "PAYSLIP" as const } });
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; controller.current?.abort(); }; }, []);
  const choose = (files: FileList | null) => {
    if (locked.current || disabled) return;
    setSuccess(false); setCandidates([]);
    if (!files?.length) return;
    if (files.length !== 1) { setMessage("한 번에 파일 하나를 선택해 주세요. 완료 후 다음 파일을 등록할 수 있습니다."); return; }
    const error = validateFile(files[0]);
    setMessage(error ?? ""); setFile(error ? undefined : files[0]);
  };
  return <form className={`${cardStyle} space-y-5`} aria-label="새 파일 업로드" onSubmit={event => { void handleSubmit(async values => {
    if (locked.current || disabled) return;
    if (!file) { setMessage("파일을 선택해 주세요."); input.current?.focus(); return; }
    locked.current = true; setBusy(true); setSuccess(false); setCandidates([]); setMessage("");
    controller.current = new AbortController();
    try {
      const error = validateFile(file) ?? await validateImageDimensions(file);
      if (error) { setMessage(error); return; }
      if (!mounted.current || controller.current.signal.aborted) return;
      const receipt = await mutation.mutateAsync({ type: "upload", context, file, documentType: values.documentType, signal: controller.current.signal });
      if (mounted.current) { setCandidates(uploadSchema.safeParse(receipt).data?.duplicateCandidateIds ?? []); setFile(undefined); setSuccess(true); if (input.current) input.current.value = ""; }
    } catch (error) { if (mounted.current) setMessage(documentError(error)); }
    finally { locked.current = false; if (mounted.current) setBusy(false); }
  })(event); }}>
    <h2 className="text-title font-bold">새 파일 업로드</h2>
    <p className="text-body text-muted">불필요한 민감정보는 가린 뒤 등록해 주세요. 원본은 근무지에 보관됩니다.</p>
    <SelectField id={`${id}-type`} label="문서 유형" disabled={busy || disabled} {...register("documentType")}>
      {documentTypes.map(type => <option key={type} value={type}>{typeLabels[type]}</option>)}
    </SelectField>
    <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); choose(e.dataTransfer.files); }} className="min-w-0 rounded-panel border-2 border-dashed border-border bg-neutral-soft p-5 text-center">
      <UploadCloud aria-hidden="true" className="mx-auto mb-3 size-8" />
      <label htmlFor={`${id}-file`} className="block text-body font-bold">파일 선택 또는 이곳에 끌어 놓기</label>
      <input ref={input} id={`${id}-file`} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" disabled={busy || disabled} onChange={e => choose(e.target.files)} className="mt-4 block w-full min-w-0 max-w-full text-body file:mr-2 file:min-h-11 file:rounded-control file:border file:border-border file:bg-surface file:px-3" />
      {file && <p className="mt-3 break-all text-body">{file.name}</p>}
    </div>
    <p className="text-caption text-muted">PDF·JPEG·PNG, 20MiB 이하. PDF 50페이지, 이미지 각 축 10000px 이하. 암호화·손상·실제 파일 형식은 서버에서 최종 검사합니다.</p>
    {message && <p role="alert" tabIndex={-1} className="break-words text-body">{message}</p>}
    {success && <p role="status" className="text-body">업로드가 접수되었습니다. 아래 목록에서 서버 처리 상태를 확인해 주세요.</p>}
    {!!candidates.length && <p role="status" className="break-words text-body">중복 원본 후보: {candidates.map(id => `#${id}`).join(", ")}. 서버가 제공한 후보이며, 업로드는 접수되었습니다. 기존 자료를 확인해 주세요.</p>}
    {busy && <p role="status" className="text-body">업로드 요청 중… 서버 처리 진행률과는 별개입니다.</p>}
    <div className="flex flex-wrap gap-3"><button className={primaryButton} disabled={busy || disabled} type="submit">{busy ? "업로드 요청 중" : "파일 업로드"}</button>
      {busy && <button className={secondaryButton} type="button" onClick={() => controller.current?.abort()}>요청 대기 중단</button>}
    </div>
    <p className="text-caption text-muted">요청 중단은 서버 접수나 처리를 취소하지 않습니다. 오류·중단 후 목록을 확인하고 직접 재시도해 주세요.</p>
  </form>;
}
