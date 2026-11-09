"use client";
import { useEffect, useState } from "react";
export function useObjectUrl(blob:Blob|undefined){
  const [resource,setResource]=useState<{blob:Blob;url:string}>();
  useEffect(()=>{
    if(!blob)return;
    const url=URL.createObjectURL(blob);
    // The URL is an external browser resource; publish it only after acquisition and revoke it in cleanup.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setResource({blob,url});
    return()=>URL.revokeObjectURL(url);
  },[blob]);
  return resource?.blob===blob?resource?.url:undefined;
}
