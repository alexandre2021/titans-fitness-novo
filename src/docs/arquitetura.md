# Arquitetura do Projeto

Este documento descreve a arquitetura e as principais tecnologias utilizadas neste projeto.

## Tecnologias Utilizadas

- **React**: Biblioteca principal para construção da interface de usuário (UI).
- **TypeScript**: Linguagem utilizada para garantir tipagem estática e maior segurança no desenvolvimento.
- **Vite**: Ferramenta de build e desenvolvimento rápido para projetos front-end.
- **Tailwind CSS**: Framework utilitário para estilização rápida e responsiva.
- **Supabase**: Backend como serviço, utilizado para autenticação, banco de dados (PostgreSQL) e armazenamento de arquivos/imagens.
- **React Router**: Gerenciamento de rotas e navegação entre páginas.
- **React Hook Form**: Gerenciamento de formulários e validação.
- **Lucide Icons**: Biblioteca de ícones SVG para UI.
- **Custom Hooks**: Hooks personalizados para lógica de autenticação, perfil, navegação e integração com Supabase.

## Estrutura de Pastas

- `src/pages/` — Páginas principais da aplicação (ex: Dashboard, Login, Avaliações, etc.)
- `src/components/` — Componentes reutilizáveis de UI e layout
- `src/hooks/` — Hooks personalizados
- `src/integrations/supabase/` — Integração com Supabase
- `src/lib/` — Funções utilitárias
- `src/utils/` — Utilidades e formatadores
- `src/assets/` — Imagens e arquivos estáticos
- `src/docs/` — Documentação do projeto

## Fluxo Principal

1. Usuário acessa a aplicação via navegador.
2. Autenticação e dados são gerenciados pelo Supabase.
3. Navegação entre páginas é feita pelo React Router.
4. UI é construída com componentes React, estilizados com Tailwind CSS.
5. Formulários utilizam React Hook Form para validação e envio.
6. Imagens e arquivos são enviados e gerenciados via Supabase Storage e Edge Functions.

## Roteamento

O roteamento da aplicação é realizado utilizando o **React Router**. As rotas principais são definidas no arquivo `src/App.tsx`, onde cada caminho é associado a um componente de página.

Exemplo simplificado de configuração:

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import DashboardAluno from './pages/DashboardAluno';
import Login from './pages/Login';
// ... outros imports

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard-aluno" element={<DashboardAluno />} />
        {/* Outras rotas */}
      </Routes>
    </BrowserRouter>
  );
}
```

Além das rotas principais, o projeto utiliza navegação condicional para diferentes tipos de usuários (aluno, personal trainer), e componentes de navegação (sidebar, bottom nav) para adaptar a experiência entre desktop e mobile.

O React Router permite navegação programática (ex: `navigate('/dashboard-aluno')`) e proteção de rotas via componentes como `AuthGuard`.

---

Este documento será expandido conforme novas funcionalidades e integrações forem adicionadas.