import type { Report } from "@/features/case-support/schemas";
// Synthetic ASCII PDF, generated only in MSW, never a frontend wage engine.
export function reportPdf(r:Report):Uint8Array<ArrayBuffer>{
 const lines=["WAGEITDA MOCK REPORT - NOT AN OFFICIAL DOCUMENT",`Report ${r.reportId} / version ${r.version}`,`Input version ${r.basedOnInputVersion}`,`Original IDs: ${r.selectedDocumentIds.join(", ")}`,JSON.stringify(r.referencedSnapshots)];
 const content="BT /F1 10 Tf 30 740 Td "+lines.map((s,i)=>`${i?"0 -30 Td ":""}(${s.replace(/[()\\]/g," ")}) Tj`).join(" ")+" ET";
 const objects=["<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids [3 0 R] /Count 1 >>","<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>","<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",`<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
 let pdf="%PDF-1.4\n";const offsets=[0];objects.forEach((o,i)=>{offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${o}\nendobj\n`});const start=pdf.length;pdf+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(o=>`${String(o).padStart(10,"0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;return new TextEncoder().encode(pdf);
}
export interface MockOriginal { documentId:number; name:string; bytes:Uint8Array<ArrayBuffer> }
/** Stored ZIP fixture serializer, used exclusively by MSW. */
export function snapshotZip(r:Report, originals:MockOriginal[]=[]):Uint8Array<ArrayBuffer>{
 const encoder=new TextEncoder();
 const entries=[{name:"result-snapshot.json",bytes:encoder.encode(JSON.stringify(r))},...originals.filter(f=>r.selectedDocumentIds.includes(f.documentId)).map(f=>({name:`originals/${f.documentId}-${f.name.replace(/[\\/\x00-\x1f]/g,"_")}`,bytes:f.bytes}))];
 const locals:Uint8Array[]=[],centrals:Uint8Array[]=[];let offset=0;
 for(const entry of entries){
  const name=encoder.encode(entry.name),data=entry.bytes;let crc=0xffffffff;
  for(const b of data){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}crc=(crc^0xffffffff)>>>0;
  const local=new Uint8Array(30+name.length+data.length),central=new Uint8Array(46+name.length);
  const l=new DataView(local.buffer),c=new DataView(central.buffer);
  l.setUint32(0,0x04034b50,true);l.setUint16(4,20,true);l.setUint16(6,0x800,true);l.setUint32(14,crc,true);l.setUint32(18,data.length,true);l.setUint32(22,data.length,true);l.setUint16(26,name.length,true);local.set(name,30);local.set(data,30+name.length);
  c.setUint32(0,0x02014b50,true);c.setUint16(4,20,true);c.setUint16(6,20,true);c.setUint16(8,0x800,true);c.setUint32(16,crc,true);c.setUint32(20,data.length,true);c.setUint32(24,data.length,true);c.setUint16(28,name.length,true);c.setUint32(42,offset,true);central.set(name,46);
  locals.push(local);centrals.push(central);offset+=local.length;
 }
 const centralSize=centrals.reduce((n,v)=>n+v.length,0);const result=new Uint8Array(offset+centralSize+22);let position=0;
 for(const part of [...locals,...centrals]){result.set(part,position);position+=part.length;}
 const end=new DataView(result.buffer,position);end.setUint32(0,0x06054b50,true);end.setUint16(8,entries.length,true);end.setUint16(10,entries.length,true);end.setUint32(12,centralSize,true);end.setUint32(16,offset,true);return result;
}
