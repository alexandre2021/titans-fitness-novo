import * as React from 'react'

/**
 * A custom hook to determine if a media query matches the current screen size.
 * @param query The media query string (e.g., '(min-width: 768px)').
 * @returns `true` if the query matches, `false` otherwise.
 */
export function useMediaQuery(query: string) {
  const [value, setValue] = React.useState(false)

  React.useEffect(() => {
    function onChange(event: MediaQueryListEvent) {
      setValue(event.matches)
    }

    const result = window.matchMedia(query)
    result.addEventListener('change', onChange)
    setValue(result.matches)

    return () => result.removeEventListener('change', onChange)
  }, [query])

  return value
}