# 👤 Sistema de Perfil de Usuário

Este documento descreve a arquitetura e as principais funcionalidades do sistema de perfil de usuário, que é compartilhado entre Alunos e Profesores.

---

## 📂 Arquitetura de Arquivos

A funcionalidade de perfil é modular e reutiliza componentes para garantir consistência.

```
src/
├── pages/
│   ├── PerfilAluno.tsx                # Página principal do perfil do Aluno
│   └── PerfilPT.tsx                   # Página principal do perfil do PT
│
├── components/
│   └── perfil/
│       ├── AvatarSection.tsx          # 🖼️ Componente da foto e nome (reutilizado)
│       ├── PerfilTabs.tsx             # 📑 Abas de informações do PT
│       ├── AlunoPerfilTabs.tsx        # 📑 Abas de informações do Aluno
│       ├── EditPessoalModal.tsx       # ✏️ Modal de edição (pessoal)
│       ├── EditProfissionalModal.tsx  # ✏️ Modal de edição (profissional)
│       ├── EditRedesSociaisModal.tsx  # ✏️ Modal de edição (redes sociais)
│       ├── EditAlunoModal.tsx         # ✏️ Modal de edição (aluno)
│       └── PasswordChangeSection.tsx  # 🔑 Seção para troca de senha
│
├── hooks/
│   ├── useAlunoProfile.ts             # 🎣 Hook para dados do perfil do Aluno
│   └── usePTProfile.ts                # 🎣 Hook para dados do perfil do PT
│
└── types/
    └── ...                            # Tipos de dados (Aluno, professor)
```

---

## ✨ Funcionalidade Principal: Edição de Perfil com Modais Unificados

A edição de perfil foi projetada para oferecer uma experiência consistente em qualquer dispositivo, utilizando um padrão de modal unificado e responsivo baseado no `react-modal`.

**Onde é implementado:**
-   `src/components/perfil/AvatarSection.tsx` (aciona o modal)
-   `src/components/perfil/PerfilTabs.tsx` (aciona os modais)
-   `src/components/perfil/Edit...Modal.tsx` (todos os modais de edição)

### Como Funciona:

Ao clicar em "Editar", um único componente de modal é aberto. Este modal é estilizado com Tailwind CSS para ser totalmente responsivo:

-   Em **telas grandes (Desktop)**, ele se comporta como um diálogo centralizado tradicional.
-   Em **telas pequenas (Mobile)**, ele se ajusta para ocupar a largura da tela com pequenas margens, proporcionando uma experiência de usuário nativa e acessível.

### Implementação:

O padrão é implementado diretamente com o componente `<Modal>` do `react-modal`, com classes de CSS que controlam sua aparência e responsividade.

```typescriptreact
// Exemplo de uso em um componente de edição
const EditPessoalModal = ({ open, onOpenChange, ... }) => {
  return (
    <Modal
      isOpen={open}
      onRequestClose={() => onOpenChange(false)}
      className="... classes responsivas ..."
      overlayClassName="..."
    >
      {/* Conteúdo do formulário */}
    </Modal>
  );
};
```

### 🚀 Vantagens:

-   **UX Otimizada:** A interface se adapta perfeitamente ao dispositivo do usuário.
-   **Código Reutilizável:** A mesma lógica de formulário e validação é usada em ambas as versões.
-   **Consistência Visual:** Mantém a identidade visual da plataforma em todos os cenários.

---

## 🧠 Gerenciamento de Estado com Hooks

A busca e atualização dos dados de perfil são centralizadas em hooks customizados para cada tipo de usuário.

-   **`usePTProfile.ts`**:
    -   Busca os dados do Professor logado na tabela `professores`.
    -   Fornece funções para atualizar as informações (pessoais, profissionais, redes sociais).
    -   Gerencia os estados de `loading` e `error`.

-   **`useAlunoProfile.ts`**:
    -   Busca os dados do Aluno logado na tabela `alunos`.
    -   Fornece funções para atualizar as informações básicas.
    -   Gerencia os estados de `loading` e `error`.

Este desacoplamento da lógica de dados da UI torna os componentes mais limpos e focados em sua responsabilidade de renderização.