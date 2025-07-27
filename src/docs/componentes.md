# Componentes

Este projeto segue um padrão consistente para criação de componentes, facilitando a manutenção e o onboarding de novos desenvolvedores.

## Padrão dos Componentes de UI

- Utilizam `React.forwardRef` para permitir maior flexibilidade e integração com bibliotecas de acessibilidade (ex: Radix UI).
- Usam utilitários como `cn` para composição de classes CSS e `class-variance-authority` para variantes visuais.
- Props são sempre tipadas com TypeScript.
- Variantes de estilo e tamanho são definidas via objeto e integradas ao componente.
- Exemplo:

```tsx
// src/components/ui/button.tsx
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
```

## Composição de Componentes de Domínio

- Componentes de domínio (ex: `AlunoCard`) utilizam e compõem os de UI para criar interfaces ricas e reutilizáveis.
- Seguem boas práticas de separação de responsabilidades e tipagem de props.
- Exemplo:

```tsx
// src/components/alunos/AlunoCard.tsx
export const AlunoCard = ({ aluno, onExcluir }: AlunoCardProps) => {
  // ...
  return (
    <Card>
      <CardContent>
        {/* Conteúdo do aluno */}
      </CardContent>
    </Card>
  );
}
```

## Tipos e Interfaces

- Todos os componentes utilizam TypeScript para garantir tipagem forte e segurança.
- Props, estados e dados recebidos são sempre definidos via `interface` ou `type`.
- Tipos compartilhados podem ser definidos em arquivos próprios (ex: `src/integrations/supabase/types.ts`) ou próximos ao componente.
- Exemplo de interface de props:

```tsx
interface AlunoCardProps {
  aluno: Aluno;
  onExcluir: (id: string) => Promise<boolean>;
}

export const AlunoCard = ({ aluno, onExcluir }: AlunoCardProps) => {
  // ...
}
```

- Exemplo de tipo para dados:

```tsx
type ButtonVariant = "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "sm" | "lg" | "xl" | "icon";
  asChild?: boolean;
}
```

- Para dados vindos do backend, utilize os tipos definidos em `src/integrations/supabase/types.ts` para garantir consistência.

## Boas Práticas Adotadas

- Sempre usar tipagem explícita nas props.
- Preferir componentes funcionais e modulares.
- Utilizar Radix UI para acessibilidade e integração com React Hook Form para formulários.
- Utilizar variantes para estilos e tamanhos, evitando duplicação de código.
- Separar componentes de UI (genéricos) dos de domínio (específicos).
- Sempre definir interfaces para props de componentes.
- Usar tipos para enums, variantes e dados estáticos.
- Centralizar tipos compartilhados em arquivos próprios.
- Preferir interfaces para objetos e tipos para aliases ou enums.
- Documentar interfaces complexas com comentários.

---

Seguir este padrão garante consistência visual, facilidade de manutenção e melhor experiência para futuros desenvolvedores.