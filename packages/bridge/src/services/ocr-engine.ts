// OCR 推理引擎 - 完整 ONNX Runtime + sharp 实现

import * as fs from 'fs';
import * as path from 'path';

interface OcrResult {
  text: string;
  regions: Array<{
    text: string;
    confidence: number;
    box: [number, number, number, number];
  }>;
}

interface OcrEngineConfig {
  engine: 'paddleocr' | 'ocrlite';
  modelPath: string;
  useGpu: boolean;
}

// PaddleOCR 标签字典
let LABELS_V4: string[] = [];
let LABELS_V5: string[] = [];

function loadLabels(modelPath: string): void {
  // PaddleOCR v4 字典
  const v4Path = path.join(modelPath, 'ppocr_keys_v1.txt');
  if (fs.existsSync(v4Path) && LABELS_V4.length === 0) {
    LABELS_V4 = fs.readFileSync(v4Path, 'utf-8').split('\n').filter(Boolean);
  }
  // PaddleOCR v5 字典
  const v5Path = path.join(modelPath, 'ppocrv5_mobile_labels.txt');
  if (fs.existsSync(v5Path) && LABELS_V5.length === 0) {
    LABELS_V5 = fs.readFileSync(v5Path, 'utf-8').split('\n').filter(Boolean);
  }
}

export class OcrEngineService {
  private config: OcrEngineConfig;
  private initialized = false;
  private ort: any = null;
  private detModel: any = null;
  private clsModel: any = null;
  private recModel: any = null;
  private sharp: any = null;

  constructor(config: OcrEngineConfig) {
    this.config = config;
  }

  /** 初始化 OCR 引擎 */
  async initialize(): Promise<boolean> {
    if (this.initialized) return true;

    try {
      const modelDir = this.config.modelPath;
      if (!fs.existsSync(modelDir)) {
        console.warn(`[OCR] Model directory not found: ${modelDir}, OCR will return empty results`);
        // 标记初始化但不加载模型，recognize() 将走外部进程降级
      } else {
        // 加载标签
        loadLabels(modelDir);

        // 尝试加载 sharp（图像预处理）
        try {
          this.sharp = await import('sharp');
          console.log('[OCR] sharp loaded for image preprocessing');
        } catch {
          console.warn('[OCR] sharp not available, image preprocessing will be limited');
        }

        // 尝试加载 ONNX Runtime
        try {
          const ort = await import('onnxruntime-node');
          this.ort = ort;

          if (this.config.engine === 'paddleocr') {
            // 优先使用 v5 模型，回退到 v4
            let detPath = path.join(modelDir, 'ch_PP-OCRv5_mobile_det.onnx');
            let recPath = path.join(modelDir, 'ch_PP-OCRv5_rec_mobile_infer.onnx');

            if (!fs.existsSync(detPath)) {
              detPath = path.join(modelDir, 'ch_PP-OCRv4_det_infer.onnx');
            }
            if (!fs.existsSync(recPath)) {
              recPath = path.join(modelDir, 'ch_PP-OCRv4_rec_infer.onnx');
            }

            const clsPath = path.join(modelDir, 'ch_ppocr_mobile_v2.0_cls_infer.onnx');

            const options: any = {
              executionProviders: this.config.useGpu ? ['cuda', 'cpu'] : ['cpu'],
              graphOptimizationLevel: 'all',
            };

            if (fs.existsSync(detPath)) {
              this.detModel = await ort.InferenceSession.create(detPath, options);
              console.log(`[OCR] Detection model loaded: ${path.basename(detPath)}`);
            }
            if (fs.existsSync(clsPath)) {
              this.clsModel = await ort.InferenceSession.create(clsPath, options);
              console.log(`[OCR] Classification model loaded: ${path.basename(clsPath)}`);
            }
            if (fs.existsSync(recPath)) {
              this.recModel = await ort.InferenceSession.create(recPath, options);
              console.log(`[OCR] Recognition model loaded: ${path.basename(recPath)}`);
            }
          } else {
            const modelPath = path.join(modelDir, 'ocr-lite.onnx');
            if (fs.existsSync(modelPath)) {
              const options: any = {
                executionProviders: this.config.useGpu ? ['cuda', 'cpu'] : ['cpu'],
              };
              this.recModel = await ort.InferenceSession.create(modelPath, options);
            }
          }

          console.log(`[OCR] ${this.config.engine} engine initialized, GPU: ${this.config.useGpu}`);
        } catch (ortErr) {
          console.warn(`[OCR] ONNX Runtime not available, using external OCR process:`, (ortErr as Error).message);
        }
      }

      this.initialized = true;
      return true;
    } catch (err) {
      console.error('[OCR] Initialization failed:', err);
      return false;
    }
  }

  /** 执行 OCR 识别 */
  async recognize(image: string | Buffer, options?: { engine?: string; useGpu?: boolean }): Promise<OcrResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    const engine = options?.engine ?? this.config.engine;

    switch (engine) {
      case 'paddleocr':
        return this.paddleOcrRecognize(image);
      case 'ocrlite':
        return this.ocrLiteRecognize(image);
      default:
        return this.paddleOcrRecognize(image);
    }
  }

  /** PaddleOCR 识别 */
  private async paddleOcrRecognize(image: string | Buffer): Promise<OcrResult> {
    if (this.detModel && this.recModel && this.ort) {
      return this.paddleOcrLocalInference(image);
    }
    return this.externalOcrRecognize(image, 'paddleocr');
  }

  /** OcrLite 识别 */
  private async ocrLiteRecognize(image: string | Buffer): Promise<OcrResult> {
    if (this.recModel && this.ort) {
      return this.ocrLiteLocalInference(image);
    }
    return this.externalOcrRecognize(image, 'ocrlite');
  }

  // =====================================================
  // PaddleOCR 本地 ONNX 推理 - 完整实现
  // =====================================================

  private async paddleOcrLocalInference(image: string | Buffer): Promise<OcrResult> {
    try {
      const imageBuffer = this.toBuffer(image);

      // 1. 解码图像并获取原始尺寸
      const { data, width, height, channels } = await this.decodeImage(imageBuffer);

      // 2. 文本检测 (DBNet)
      const detInput = this.preprocessDet(data, width, height, channels);
      const detResults = await this.detModel.run(detInput);
      const boxes = this.postprocessDetection(detResults, width, height, 0.5);

      if (boxes.length === 0) {
        return { text: '', regions: [] };
      }

      // 3. 对每个文本框进行方向分类 + 文本识别
      const regions: OcrResult['regions'] = [];
      for (const box of boxes) {
        try {
          // 裁剪文本区域
          const cropped = await this.cropRegion(imageBuffer, box, width, height);

          // 方向分类（如果模型可用）
          let finalImage = cropped;
          if (this.clsModel) {
            const clsInput = this.preprocessCls(cropped.data, cropped.width, cropped.height, cropped.channels);
            const clsResults = await this.clsModel.run(clsInput);
            const isRotated = this.postprocessClassification(clsResults);
            if (isRotated) {
              finalImage = await this.rotate180(cropped);
            }
          }

          // 文本识别
          const recInput = this.preprocessRec(finalImage.data, finalImage.width, finalImage.height, finalImage.channels);
          const recResults = await this.recModel.run(recInput);
          const { text, confidence } = this.postprocessRecognition(recResults);

          const [x1, y1, x2, y2] = box;
          regions.push({ text, confidence, box: [x1, y1, x2, y2] });
        } catch (err) {
          // 单个区域识别失败不影响其他区域
          console.warn('[OCR] Region recognition failed:', err);
        }
      }

      return {
        text: regions.map(r => r.text).join('\n'),
        regions,
      };
    } catch (err) {
      console.error('[OCR] PaddleOCR local inference error:', err);
      return this.externalOcrRecognize(image, 'paddleocr');
    }
  }

  /** OcrLite 本地 ONNX 推理 */
  private async ocrLiteLocalInference(image: string | Buffer): Promise<OcrResult> {
    try {
      const imageBuffer = this.toBuffer(image);
      const { data, width, height, channels } = await this.decodeImage(imageBuffer);

      const input = this.preprocessDet(data, width, height, channels);
      const results = await this.recModel.run(input);

      const regions: OcrResult['regions'] = [];
      // OcrLite 输出格式解析
      const outputKey = this.recModel.outputNames[0];
      const output = results[outputKey];
      if (output) {
        const text = this.ctcDecode(output, LABELS_V4.length > 0 ? LABELS_V4 : LABELS_V5);
        regions.push({ text, confidence: 0.9, box: [0, 0, width, height] });
      }

      return { text: regions.map(r => r.text).join('\n'), regions };
    } catch (err) {
      console.error('[OCR] OcrLite local inference error:', err);
      return this.externalOcrRecognize(image, 'ocrlite');
    }
  }

  // =====================================================
  // 图像预处理 - 基于 sharp
  // =====================================================

  /** 将输入转为 Buffer */
  private toBuffer(image: string | Buffer): Buffer {
    if (Buffer.isBuffer(image)) return image;
    if (typeof image === 'string') {
      if (image.startsWith('data:')) {
        const base64 = image.split(',')[1];
        return Buffer.from(base64, 'base64');
      }
      return Buffer.from(image, 'base64');
    }
    return image;
  }

  /** 解码图像为原始像素数据 */
  private async decodeImage(buffer: Buffer): Promise<{
    data: Float32Array;
    width: number;
    height: number;
    channels: number;
  }> {
    if (this.sharp) {
      const img = this.sharp.default(buffer);
      const metadata = await img.metadata();
      const raw = await img.raw().toBuffer();
      const { width = 0, height = 0, channels = 3 } = metadata;

      // 转换为 Float32Array 并归一化到 [0, 1]
      const data = new Float32Array(width * height * channels);
      for (let i = 0; i < raw.length; i++) {
        data[i] = raw[i] / 255.0;
      }

      return { data, width, height, channels };
    }

    // 无 sharp 时的降级：创建空白图像
    throw new Error('sharp not available for image decoding');
  }

  /** 调整图像尺寸并生成 ONNX Tensor */
  private async resizeAndNormalize(
    buffer: Buffer,
    targetWidth: number,
    targetHeight: number,
  ): Promise<{ tensor: any; ratioX: number; ratioY: number }> {
    if (this.sharp) {
      const img = this.sharp.default(buffer).resize(targetWidth, targetHeight, { fit: 'fill' });
      const raw = await img.raw().toBuffer();

      // HWC -> CHW 并归一化
      const floatData = new Float32Array(3 * targetWidth * targetHeight);
      const pixelCount = targetWidth * targetHeight;

      for (let y = 0; y < targetHeight; y++) {
        for (let x = 0; x < targetWidth; x++) {
          const srcIdx = (y * targetWidth + x) * 3;
          const dstBase = y * targetWidth + x;
          floatData[dstBase] = raw[srcIdx] / 255.0;                   // R
          floatData[pixelCount + dstBase] = raw[srcIdx + 1] / 255.0;  // G
          floatData[2 * pixelCount + dstBase] = raw[srcIdx + 2] / 255.0; // B
        }
      }

      const tensor = new this.ort.Tensor('float32', floatData, [1, 3, targetHeight, targetWidth]);
      return { tensor, ratioX: 1, ratioY: 1 };
    }

    throw new Error('sharp not available');
  }

  /** 检测模型预处理 (DBNet) - 输入 [1, 3, 960, 960] */
  private preprocessDet(data: Float32Array, width: number, height: number, channels: number): Record<string, any> {
    const targetSize = 960;
    // 保持宽高比 resize
    const ratio = Math.min(targetSize / height, targetSize / width);
    const newH = Math.round(height * ratio);
    const newW = Math.round(width * ratio);

    // 简化：直接双线性插值 resize
    const resized = this.bilinearResize(data, width, height, channels, newW, newH);

    // Pad 到 targetSize x targetSize
    const padded = this.padImage(resized, newW, newH, channels, targetSize, targetSize);

    // HWC -> CHW
    const floatData = new Float32Array(3 * targetSize * targetSize);
    const pixelCount = targetSize * targetSize;
    for (let y = 0; y < targetSize; y++) {
      for (let x = 0; x < targetSize; x++) {
        const srcIdx = (y * targetSize + x) * 3;
        const dstBase = y * targetSize + x;
        floatData[dstBase] = padded[srcIdx];                   // R
        floatData[pixelCount + dstBase] = padded[srcIdx + 1];  // G
        floatData[2 * pixelCount + dstBase] = padded[srcIdx + 2]; // B
      }
    }

    const tensor = new this.ort.Tensor('float32', floatData, [1, 3, targetSize, targetSize]);
    return { [this.detModel.inputNames[0]]: tensor };
  }

  /** 分类模型预处理 - 输入 [1, 3, 48, 192] */
  private preprocessCls(data: Float32Array, width: number, height: number, channels: number): Record<string, any> {
    const targetH = 48;
    const targetW = 192;

    const resized = this.bilinearResize(data, width, height, channels, targetW, targetH);

    const floatData = new Float32Array(3 * targetH * targetW);
    const pixelCount = targetH * targetW;
    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < targetW; x++) {
        const srcIdx = (y * targetW + x) * 3;
        const dstBase = y * targetW + x;
        floatData[dstBase] = resized[srcIdx];
        floatData[pixelCount + dstBase] = resized[srcIdx + 1];
        floatData[2 * pixelCount + dstBase] = resized[srcIdx + 2];
      }
    }

    const tensor = new this.ort.Tensor('float32', floatData, [1, 3, targetH, targetW]);
    return { [this.clsModel.inputNames[0]]: tensor };
  }

  /** 识别模型预处理 - 输入 [1, 3, 48, 320] */
  private preprocessRec(data: Float32Array, width: number, height: number, channels: number): Record<string, any> {
    const targetH = 48;
    const targetW = 320;

    const resized = this.bilinearResize(data, width, height, channels, targetW, targetH);

    const floatData = new Float32Array(3 * targetH * targetW);
    const pixelCount = targetH * targetW;
    for (let y = 0; y < targetH; y++) {
      for (let x = 0; x < targetW; x++) {
        const srcIdx = (y * targetW + x) * 3;
        const dstBase = y * targetW + x;
        floatData[dstBase] = resized[srcIdx];
        floatData[pixelCount + dstBase] = resized[srcIdx + 1];
        floatData[2 * pixelCount + dstBase] = resized[srcIdx + 2];
      }
    }

    const tensor = new this.ort.Tensor('float32', floatData, [1, 3, targetH, targetW]);
    return { [this.recModel.inputNames[0]]: tensor };
  }

  // =====================================================
  // 后处理
  // =====================================================

  /** DBNet 后处理：从概率图提取文本框 */
  private postprocessDetection(
    results: Record<string, any>,
    origWidth: number,
    origHeight: number,
    threshold: number,
  ): number[][] {
    const outputKey = this.detModel.outputNames[0];
    const output = results[outputKey];
    if (!output) return [];

    const data = output.data as Float32Array;
    const [batch, channels, outH, outW] = output.dims as number[];

    // 二值化：将概率图转为二值图
    const binary = new Uint8Array(outH * outW);
    for (let i = 0; i < outH * outW; i++) {
      binary[i] = data[i] > threshold ? 1 : 0;
    }

    // 连通域分析，提取外接矩形
    const boxes = this.extractBoxes(binary, outW, outH);

    // 将坐标映射回原图
    const scaleX = origWidth / outW;
    const scaleY = origHeight / outH;

    return boxes.map(([x1, y1, x2, y2]) => [
      Math.round(x1 * scaleX),
      Math.round(y1 * scaleY),
      Math.round(x2 * scaleX),
      Math.round(y2 * scaleY),
    ]);
  }

  /** 从二值图提取文本框（连通域分析） */
  private extractBoxes(binary: Uint8Array, width: number, height: number): number[][] {
    const visited = new Uint8Array(width * height);
    const boxes: number[][] = [];

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        if (binary[idx] === 1 && !visited[idx]) {
          // BFS 洪水填充找连通域
          let minX = x, maxX = x, minY = y, maxY = y;
          const queue: [number, number][] = [[x, y]];
          visited[idx] = 1;

          while (queue.length > 0) {
            const [cx, cy] = queue.shift()!;
            minX = Math.min(minX, cx);
            maxX = Math.max(maxX, cx);
            minY = Math.min(minY, cy);
            maxY = Math.max(maxY, cy);

            // 4-邻域
            for (const [dx, dy] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
              const nx = cx + dx;
              const ny = cy + dy;
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nIdx = ny * width + nx;
                if (binary[nIdx] === 1 && !visited[nIdx]) {
                  visited[nIdx] = 1;
                  queue.push([nx, ny]);
                }
              }
            }
          }

          // 过滤太小的区域（噪声）
          const boxW = maxX - minX;
          const boxH = maxY - minY;
          if (boxW > 3 && boxH > 3 && boxW * boxH > 20) {
            // 添加 2px padding
            boxes.push([
              Math.max(0, minX - 2),
              Math.max(0, minY - 2),
              Math.min(width, maxX + 2),
              Math.min(height, maxY + 2),
            ]);
          }
        }
      }
    }

    return boxes;
  }

  /** 方向分类后处理 */
  private postprocessClassification(results: Record<string, any>): boolean {
    const outputKey = this.clsModel.outputNames[0];
    const output = results[outputKey];
    if (!output) return false;

    const data = output.data as Float32Array;
    // softmax: index 0 = 正常, index 1 = 旋转180度
    const exp0 = Math.exp(data[0]);
    const exp1 = Math.exp(data[1]);
    const sum = exp0 + exp1;
    const probRotated = exp1 / sum;

    return probRotated > 0.5;
  }

  /** CTC 解码后处理 */
  private postprocessRecognition(results: Record<string, any>): { text: string; confidence: number } {
    const outputKey = this.recModel.outputNames[0];
    const output = results[outputKey];
    if (!output) return { text: '', confidence: 0 };

    const labels = LABELS_V4.length > 0 ? LABELS_V4 : LABELS_V5;
    return this.ctcDecode(output, labels);
  }

  /** CTC 贪心解码 */
  private ctcDecode(output: any, labels: string[]): { text: string; confidence: number } {
    const data = output.data as Float32Array;
    const dims = output.dims as number[];

    // 输出形状: [1, seq_len, num_classes] 或 [seq_len, num_classes]
    let seqLen: number;
    let numClasses: number;
    let offset = 0;

    if (dims.length === 3) {
      seqLen = dims[1];
      numClasses = dims[2];
      offset = 0;
    } else if (dims.length === 2) {
      seqLen = dims[0];
      numClasses = dims[1];
      offset = 0;
    } else {
      return { text: '', confidence: 0 };
    }

    const chars: string[] = [];
    let totalConf = 0;
    let lastIdx = -1;

    for (let t = 0; t < seqLen; t++) {
      // 找到最大概率的类别
      let maxIdx = 0;
      let maxProb = -Infinity;
      for (let c = 0; c < numClasses; c++) {
        const prob = data[t * numClasses + c];
        if (prob > maxProb) {
          maxProb = prob;
          maxIdx = c;
        }
      }

      // CTC blank 通常是 index 0
      if (maxIdx !== 0 && maxIdx !== lastIdx) {
        if (maxIdx - 1 < labels.length) {
          chars.push(labels[maxIdx - 1]);
        }
      }
      lastIdx = maxIdx;

      // softmax 概率
      totalConf += Math.exp(maxProb);
    }

    const text = chars.join('');
    const confidence = seqLen > 0 ? totalConf / seqLen : 0;

    return { text, confidence };
  }

  // =====================================================
  // 图像操作工具
  // =====================================================

  /** 裁剪文本区域 */
  private async cropRegion(
    imageBuffer: Buffer,
    box: number[],
    _origWidth: number,
    _origHeight: number,
  ): Promise<{ data: Float32Array; width: number; height: number; channels: number }> {
    const [x1, y1, x2, y2] = box;
    const cropW = x2 - x1;
    const cropH = y2 - y1;

    if (this.sharp) {
      const img = this.sharp.default(imageBuffer)
        .extract({ left: x1, top: y1, width: cropW, height: cropH });
      const raw = await img.raw().toBuffer();
      const metadata = await img.metadata();
      const { width = cropW, height = cropH, channels = 3 } = metadata;

      const data = new Float32Array(raw.length);
      for (let i = 0; i < raw.length; i++) {
        data[i] = raw[i] / 255.0;
      }

      return { data, width, height, channels };
    }

    // 降级返回空数据
    return {
      data: new Float32Array(cropW * cropH * 3),
      width: cropW,
      height: cropH,
      channels: 3,
    };
  }

  /** 旋转 180 度 */
  private async rotate180(
    imageData: { data: Float32Array; width: number; height: number; channels: number },
  ): Promise<{ data: Float32Array; width: number; height: number; channels: number }> {
    const { data, width, height, channels } = imageData;
    const rotated = new Float32Array(data.length);

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const srcIdx = (y * width + x) * channels;
        const dstY = height - 1 - y;
        const dstX = width - 1 - x;
        const dstIdx = (dstY * width + dstX) * channels;
        for (let c = 0; c < channels; c++) {
          rotated[dstIdx + c] = data[srcIdx + c];
        }
      }
    }

    return { data: rotated, width, height, channels };
  }

  /** 双线性插值 resize */
  private bilinearResize(
    data: Float32Array,
    srcW: number,
    srcH: number,
    channels: number,
    dstW: number,
    dstH: number,
  ): Float32Array {
    const output = new Float32Array(dstW * dstH * channels);
    const xRatio = srcW / dstW;
    const yRatio = srcH / dstH;

    for (let y = 0; y < dstH; y++) {
      for (let x = 0; x < dstW; x++) {
        const srcX = x * xRatio;
        const srcY = y * yRatio;
        const x0 = Math.floor(srcX);
        const y0 = Math.floor(srcY);
        const x1 = Math.min(x0 + 1, srcW - 1);
        const y1 = Math.min(y0 + 1, srcH - 1);
        const xFrac = srcX - x0;
        const yFrac = srcY - y0;

        for (let c = 0; c < channels; c++) {
          const top = data[(y0 * srcW + x0) * channels + c] * (1 - xFrac)
                    + data[(y0 * srcW + x1) * channels + c] * xFrac;
          const bottom = data[(y1 * srcW + x0) * channels + c] * (1 - xFrac)
                       + data[(y1 * srcW + x1) * channels + c] * xFrac;
          output[(y * dstW + x) * channels + c] = top * (1 - yFrac) + bottom * yFrac;
        }
      }
    }

    return output;
  }

  /** 填充图像到目标尺寸 */
  private padImage(
    data: Float32Array,
    srcW: number,
    srcH: number,
    channels: number,
    dstW: number,
    dstH: number,
  ): Float32Array {
    const output = new Float32Array(dstW * dstH * channels);
    // 复制原始数据
    for (let y = 0; y < Math.min(srcH, dstH); y++) {
      for (let x = 0; x < Math.min(srcW, dstW); x++) {
        for (let c = 0; c < channels; c++) {
          output[(y * dstW + x) * channels + c] = data[(y * srcW + x) * channels + c];
        }
      }
    }
    return output;
  }

  // =====================================================
  // 外部 OCR 进程（降级方案）
  // =====================================================

  /** 调用外部 OCR 可执行文件 */
  private async externalOcrRecognize(image: string | Buffer, engine: string): Promise<OcrResult> {
    try {
      const { execFile } = require('child_process');
      const platform = process.platform;
      const ext = platform === 'win32' ? '.exe' : '';
      const toolName = engine === 'paddleocr' ? 'PaddleOcrNcnn' : 'OcrLiteNcnn';

      const resourcePath = process.env.RESOURCES_PATH || path.resolve(process.cwd(), 'resources');
      const toolPath = path.join(resourcePath, 'bin', platform === 'win32' ? 'win' : 'mac', `${toolName}${ext}`);

      if (!fs.existsSync(toolPath)) {
        console.warn(`[OCR] External tool not found: ${toolPath}`);
        return { text: '', regions: [] };
      }

      const imageBuffer = this.toBuffer(image);
      const tmpPath = path.join(require('os').tmpdir(), `ocr_${Date.now()}.png`);
      fs.writeFileSync(tmpPath, imageBuffer);

      const result = await new Promise<string>((resolve, reject) => {
        execFile(toolPath, [tmpPath, '--output=json'], { timeout: 30000 }, (error: any, stdout: string) => {
          try { fs.unlinkSync(tmpPath); } catch { /* ignore */ }
          if (error) reject(error);
          else resolve(stdout);
        });
      });

      const parsed = JSON.parse(result);
      const regions: OcrResult['regions'] = (parsed.texts || []).map((t: any) => ({
        text: t.text || '',
        confidence: t.confidence ?? 0,
        box: t.box ?? [0, 0, 0, 0],
      }));

      return {
        text: regions.map(r => r.text).join('\n'),
        regions,
      };
    } catch (err) {
      console.error('[OCR] External OCR error:', err);
      return { text: '', regions: [] };
    }
  }

  /** 更新配置 */
  updateConfig(config: Partial<OcrEngineConfig>): void {
    Object.assign(this.config, config);
    this.initialized = false;
    this.ort = null;
    this.detModel = null;
    this.clsModel = null;
    this.recModel = null;
  }
}
