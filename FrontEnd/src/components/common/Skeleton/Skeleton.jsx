import React from "react";
import "./Skeleton.scss";

/**
 * Universal Shimmer Skeleton Primitive for zero-CLS loading states.
 *
 * @param {Object} props
 * @param {'rectangular' | 'circular' | 'text'} [props.variant='rectangular']
 * @param {string | number} [props.width]
 * @param {string | number} [props.height]
 * @param {string | number} [props.borderRadius]
 * @param {'shimmer' | 'pulse'} [props.animation='shimmer']
 * @param {string} [props.className]
 * @param {React.CSSProperties} [props.style]
 */
export const Skeleton = ({
  variant = "rectangular",
  width,
  height,
  borderRadius,
  animation = "shimmer",
  className = "",
  style = {},
  ...rest
}) => {
  const combinedStyles = {
    ...(width !== undefined ? { width: typeof width === "number" ? `${width}px` : width } : {}),
    ...(height !== undefined ? { height: typeof height === "number" ? `${height}px` : height } : {}),
    ...(borderRadius !== undefined ? { borderRadius } : {}),
    ...style,
  };

  return (
    <span
      className={`lime-skeleton variant-${variant} animation-${animation} ${className}`}
      style={combinedStyles}
      aria-hidden="true"
      {...rest}
    />
  );
};

export default Skeleton;
