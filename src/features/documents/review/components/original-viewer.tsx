"use client";
import { translate } from "@/i18n/translate";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./original-viewer.module.css";
import { QueryFeedback } from "@/components/ui/query-feedback";
import { cardStyle, secondaryButton } from "@/components/ui/styles";
import { useOriginalFile, usePreview } from "../queries";
import { useObjectUrl } from "../use-object-url";
import { highlightBox } from "../view-models";
import type { PreviewDto, SourceDto } from "../schemas";
const PdfCanvas=dynamic(()=>import("./pdf-canvas"),{ssr:false,loading:()=> <p role="status">{translate("documents.originalViewer_pdf")}</p>});
export function OriginalViewer({workplaceId,documentId,source,sourceRequest=0,onReady}:{workplaceId:number;documentId:number;source?:SourceDto|null;sourceRequest?:number;onReady?:(ready:boolean)=>void}){
  const preview=usePreview(workplaceId,documentId);const file=useOriginalFile(workplaceId,documentId);
  const url=useObjectUrl(file.data);
  const [retryKey,setRetryKey]=useState(0);
  const retry=()=>{setRetryKey(v=>v+1);void preview.refetch();void file.refetch();};
  if(preview.isError||file.isError)return <QueryFeedback error={preview.error??file.error} retry={retry} />;
  if(preview.isPending||file.isPending||!url)return <QueryFeedback pending />;
  if(preview.data.documentId!==documentId)return <p role="alert">{translate("documents.originalViewer_original_information_match")}</p>;
  const mediaType=file.data.type.split(";",1)[0];
  if(!["application/pdf","image/jpeg","image/png"].includes(preview.data.mediaType)||mediaType!==preview.data.mediaType)return <p role="alert">{translate("documents.originalViewer_original_file_format_match")}</p>;
  return <ViewerContent key={`${documentId}-${retryKey}`} url={url} preview={preview.data} source={source} sourceRequest={sourceRequest} onRetry={retry} onReady={onReady} />;
}
export function ViewerContent({url,preview,source,sourceRequest=0,onRetry,onReady}:{url:string;preview:PreviewDto;source?:SourceDto|null;sourceRequest?:number;onRetry:()=>void;onReady?:(ready:boolean)=>void}){
  const scrollArea=useRef<HTMLDivElement>(null);
  const marker=useRef<HTMLDivElement>(null);
  const [manualPage,setManualPage]=useState<{page:number;source:SourceDto|null|undefined;request:number}>();
  // A request is an explicit evidence click, including repeated clicks on the same field.
  const [zoomState,setZoomState]=useState({request:sourceRequest,value:sourceRequest>0?2:1});
  const zoom=zoomState.request===sourceRequest?zoomState.value:sourceRequest>0?2:zoomState.value;
  if(zoomState.request!==sourceRequest)setZoomState({request:sourceRequest,value:zoom});
  const setZoom=(update:(value:number)=>number)=>setZoomState({request:sourceRequest,value:update(zoom)});
  const [imageError,setImageError]=useState(false);
  const [imageLoaded,setImageLoaded]=useState(false);
  const [imageSize,setImageSize]=useState<{width:number;height:number}>();
  const [pdfReady,setPdfReady]=useState<{page:number;rotation:number}>();
  const reportRendered=useCallback((page:number,rotation:number)=>setPdfReady({page,rotation}),[]);
  const sourcePage=source?.documentId===preview.documentId&&source.page&&(preview.pageCount===null||source.page<=preview.pageCount)?source.page:undefined;
  const page=(manualPage?.source===source&&manualPage?.request===sourceRequest?manualPage?.page:undefined)??sourcePage??1;
  const rendered=preview.mediaType==="application/pdf"?pdfReady?.page===page:imageLoaded;
  useEffect(()=>{onReady?.(rendered&&!imageError);return()=>onReady?.(false);},[rendered,imageError,onReady]);
  const box=rendered?highlightBox(preview,source,page,preview.mediaType==="application/pdf"?(pdfReady?.rotation??NaN):0):undefined;
  const hasBox=!!box;
  useEffect(()=>{
    const area=scrollArea.current;
    if(!area||!hasBox)return;
    const reveal=()=>{
      const target=marker.current;if(!target)return;
      const container=area.getBoundingClientRect(),rect=target.getBoundingClientRect();
      area.scrollTo({top:Math.max(0,area.scrollTop+rect.top-container.top-(area.clientHeight-rect.height)/2),left:Math.max(0,area.scrollLeft+rect.left-container.left-(area.clientWidth-rect.width)/2),behavior:window.matchMedia?.("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
    };
    const frame=requestAnimationFrame(reveal);
    const observer=typeof ResizeObserver!=="undefined"?new ResizeObserver(reveal):undefined;
    observer?.observe(area);
    if(marker.current?.parentElement)observer?.observe(marker.current.parentElement);
    return()=>{cancelAnimationFrame(frame);observer?.disconnect();};
  },[source,sourceRequest,page,zoom,hasBox]);
  const radians=(preview.rotationDegrees??0)*Math.PI/180;
  const rotatedSize=imageSize&&preview.rotationDegrees?{
    width:Math.abs(imageSize.width*Math.cos(radians))+Math.abs(imageSize.height*Math.sin(radians)),
    height:Math.abs(imageSize.width*Math.sin(radians))+Math.abs(imageSize.height*Math.cos(radians)),
  }:undefined;
  const rotated=preview.rotationDegrees!==0||(pdfReady!==undefined&&pdfReady.rotation!==0);
  return <section className={`${cardStyle} space-y-4`} data-ui="documents-originalViewer_ariaLabel_section" aria-label={translate("documents.originalViewer_document_original")}>
    {preview.pageCount===null&&<p role="status">{translate("documents.originalViewer_all_page_count_unconfirmed")}</p>}
    <h2 className="text-title font-bold">{translate("documents.originalViewer_document_original_2")}</h2>
    <div className="flex flex-wrap gap-2" data-ui="documents-originalViewer_ariaLabel_div" aria-label={translate("documents.originalViewer_original")}>
      <button className={secondaryButton} disabled={page<=1} onClick={()=>setManualPage({page:page-1,source,request:sourceRequest})}>{translate("documents.originalViewer_previous_page")}</button><p className="self-center text-body">{translate("documents.originalViewer_page", { value1: page, value2: preview.pageCount ?? "?" })}</p><button className={secondaryButton} disabled={preview.pageCount===null||page>=preview.pageCount} onClick={()=>setManualPage({page:page+1,source,request:sourceRequest})}>{translate("documents.originalViewer_next_page")}</button>
      <button className={secondaryButton} disabled={zoom<=0.5} onClick={()=>setZoom(v=>Math.max(0.5,v-0.25))}>{translate("documents.originalViewer_div4")}</button><span className="self-center text-body">{Math.round(zoom*100)}%</span><button className={secondaryButton} disabled={zoom>=3} onClick={()=>setZoom(v=>Math.min(3,v+0.25))}>{translate("documents.originalViewer_div5")}</button>
      {sourcePage&&<button className={secondaryButton} onClick={()=>setManualPage(undefined)}>{translate("documents.originalViewer_selected_evidence_page")}</button>}
      <button className={secondaryButton} onClick={onRetry}>{translate("documents.originalViewer_original_retry_load")}</button>
    </div>
    <div ref={scrollArea} className={`${styles.viewport} max-w-full overflow-auto rounded-control border border-border bg-neutral-soft`} tabIndex={0} data-ui="documents-originalViewer_ariaLabel_div2" aria-label={translate("documents.originalViewer_original_2")}>
      <div className="relative origin-top-left" style={{width:`${zoom*100}%`}}>
        {preview.mediaType==="application/pdf"?<PdfCanvas url={url} page={page} pageCount={preview.pageCount} rotation={preview.rotationDegrees} onRendered={reportRendered} />:<>
          {!imageLoaded&&!imageError&&<p role="status">{translate("documents.originalViewer_original_image_load")}</p>}
          {/* Blob URLs cannot use the Next image optimizer. */}
          <div className="relative" style={rotatedSize?{aspectRatio:`${rotatedSize.width}/${rotatedSize.height}`}:undefined}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={translate("documents.originalViewer_document_original_page", { value1: page })} onLoad={event=>{setImageLoaded(true);const image=event.currentTarget;if(image.naturalWidth>0&&image.naturalHeight>0)setImageSize({width:image.naturalWidth,height:image.naturalHeight});}} onError={()=>setImageError(true)} className="block h-auto w-full" style={rotatedSize&&imageSize?{position:"absolute",width:`${imageSize.width/rotatedSize.width*100}%`,maxWidth:"none",left:"50%",top:"50%",transform:`translate(-50%,-50%) rotate(${preview.rotationDegrees}deg)`}:undefined} />
          </div>
          {imageError&&<p role="alert">{translate("documents.originalViewer_image_count_empty_original_retry")}</p>}
        </>}
        {box&&!imageError&&<div key={JSON.stringify(source)} ref={marker} role="img" aria-label={translate("documents.originalViewer_selected_field_original")} className={styles.highlight} style={box} />}
      </div>
    <div data-original-evidence className="break-words text-body text-muted"><p>{translate("documents.originalViewer_evidence_page", { value1: source?.page??translate("common.notProvided") })}</p><p>{translate("documents.originalViewer_evidence", { value1: source?.text??translate("common.notProvided") })}</p>
      {!box&&<p>{rotated?translate("documents.originalViewer_original_basis"):translate("documents.originalViewer_match_page_information_none")}</p>}
    </div>
    </div>
  </section>;
}
