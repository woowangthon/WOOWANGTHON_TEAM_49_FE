"use client";
import { translate } from "@/i18n/translate";

import { useEffect } from "react";
export const discardChanges = () => window.confirm(translate("documents.useUnsaved_save_change_navigate"));
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
