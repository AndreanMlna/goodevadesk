import React, { useEffect, useRef, useState } from 'react';

export interface CompleteShelfLandingPageProps {
  headingFont?: string;
  bodyFont?: string;
  headingWeight?: string;
  bodyWeight?: string;
  primaryColor?: string;
  headingSize?: number;
  bodySize?: number;
  headingLetterSpacing?: number;
  className?: string;
  style?: React.CSSProperties;
}

const URL_FRAME_SANDBOX =
  'allow-downloads allow-forms allow-modals allow-popups allow-same-origin allow-scripts';

export const CompleteShelfLandingPage: React.FC<CompleteShelfLandingPageProps> = ({
  headingFont = 'iowan-old-style',
  bodyFont = 'inter',
  headingWeight = '400',
  bodyWeight = '400',
  primaryColor = '#c87046',
  headingSize = 60,
  bodySize = 12,
  headingLetterSpacing = -0.055,
  className = '',
  style,
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const frameRef = useRef<HTMLIFrameElement>(null);

  const applyCustomization = () => {
    try {
      const doc = frameRef.current?.contentDocument;
      if (!doc) return;

      let styleEl = doc.getElementById('threeui-custom-style') as HTMLStyleElement | null;
      if (!styleEl) {
        styleEl = doc.createElement('style');
        styleEl.id = 'threeui-custom-style';
        doc.head.appendChild(styleEl);
      }

      styleEl.textContent = `
        :root {
          --primary-color: ${primaryColor} !important;
          --heading-size: ${headingSize}px !important;
          --body-size: ${bodySize}px !important;
          --heading-letter-spacing: ${headingLetterSpacing}em !important;
        }
      `;
    } catch {
      // Sandboxed origin safety fallback
    }
  };

  useEffect(() => {
    if (isLoaded) {
      applyCustomization();
    }
  }, [isLoaded, primaryColor, headingSize, bodySize, headingLetterSpacing, headingFont, bodyFont, headingWeight, bodyWeight]);

  return (
    <div
      className={`relative w-full h-full overflow-hidden bg-[#080808] rounded-2xl ${className}`}
      style={{ minHeight: '720px', ...style }}
    >
      {!isLoaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#090d16] z-10 space-y-3">
          <div className="w-10 h-10 border-2 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-xs font-semibold text-slate-400 tracking-wide">
            Initializing Three.js r165 3D Spatial Environment...
          </p>
        </div>
      )}
      <iframe
        ref={frameRef}
        title="Working Volumes — Seven Tools for Making"
        src="/landing-pages/complete-shelf-v2.html"
        sandbox={URL_FRAME_SANDBOX}
        loading="eager"
        onLoad={() => {
          setIsLoaded(true);
          applyCustomization();
        }}
        className="w-full h-full border-none block"
        style={{
          width: '100%',
          height: '100%',
          minHeight: '720px',
          border: 'none',
          backgroundColor: '#080808',
        }}
      />
    </div>
  );
};
