// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { ViewerContent } from "./components/original-viewer";

afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
it("waits for the image, centers the source inside its viewport and replaces the highlight",async()=>{
  const scroll=vi.fn();
  HTMLElement.prototype.scrollTo=scroll;
  vi.stubGlobal("matchMedia",()=>({matches:true}));
  const preview={documentId:101,mediaType:"image/png",pageCount:2,coordinateSystem:"RELATIVE_0_1",rotationDegrees:0,supportsHighlight:true};
  const source={documentId:101,page:1,text:"source",coordinateSystem:"RELATIVE_0_1",boundingBox:[0.1,0.2,0.3,0.1] as [number,number,number,number]};
  const props={url:"blob:local",preview,onRetry:vi.fn()};
  const {rerender}=render(<ViewerContent {...props} source={source}/>);
  expect(scroll).not.toHaveBeenCalled();
  const viewport=screen.getByLabelText("확대한 원문 스크롤 영역");
  Object.defineProperty(viewport,"clientHeight",{value:200});
  vi.spyOn(HTMLElement.prototype,"getBoundingClientRect").mockImplementation(function(this:HTMLElement){return {top:this===viewport?100:450,left:0,width:100,height:this===viewport?200:50,bottom:500,right:100,x:0,y:0,toJSON(){}};});
  fireEvent.load(screen.getByRole("img",{name:"문서 원문 1페이지"}));
  await waitFor(()=>expect(scroll).toHaveBeenCalledWith(expect.objectContaining({top:275,behavior:"instant"})));
  const first=screen.getByRole("img",{name:"선택한 필드의 원문 위치"});
  rerender(<ViewerContent {...props} source={{...source,boundingBox:[0.5,0.6,0.2,0.1]}}/>);
  expect(screen.getByRole("img",{name:"선택한 필드의 원문 위치"})).not.toBe(first);
  rerender(<ViewerContent {...props} source={{...source,boundingBox:null}}/>);
  expect(screen.queryByRole("img",{name:"선택한 필드의 원문 위치"})).toBeNull();
});
