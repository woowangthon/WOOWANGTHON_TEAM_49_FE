/** Synthetic, public development fixture. No personal information or wage calculation. */
export function samplePdf(): Uint8Array<ArrayBuffer> {
  const content = "BT /F1 20 Tf 50 740 Td (WAGEITDA - MOCK SAMPLE ONLY) Tj 0 -50 Td /F1 14 Tf (Gross pay: KRW 2,300,000) Tj 0 -30 Td (Deductions: unconfirmed) Tj 0 -30 Td (Net pay: KRW 2,100,000) Tj 0 -30 Td (Bonus: KRW 0) Tj 0 -60 Td (Synthetic document. Not a real payslip.) Tj ET";
  const objects = ["<< /Type /Catalog /Pages 2 0 R >>", "<< /Type /Pages /Kids [3 0 R] /Count 1 >>", "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>", "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>", `<< /Length ${content.length} >>\nstream\n${content}\nendstream`];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => { offsets.push(pdf.length); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = pdf.length;
  pdf += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new TextEncoder().encode(pdf);
}
