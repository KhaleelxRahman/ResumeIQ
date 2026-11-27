import { Suspense, lazy, useEffect, useState } from 'react';
import { StaticPrismFallback } from './StaticPrismFallback';
import { WebGLErrorBoundary } from './WebGLErrorBoundary';

const LazyHeroPrismCanvas = lazy(() => import('./HeroPrismCanvas'));

function checkWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement('canvas');
    return !!(
      window.WebGLRenderingContext &&
      (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
}

export function HeroVisualStage() {
  const [allow3D, setAllow3D] = useState(false);

  useEffect(() => {
    const evaluateEligibility = () => {
      const reducedMotion =
        typeof window.matchMedia === 'function'
          ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
          : false;
      const isDesktop = window.innerWidth >= 768;
      setAllow3D(!reducedMotion && isDesktop && checkWebGLAvailable());
    };

    evaluateEligibility();
    window.addEventListener('resize', evaluateEligibility);
    return () => window.removeEventListener('resize', evaluateEligibility);
  }, []);

  return (
    <aside
      aria-label="Visual Calibration Stage"
      className="flex min-h-[380px] w-full flex-col justify-between rounded-[14px] border border-[var(--border-hairline)] bg-[var(--bg-surface)]"
    >
      {allow3D ? (
        <WebGLErrorBoundary fallback={<StaticPrismFallback />}>
          <Suspense fallback={<StaticPrismFallback />}>
            <LazyHeroPrismCanvas />
          </Suspense>
        </WebGLErrorBoundary>
      ) : (
        <StaticPrismFallback />
      )}
    </aside>
  );
}
