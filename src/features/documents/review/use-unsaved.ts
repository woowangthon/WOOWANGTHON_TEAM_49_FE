"use client";
import { useEffect } from "react";
export const discardChanges = () => window.confirm("저장하지 않은 변경이 있습니다. 변경을 버리고 이동할까요?");
export function useUnsavedChanges(dirty:boolean){
  useEffect(()=>{
    if(!dirty)return;
    const unload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
    const navigation=(event:MouseEvent)=>{
      const target=event.target instanceof Element?event.target.closest("a[href]"):null;
      if(target&&!event.defaultPrevented&&!discardChanges()){event.preventDefault();event.stopPropagation();}
    };
    window.addEventListener("beforeunload",unload);document.addEventListener("click",navigation,true);
    return()=>{window.removeEventListener("beforeunload",unload);document.removeEventListener("click",navigation,true);};
  },[dirty]);
}
