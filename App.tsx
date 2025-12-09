import React, { useState, useEffect, useCallback } from 'react';
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { 
  DEFAULT_IMAGE_OPTIONS, 
  IMAGE_ASPECT_RATIOS, 
  IMAGE_MODELS, 
  NUMBER_OF_IMAGES_OPTIONS,
  FREE_MODEL_NAME,
  DEFAULT_MODEL,
  PAID_MODEL_NAME,
  IMAGE_SIZES,
  LOCAL_STORAGE_SAVED_IMAGES_KEY,
  LOCAL_STORAGE_USERNAME_KEY,
  MAX_SAVED_IMAGES
} from './constants';
import { ImageGenerationOptions, SavedImage } from './types';
import LoadingSpinner from './components/LoadingSpinner';
import ImageCard from './components/ImageCard';
import { ApiKeySelector } from './components/ApiKeySelector'; // Named import

interface GroundingUrl {
  uri: string;
  title: string;
}

const App: React.FC = () => {
  const [prompt, setPrompt] = useState<string>('');
  const [generatedImageUrls, setGeneratedImageUrls] = useState<{ url: string, prompt: string, model: string }[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [isApiKeySelected, setIsApiKeySelected] = useState<boolean>(DEFAULT_MODEL === FREE_MODEL_NAME); // Assume true for free model initially, checked by effect
  const [useGoogleSearch, setUseGoogleSearch] = useState<boolean>(false);
  const [groundingUrls, setGroundingUrls] = useState<GroundingUrl[]>([]);
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [loginInput, setLoginInput] = useState<string>('');
  const [savedImages, setSavedImages] = useState<SavedImage[]>([]);

  // Fix: Initialize imageSize based on default model explicitly to avoid TypeScript warning.
  const [imageOptions, setImageOptions] = useState<ImageGenerationOptions>(() => {
    const baseOptions = { ...DEFAULT_IMAGE_OPTIONS };
    if (DEFAULT_MODEL === FREE_MODEL_NAME) {
      baseOptions.imageSize = undefined; // Free model doesn't support imageSize
    } else { 
      baseOptions.imageSize = "1K"; // Paid model defaults to 1K
    }
    return baseOptions;
  });

  // Load user and saved images from localStorage on mount
  useEffect(() => {
    const storedUsername = localStorage.getItem(LOCAL_STORAGE_USERNAME_KEY);
    if (storedUsername) {
      setCurrentUser(storedUsername);
    }
    const storedImages = localStorage.getItem(LOCAL_STORAGE_SAVED_IMAGES_KEY);
    if (storedImages) {
      try {
        setSavedImages(JSON.parse(storedImages));
      } catch (e) {
        console.error("Failed to parse saved images from localStorage", e);
        setSavedImages([]);
      }
    }
  }, []);

  // Effect to manage API key status for the selected model
  const checkApiKeyStatus = useCallback(async () => {
    if (selectedModel === PAID_MODEL_NAME) {
      if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
        const hasKey = await window.aistudio.hasSelectedApiKey();
        setIsApiKeySelected(hasKey);
      } else {
        // Fallback if aistudio API is not available, assume key isn't selected for paid model
        setIsApiKeySelected(false); 
      }
    } else {
      setIsApiKeySelected(true); // No API key needed for the free model
    }
  }, [selectedModel]);

  useEffect(() => {
    checkApiKeyStatus();
  }, [checkApiKeyStatus]);

  const handleApiKeySelected = useCallback(() => {
    setIsApiKeySelected(true);
    setError(null); // Clear any API key related errors
  }, []);

  const handleLogin = () => {
    if (loginInput.trim()) {
      localStorage.setItem(LOCAL_STORAGE_USERNAME_KEY, loginInput.trim());
      setCurrentUser(loginInput.trim());
      setLoginInput(''); // Clear input after login
      setError(null);
    } else {
      setError("Please enter a username to log in.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(LOCAL_STORAGE_USERNAME_KEY);
    setCurrentUser(null);
    setError(null);
    setGeneratedImageUrls([]); // Clear generated images on logout
    setSavedImages([]); // Clear saved images on logout (client-side specific)
    localStorage.removeItem(LOCAL_STORAGE_SAVED_IMAGES_KEY);
    setPrompt(''); // Clear prompt
  };

  const handleSaveImage = useCallback((imageToSave: { url: string, prompt: string, model: string }) => {
    const newImage: SavedImage = {
      id: crypto.randomUUID(), // Unique ID for each image
      url: imageToSave.url,
      prompt: imageToSave.prompt,
      model: imageToSave.model,
      timestamp: Date.now(),
    };

    setSavedImages(prevImages => {
      const updatedImages = [newImage, ...prevImages];
      // Enforce MAX_SAVED_IMAGES limit
      if (updatedImages.length > MAX_SAVED_IMAGES) {
        updatedImages.pop(); // Remove the oldest image
      }
      localStorage.setItem(LOCAL_STORAGE_SAVED_IMAGES_KEY, JSON.stringify(updatedImages));
      return updatedImages;
    });
  }, []);

  const handleClearSavedImages = () => {
    if (window.confirm("Are you sure you want to clear all saved images? This action cannot be undone.")) {
      setSavedImages([]);
      localStorage.removeItem(LOCAL_STORAGE_SAVED_IMAGES_KEY);
      setError(null);
    }
  };

  const handleGenerateImage = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt to generate an image.');
      return;
    }

    if (selectedModel === PAID_MODEL_NAME && !isApiKeySelected) {
      setError('Please select an API key to use the ZYTOXIC Pro model.');
      return;
    }

    setIsLoading(true);
    setGeneratedImageUrls([]);
    setGroundingUrls([]); // Clear previous grounding URLs
    setError(null);

    const generatedImagesData: { url: string, prompt: string, model: string }[] = [];
    const collectedGroundingUrls: GroundingUrl[] = [];

    try {
      // Fix: Create new GoogleGenAI instance right before API call
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      for (let i = 0; i < imageOptions.numberOfImages; i++) {
        const config: any = {
          imageConfig: {
            aspectRatio: imageOptions.aspectRatio,
          },
        };

        if (selectedModel === PAID_MODEL_NAME) {
          if (imageOptions.imageSize) { // Only add imageSize if it's set and model supports it
            config.imageConfig.imageSize = imageOptions.imageSize;
          }
          if (useGoogleSearch) {
            // Fix: Ensure tools array is handled correctly for googleSearch
            config.tools = [{ googleSearch: {} }];
          }
        }
        
        const response: GenerateContentResponse = await ai.models.generateContent({
          model: selectedModel,
          contents: {
            parts: [{ text: prompt }],
          },
          config: config,
        });

        // Process grounding chunks if Google Search was used
        if (selectedModel === PAID_MODEL_NAME && useGoogleSearch && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
          response.candidates[0].groundingMetadata.groundingChunks.forEach((chunk: any) => {
            if (chunk.web && chunk.web.uri && chunk.web.title) {
              collectedGroundingUrls.push({ uri: chunk.web.uri, title: chunk.web.title });
            }
            if (chunk.maps && chunk.maps.uri && chunk.maps.title) { // Include maps if present
              collectedGroundingUrls.push({ uri: chunk.maps.uri, title: chunk.maps.title });
            }
          });
        }

        let imageUrl: string | null = null;
        for (const candidate of response.candidates || []) {
          for (const part of candidate.content?.parts || []) {
            if (part.inlineData && part.inlineData.mimeType.startsWith('image/')) {
              imageUrl = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
              break;
            }
          }
          if (imageUrl) break;
        }

        if (imageUrl) {
          generatedImagesData.push({ url: imageUrl, prompt: prompt, model: selectedModel });
        } else {
          setError(`No image data found in the response for image ${i + 1}.`);
          break;
        }
      }

      if (generatedImagesData.length > 0) {
        setGeneratedImageUrls(generatedImagesData);
      } else if (!error) {
        setError('No images were generated.');
      }
      if (collectedGroundingUrls.length > 0) {
        // Remove duplicates if any
        const uniqueGroundingUrls = Array.from(new Map(collectedGroundingUrls.map(item => [item.uri, item])).values());
        setGroundingUrls(uniqueGroundingUrls);
      }

    } catch (e: any) {
      console.error('Error generating image(s):', e);
      let errorMessage = 'Failed to generate image(s). Please try again.';
      if (e.message) {
        errorMessage = `Error: ${e.message}`;
        // Specific error for API key issue with paid model
        if (e.message.includes("Requested entity was not found.")) {
          errorMessage = "Error: Invalid API Key. Please select a valid API key for ZYTOXIC Pro (Paid) model.";
          setIsApiKeySelected(false);
          // Immediately prompt user to select key again
          if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
            window.aistudio.openSelectKey();
          }
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const currentTitle = selectedModel === FREE_MODEL_NAME 
    ? "ZYTOXIC Image Generator (Free)" 
    : "ZYTOXIC Pro Image Generator (Paid)";

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100 flex items-center justify-center p-4">
      <div className="bg-gray-800 p-10 rounded-lg shadow-lg w-full max-w-4xl space-y-8"> {/* Increased max-w and added space-y */}
        <h1 className="text-4xl font-extrabold text-cyan-400 text-center tracking-wide">{currentTitle}</h1>
        
        {/* Client-side Login Section - ALWAYS VISIBLE AT TOP */}
        <div className="bg-gray-700 p-6 rounded-lg shadow-inner border border-gray-600">
          {!currentUser ? (
            <div className="flex flex-col md:flex-row items-center justify-center gap-4">
              <input
                type="text"
                placeholder="Enter username"
                value={loginInput}
                onChange={(e) => setLoginInput(e.target.value)}
                className="flex-grow px-4 py-2 border border-gray-600 rounded-md bg-gray-800 text-gray-100 focus:ring-cyan-500 focus:border-cyan-500 transition-all hover:border-cyan-500"
                aria-label="Username input"
                onKeyPress={(e) => { if (e.key === 'Enter') handleLogin(); }}
              />
              <button
                onClick={handleLogin}
                className="bg-purple-600 text-white py-2 px-6 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-gray-700 transition duration-150 ease-in-out font-semibold min-w-[100px]"
              >
                Login
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-lg text-gray-200">Welcome, <span className="text-cyan-400 font-bold">{currentUser}</span>!</p>
              <button
                onClick={handleLogout}
                className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-gray-700 transition duration-150 ease-in-out font-semibold"
              >
                Logout
              </button>
            </div>
          )}
          <p className="text-xs text-gray-500 mt-3 text-center">
            (This is a client-side only login for demonstration purposes and offers no security.)
          </p>
          {/* Show error only for login if not logged in */}
          {error && currentUser === null && ( 
            <div className="mt-4 p-3 bg-red-900/30 border border-red-700 text-red-300 rounded-md" role="alert">
              <p className="font-bold">Error:</p>
              <p className="text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Conditional rendering for the rest of the application */}
        {currentUser ? (
          <>
            {selectedModel === PAID_MODEL_NAME && !isApiKeySelected && (
              <div>
                <ApiKeySelector onApiKeySelected={handleApiKeySelected} />
              </div>
            )}

            <div>
              <label htmlFor="modelSelection" className="block text-lg font-bold text-gray-200 mb-3">
                Select AI Model <span className="text-cyan-300 ml-2 text-sm">(Choose ZYTOXIC Pro for higher quality!)</span>
              </label>
              <select
                id="modelSelection"
                className="w-full px-4 py-3 border border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500 bg-gray-700 text-gray-100 transition-all hover:border-cyan-500 text-base"
                value={selectedModel}
                onChange={(e) => {
                  setSelectedModel(e.target.value);
                  // Reset imageSize and Google Search if switching to free model
                  if (e.target.value === FREE_MODEL_NAME) {
                    setImageOptions(prev => ({ ...prev, imageSize: undefined }));
                    setUseGoogleSearch(false);
                  } else {
                    // Set default for paid model if switching to it
                    setImageOptions(prev => ({ ...prev, imageSize: "1K" }));
                  }
                  setGroundingUrls([]); // Clear grounding URLs on model change
                  checkApiKeyStatus();
                  setError(null); // Clear errors on model change
                }}
                aria-label="Select AI model"
              >
                {IMAGE_MODELS.map(model => (
                  <option key={model.value} value={model.value}>{model.label}</option>
                ))}
              </select>
              <p className="text-sm text-gray-400 mt-2">
                ZYTOXIC Pro offers advanced image generation, supports 2K/4K resolutions, and can leverage Google Search for context. Requires a paid API key.
              </p>
            </div>

            <div>
              <label htmlFor="prompt" className="block text-lg font-bold text-gray-200 mb-3">
                Image Prompt
              </label>
              <textarea
                id="prompt"
                className="w-full px-4 py-3 border border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500 transition-all duration-150 ease-in-out resize-y h-36 bg-gray-700 text-gray-100 hover:border-cyan-500 text-base"
                placeholder="Describe the image you want to generate (e.g., 'A futuristic city at sunset, highly detailed, cyberpunk style, 4k')"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                rows={4}
                aria-label="Image prompt input"
              ></textarea>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <label htmlFor="aspectRatio" className="block text-sm font-semibold text-gray-200 mb-2">
                  Aspect Ratio
                </label>
                <select
                  id="aspectRatio"
                  className="w-full px-4 py-3 border border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500 bg-gray-700 text-gray-100 transition-all hover:border-cyan-500 text-base"
                  value={imageOptions.aspectRatio}
                  onChange={(e) => setImageOptions({ ...imageOptions, aspectRatio: e.target.value as ImageGenerationOptions["aspectRatio"] })}
                  aria-label="Select aspect ratio"
                >
                  {IMAGE_ASPECT_RATIOS.map(ratio => (
                    <option key={ratio} value={ratio}>{ratio}</option>
                  ))}
                </select>
              </div>

              {selectedModel === PAID_MODEL_NAME && (
                <div>
                  <label htmlFor="imageSize" className="block text-sm font-semibold text-gray-200 mb-2">
                    Image Size (Pro Model Only)
                  </label>
                  <select
                    id="imageSize"
                    className="w-full px-4 py-3 border border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500 bg-gray-700 text-gray-100 transition-all hover:border-cyan-500 text-base"
                    value={imageOptions.imageSize || "1K"} // Ensure a default is shown if undefined
                    onChange={(e) => setImageOptions({ ...imageOptions, imageSize: e.target.value as ImageGenerationOptions["imageSize"] })}
                    aria-label="Select image size"
                  >
                    {IMAGE_SIZES.map(size => (
                      <option key={size} value={size}>{size}</option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label htmlFor="numberOfImages" className="block text-sm font-semibold text-gray-200 mb-2">
                  Number of Images (1-50)
                </label>
                <select
                  id="numberOfImages"
                  className="w-full px-4 py-3 border border-gray-600 rounded-md focus:ring-cyan-500 focus:border-cyan-500 bg-gray-700 text-gray-100 transition-all hover:border-cyan-500 text-base"
                  value={imageOptions.numberOfImages}
                  onChange={(e) => setImageOptions({ ...imageOptions, numberOfImages: parseInt(e.target.value, 10) })}
                  aria-label="Select number of images to generate"
                >
                  {NUMBER_OF_IMAGES_OPTIONS.map(num => (
                    <option key={num} value={num}>{num}</option>
                  ))}
                </select>
              </div>
              
              {selectedModel === PAID_MODEL_NAME && (
                <div className="col-span-1 md:col-span-2 lg:col-span-3 flex items-center pt-2">
                  <input
                    type="checkbox"
                    id="useGoogleSearch"
                    checked={useGoogleSearch}
                    onChange={(e) => setUseGoogleSearch(e.target.checked)}
                    className="form-checkbox h-5 w-5 text-cyan-500 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500 focus:ring-offset-gray-900"
                    aria-label="Enable Google Search for better grounding"
                  />
                  <label htmlFor="useGoogleSearch" className="ml-2 block text-base font-semibold text-gray-200">
                    Enable Google Search (Pro Model Only)
                  </label>
                </div>
              )}
            </div>

            <button
              onClick={handleGenerateImage}
              className="w-full bg-cyan-500 text-white py-3 px-4 rounded-md hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-gray-800 transition-all duration-150 ease-in-out text-lg font-semibold transform hover:scale-105"
              disabled={isLoading || (selectedModel === PAID_MODEL_NAME && !isApiKeySelected)}
              aria-live="polite"
              aria-atomic="true"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mr-3"></div>
                  Generating...
                </span>
              ) : 'Generate Image(s)'}
            </button>

            {isLoading && <LoadingSpinner />}

            {/* Show error only if logged in or specific API key error */}
            {error && currentUser !== null && ( 
              <div className="mt-6 p-4 bg-red-900/30 border border-red-700 text-red-300 rounded-md" role="alert">
                <p className="font-bold">Error:</p>
                <p className="text-sm">{error}</p>
              </div>
            )}

            {generatedImageUrls.length > 0 && (
              <div className="mt-10 pt-6 border-t border-gray-700">
                <h2 className="text-3xl font-bold text-cyan-400 mb-6 text-center">Newly Generated Image(s)</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {generatedImageUrls.map((imgData, index) => (
                    <div key={index} className="relative group">
                      <ImageCard src={imgData.url} alt={`Generated AI Image ${index + 1}`} />
                      {currentUser && (
                        <button
                          onClick={() => handleSaveImage(imgData)}
                          className="absolute bottom-4 right-4 bg-green-600 text-white p-2 rounded-full hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-gray-800 transition-all duration-150 ease-in-out opacity-0 group-hover:opacity-100"
                          title="Save to Gallery"
                        >
                          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                            <path d="M5 4H15V16H5V4ZM3 2V18C3 19.1046 3.89543 20 5 20H15C16.1046 20 17 19.1046 17 18V2C17 0.89543 16.1046 0 15 0H5C3.89543 0 3 0.89543 3 2ZM10 17C10.5523 17 11 16.5523 11 16C11 15.4477 10.5523 15 10 15C9.44772 15 9 15.4477 9 16C9 16.5523 9.44772 17 10 17Z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {groundingUrls.length > 0 && (
              <div className="mt-10 pt-6 border-t border-gray-700 p-4 bg-gray-700 rounded-lg shadow-inner border border-gray-600">
                <h3 className="text-xl font-bold text-cyan-400 mb-4">Grounding Sources (from Google Search)</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-2">
                  {groundingUrls.map((source, index) => (
                    <li key={index}>
                      <a 
                        href={source.uri} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="text-blue-400 hover:underline hover:text-cyan-300 transition-colors duration-150"
                      >
                        {source.title || source.uri}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {savedImages.length > 0 && (
              <div className="mt-10 pt-6 border-t border-gray-700">
                <h2 className="text-3xl font-bold text-purple-400 mb-6 text-center">Your Saved Gallery ({savedImages.length}/{MAX_SAVED_IMAGES})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {savedImages.map((imgData) => (
                    <div key={imgData.id} className="relative group">
                      <ImageCard src={imgData.url} alt={`Saved AI Image: ${imgData.prompt}`} />
                      <div className="absolute top-4 left-4 bg-gray-900 bg-opacity-75 text-gray-200 text-xs px-2 py-1 rounded-md max-w-[calc(100%-80px)] overflow-hidden text-ellipsis whitespace-nowrap">
                        {imgData.prompt}
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm("Are you sure you want to delete this image from your gallery?")) {
                            const updatedImages = savedImages.filter(img => img.id !== imgData.id);
                            setSavedImages(updatedImages);
                            localStorage.setItem(LOCAL_STORAGE_SAVED_IMAGES_KEY, JSON.stringify(updatedImages));
                          }
                        }}
                        className="absolute bottom-4 right-4 bg-red-600 text-white p-2 rounded-full hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-gray-800 transition-all duration-150 ease-in-out opacity-0 group-hover:opacity-100"
                        title="Delete from Gallery"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                          <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm6 0a1 1 0 01-2 0v6a1 1 0 112 0V8z" clipRule="evenodd"></path>
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
                <button
                  onClick={handleClearSavedImages}
                  className="mt-8 w-full bg-red-700 text-white py-3 px-4 rounded-md hover:bg-red-800 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-gray-800 transition-all duration-150 ease-in-out text-lg font-semibold"
                >
                  Clear All Saved Images
                </button>
              </div>
            )}
          </>
        ) : (
          <p className="text-center text-gray-400 mt-6 text-lg animate-pulse">
            Please log in to access the ZYTOXIC Image Generator.
          </p>
        )}
      </div>
    </div>
  );
};

export default App;