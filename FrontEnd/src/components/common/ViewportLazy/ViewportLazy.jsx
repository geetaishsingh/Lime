import React from "react";
import useIntersectionObserver from "../../../hooks/useIntersectionObserver";

/**
 * ViewportLazy loads below-the-fold content when it enters or nears the viewport.
 * Uses native IntersectionObserver to avoid rendering off-screen DOM/video elements.
 *
 * @param {Object} props
 * @param {React.ReactNode} props.children Child component to render when near viewport
 * @param {React.ReactNode} [props.placeholder] Fallback skeleton or placeholder to render before viewport
 * @param {string} [props.rootMargin='250px 0px'] Threshold margin to load ahead of scroll
 * @param {string | number} [props.minHeight] Minimum height to prevent layout shift (CLS)
 * @param {string} [props.className] Optional wrapper class
 */
export const ViewportLazy = ({
  children,
  placeholder = null,
  rootMargin = "250px 0px",
  minHeight,
  className = "",
  style = {},
}) => {
  const [ref, isIntersecting] = useIntersectionObserver({
    rootMargin,
    triggerOnce: true,
  });

  return (
    <div
      ref={ref}
      className={`viewport-lazy-container ${className}`}
      style={{
        minHeight: minHeight || undefined,
        ...style,
      }}
    >
      {isIntersecting ? children : placeholder}
    </div>
  );
};

export default ViewportLazy;
