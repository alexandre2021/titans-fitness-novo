import * as React from "react"

const MOBILE_BREAKPOINT = 768
const mediaQueryString = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;

const getIsMobile = () => {
  // Retorna `false` no servidor para evitar erros e garantir consistência na renderização inicial.
  if (typeof window === 'undefined') {
    return false;
  }
  return window.matchMedia(mediaQueryString).matches;
}

export function useIsMobile() {
  // Inicializa o estado com o valor correto no cliente, evitando o "pisca".
  const [isMobile, setIsMobile] = React.useState(getIsMobile)

  React.useEffect(() => {
    const mediaQueryList = window.matchMedia(mediaQueryString);
    const listener = () => setIsMobile(mediaQueryList.matches);
    mediaQueryList.addEventListener("change", listener);
    return () => mediaQueryList.removeEventListener("change", listener);
  }, [])

  return isMobile
}
