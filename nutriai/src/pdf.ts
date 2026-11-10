import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { createWorker } from 'tesseract.js';
import { emptyNutrients, uid, type Meal, type Ingredient } from './db';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export async function extractPDF(file: File, onProgress: (status: string) => void): Promise<string> {
  const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  let text = '';
  let ocrWorker: Awaited<ReturnType<typeof createWorker>> | undefined;

  try {
    for (let n = 1; n <= doc.numPages; n++) {
      onProgress(`Pagina ${n}/${doc.numPages}`);
      const page = await doc.getPage(n);
      const content = await page.getTextContent();
      let pageText = content.items.map(item => ('str' in item ? item.str : '')).join(' ');

      if (pageText.trim().length < 35) {
        onProgress(`OCR pagina ${n}/${doc.numPages} (può richiedere tempo)`);
        ocrWorker ??= await createWorker('ita+eng');
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Canvas non disponibile');

        await page.render({ canvasContext: context, viewport }).promise;
        pageText = (await ocrWorker.recognize(canvas)).data.text;
      }

      text += `\n--- PAGINA ${n} ---\n${pageText}\n`;
    }
  } finally {
    await ocrWorker?.terminate();
  }

  return text;
}

// Conservative heuristic: extract headings only. Never fabricate portions, options or nutrients.
export function draftMeals(text: string): Meal[] {
  const lines = text
    .split(/\n|(?=\b(?:colazione|spuntino|pranzo|merenda|cena)\s*[:\-])/i)
    .map(line => line.trim())
    .filter(Boolean);
  const found: Meal[] = [];

  for (const line of lines) {
    const match = line.match(/\b(colazione|spuntino|pranzo|merenda|cena)\b\s*[:\-]?\s*(.*)/i);
    if (!match) continue;

    const name = match[1].toLowerCase();
    const description = match[2].trim();
    const ingredient: Ingredient = {
      id: uid(),
      name: description || 'Da verificare nel PDF',
      grams: null,
      weightState: 'non_specificato',
      nutrients: emptyNutrients(),
      source: 'PDF',
      confirmed: false,
    };

    found.push({
      id: uid(),
      name: name[0].toUpperCase() + name.slice(1),
      dayType: 'Giornata standard',
      alternatives: description ? [[ingredient]] : [],
      notes: 'Bozza automatica: verificare ingredienti, quantità e alternative con il PDF originale.',
      needsReview: true,
    });
  }

  return found;
}
