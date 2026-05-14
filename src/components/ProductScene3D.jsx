import React from 'react';

const ProductScene3D = () => {
  return (
    <div className="relative w-full h-[60vh] md:h-[80vh] min-h-[400px] flex items-center justify-center bg-transparent mt-12 mb-8 md:my-16">
      {/* Dynamic 3D Scene Wrapper */}
      <div className="absolute inset-0 z-0">
        <div className="w-full h-full rounded-[2rem] overflow-hidden shadow-2xl relative custom-3d-wrapper">
          {/* Fallback Glass overlay to blend edges with the background seamlessly */}
          <div className="absolute inset-0 pointer-events-none rounded-[2rem] border border-white/10 shadow-[inner_0_0_80px_rgba(0,0,0,0.8)] z-10 box-border mix-blend-overlay"></div>
          <iframe
            src="https://my.spline.design/untitled-k1KQe1bIq5W7lZvLark2ZzGe/"
            className="w-full h-full scale-[1.02] border-none"
            frameBorder="0"
            allowFullScreen
            title="Luxury 3D Scene"
          />
        </div>
      </div>
      
      {/* Foreground Content Overlay */}
      <div className="relative z-10 w-full px-6 flex flex-col items-center text-center pointer-events-none">
        
        {/* We can place floating text or a subtle indicator here if needed */}
        <div className="mt-auto pt-[40vh] md:pt-[50vh] flex flex-col items-center opacity-80 pointer-events-auto transition-opacity duration-500 hover:opacity-100">
          <div className="w-12 h-12 rounded-full border border-white/20 flex flex-col items-center justify-center animate-bounce shadow-glow backdrop-blur-sm bg-black/20">
            <svg 
              width="24" 
              height="24" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              className="text-perfume-gold w-5 h-5 mx-auto"
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="m7 15 5 5 5-5"/>
              <path d="m7 9 5 5 5-5"/>
            </svg>
          </div>
          <span className="text-[10px] uppercase tracking-[0.3em] font-medium text-perfume-gold mt-4 shadow-sm bg-black/40 px-3 py-1 rounded-full backdrop-blur-md">
            Drag to Interact
          </span>
        </div>

      </div>
    </div>
  );
};

export default ProductScene3D;
