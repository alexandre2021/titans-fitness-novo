import { useState, useEffect } from 'react';

/**
 * Helper function to get the match status of a media query.
 * It's safe to call on the server, where it will return a default value.
 * @param query The media query string.
 * @returns `true` if the query matches, `false` otherwise.
 */
const getMatches = (query: string): boolean => {
  // Returns `false` on the server to avoid errors and ensure consistency on initial render.
  if (typeof window !== 'undefined') {
    return window.matchMedia(query).matches;
  }
  return false;
};

/**
 * A custom hook to determine if a media query matches the current screen size.
 * @param query The media query string (e.g., '(min-width: 768px)').
 * @returns `true` if the query matches, `false` otherwise.
 */
export function useMediaQuery(query: string): boolean {
  // Initialize state with the correct value on the client, avoiding the "flicker".
  const [matches, setMatches] = useState<boolean>(() => getMatches(query));

  useEffect(() => {
    const mediaQueryList = window.matchMedia(query);
    const listener = () => setMatches(mediaQueryList.matches);
    
    mediaQueryList.addEventListener('change', listener);

    return () => mediaQueryList.removeEventListener('change', listener);
  }, [query]);

  return matches;
}