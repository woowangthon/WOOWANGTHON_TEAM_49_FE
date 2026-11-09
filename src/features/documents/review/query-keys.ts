import { documentKeys } from "../query-keys";
export const reviewKeys = {
  fields: (g:number,c:number,d:number) => [...documentKeys.root(g),"fields",{kind:"case",id:c},d] as const,
  review: (g:number,c:number,d:number) => [...documentKeys.root(g),"review",{kind:"case",id:c},d] as const,
  history: (g:number,c:number,d:number,f:number,page:number) => [...documentKeys.root(g),"history",{kind:"case",id:c},d,f,page] as const,
  preview: (g:number,w:number,d:number) => [...documentKeys.root(g),"preview",{kind:"workplace",id:w},d] as const,
  file: (g:number,w:number,d:number) => [...documentKeys.root(g),"file",{kind:"workplace",id:w},d] as const,
  replacement: (g:number,c:number,r:string|number) => [...documentKeys.root(g),"replacement",{kind:"case",id:c},r] as const,
};
