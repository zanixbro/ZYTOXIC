
import React from 'react';

interface ImageCardProps {
  src: string;
  alt: string;
}

const ImageCard: React.FC<ImageCardProps> = React.memo(({ src, alt }) => {
  return (
    <div className="relative group overflow-hidden rounded-lg shadow-xl hover:shadow-2xl transition-shadow duration-300 bg-gray-800 flex items-center justify-center p-2 border border-gray-700">
      <img
        src={src}
        alt={alt}
        className="max-w-full h-auto object-contain rounded-lg"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity duration-300 flex items-center justify-center">
        <a
          href={src}
          download={`gemini-image-${Date.now()}.png`}
          className="opacity-0 group-hover:opacity-100 transition-all duration-300 p-2 bg-cyan-500 text-white rounded-full hover:bg-cyan-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-opacity-75 w-10 h-10 flex items-center justify-center"
          title="Download Image"
        >
          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
            <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd"></path>
          </svg>
        </a>
      </div>
    </div>
  );
});

export default ImageCard;