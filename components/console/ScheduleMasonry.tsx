"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, Children } from 'react';
import { gsap } from 'gsap';

const useMedia = (queries: string[], values: number[], defaultValue: number) => {
  const get = () => values[queries.findIndex(q => window.matchMedia(q).matches)] ?? defaultValue;

  const [value, setValue] = useState(get);

  useEffect(() => {
    const handler = () => setValue(get);
    queries.forEach(q => window.matchMedia(q).addEventListener('change', handler));
    return () => queries.forEach(q => window.matchMedia(q).removeEventListener('change', handler));
  }, [queries]);

  return value;
};

const useMeasure = () => {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!ref.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize({ width, height });
    });
    ro.observe(ref.current);
    return () => ro.disconnect();
  }, []);

  return [ref, size] as const;
};

interface ScheduleMasonryProps {
  children: React.ReactNode;
  ease?: string;
  duration?: number;
  stagger?: number;
  animateFrom?: 'top' | 'bottom' | 'left' | 'right' | 'center' | 'random';
  gap?: number;
}

export const ScheduleMasonry = ({
  children,
  ease = 'power3.out',
  duration = 0.6,
  stagger = 0.05,
  animateFrom = 'bottom',
  gap = 16
}: ScheduleMasonryProps) => {
  const childrenArray = useMemo(() => Children.toArray(children), [children]);
  const columns = useMedia(
    ['(min-width:1500px)', '(min-width:1000px)', '(min-width:600px)', '(min-width:400px)'],
    [3, 2, 2, 1],
    1
  );

  const [containerRef, { width }] = useMeasure();
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [heights, setHeights] = useState<number[]>([]);
  const prevDepsRef = useRef<{ childrenLength: number; width: number; columns: number }>({
    childrenLength: 0,
    width: 0,
    columns: 0
  });

  const getInitialPosition = (item: { x: number; y: number }) => {
    let direction = animateFrom;

    if (animateFrom === 'random') {
      const directions = ['top', 'bottom', 'left', 'right'];
      direction = directions[Math.floor(Math.random() * directions.length)] as typeof direction;
    }

    switch (direction) {
      case 'top':
        return { x: item.x, y: -200 };
      case 'bottom':
        return { x: item.x, y: window.innerHeight + 200 };
      case 'left':
        return { x: -200, y: item.y };
      case 'right':
        return { x: window.innerWidth + 200, y: item.y };
      case 'center':
        return {
          x: width / 2 - (width / columns) / 2,
          y: window.innerHeight / 2
        };
      default:
        return { x: item.x, y: item.y + 100 };
    }
  };

  // Measure heights after render
  useEffect(() => {
    const childrenLength = childrenArray.length;
    const hasChanged = 
      prevDepsRef.current.childrenLength !== childrenLength ||
      prevDepsRef.current.width !== width ||
      prevDepsRef.current.columns !== columns;

    if (!hasChanged) return;

    // Update refs array size if needed
    if (itemRefs.current.length !== childrenLength) {
      itemRefs.current = new Array(childrenLength).fill(null).map((_, i) => itemRefs.current[i] || null);
    }

    // Use requestAnimationFrame to ensure DOM has updated
    requestAnimationFrame(() => {
      const newHeights = itemRefs.current.map(ref => {
        if (!ref) return 300; // Default height
        return ref.offsetHeight;
      });

      setHeights(newHeights);
      prevDepsRef.current = { childrenLength, width, columns };
    });
  }, [childrenArray.length, width, columns]);

  const grid = useMemo(() => {
    if (!width || heights.length === 0) return [];

    const colHeights = new Array(columns).fill(0);
    const columnWidth = (width - (gap * (columns - 1))) / columns;

    return childrenArray.map((_, index) => {
      const col = colHeights.indexOf(Math.min(...colHeights));
      const x = columnWidth * col + (gap * col);
      const height = heights[index] || 300;
      const y = colHeights[col];

      colHeights[col] += height + gap;

      return { id: index, x, y, w: columnWidth, h: height };
    });
  }, [columns, childrenArray, width, heights, gap]);

  const hasMounted = useRef(false);

  useLayoutEffect(() => {
    if (heights.length === 0 || grid.length === 0) return;

    grid.forEach((item, index) => {
      const element = itemRefs.current[index];
      if (!element) return;

      const selector = `[data-masonry-key="${item.id}"]`;
      const animationProps = {
        x: item.x,
        y: item.y,
        width: item.w,
        height: item.h
      };

      if (!hasMounted.current) {
        const initialPos = getInitialPosition(item);
        const initialState = {
          opacity: 0,
          x: initialPos.x,
          y: initialPos.y,
          width: item.w,
          height: item.h,
          filter: 'blur(10px)'
        };

        gsap.fromTo(selector, initialState, {
          opacity: 1,
          ...animationProps,
          filter: 'blur(0px)',
          duration: 0.8,
          ease: 'power3.out',
          delay: index * stagger
        });
      } else {
        gsap.to(selector, {
          ...animationProps,
          duration: duration,
          ease: ease,
          overwrite: 'auto'
        });
      }
    });

    hasMounted.current = true;
  }, [grid, heights, stagger, animateFrom, duration, ease]);

  return (
    <div ref={containerRef} className="relative w-full" style={{ minHeight: '100vh' }}>
      {childrenArray.map((child, index) => {
        const item = grid[index];
        if (!item) return null;

        return (
          <div
            key={index}
            ref={(el) => { itemRefs.current[index] = el; }}
            data-masonry-key={item.id}
            className="absolute will-change-transform"
            style={{
              padding: `${gap / 2}px`
            }}
          >
            <div className="w-full h-full">
              {child}
            </div>
          </div>
        );
      })}
    </div>
  );
};
