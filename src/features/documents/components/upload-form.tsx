"use client";
import {useMessageState} from '@/i18n/use-message-state';
import {message as describeMessage} from '@/i18n/message';

import {useLocalized} from '@/i18n/use-translation';
import {createLocalizedFeaturesDocumentsSchemas} from '../schemas';
import {createLocalizedFeaturesDocumentsViewModels} from '../view-models';
import {createLocalizedFeaturesDocumentsFileValidation} from '../file-validation';

import { useTranslation } from '@/i18n/use-translation';

import { useEffect, useId, useRef, useState } from "react";
import {useForm} from '@/i18n/use-localized-form';
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { UploadCloud } from "lucide-react";
import { SelectField } from "@/components/ui/select-field";
import { cardStyle, primaryButton, secondaryButton } from "@/components/ui/styles";
import {uploadDocumentTypes, type DocumentContext} from "../schemas";
import { useDocumentAction } from "../queries";

const formSchema = z.object({ documentType: z.enum(uploadDocumentTypes) });
export function UploadForm({ context, disabled = false }: { context: Exclude<DocumentContext, {kind: "library"}>; disabled?: boolean }) {
const {uploadDocumentTypes, uploadSchema} = useLocalized(createLocalizedFeaturesDocumentsSchemas);
const {documentError, typeLabels} = useLocalized(createLocalizedFeaturesDocumentsViewModels);
const {validateFile, validateImageDimensions} = useLocalized(createLocalizedFeaturesDocumentsFileValidation);

 const {translate} = useTranslation();

  const id = useId();
  const [file, setFile] = useState<File>();
  const [message, setMessage] = useMessageState("");
  const [candidates, setCandidates] = useState<number[]>([]);
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const locked = useRef(false);
  const mounted = useRef(true);
  const input = useRef<HTMLInputElement>(null);
  const mutation = useDocumentAction();
  const { register, handleSubmit } = useForm({ resolver: zodResolver(formSchema), defaultValues: { documentType: "AUTO" as const } });
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; controller.current?.abort(); }; }, []);
  const choose = (files: FileList | null) => {
    if (locked.current || disabled) return;
    setSuccess(false); setCandidates([]);
    if (!files?.length) return;
    if (files.length !== 1) { setMessage(describeMessage("documents.uploadForm_file_select_complete_next_create_count")); return; }
    const error = validateFile(files[0], true);
    setMessage(error ?? ""); setFile(error ? undefined : files[0]);
  };
  return <form className={`${cardStyle} space-y-5`} aria-label={translate("documents.documentScreens_new_file_upload")} onSubmit={event => { void handleSubmit(async values => {
    if (locked.current || disabled) return;
    if (!file) { setMessage(describeMessage("documents.uploadForm_file_select")); input.current?.focus(); return; }
    locked.current = true; setBusy(true); setSuccess(false); setCandidates([]); setMessage("");
    controller.current = new AbortController();
    try {
      const error = validateFile(file, true) ?? await validateImageDimensions(file, true);
      if (error) { setMessage(error); return; }
      if (!mounted.current || controller.current.signal.aborted) return;
      const receipt = await mutation.mutateAsync({ type: "upload", context, file, documentType: values.documentType, signal: controller.current.signal });
      if (mounted.current) { setCandidates(uploadSchema.parse(receipt).duplicateCandidateIds); setFile(undefined); setSuccess(true); if (input.current) input.current.value = ""; }
    } catch (error) { if (mounted.current) setMessage(documentError(error, true)); }
    finally { locked.current = false; if (mounted.current) setBusy(false); }
  })(event); }}>
    <h2 className="text-title font-bold">{translate("documents.documentScreens_new_file_upload")}</h2>
    <p className="text-body text-muted">{translate("documents.uploadForm_required_information_create_original_workplace_archived")}</p>
    <SelectField id={`${id}-type`} label={translate("documents.documentTypeResolution_document_type")} hint={translate("documents.uploadForm_automatic_document_type_extraction_retry_select_notice")} disabled={busy || disabled} {...register("documentType")}>
      {uploadDocumentTypes.map(type => <option key={type} value={type}>{type === "AUTO" ? translate("documents.uploadForm_automatic_type") : typeLabels[type]}</option>)}
    </SelectField>
    <div onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); choose(e.dataTransfer.files); }} className="min-w-0 rounded-panel border-2 border-dashed border-border bg-neutral-soft p-5 text-center">
      <UploadCloud aria-hidden="true" className="mx-auto mb-3 size-8" />
      <label htmlFor={`${id}-file`} className="block text-body font-bold">{translate("documents.uploadForm_file_select_2")}</label>
      <input ref={input} id={`${id}-file`} type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" disabled={busy || disabled} onChange={e => choose(e.target.files)} className="mt-4 block w-full min-w-0 max-w-full text-body file:mr-2 file:min-h-11 file:rounded-control file:border file:border-border file:bg-surface file:px-3" />
      {file && <p className="mt-3 break-all text-body">{file.name}</p>}
    </div>
    <p className="text-caption text-muted">{translate("documents.uploadForm_pdf_atMost_page_image_file_format_check")}</p>
    {message && <p role="alert" tabIndex={-1} className="break-words text-body">{message}</p>}
    {success && <p role="status" className="text-body">{translate("documents.uploadForm_upload_count_list_processing_status_confirm")}</p>}
    {!!candidates.length && <p role="status" className="break-words text-body">{translate("documents.uploadForm_duplicate_original_candidate_provided_upload_count_record", { value1: candidates.map(id => `#${id}`).join(", ") })}</p>}
    {busy && <p role="status" className="text-body">{translate("documents.uploadForm_upload_request_processing_progress")}</p>}
    <div className="flex flex-wrap gap-3"><button className={primaryButton} disabled={busy || disabled} type="submit">{busy ? translate("documents.uploadForm_upload_request") : translate("documents.uploadForm_file_upload")}</button>
      {busy && <button className={secondaryButton} type="button" onClick={() => controller.current?.abort()}>{translate("documents.uploadForm_request_pending_stop")}</button>}
    </div>
    <p className="text-caption text-muted">{translate("documents.uploadForm_request_stop_count_processing_cancel_error_list")}</p>
  </form>;
}
