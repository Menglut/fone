import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

export async function createPdfBuffer(title, content) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontSize = 11;
  const margin = 50;
  const width = page.getWidth() - margin * 2;

  const fullText = `${title}\n\n${content}`;
  const lines = wrapText(fullText, 40); // 대충 40자 기준 줄바꿈

  let y = page.getHeight() - margin;

  for (const line of lines) {
    if (y < margin) {
      const newPage = pdfDoc.addPage([595.28, 841.89]);
      y = newPage.getHeight() - margin;
      newPage.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
      y -= 16;
    } else {
      page.drawText(line, { x: margin, y, size: fontSize, font, color: rgb(0, 0, 0) });
      y -= 16;
    }
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

function wrapText(str, maxChars) {
  return str.split('\n').flatMap((p) => {
    const out = [];
    let s = p.trim();
    while (s.length > maxChars) {
      out.push(s.slice(0, maxChars));
      s = s.slice(maxChars);
    }
    out.push(s);
    return out.concat(['']);
  });
}
