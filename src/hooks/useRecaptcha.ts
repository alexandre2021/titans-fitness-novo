import { useEffect, useState } from 'react';

/**
 * Hook para gerenciar reCAPTCHA v3 (invisível)
 *
 * Carrega o script do Google reCAPTCHA v3 dinamicamente e fornece
 * função para executar verificações invisíveis.
 *
 * Uso:
 * ```
 * const { executeRecaptcha, isReady } = useRecaptcha();
 *
 * if (isReady) {
 *   const token = await executeRecaptcha('signup');
 * }
 * ```
 */

declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (siteKey: string, options: { action: string }) => Promise<string>;
    };
  }
}

export const useRecaptcha = () => {
  const [isReady, setIsReady] = useState(false);
  const RECAPTCHA_SITE_KEY_V3 = import.meta.env.VITE_RECAPTCHA_SITE_KEY_V3;

  useEffect(() => {
    // Se a chave não estiver configurada, não carrega o script
    if (!RECAPTCHA_SITE_KEY_V3) {
      console.warn('reCAPTCHA v3 site key não configurada. Defina VITE_RECAPTCHA_SITE_KEY_V3 no .env');
      return;
    }

    // Verifica se o script já foi carregado
    if (window.grecaptcha) {
      window.grecaptcha.ready(() => setIsReady(true));
      return;
    }

    // Carrega o script do reCAPTCHA v3
    const script = document.createElement('script');
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY_V3}`;
    script.async = true;
    script.defer = true;

    script.onload = () => {
      window.grecaptcha.ready(() => {
        setIsReady(true);
      });
    };

    document.head.appendChild(script);

    return () => {
      // Cleanup: remove o script quando o componente é desmontado
      const scriptElement = document.querySelector(`script[src*="recaptcha"]`);
      if (scriptElement) {
        scriptElement.remove();
      }
    };
  }, [RECAPTCHA_SITE_KEY_V3]);

  /**
   * Executa o reCAPTCHA v3 invisível e retorna o token
   *
   * @param action - Nome da ação (ex: 'signup_aluno', 'signup_professor', 'login')
   * @returns Promise com o token reCAPTCHA ou null se não estiver pronto
   */
  const executeRecaptcha = async (action: string): Promise<string | null> => {
    if (!isReady || !RECAPTCHA_SITE_KEY_V3) {
      console.warn('reCAPTCHA não está pronto ou chave não configurada');
      return null;
    }

    try {
      const token = await window.grecaptcha.execute(RECAPTCHA_SITE_KEY_V3, { action });
      return token;
    } catch (error) {
      console.error('Erro ao executar reCAPTCHA v3:', error);
      return null;
    }
  };

  /**
   * Remove o script e badge do reCAPTCHA da página
   * Útil para limpar após o cadastro ser concluído
   */
  const cleanup = () => {
    // Remove o script
    const scriptElement = document.querySelector(`script[src*="recaptcha"]`);
    if (scriptElement) {
      scriptElement.remove();
    }

    // Remove o badge do reCAPTCHA
    const badge = document.querySelector('.grecaptcha-badge');
    if (badge) {
      badge.remove();
    }

    // Limpa o objeto global
    if (window.grecaptcha) {
      delete (window as any).grecaptcha;
    }

    setIsReady(false);
  };

  return {
    executeRecaptcha,
    isReady,
    cleanup,
  };
};
