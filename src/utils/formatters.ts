export function formatarTelefone(telefone: string): string {
  if (!telefone) return '';
  const digitos = telefone.replace(/\D/g, '');
  let telefoneFormatado = digitos.replace(/^(\d{2})(\d)/, '($1) $2');
  telefoneFormatado = telefoneFormatado.replace(/(\d{5})(\d)/, '$1-$2');
  return telefoneFormatado.slice(0, 15);
}

export function limparTelefone(telefone: string): string {
  return telefone.replace(/\D/g, '');
}

// Formatadores de dados
export const formatters = {
  phone: (phone: string) => {
    // Remove caracteres não numéricos
    const cleaned = phone.replace(/\D/g, '');
    
    // Aplica máscara (11) 99999-9999
    if (cleaned.length === 11) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    }
    
    // Aplica máscara (11) 9999-9999 para números com 10 dígitos
    if (cleaned.length === 10) {
      return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    }
    
    return phone;
  },

  date: (date: string | Date) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      return dateObj.toLocaleDateString('pt-BR');
    } catch {
      return date.toString();
    }
  },

  currency: (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  },

  cpf: (cpf: string) => {
    const cleaned = cpf.replace(/\D/g, '');
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}.${cleaned.slice(3, 6)}.${cleaned.slice(6, 9)}-${cleaned.slice(9)}`;
    }
    return cpf;
  }
};