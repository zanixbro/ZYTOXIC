
import { ImageGenerationOptions } from './types';

export const FREE_MODEL_NAME = 'gemini-2.5-flash-image';
export const PAID_MODEL_NAME = 'gemini-3-pro-image-preview';
export const DEFAULT_MODEL = FREE_MODEL_NAME; // Default to free model

export const DEFAULT_IMAGE_OPTIONS: ImageGenerationOptions = {
  aspectRatio: "1:1",
  numberOfImages: 1,
  imageSize: "1K", // Default image size, applicable for paid model
};

export const IMAGE_MODELS = [
  { value: FREE_MODEL_NAME, label: 'ZYTOXIC (Free)' },
  { value: PAID_MODEL_NAME, label: 'ZYTOXIC Pro (Paid - High Quality, 2K/4K, Google Search)' },
];

export const IMAGE_ASPECT_RATIOS: Array<ImageGenerationOptions["aspectRatio"]> = [
  "1:1", "3:4", "4:3", "9:16", "16:9"
];

export const IMAGE_SIZES: Array<ImageGenerationOptions["imageSize"]> = ["1K", "2K", "4K"];

export const NUMBER_OF_IMAGES_OPTIONS: number[] = Array.from({ length: 50 }, (_, i) => i + 1); // Changed to 1-50

// Local Storage Keys
export const LOCAL_STORAGE_SAVED_IMAGES_KEY = 'zytoxic_saved_images';
export const LOCAL_STORAGE_USERNAME_KEY = 'zytoxic_username';
export const MAX_SAVED_IMAGES = 10; // Limit for images stored in localStorage