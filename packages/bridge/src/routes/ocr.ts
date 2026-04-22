// OCR 识别 API 路由

import type { FastifyInstance } from 'fastify';
import type { OcrEngineService } from '../services/ocr-engine';

export function registerOcrRoutes(
  app: FastifyInstance,
  ocrEngine: OcrEngineService
): void {
  // POST /api/ocr/recognize - OCR 识别
  app.post<{ Body: {
    image: string;
    engine?: 'paddleocr' | 'ocrlite';
    useGpu?: boolean;
  } }>('/api/ocr/recognize', async (req, reply) => {
    const { image, engine, useGpu } = req.body;
    const result = await ocrEngine.recognize(image, { engine, useGpu });
    return { code: 0, data: result, msg: '' };
  });
}
