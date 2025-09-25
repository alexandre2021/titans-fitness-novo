# Sistema de Autenticação - Titans Fitness


## Estrutura de Arquivos


```
src/
├── App.tsx                              # Configuração principal e rotas
├── components/
│   ├── AuthGuard.tsx                    # Proteção e redirecionamento de rotas
│   └── layout/
│       └── ProtectedRoutes.tsx          # Layout para rotas protegidas
├── hooks/
│   └── useAuth.tsx                      # Hook + Provider de autenticação
├── pages/
│   ├── Login.tsx                        # Página de login
│   ├── IndexPT.tsx                      # Dashboard do Personal Trainer
│   ├── IndexAluno.tsx                   # Dashboard do Aluno
│   ├── OnboardingPT*.tsx               # Páginas de onboarding PT
│   ├── OnboardingAluno*.tsx            # Páginas de onboarding Aluno
│   └── ...
└── integrations/
    └── supabase/
        └── client.ts                    # Cliente Supabase
```


## Componentes do Sistema de Autenticação


### 1. **AuthProvider** (`useAuth.tsx`)


**Responsabilidade**: Gerenciar o estado global de autenticação


**Funcionalidades**:
- Monitora mudanças na sessão do usuário
- Mantém dados do usuário e sessão em contexto global  
- Fornece função de logout
- Carrega estado inicial da sessão


**Estados**:
```typescript
{
  user: User | null,      // Dados do usuário logado
  session: Session | null, // Sessão ativa
  loading: boolean,       // Estado de carregamento
  signOut: () => Promise<void> // Função de logout
}
```


**Como funciona**:
1. Ao inicializar, busca sessão existente via `supabase.auth.getSession()`
2. Configura listener para mudanças de estado de autenticação
3. Atualiza estados automaticamente quando usuário faz login/logout


### 2. **useAuth Hook** (`useAuth.tsx`)


**Responsabilidade**: Fornecer acesso aos dados de autenticação


**Uso**:
```typescript
const { user, session, loading, signOut } = useAuth();
```


**Validação**: Garante que o hook seja usado dentro do AuthProvider


### 3. **AuthGuard** (`AuthGuard.tsx`)


**Responsabilidade**: Proteção inteligente de rotas baseada em regras de negócio


**Lógica de Redirecionamento**:


#### Páginas Públicas (sem proteção):
- `/`, `/login`, `/cadastro/*`, `/termos`, `/privacidade`, `/confirmacao-email`


#### Usuário Não Logado:
- Qualquer rota protegida → `/login`


#### Personal Trainer Logado:
```
┌─ Onboarding Incompleto ─┐
│ Qualquer rota → /onboarding-pt/informacoes-basicas
│
├─ Onboarding Completo ─┐
│ /onboarding-pt/* → /index-pt
│ Outras rotas → Permitidas
```


#### Aluno Logado:
```
┌─ Onboarding Incompleto ─┐
│ Qualquer rota → /onboarding-aluno/dados-basicos
│
├─ Onboarding Completo ─┐
│ /onboarding-aluno/* → /index-aluno
│ Outras rotas → Permitidas
```


#### Usuário Logado na Página de Login:
- PT → `/index-pt`
- Aluno → `/index-aluno`
- Sem perfil → `/`


**Estados de Carregamento**:
- Mostra spinner durante verificações de autenticação
- Previne renderização até completar validações


### 4. **Processo de Login** (`Login.tsx`)


**Fluxo**:
```
1. Usuário insere credenciais
   ↓
2. supabase.auth.signInWithPassword()
   ↓
3. Busca tipo de usuário na tabela user_profiles
   ↓
4. Redirecionamento baseado no tipo:
   • professor → /index-pt
   • aluno → /index-aluno
   • default → /
```


**Tratamento de Erros**:
- Email não confirmado
- Credenciais inválidas  
- Erros de rede


**Notificações**:
- Feedback via toast para sucesso/erro
- Mensagens de vínculo bem-sucedido via URL params


### 5. **Configuração de Rotas** (`App.tsx`)


**Estrutura**:
```typescript
<AuthProvider>
  <BrowserRouter>
    <Routes>
      {/* Rotas Públicas - SEM AuthGuard */}
      <Route path="/" element={<Index />} />
      <Route path="/login" element={<Login />} />
     
      {/* Onboarding - COM AuthGuard, SEM layout */}
      <Route path="/onboarding-*" element={
        <AuthGuard><OnboardingComponent /></AuthGuard>
      } />
     
      {/* Rotas Protegidas - COM AuthGuard E layout */}
      <Route element={<AuthGuard><ProtectedRoutes /></AuthGuard>}>
        <Route path="/index-pt" element={<IndexPT />} />
        <Route path="/index-aluno" element={<IndexAluno />} />
        {/* ... outras rotas protegidas */}
      </Route>
    </Routes>
  </BrowserRouter>
</AuthProvider>
```


## Fluxo Completo de Autenticação


### Cenário 1: Primeiro Acesso
```
1. Usuário acessa /index-pt (sem login)
   ↓
2. AuthGuard detecta user = null
   ↓  
3. Redireciona para /login
   ↓
4. Usuário faz login com sucesso
   ↓
5. Login.tsx redireciona para /index-pt
   ↓
6. AuthGuard verifica onboarding
   ↓
7. Se incompleto → /onboarding-pt/informacoes-basicas
   Se completo → Permite acesso a /index-pt
```


### Cenário 2: Usuário Logado Retornando
```
1. Usuário acessa qualquer rota
   ↓
2. AuthProvider carrega sessão existente
   ↓
3. AuthGuard verifica permissões e onboarding
   ↓
4. Permite acesso ou redireciona conforme necessário
```


### Cenário 3: Logout
```
1. Usuário clica em "Sair"
   ↓
2. Chama signOut() do useAuth
   ↓
3. supabase.auth.signOut() limpa sessão
   ↓
4. AuthProvider detecta mudança e limpa estados
   ↓
5. AuthGuard redireciona para /login
```


## Tipos de Usuário


### Personal Trainer
- **Páginas principais**: `/index-pt`, `/alunos`, `/exercicios-pt`
- **Onboarding**: 3 etapas (informações básicas, experiência, redes sociais)
- **Verificação**: Tabela `professores.onboarding_completo`


### Aluno  
- **Páginas principais**: `/index-aluno`, `/minhas-rotinas`, `/avaliacoes-aluno`
- **Onboarding**: 2 etapas (dados básicos, questionário de saúde)
- **Verificação**: Tabela `alunos.onboarding_completo`


## Estados de Loading


O sistema possui múltiplas camadas de loading para melhor UX:
- **AuthProvider.loading**: Carregamento inicial da sessão
- **AuthGuard.isChecking**: Verificação de permissões e onboarding
- **Login.isLoading**: Processo de autenticação


## Segurança


### Proteções Implementadas:
- Verificação de sessão em cada mudança de rota
- Validação de tipo de usuário no servidor (Supabase)
- Redirecionamento automático para fluxos obrigatórios (onboarding)
- Limpeza de estado local no logout


### Considerações:
- Autenticação real acontece no Supabase (server-side)
- Cliente apenas controla navegação baseada no estado
- Dados sensíveis sempre validados no backend

