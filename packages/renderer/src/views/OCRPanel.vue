<template>
  <div class="ocr-panel flex h-full gap-4">
    <!-- 左侧识别面板 -->
    <div class="w-[400px] glass-light rounded-xl border border-dark-500/30 flex flex-col">
      <div class="p-4 border-b border-dark-500/20">
        <div class="text-subheading text-dark-50 mb-3">OCR 识别</div>
        <div class="space-y-3">
          <div>
            <div class="text-xs text-dark-300 mb-1.5">识别引擎</div>
            <select v-model="ocrEngine"
              class="w-full px-3 py-2 rounded-lg bg-dark-700/50 border border-dark-500/30 text-dark-100 text-sm focus:border-primary-500/50 focus:outline-none">
              <option value="paddleocr">PaddleOCR</option>
              <option value="ocrlite">OcrLite</option>
            </select>
          </div>
          <div class="flex items-center gap-2">
            <input type="checkbox" id="useGpu" v-model="useGpu"
              class="rounded border-dark-500 bg-dark-700 text-primary-500" />
            <label for="useGpu" class="text-xs text-dark-200 cursor-pointer">GPU 加速</label>
          </div>
        </div>
      </div>

      <!-- 图片上传区域 -->
      <div class="flex-1 p-4 flex flex-col">
        <div v-if="!previewImage"
          class="flex-1 border-2 border-dashed border-dark-500/30 rounded-xl flex flex-col items-center justify-center hover:border-primary-500/30 transition-colors cursor-pointer"
          @click="selectImage" @dragover.prevent @drop.prevent="handleDrop">
          <svg class="w-12 h-12 mb-3 text-dark-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
          </svg>
          <div class="text-sm text-dark-300">点击选择图片或拖拽到此处</div>
          <div class="text-[11px] text-dark-400 mt-1">支持 JPG / PNG / WebP</div>
        </div>
        <div v-else class="flex-1 flex flex-col">
          <div class="flex-1 rounded-lg overflow-hidden bg-dark-900/50 flex items-center justify-center">
            <img :src="previewImage" alt="preview" class="max-w-full max-h-full object-contain" />
          </div>
          <div class="flex gap-2 mt-3">
            <button @click="recognize"
              :disabled="ocrLoading"
              class="flex-1 px-3 py-2 rounded-lg bg-primary-500/15 text-primary-400 hover:bg-primary-500/25 text-sm transition-all border border-primary-500/20 disabled:opacity-40">
              {{ ocrLoading ? '识别中...' : '开始识别' }}
            </button>
            <button @click="clearImage"
              class="px-3 py-2 rounded-lg bg-dark-600/30 text-dark-200 hover:text-dark-100 text-sm transition-colors border border-dark-500/20">
              清除
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 右侧识别结果 -->
    <div class="flex-1 glass-light rounded-xl border border-dark-500/30 flex flex-col">
      <div class="p-4 border-b border-dark-500/20">
        <div class="flex items-center justify-between">
          <div class="text-subheading text-dark-50">识别结果</div>
          <button v-if="ocrResult" @click="copyResult"
            class="px-3 py-1.5 rounded-lg bg-dark-600/30 text-dark-200 hover:text-primary-400 text-xs transition-colors border border-dark-500/20">
            复制文本
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-auto p-4">
        <div v-if="!ocrResult" class="h-full flex items-center justify-center">
          <div class="text-dark-400 text-sm">上传图片并点击识别</div>
        </div>
        <div v-else>
          <!-- 全文 -->
          <div class="mb-4">
            <div class="text-xs text-dark-300 mb-2">全文识别</div>
            <div class="bg-dark-700/50 rounded-lg p-3 text-sm text-dark-100 whitespace-pre-wrap">{{ ocrResult.text }}</div>
          </div>

          <!-- 区域详情 -->
          <div>
            <div class="text-xs text-dark-300 mb-2">识别区域 ({{ ocrResult.regions.length }})</div>
            <div class="space-y-2">
              <div v-for="(region, idx) in ocrResult.regions" :key="idx"
                class="flex items-center gap-3 px-3 py-2 rounded-lg bg-dark-700/30 border border-dark-500/10">
                <span class="text-[10px] text-dark-400 w-5 text-right">{{ idx + 1 }}</span>
                <span class="text-sm text-dark-100 flex-1">{{ region.text }}</span>
                <span class="text-[10px] text-dark-400">{{ (region.confidence * 100).toFixed(1) }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useOCR } from '@/composables/useOCR';

const { loading: ocrLoading, result: ocrResult, recognize: doRecognize } = useOCR();
const ocrEngine = ref<'paddleocr' | 'ocrlite'>('paddleocr');
const useGpu = ref(false);
const previewImage = ref('');
const imageBase64 = ref('');

function selectImage() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/*';
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    previewImage.value = URL.createObjectURL(file);
    const reader = new FileReader();
    reader.onload = () => { imageBase64.value = reader.result as string; };
    reader.readAsDataURL(file);
  };
  input.click();
}

function handleDrop(event: DragEvent) {
  const file = event.dataTransfer?.files[0];
  if (!file) return;
  previewImage.value = URL.createObjectURL(file);
  const reader = new FileReader();
  reader.onload = () => { imageBase64.value = reader.result as string; };
  reader.readAsDataURL(file);
}

async function recognize() {
  if (!imageBase64.value) return;
  await doRecognize(imageBase64.value, ocrEngine.value, useGpu.value);
}

function clearImage() {
  previewImage.value = '';
  imageBase64.value = '';
}

function copyResult() {
  if (ocrResult.value?.text) {
    navigator.clipboard.writeText(ocrResult.value.text);
  }
}
</script>
