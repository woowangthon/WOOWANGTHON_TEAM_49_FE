"use client";

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Printer, X } from 'lucide-react';
import { useTranslation } from '@/i18n/use-translation';
import { useObjectUrl } from '@/features/documents/review/use-object-url';
import { saveDownload } from '@/lib/api/download';
import styles from './reports-screen.module.css';

const PdfCanvas=dynamic(()=>import('@/features/documents/review/components/pdf-canvas'),{ssr:false});
export function ReportPdfPreview({file,onClose}:{file:{blob:Blob;filename:string};onClose:()=>void}) {
  const {translate}=useTranslation();
  const url=useObjectUrl(file.blob), dialog=useRef<HTMLDialogElement>(null), printer=useRef<HTMLIFrameElement>(null);
  const [page,setPage]=useState(1),[pages,setPages]=useState<number|null>(null),[printReady,setPrintReady]=useState(false),[printError,setPrintError]=useState(false);
  const onRendered=useCallback(()=>{},[]);
  useEffect(()=>{
    const element=dialog.current,previous=document.activeElement;
    element?.showModal();
    return ()=>{element?.close();if(previous instanceof HTMLElement&&previous.isConnected)previous.focus()};
  },[]);
  function print() {
    try {
      if(!printer.current?.contentWindow)throw new Error('PDF_PRINT_UNAVAILABLE');
      printer.current.contentWindow.focus();printer.current.contentWindow.print();
    } catch {setPrintError(true)}
  }
  return <dialog ref={dialog} className={styles.previewDialog} aria-labelledby="report-preview-title" onCancel={event=>{event.preventDefault();onClose()}}>
    <header className={styles.previewHeader}><div><h2 id="report-preview-title">{translate('caseSupport.bundle_preview')}</h2><p>{file.filename}</p></div><button className={styles.iconButton} onClick={onClose} aria-label={translate('caseSupport.bundle_closePreview')}><X size={23} aria-hidden="true"/></button></header>
    <div className={styles.previewActions}><button disabled={!url||page<=1} onClick={()=>setPage(p=>p-1)}>{translate('documents.originalViewer_previous_page')}</button><span aria-live="polite">{translate('documents.originalViewer_page',{value1:page,value2:pages??'?'})}</span><button disabled={!url||pages===null||page>=pages} onClick={()=>setPage(p=>p+1)}>{translate('documents.originalViewer_next_page')}</button><button disabled={!url} onClick={()=>saveDownload(file)}><Download size={17} aria-hidden="true"/>{translate('caseSupport.reportPresentation_pdf_download')}</button><button disabled={!url||!printReady} onClick={print}><Printer size={17} aria-hidden="true"/>{translate('caseSupport.bundle_print')}</button></div>
    <p className={styles.printHelp}>{translate('caseSupport.bundle_printHelp')}</p>
    {printError&&<p role="alert">{translate('caseSupport.bundle_printFallback')}</p>}
    <div className={styles.pdfViewport}>{url?<PdfCanvas url={url} page={page} pageCount={null} rotation={null} onRendered={onRendered} onDocumentLoaded={setPages}/>:<p role="status">{translate('caseSupport.bundle_loadingPdf')}</p>}</div>
    {url&&<iframe ref={printer} className={styles.printFrame} title={translate('caseSupport.bundle_printDocument')} src={url} aria-hidden="true" tabIndex={-1} onLoad={()=>setPrintReady(true)}/>}
  </dialog>;
}
