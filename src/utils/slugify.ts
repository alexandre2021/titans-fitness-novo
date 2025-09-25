export const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/\s+/g, '-')       // Substitui espaços por -
    .replace(/[^\w-]+/g, '')    // Remove caracteres inválidos
    .replace(/--+/g, '-')       // Substitui múltiplos - por um único -
    .replace(/^-+/, '')         // Remove - do início
    .replace(/-+$/, '');        // Remove - do final
};