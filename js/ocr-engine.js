/**
 * OCR Engine Module — Wrapper for Tesseract.js (Client-Side WASM)
 */

class OCREngine {
  constructor() {
    this.worker = null;
    this.isReady = false;
  }

  /**
   * Initialize Tesseract Worker with Thai + English language models
   * @param {Function} onProgress Callback function for loading progress
   */
  async init(onProgress) {
    if (this.isReady && this.worker) return;

    try {
      if (onProgress) onProgress('กำลังสร้าง OCR Worker...', 0.1);
      
      this.worker = await Tesseract.createWorker('tha+eng', 1, {
        logger: m => {
          if (m.status === 'recognizing text' && onProgress) {
            onProgress(`กำลังอ่านข้อความ OCR (${Math.round(m.progress * 100)}%)...`, 0.3 + (m.progress * 0.7));
          } else if (onProgress && m.status) {
            onProgress(`การจัดเตรียม: ${m.status}`, 0.2);
          }
        }
      });

      this.isReady = true;
      if (onProgress) onProgress('OCR Engine พร้อมใช้งาน', 1.0);
    } catch (err) {
      console.error('Failed to initialize Tesseract worker:', err);
      throw new Error('ไม่สามารถเริ่มต้นระบบ OCR ได้: ' + err.message);
    }
  }

  /**
   * Perform image pre-processing on a Canvas element to optimize OCR accuracy
   * @param {HTMLCanvasElement} srcCanvas Original image canvas
   * @returns {HTMLCanvasElement} Enhanced processed canvas
   */
  preprocessImage(srcCanvas) {
    const canvas = document.createElement('canvas');
    canvas.width = srcCanvas.width;
    canvas.height = srcCanvas.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(srcCanvas, 0, 0);

    const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imgData.data;

    // Grayscale + Contrast Stretch + Adaptive Thresholding
    for (let i = 0; i < data.length; i += 4) {
      // Luminance formula
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      
      // Contrast enhancement (factor = 1.3)
      let contrastGray = (gray - 128) * 1.3 + 128;
      contrastGray = Math.min(255, Math.max(0, contrastGray));

      data[i] = contrastGray;
      data[i + 1] = contrastGray;
      data[i + 2] = contrastGray;
    }

    ctx.putImageData(imgData, 0, 0);
    return canvas;
  }

  /**
   * Run OCR recognition on a canvas or image element
   * @param {HTMLCanvasElement|HTMLImageElement} imageInput Input image
   * @param {Function} onProgress Progress callback
   * @returns {Promise<{text: string, confidence: number, words: Array}>}
   */
  async recognize(imageInput, onProgress) {
    if (!this.isReady) {
      await this.init(onProgress);
    }

    let processCanvas;
    if (imageInput instanceof HTMLCanvasElement) {
      processCanvas = this.preprocessImage(imageInput);
    } else {
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = imageInput.width || imageInput.naturalWidth;
      tempCanvas.height = imageInput.height || imageInput.naturalHeight;
      const ctx = tempCanvas.getContext('2d');
      ctx.drawImage(imageInput, 0, 0);
      processCanvas = this.preprocessImage(tempCanvas);
    }

    const result = await this.worker.recognize(processCanvas);
    const { text, confidence, words } = result.data;

    return {
      text: text || '',
      confidence: Math.round(confidence || 0),
      words: words || []
    };
  }

  /**
   * Terminate worker resources when done
   */
  async terminate() {
    if (this.worker) {
      await this.worker.terminate();
      this.worker = null;
      this.isReady = false;
    }
  }
}

// Global instance
window.ocrEngine = new OCREngine();
