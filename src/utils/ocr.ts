import { createWorker } from 'tesseract.js';
import type { LanguageCode } from '../components/Header';

// Perform OCR on image data URL
export const performOcr = async (
  imageDataUrl: string,
  lang: LanguageCode,
  onProgress?: (p: number, status: string) => void
): Promise<string> => {
  let worker: Tesseract.Worker | null = null;
  try {
    if (onProgress) onProgress(0, 'initializing worker...');
    
    // Create a fresh worker for every job. This avoids getting stuck
    // due to previous failed jobs or HMR issues.
    worker = await createWorker(lang, undefined, {
      langPath: 'https://tessdata.projectnaptha.com/4.0.0_best',
      logger: m => {
        console.log('Tesseract:', m.status, m.progress);
        if (onProgress) {
          onProgress(m.progress, m.status);
        }
      }
    });

    if (onProgress) onProgress(0, 'recognizing text...');
    const result = await worker.recognize(imageDataUrl);
    await worker.terminate();
    
    return result.data.text.trim();
  } catch (error) {
    console.error('OCR Error:', error);
    if (worker) {
      await worker.terminate().catch(console.error);
    }
    throw new Error('Failed to extract text. Please try again.');
  }
};
