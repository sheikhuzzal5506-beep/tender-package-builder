import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const sampleDir = path.join(root, 'sample', 'pdfs');
const outputDir = path.join(root, 'output');
await fs.mkdir(sampleDir, { recursive: true });
await fs.mkdir(outputDir, { recursive: true });

const docs = [
  ['trade_license_2026.pdf', 'TRADE LICENSE · VALID THROUGH 2027-06-30', 1],
  ['trade_license_2025_expired.pdf', 'TRADE LICENSE · EXPIRED 2025-06-30', 1],
  ['tin_certificate.pdf', 'TIN CERTIFICATE · TIN 123456789', 2],
  ['vat_registration.pdf', 'VAT REGISTRATION CERTIFICATE · BIN 987654321', 1],
  ['bank_solvency.pdf', 'BANK SOLVENCY CERTIFICATE · MEGHNA TECH SOLUTIONS LTD.', 2],
  ['experience_certificate.pdf', 'EXPERIENCE CERTIFICATE · GOVERNMENT SUPPLY CONTRACT', 2],
  ['experience_certificate_copy.pdf', 'EXPERIENCE CERTIFICATE · GOVERNMENT SUPPLY CONTRACT', 2],
  ['technical_proposal.pdf', 'TECHNICAL PROPOSAL · SUPPLY OF IT EQUIPMENT', 3],
  ['financial_proposal.pdf', 'FINANCIAL PROPOSAL · SUPPLY OF IT EQUIPMENT', 2],
  ['signed_declaration.pdf', 'SIGNED DECLARATION · MEGHNA TECH SOLUTIONS LTD.', 1],
];

for (const [filename, label, pageCount] of docs) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  for (let pageNo = 1; pageNo <= pageCount; pageNo += 1) {
    const page = pdf.addPage([595, 842]);
    page.drawRectangle({ x: 0, y: 760, width: 595, height: 82, color: rgb(0.08, 0.15, 0.3) });
    page.drawText(label, { x: 42, y: 794, size: 17, font: bold, color: rgb(1, 1, 1), maxWidth: 510 });
    page.drawText(`Sample source document · page ${pageNo} of ${pageCount}`, { x: 42, y: 712, size: 11, font, color: rgb(0.35, 0.4, 0.48) });
    page.drawText('This generated sample PDF is used to demonstrate local page counting, matching, duplicate detection, and ordered package assembly.', { x: 42, y: 670, size: 12, font, color: rgb(0.16, 0.2, 0.28), maxWidth: 490, lineHeight: 19 });
    page.drawLine({ start: { x: 42, y: 625 }, end: { x: 553, y: 625 }, thickness: 1, color: rgb(0.86, 0.88, 0.92) });
    page.drawText('Meghna Tech Solutions Ltd.', { x: 42, y: 88, size: 10, font: bold, color: rgb(0.31, 0.37, 0.46) });
  }
  await fs.writeFile(path.join(sampleDir, filename), await pdf.save());
}

console.log(`Created ${docs.length} sample PDFs in ${sampleDir}`);
