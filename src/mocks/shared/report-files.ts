import type { Report } from "@/features/case-support/schemas";
// Synthetic ASCII PDF, generated only in MSW, never a frontend wage engine.
export function reportPdf(r:Report):Uint8Array<ArrayBuffer>{
 const lines=["WAGEITDA MOCK REPORT - NOT AN OFFICIAL DOCUMENT",`Report ${r.reportId} / version ${r.version}`,`Input version ${r.basedOnInputVersion}`,`Original IDs: ${r.selectedDocumentIds.join(", ")}`,JSON.stringify(r.referencedSnapshots)];
 const content="BT /F1 10 Tf 30 740 Td "+lines.map((s,i)=>`${i?"0 -30 Td ":""}(${s.replace(/[()\\]/g," ")}) Tj`).join(" ")+" ET";
 const objects=["<< /Type /Catalog /Pages 2 0 R >>","<< /Type /Pages /Kids [3 0 R] /Count 1 >>","<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>","<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",`<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
 let pdf="%PDF-1.4\n";const offsets=[0];objects.forEach((o,i)=>{offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${o}\nendobj\n`});const start=pdf.length;pdf+=`xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(o=>`${String(o).padStart(10,"0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;return new TextEncoder().encode(pdf);
}
export function snapshotZip(r:Report):Uint8Array<ArrayBuffer>{
 const name=new TextEncoder().encode("result-snapshot.json"),data=new TextEncoder().encode(JSON.stringify(r));let crc=0xffffffff;for(const b of data){crc^=b;for(let i=0;i<8;i++)crc=(crc>>>1)^((crc&1)?0xedb88320:0)}crc=(crc^0xffffffff)>>>0;
 const local=30+name.length+data.length,central=46+name.length;const bytes=new Uint8Array(local+central+22);const v=new DataView(bytes.buffer);const u16=(o:number,n:number)=>v.setUint16(o,n,true),u32=(o:number,n:number)=>v.setUint32(o,n,true);
 u32(0,0x04034b50);u16(4,20);u32(14,crc);u32(18,data.length);u32(22,data.length);u16(26,name.length);bytes.set(name,30);bytes.set(data,30+name.length);
 u32(local,0x02014b50);u16(local+4,20);u16(local+6,20);u32(local+16,crc);u32(local+20,data.length);u32(local+24,data.length);u16(local+28,name.length);bytes.set(name,local+46);
 u32(local+central,0x06054b50);u16(local+central+8,1);u16(local+central+10,1);u32(local+central+12,central);u32(local+central+16,local);return bytes;
}
