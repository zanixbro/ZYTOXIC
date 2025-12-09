

export interface ImageGenerationOptions {
  aspectRatio: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
  numberOfImages: number;
  imageSize?: "1K" | "2K" | "4K"; // Optional, only for certain models
}

export interface SavedImage {
  id: string;
  url: string; // base64 image data
  prompt: string;
  model: string;
  timestamp: number;
}

export interface User {
  username: string;
}

// Define the AIStudio interface
export interface AIStudio {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

// Global interface for the AI Studio specific methods
declare global {
  interface Window {
    // Define the AIStudio interface directly on Window.
    aistudio: AIStudio;
  }
}

// Explicitly export an empty object to ensure this file is treated as a module,
// which helps TypeScript correctly process global augmentations.
export {};