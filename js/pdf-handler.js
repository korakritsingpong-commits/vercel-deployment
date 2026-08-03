/**
 * PDF Handler Module — Converts PDF files into HTML5 Canvas images using pdf.js
 */

class PDFHandler {
  /**
   * Check if a file is a PDF
   * @param {File} file 
   * @returns {boolean}
   */
  isPDF(file) {
    return file && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'));
  }

  /**
   * Convert a PDF File object into an array of HTML5 Canvas elements (one per page)
   * @param {File} file PDF File
   * @param {number} scale Rendering scale factor (default 2.0 for ~300 DPI high resolution OCR)
   * @returns {Promise<Array<{canvas: HTMLCanvasElement, pageNum: number}>>}
   */
  async pdfToCanvases(file, scale = 2.0) {
    if (!window.pdfjsLib) {
      throw new Error('ไลบรารี pdf.js ยังไม่ถูกโหลดเข้าสู่ระบบ');
    }

    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdfDoc = await loadingTask.promise;

    const results = [];
    const numPages = pdfDoc.numPages;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: scale });

      const canvas = document.createElement('canvas');
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      const ctx = canvas.getContext('2d');
      const renderContext = {
        canvasContext: ctx,
        viewport: viewport
      };

      await page.render(renderContext).promise;

      results.push({
        canvas: canvas,
        pageNum: pageNum,
        totalPages: numPages,
        filename: file.name
      });
    }

    return results;
  }
}

window.pdfHandler = new PDFHandler();
