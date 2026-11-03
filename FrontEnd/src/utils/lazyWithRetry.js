import { lazy } from "react";

/**
 * Enhanced React.lazy with automatic retry on chunk load errors (e.g. after network glitch or new deployment).
 *
 * @param {() => Promise<{ default: React.ComponentType<any> }>} componentImport
 * @param {number} retriesLeft
 * @param {number} interval
 */
export const lazyWithRetry = (componentImport, retriesLeft = 2, interval = 1000) => {
  return lazy(() =>
    new Promise((resolve, reject) => {
      const attempt = (remaining) => {
        componentImport()
          .then(resolve)
          .catch((error) => {
            if (remaining === 0) {
              reject(error);
              return;
            }
            setTimeout(() => {
              attempt(remaining - 1);
            }, interval);
          });
      };
      attempt(retriesLeft);
    })
  );
};

export default lazyWithRetry;
