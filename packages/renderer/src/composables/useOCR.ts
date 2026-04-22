// OCR 识别组合式函数

import { ref } from 'vue';
import { bridgeApi } from './useApi';

interface OcrResult {
  text: string;
  regions: Array<{
    text: string;
    confidence: number;
    box: [number, number, number, number];
  }>;
}

export function useOCR() {
  const loading = ref(false);
  const result = ref<OcrResult | null>(null);

  async function recognize(image: string, engine?: 'paddleocr' | 'ocrlite', useGpu?: boolean) {
    loading.value = true;
    const res = await bridgeApi.ocrRecognize(image, engine, useGpu);
    loading.value = false;

    if (res.code === 0) {
      result.value = res.data;
      return res.data;
    }
    return null;
  }

  async function recognizeFromFile(file: File, engine?: 'paddleocr' | 'ocrlite', useGpu?: boolean) {
    const base64 = await fileToBase64(file);
    return recognize(base64, engine, useGpu);
  }

  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  return {
    loading,
    result,
    recognize,
    recognizeFromFile,
  };
}
