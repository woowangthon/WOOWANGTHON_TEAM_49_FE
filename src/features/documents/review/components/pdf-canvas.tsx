"use client";
import { useEffect, useRef, useState } from "react";
import type { PDFDocumentProxy, RenderTask } from "pdfjs-dist";
export default function PdfCanvas({url,page,pageCount,rotation,onRendered}:{url:string;page:number;pageCount:number;rotation:number|null;onRendered:(page:number,rotation:number)=>void}){
  const canvas=useRef<HTMLCanvasElement>(null);
  const [loaded,setLoaded]=useState<{url:string;pdf:PDFDocumentProxy}>();
  const [rendered,setRendered]=useState<{page:number;url:string}>();
  const [error,setError]=useState(false);
  const previous=useRef<Promise<unknown>>(Promise.resolve());
  useEffect(()=>{
    let disposed=false;let destroy:(()=>void)|undefined;
    void import("pdfjs-dist").then(pdfjs=>{
      if(disposed)return;
      pdfjs.GlobalWorkerOptions.workerSrc=new URL("pdfjs-dist/build/pdf.worker.min.mjs",import.meta.url).toString();
      const task=pdfjs.getDocument({url,enableXfa:false});
      destroy=()=>{void task.destroy();};
      return task.promise.then(pdf=>{if(!disposed){if(pdf.numPages!==pageCount){setError(true);return;}setLoaded({url,pdf});}});
    }).catch(()=>{if(!disposed)setError(true);});
    return()=>{disposed=true;destroy?.();};
  },[url,pageCount]);
  useEffect(()=>{
    if(!loaded||loaded.url!==url)return;
    let disposed=false;let task:RenderTask|undefined;
    const job=previous.current.catch(()=>{}).then(async()=>{
      const pdfPage=await loaded.pdf.getPage(page);
      if(disposed||!canvas.current)return;
      const viewport=pdfPage.getViewport({scale:1.5,rotation:rotation??pdfPage.rotate});
      const element=canvas.current;const ctx=element.getContext("2d");if(!ctx)throw new Error("CANVAS_UNAVAILABLE");
      element.width=Math.ceil(viewport.width);element.height=Math.ceil(viewport.height);
      task=pdfPage.render({canvas:element,canvasContext:ctx,viewport});await task.promise;
      if(!disposed){setRendered({page,url});setError(false);onRendered(page,pdfPage.rotate);}
    }).catch(()=>{if(!disposed)setError(true);});
    previous.current=job;
    return()=>{disposed=true;task?.cancel();};
  },[loaded,url,page,rotation,onRendered]);
  if(error)return <p role="alert">PDF를 표시할 수 없습니다. 파일 또는 페이지 정보를 확인하고 원문을 다시 불러와 주세요.</p>;
  return <><canvas ref={canvas} role="img" aria-label={`PDF 원문 ${page}페이지`} className="block h-auto w-full" />{(rendered?.page!==page||rendered.url!==url)&&<p role="status">PDF 페이지를 그리는 중…</p>}</>;
}
