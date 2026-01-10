/**
 * Utility functions for image handling, including base64/data URI support
 */

/**
 * Checks if a string is a data URI (base64 encoded image)
 * @param src - Image source string
 * @returns true if the string is a data URI
 */
export const isDataURI = (src: string): boolean => {
  return src.startsWith('data:');
};

/**
 * Checks if a string is a base64 encoded image data URI
 * @param src - Image source string
 * @returns true if the string is a base64 data URI
 */
export const isBase64DataURI = (src: string): boolean => {
  return src.startsWith('data:image/') && src.includes('base64,');
};

/**
 * Normalizes an image source to handle both URLs and data URIs
 * @param src - Image source string (URL or data URI)
 * @returns The normalized source string
 */
export const normalizeImageSrc = (src: string): string => {
  // Data URIs are already normalized
  if (isDataURI(src)) {
    return src;
  }
  // Regular URLs are returned as-is
  return src;
};
