import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requirements = JSON.parse(await readFile(path.join(root, 'sample', 'requirements.json'), 'utf8'));
const sourceByRequirement = new Map([
  ['R01', 'trade_license_2026.pdf'],
  ['R02', 'tin_certificate.pdf'],
  ['R03', 'vat_registration.pdf'],
  ['R04', 'bank_solvency.pdf'],
  ['R05', 'experience_certificate.pdf'],
  ['R08', 'technical_proposal.pdf'],
  ['R09', 'financial_proposal.pdf'],
  ['R11', 'signed_declaration.pdf'],
]);

const included = requirements.requirements
  .slice()
  .sort((a, b) => a.order - b.order)
  .filter((item) => sourceByRequirement.has(item.id))
  .map((requirement) => ({
    requirement,
    fileName: sourceByRequirement.get(requirement.id),
  }));

const output = await PDFDocument.create();
const regular = await output.embedFont(StandardFonts.Helvetica);
const bold = await output.embedFont(StandardFonts.HelveticaBold);
const pageSize = [595.28, 841.89];

const pageCounts = [];
for (const item of included) {
  const bytes = await readFile(path.join(root, 'sample', 'pdfs', item.fileName));
  const source = await PDFDocument.load(bytes);
  pageCounts.push(source.getPageCount());
}

const indexItems = included.map((item, index) => ({
  ...item,
  startPage: 3 + pageCounts.slice(0, index).reduce((sum, count) => sum + count, 0),
}));

function drawFooter(page, pageNumber, totalPages) {
  const footer = `${requirements.tender.tender_id} | Page ${pageNumber} of ${totalPages}`;
  const size = 8;
  const width = page.getWidth();
  const textWidth = regular.widthOfTextAtSize(footer, size);
  page.drawRectangle({ x: 0, y: 0, width, height: 27, color: rgb(0.98, 0.99, 1) });
  page.drawLine({ start: { x: 26, y: 26 }, end: { x: width - 26, y: 26 }, thickness: 0.5, color: rgb(0.82, 0.86, 0.91) });
  page.drawText(footer, { x: width - textWidth - 26, y: 10, size, font: regular, color: rgb(0.31, 0.36, 0.44) });
}

function drawCover(page) {
  const width = page.getWidth();
  const height = page.getHeight();
  const ink = rgb(0.08, 0.12, 0.2);
  const muted = rgb(0.36, 0.42, 0.5);
  const accent = rgb(0.12, 0.38, 0.88);
  page.drawRectangle({ x: 0, y: height - 112, width, height: 112, color: rgb(0.06, 0.12, 0.24) });
  page.drawCircle({ x: width - 72, y: height - 52, size: 100, color: rgb(0.12, 0.29, 0.53), opacity: 0.55 });
  page.drawText('TENDER DOCUMENT PACKAGE', { x: 48, y: height - 55, size: 20, font: bold, color: rgb(1, 1, 1) });
  page.drawText('Submission-ready document set', { x: 48, y: height - 78, size: 9, font: regular, color: rgb(0.77, 0.84, 0.95) });

  let y = height - 157;
  const labelValue = (label, value) => {
    page.drawText(label.toUpperCase(), { x: 48, y, size: 7, font: bold, color: muted });
    y -= 16;
    page.drawText(String(value || '—'), { x: 48, y, size: 13, font: bold, color: ink, maxWidth: width - 96 });
    y -= 35;
  };
  labelValue('Tender ID', requirements.tender.tender_id);
  labelValue('Tender Title', requirements.tender.title);
  labelValue('Procuring Entity', requirements.tender.procuring_entity);
  labelValue('Bidder', requirements.tender.bidder);
  labelValue('Submission Deadline', requirements.tender.submission_deadline);
  labelValue('Package Created', '06 October 2026');

  page.drawLine({ start: { x: 48, y: y + 11 }, end: { x: width - 48, y: y + 11 }, thickness: 1, color: rgb(0.86, 0.89, 0.94) });
  y -= 18;
  page.drawText('INCLUDED DOCUMENTS', { x: 48, y, size: 9, font: bold, color: accent });
  y -= 20;
  indexItems.forEach((item, index) => {
    page.drawText(String(index + 1).padStart(2, '0'), { x: 48, y, size: 9, font: bold, color: accent });
    page.drawText(item.requirement.title_en, { x: 84, y, size: 9.5, font: regular, color: ink, maxWidth: width - 132 });
    y -= 17;
  });
  page.drawText('Prepared locally in Tender Package Builder', { x: 48, y: 34, size: 8, font: regular, color: muted });
}

function drawIndex(page) {
  const width = page.getWidth();
  const height = page.getHeight();
  const ink = rgb(0.08, 0.12, 0.2);
  const muted = rgb(0.36, 0.42, 0.5);
  page.drawText('DOCUMENT INDEX', { x: 48, y: height - 80, size: 22, font: bold, color: ink });
  page.drawText('Documents included in the order defined by the tender requirements.', { x: 48, y: height - 102, size: 9, font: regular, color: muted });
  let y = height - 155;
  page.drawText('DOCUMENT', { x: 48, y, size: 8, font: bold, color: muted });
  page.drawText('START PAGE', { x: width - 126, y, size: 8, font: bold, color: muted });
  y -= 13;
  page.drawLine({ start: { x: 48, y }, end: { x: width - 48, y }, thickness: 0.7, color: rgb(0.84, 0.87, 0.91) });
  y -= 25;
  indexItems.forEach((item) => {
    page.drawText(item.requirement.title_en, { x: 48, y, size: 10.5, font: regular, color: ink, maxWidth: width - 190 });
    page.drawText(String(item.startPage), { x: width - 105, y, size: 10.5, font: bold, color: ink });
    y -= 25;
  });
}

const cover = output.addPage(pageSize);
const index = output.addPage(pageSize);
drawCover(cover);
drawIndex(index);

for (const item of included) {
  const bytes = await readFile(path.join(root, 'sample', 'pdfs', item.fileName));
  const source = await PDFDocument.load(bytes);
  for (const sourcePage of source.getPages()) {
    const sourceWidth = sourcePage.getWidth();
    const sourceHeight = sourcePage.getHeight();
    const embeddedPage = await output.embedPage(sourcePage);
    const destination = output.addPage([sourceWidth, sourceHeight + 34]);
    destination.drawPage(embeddedPage, { x: 0, y: 34, width: sourceWidth, height: sourceHeight });
  }
}

const totalPages = output.getPageCount();
output.getPages().forEach((page, index) => drawFooter(page, index + 1, totalPages));
const outDir = path.join(root, 'output');
await mkdir(outDir, { recursive: true });
const outputPath = path.join(outDir, `${requirements.tender.tender_id}_Package.pdf`);
await writeFile(outputPath, await output.save({ useObjectStreams: true }));
console.log(`Created ${outputPath}`);
console.log(`Included ${included.length} documents across ${totalPages} pages.`);
