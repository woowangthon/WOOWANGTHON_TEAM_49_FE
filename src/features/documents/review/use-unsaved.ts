"use client";
import {useTranslation} from "@/i18n/use-translation";
import type {Translation} from "@/i18n/translate";

import { useEffect } from "react";
export const discardChanges = (translate: Translation["translate"]) => window.confirm(translate("documents.useUnsaved_save_change_navigate"));
export function useUnsavedChanges(dirty:boolean){
  const {translate} = useTranslation();
  useEffect(()=>{
    if(!dirty)return;
    const unload=(event:BeforeUnloadEvent)=>{event.preventDefault();event.returnValue="";};
    const navigation=(event:MouseEvent)=>{
      const target=event.target instanceof Element?event.target.closest("a[href]"):null;
      if(target&&!event.defaultPrevented&&!discardChanges(translate)){event.preventDefault();event.stopPropagation();}
    };
    window.addEventListener("beforeunload",unload);document.addEventListener("click",navigation,true);
    return()=>{window.removeEventListener("beforeunload",unload);document.removeEventListener("click",navigation,true);};
  },[dirty, translate]);
}
