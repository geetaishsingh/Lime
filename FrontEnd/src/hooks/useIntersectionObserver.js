import { useEffect, useRef, useState } from "react";

/**
 * Custom hook for Viewport-Based Lazy Loading using Intersection Observer.
 *
 * @param {Object} options IntersectionObserverInit options
 * @param {string} options.rootMargin Default '200px' to prefetch before entering viewport
 * @param {number|number[]} options.threshold Default 0.01
 * @param {boolean} options.triggerOnce Whether to disconnect after first intersecting (default: true)
 * @returns {[import('react').RefObject<HTMLElement | null>, boolean, IntersectionObserverEntry | null]}
 */
export const useIntersectionObserver = ({
  root = null,
  rootMargin = "200px 0px",
  threshold = 0.01,
  triggerOnce = true,
} = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [entry, setEntry] = useState(null);
  const targetRef = useRef(null);

  useEffect(() => {
    const node = targetRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setIsIntersecting(true);
      return;
    }

    // If already intersected and triggerOnce is true, do not re-observe
    if (isIntersecting && triggerOnce) return;

    const observer = new IntersectionObserver(
      ([observedEntry]) => {
        setEntry(observedEntry);
        if (observedEntry.isIntersecting) {
          setIsIntersecting(true);
          if (triggerOnce) {
            observer.unobserve(node);
          }
        } else if (!triggerOnce) {
          setIsIntersecting(false);
        }
      },
      { root, rootMargin, threshold }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [root, rootMargin, threshold, triggerOnce, isIntersecting]);

  return [targetRef, isIntersecting, entry];
};

export default useIntersectionObserver;
