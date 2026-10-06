import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist/build/pdf.mjs';
import workerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerSrc;

export async function inspectPdf(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
  const pageCount = pdf.numPages;
  await pdf.destroy();
  return { buffer, pageCount };
}

export async function renderPdfPage(file, pageNumber, scale = 1.3) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer.slice(0) }).promise;
  const page = await pdf.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement('canvas');
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const context = canvas.getContext('2d', { alpha: false });
  await page.render({ canvasContext: context, viewport }).promise;
  await pdf.destroy();
  return canvas;
}

function drawFooter(page, tenderId, pageNumber, totalPages, font) {
  const pageWidth = page.getWidth();
  const footerText = `${tenderId} | Page ${pageNumber} of ${totalPages}`;
  const fontSize = 8;
  const textWidth = font.widthOfTextAtSize(footerText, fontSize);
  page.drawRectangle({ x: 0, y: 0, width: pageWidth, height: 27, color: rgb(0.98, 0.99, 1), opacity: 0.97 });
  page.drawLine({ start: { x: 26, y: 26 }, end: { x: pageWidth - 26, y: 26 }, thickness: 0.5, color: rgb(0.82, 0.86, 0.91) });
  page.drawText(footerText, { x: pageWidth - textWidth - 26, y: 10, size: fontSize, font, color: rgb(0.31, 0.36, 0.44) });
}

function drawCover(page, tender, included, font, boldFont, createdDate) {
  const width = page.getWidth();
  const height = page.getHeight();
  const ink = rgb(0.08, 0.12, 0.2);
  const muted = rgb(0.36, 0.42, 0.5);
  const accent = rgb(0.12, 0.38, 0.88);
  page.drawRectangle({ x: 0, y: height - 112, width, height: 112, color: rgb(0.06, 0.12, 0.24) });
  page.drawCircle({ x: width - 72, y: height - 52, size: 100, color: rgb(0.12, 0.29, 0.53), opacity: 0.55 });
  page.drawText('TENDER DOCUMENT PACKAGE', { x: 48, y: height - 55, size: 20, font: boldFont, color: rgb(1, 1, 1) });
  page.drawText('Submission-ready document set', { x: 48, y: height - 78, size: 9, font, color: rgb(0.77, 0.84, 0.95) });

  let y = height - 157;
  const drawLabelValue = (label, value) => {
    page.drawText(label.toUpperCase(), { x: 48, y, size: 7, font: boldFont, color: muted });
    y -= 16;
    page.drawText(String(value || '—'), { x: 48, y, size: 13, font: boldFont, color: ink, maxWidth: width - 96 });
    y -= 35;
  };
  drawLabelValue('Tender ID', tender.tender_id);
  drawLabelValue('Tender Title', tender.title);
  drawLabelValue('Procuring Entity', tender.procuring_entity);
  drawLabelValue('Bidder', tender.bidder);
  drawLabelValue('Submission Deadline', tender.submission_deadline);
  drawLabelValue('Package Created', createdDate);

  page.drawLine({ start: { x: 48, y: y + 11 }, end: { x: width - 48, y: y + 11 }, thickness: 1, color: rgb(0.86, 0.89, 0.94) });
  y -= 18;
  page.drawText('INCLUDED DOCUMENTS', { x: 48, y, size: 9, font: boldFont, color: accent });
  y -= 20;
  included.forEach((item, index) => {
    page.drawText(String(index + 1).padStart(2, '0'), { x: 48, y, size: 9, font: boldFont, color: accent });
    page.drawText(item.title, { x: 84, y, size: 9.5, font, color: ink, maxWidth: width - 132 });
    y -= 17;
  });
  page.drawText('Prepared locally in Tender Package Builder', { x: 48, y: 34, size: 8, font, color: muted });
}

function drawIndex(page, included, font, boldFont) {
  const width = page.getWidth();
  const height = page.getHeight();
  const ink = rgb(0.08, 0.12, 0.2);
  const muted = rgb(0.36, 0.42, 0.5);
  page.drawText('DOCUMENT INDEX', { x: 48, y: height - 80, size: 22, font: boldFont, color: ink });
  page.drawText('Documents included in the order defined by the tender requirements.', { x: 48, y: height - 102, size: 9, font, color: muted });
  let y = height - 155;
  page.drawText('DOCUMENT', { x: 48, y, size: 8, font: boldFont, color: muted });
  page.drawText('START PAGE', { x: width - 126, y, size: 8, font: boldFont, color: muted });
  y -= 13;
  page.drawLine({ start: { x: 48, y }, end: { x: width - 48, y }, thickness: 0.7, color: rgb(0.84, 0.87, 0.91) });
  y -= 25;
  included.forEach((item) => {
    page.drawText(item.title, { x: 48, y, size: 10.5, font, color: ink, maxWidth: width - 190 });
    page.drawText(String(item.startPage), { x: width - 105, y, size: 10.5, font: boldFont, color: ink });
    y -= 25;
  });
}

export async function createTenderPackage({ tender, includedItems, filesById, fileBufferCache }) {
  const output = await PDFDocument.create();
  const font = await output.embedFont(StandardFonts.Helvetica);
  const boldFont = await output.embedFont(StandardFonts.HelveticaBold);
  const coverPage = output.addPage([595.28, 841.89]);
  const indexPage = output.addPage([595.28, 841.89]);
  const createdDate = new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());
  let nextStartPage = 3;
  const indexItems = includedItems.map((item) => {
    const result = { ...item, startPage: nextStartPage };
    nextStartPage += item.file.pageCount;
    return result;
  });
  drawCover(coverPage, tender, indexItems, font, boldFont, createdDate);
  drawIndex(indexPage, indexItems, font, boldFont);

  for (const item of includedItems) {
    const file = filesById[item.file.id];
    let sourceBuffer = fileBufferCache.get(file.id);
    if (!sourceBuffer) {
      sourceBuffer = await file.file.arrayBuffer();
      fileBufferCache.set(file.id, sourceBuffer);
    }
    const source = await PDFDocument.load(sourceBuffer, { ignoreEncryption: false });
    const sourcePages = source.getPages();
    for (const sourcePage of sourcePages) {
      const sourceWidth = sourcePage.getWidth();
      const sourceHeight = sourcePage.getHeight();
      const embeddedPage = await output.embedPage(sourcePage);
      const destination = output.addPage([sourceWidth, sourceHeight + 34]);
      destination.drawPage(embeddedPage, { x: 0, y: 34, width: sourceWidth, height: sourceHeight });
    }
  }
  const totalPages = output.getPageCount();
  output.getPages().forEach((page, index) => drawFooter(page, tender.tender_id, index + 1, totalPages, font));
  const bytes = await output.save({ useObjectStreams: true });
  return { bytes, totalPages, includedCount: includedItems.length, fileName: `${tender.tender_id}_Package.pdf` };
}
