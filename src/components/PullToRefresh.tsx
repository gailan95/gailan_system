import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';

interface PullToRefreshProps {
  children: React.ReactNode;
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({ children }) => {
  const [pullDist, setPullDist] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startYRef = useRef(0);
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const threshold = 80;

  const getScrollTop = () => {
    const scrollContainer = document.getElementById('main-scroll-container');
    const containerScroll = scrollContainer ? scrollContainer.scrollTop : 0;
    return Math.max(window.scrollY, document.documentElement.scrollTop, document.body.scrollTop, containerScroll);
  };

  const handleTouchStart = (e: TouchEvent) => {
    const target = e.target as HTMLElement | null;
    if (
      target?.closest('.fixed') ||
      target?.closest('[role="dialog"]') ||
      target?.closest('.no-pull-refresh') ||
      target?.closest('.overflow-y-auto')
    ) {
      startYRef.current = 0;
      isDraggingRef.current = false;
      return;
    }
    if (getScrollTop() <= 0) {
      startYRef.current = e.touches[0].clientY;
      isDraggingRef.current = true;
    } else {
      startYRef.current = 0;
      isDraggingRef.current = false;
    }
  };

  const handleTouchMove = (e: TouchEvent) => {
    if (!isDraggingRef.current || startYRef.current === 0) return;
    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;
    
    // Only activate if pulled down significantly (> 40px) at top
    if (diff > 40 && getScrollTop() <= 0) {
      const calculatedDist = Math.min((diff - 40) * 0.4, 90);
      setPullDist(calculatedDist);
    } else if (diff <= 0) {
      if (pullDist !== 0) setPullDist(0);
    }
  };

  const handleTouchEnd = () => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    
    if (pullDist >= threshold && !refreshing) {
      setRefreshing(true);
      setPullDist(50);
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } else {
      setPullDist(0);
    }
    startYRef.current = 0;
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: true });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
    };
  }, [pullDist, refreshing]);

  return (
    <div ref={containerRef} className="relative min-h-full flex-1 flex flex-col overscroll-y-contain">
      {/* Pull Indicator - Uses transform translate3d to avoid layout reflow/jump */}
      <div 
        className="absolute left-0 right-0 top-2 flex items-center justify-center pointer-events-none z-50 transition-transform duration-200 ease-out"
        style={{ 
          transform: `translate3d(0, ${pullDist > 0 ? Math.min(pullDist, 70) : -60}px, 0)`,
          opacity: pullDist > 10 ? Math.min(pullDist / 50, 1) : 0,
        }}
      >
        <div className={`flex items-center gap-2 text-cyan-800 font-black text-xs bg-white/95 backdrop-blur-md px-4 py-2 rounded-full shadow-xl border border-cyan-200 ${refreshing ? 'animate-pulse' : ''}`}>
          <RefreshCw className={`w-4 h-4 text-cyan-600 ${refreshing || pullDist >= threshold ? 'animate-spin' : ''}`} />
          <span>{refreshing ? 'نوێ دەبێتەوە...' : pullDist >= threshold ? 'بەردە بۆ نوێکردنەوە' : 'بکشێنە خوارەوە بۆ ڕیفرێش'}</span>
        </div>
      </div>
      
      <div className="w-full flex-1 flex flex-col min-h-0">{children}</div>
    </div>
  );
};
