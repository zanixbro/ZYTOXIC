
import React from 'react';

interface ApiKeySelectorProps {
  onApiKeySelected: () => void;
}

export const ApiKeySelector: React.FC<ApiKeySelectorProps> = ({ onApiKeySelected }) => {
  const handleSelectKey = async () => {
    await window.aistudio.openSelectKey();
    // Assume key selection was successful after triggering openSelectKey()
    onApiKeySelected();
  };

  return (
    <div className="bg-gray-700 p-6 rounded-lg shadow-lg text-center border border-gray-600">
      <h2 className="text-xl font-bold text-cyan-400 mb-4">API Key Required</h2>
      <p className="text-gray-300 mb-4">
        To use the ZYTOXIC Pro model, you need to select a paid API key.
        This model offers higher quality image generation, including 2K/4K resolutions and Google Search grounding.
      </p>
      <button
        onClick={handleSelectKey}
        className="bg-cyan-600 text-white py-2 px-6 rounded-md hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-gray-700 transition duration-150 ease-in-out font-semibold"
      >
        Select API Key
      </button>
      <p className="text-gray-400 text-sm mt-4">
        <a 
          href="https://ai.google.dev/gemini-api/docs/billing" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-blue-400 hover:underline"
          aria-label="Link to Gemini API billing documentation"
        >
          Learn more about billing
        </a> for Gemini API usage.
      </p>
    </div>
  );
};