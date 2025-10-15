export interface Article {
  title: string;
  content: string;
  tags: string[];
}

export interface Category {
  category: string;
  articles: Article[];
}

// Esta função agora é a única fonte da verdade para analisar a base de conhecimento.
export const parseKnowledgeBase = (content: string): Category[] => {
  const categories: Category[] = [];
  const lines = content.split('\n');
  let currentCategory: Category | null = null;
  let currentArticle: Article | null = null;

  for (const line of lines) {
    if (line.startsWith('## Categoria:')) {
      if (currentCategory) categories.push(currentCategory);
      currentCategory = { category: line.replace('## Categoria:', '').trim(), articles: [] };
      currentArticle = null;
    } else if (line.startsWith('### Título:')) {
      if (currentArticle && currentCategory) currentCategory.articles.push(currentArticle);
      currentArticle = { title: line.replace('### Título:', '').trim(), content: '', tags: [] };
    } else if (line.startsWith('*   **Conteúdo:**')) {
      if (currentArticle) currentArticle.content = line.replace('*   **Conteúdo:**', '').trim();
    } else if (line.startsWith('*   **Tags:**')) {
      if (currentArticle) currentArticle.tags = line.replace('*   **Tags:**', '').trim().split(',').map(tag => tag.trim());
    } else if (currentArticle && !line.startsWith('*   **')) {
      currentArticle.content += '\n' + line.trim();
    }
  }

  if (currentArticle && currentCategory) currentCategory.articles.push(currentArticle);
  if (currentCategory) categories.push(currentCategory);

  return categories;
};