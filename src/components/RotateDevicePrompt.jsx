import { useState, useEffect } from 'react';
import { Smartphone, RotateCw } from 'lucide-react';

/**
 * Mobile Landscape Recommendation Prompt.
 * Displays when a touch/mobile device is held in portrait mode,
 * prompting the user to rotate their device to landscape for the intended widescreen platformer view.
 */
export default function RotateDevicePrompt() {
  const [isPortrait, setIsPortrait] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const checkOrientation = () => {
      // Check if width is mobile/tablet scale and height exceeds width (portrait)
      const isMobileWidth = window.innerWidth <= 840;
      const portrait = window.innerHeight > window.innerWidth;
      const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

      setIsPortrait(isMobileWidth && portrait && isTouch);
    };

    checkOrientation();
    window.addEventListener('resize', checkOrientation);
    window.addEventListener('orientationchange', checkOrientation);

    return () => {
      window.removeEventListener('resize', checkOrientation);
      window.removeEventListener('orientationchange', checkOrientation);
    };
  }, []);

  if (!isPortrait || dismissed) {
    return null;
  }

  return (
    <div
      id="rotate-device-overlay"
      className="fixed inset-0 z-[100] bg-neutral-950/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none animate-in fade-in duration-300"
    >
      <div className="w-16 h-16 rounded-2xl bg-cyan-500/15 border border-cyan-400/40 flex items-center justify-center text-cyan-300 mb-6 shadow-xl shadow-cyan-950/50 relative">
        <Smartphone className="w-8 h-8 transform rotate-0" />
        <RotateCw className="w-4 h-4 text-cyan-400 absolute -top-1 -right-1" />
      </div>

      <h2 className="text-xl font-display font-bold text-white tracking-wide mb-2">
        Rotate for Landscape
      </h2>

      <p className="text-xs text-neutral-400 max-w-xs leading-relaxed mb-6">
        Dash Runner is built for widescreen precision timing. Turn your phone sideways into landscape mode for the best view and touch controls.
      </p>

      <button
        id="dismiss-rotate-prompt-btn"
        onClick={() => setDismissed(true)}
        className="px-5 py-2.5 rounded-xl bg-neutral-900 border border-neutral-700 hover:border-neutral-600 text-xs font-semibold text-neutral-300 hover:text-white transition cursor-pointer"
      >
        Continue in Portrait
      </button>
    </div>
  );
}
