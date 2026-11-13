/**
 * Ultra-Fast File, Image & PDF Optimizer + Image Clarity Analyzer
 * Ensures high-resolution preservation of Arabic text and Chemistry/Physics scientific symbols
 * before sending to Hybrid OCR + Gemini AI extraction.
 */

declare global {
  interface Window {
    pdfjsLib?: any;
  }
}

export interface ImageClarityReport {
  isValid: boolean;
  width: number;
  height: number;
  contrastStdDev: number;
  warning?: string;
}

export interface OptimizedAiPayload {
  dataUrl: string;
  mimeType: string;
  extractedText?: string;
  quality?: ImageClarityReport;
}

/**
 * Extracts raw text locally from text-based PDFs or plain text files
 * so Hybrid Extraction works accurately even without cloud connectivity.
 */
export async function extractPdfTextClient(file: File, maxPages: number = 25): Promise<string> {
  try {
    if (file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt')) {
      return (await file.text()).trim();
    }

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPdf || typeof window === 'undefined') return '';

    const pdfjs = window.pdfjsLib;
    if (!pdfjs) return '';

    if (!pdfjs.GlobalWorkerOptions.workerSrc) {
      pdfjs.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }

    const buffer = await file.arrayBuffer();
    const pdfDoc = await pdfjs.getDocument({ data: new Uint8Array(buffer) }).promise;
    const pageLimit = Math.min(pdfDoc.numPages || 0, maxPages);
    const pageTexts: string[] = [];

    for (let i = 1; i <= pageLimit; i++) {
      const page = await pdfDoc.getPage(i);
      const textContent = await page.getTextContent();
      const lines: string[] = [];
      let lastY: number | null = null;
      let currentLine = '';

      for (const item of textContent.items as any[]) {
        const str = String(item.str || '');
        const y = Array.isArray(item.transform) ? Math.round(item.transform[5]) : null;
        if (lastY !== null && y !== null && Math.abs(y - lastY) > 4) {
          if (currentLine.trim()) lines.push(currentLine.trim());
          currentLine = str;
        } else {
          currentLine += (currentLine && str && !currentLine.endsWith(' ') && !str.startsWith(' ') ? ' ' : '') + str;
        }
        if (y !== null) lastY = y;
      }
      if (currentLine.trim()) lines.push(currentLine.trim());
      if (lines.length > 0) {
        pageTexts.push(lines.join('\n'));
      }
    }

    return pageTexts.join('\n\n').trim();
  } catch {
    return '';
  }
}

/**
 * Optimizes an image (up to 1920px crisp JPEG) and checks pixel clarity & resolution
 * so blank, ultra-tiny, or unreadable photos are caught immediately with a clear user notice.
 */
export async function optimizeImageForAi(file: File): Promise<OptimizedAiPayload> {
  if (!file.type.startsWith('image/')) {
    const extractedText = await extractPdfTextClient(file);
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) =>
        resolve({
          dataUrl: e.target?.result as string,
          mimeType: file.type || 'application/pdf',
          extractedText: extractedText || undefined,
        });
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const origW = img.width;
        const origH = img.height;

        if (origW < 140 || origH < 100) {
          resolve({
            dataUrl: rawDataUrl,
            mimeType: file.type || 'image/jpeg',
            quality: {
              isValid: false,
              width: origW,
              height: origH,
              contrastStdDev: 0,
              warning: 'الصورة المرفوعة صغيرة جداً أو منخفضة الدقة ولا تسمح بقراءة الأسئلة والرموز العلمية. يُرجى إعادة رفع صورة أوضح.',
            },
          });
          return;
        }

        const MAX_DIM = 1920;
        let width = origW;
        let height = origH;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          resolve({
            dataUrl: rawDataUrl,
            mimeType: file.type || 'image/jpeg',
            quality: { isValid: true, width, height, contrastStdDev: 30 },
          });
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Fast sample contrast check to catch blank/all-white/all-black unreadable images
        let contrastStdDev = 30;
        try {
          const sampleW = Math.min(80, width);
          const sampleH = Math.min(80, height);
          const sampleCanvas = document.createElement('canvas');
          sampleCanvas.width = sampleW;
          sampleCanvas.height = sampleH;
          const sCtx = sampleCanvas.getContext('2d');
          if (sCtx) {
            sCtx.drawImage(canvas, 0, 0, sampleW, sampleH);
            const pixels = sCtx.getImageData(0, 0, sampleW, sampleH).data;
            const lums: number[] = [];
            for (let i = 0; i < pixels.length; i += 4) {
              lums.push(0.299 * pixels[i] + 0.587 * pixels[i + 1] + 0.114 * pixels[i + 2]);
            }
            const mean = lums.reduce((a, b) => a + b, 0) / lums.length;
            const variance = lums.reduce((a, b) => a + (b - mean) * (b - mean), 0) / lums.length;
            contrastStdDev = Math.round(Math.sqrt(variance) * 10) / 10;
          }
        } catch {
          contrastStdDev = 30;
        }

        if (contrastStdDev < 4.5) {
          resolve({
            dataUrl: rawDataUrl,
            mimeType: file.type || 'image/jpeg',
            quality: {
              isValid: false,
              width,
              height,
              contrastStdDev,
              warning: 'تبدو الصورة فارغة أو باهتة جداً ولا تحتوي على تباين نصي واضح. يُرجى إعادة تصوير أو رفع صورة أوضح للأسئلة.',
            },
          });
          return;
        }

        const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.9);
        resolve({
          dataUrl: optimizedDataUrl,
          mimeType: 'image/jpeg',
          quality: {
            isValid: true,
            width,
            height,
            contrastStdDev,
          },
        });
      };

      img.onerror = () => {
        resolve({
          dataUrl: rawDataUrl,
          mimeType: file.type || 'image/jpeg',
          quality: {
            isValid: false,
            width: 0,
            height: 0,
            contrastStdDev: 0,
            warning: 'تعذر قراءة ملف الصورة المرفوع أو أنه تالف. يُرجى إعادة رفع صورة بصيغة JPG أو PNG.',
          },
        });
      };

      img.src = rawDataUrl;
    };

    reader.onerror = () => {
      resolve({
        dataUrl: '',
        mimeType: file.type || 'image/jpeg',
        quality: {
          isValid: false,
          width: 0,
          height: 0,
          contrastStdDev: 0,
          warning: 'حدث خطأ أثناء قراءة الملف من جهازك. يُرجى إعادة المحاولة.',
        },
      });
    };

    reader.readAsDataURL(file);
  });
}

/**
 * Triggers an instant native browser download for videos and large files.
 * Uses direct anchor download without blocking UI threads.
 */
export function instantHighSpeedDownload(url: string, filename: string) {
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
