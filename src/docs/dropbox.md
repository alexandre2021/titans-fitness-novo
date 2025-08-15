# 📋 Plano de Ação - Sistema de Personalização com Dropbox

## 🎯 **Objetivo Geral**
Migrar do sistema atual de exercícios personalizados para um modelo onde PTs adaptam exercícios da base com suas próprias mídias armazenadas no Dropbox, eliminando custos de storage e oferecendo personalização ilimitada.

---

## 🔄 **Mudanças Conceituais**

### **ANTES (Sistema Atual):**
```
- ~300 exercícios base com imagens/vídeos
- PT cria exercícios personalizados (limitados)
- Upload para Cloudflare R2 (custo crescente)
- Limite baseado no plano do PT
```

### **DEPOIS (Novo Sistema):**
```
- Base expandida de exercícios (sem mídias)
- PT adapta exercícios existentes com suas mídias
- Upload para Dropbox do PT (custo zero)
- Personalização ilimitada
- Integração opcional no onboarding
```

---

## 📊 **Fases de Implementação**

### **🔴 FASE 1 - PREPARAÇÃO DA BASE (2-3 semanas)**

#### **1.1 Expansão da Base de Exercícios**
- [ ] **Expandir catálogo** para 500+ exercícios
- [ ] **Estrutura de dados:**
  ```sql
  exercicios:
  - nome
  - grupo_muscular_principal  
  - grupos_musculares_secundarios (array)
  - equipamento
  - descricao
  - instrucoes
  - dificuldade
  - observacoes
  - is_ativo
  ```
- [ ] **Remover campos de mídia** da tabela base
- [ ] **Script de migração** dos exercícios existentes
- [ ] **Seed data** com exercícios adicionais

#### **1.2 Nova Estrutura de Personalização**
- [ ] **Criar tabela `exercicios_personalizados`:**
  ```sql
  exercicios_personalizados:
  - id (uuid)
  - exercicio_base_id (FK)
  - personal_trainer_id (FK)  
  - imagem_1_url (texto)
  - imagem_2_url (texto)
  - video_url (texto)
  - youtube_url (texto)
  - storage_type ('dropbox' | 'external_url')
  - observacoes_personalizadas
  - created_at
  - updated_at
  ```

#### **1.3 Setup Dropbox Integration**
- [ ] **Criar app no Dropbox Developers**
- [ ] **Configurar OAuth2** credentials
- [ ] **Edge Function** para gerenciar tokens
- [ ] **Testar upload/download** básico

---

### **🟡 FASE 2 - BACKEND & APIs (2-3 semanas)**

#### **2.1 Edge Functions Dropbox**
- [ ] **`dropbox-auth`** - Gerenciar OAuth flow
- [ ] **`dropbox-upload`** - Upload de arquivos
- [ ] **`dropbox-list`** - Listar arquivos/pastas
- [ ] **`dropbox-delete`** - Remover arquivos
- [ ] **`dropbox-storage-info`** - Quota e usage

#### **2.2 Database Updates**
- [ ] **Tabela `pt_storage_connections`:**
  ```sql
  pt_storage_connections:
  - id (uuid)
  - pt_id (FK)
  - provider ('dropbox' | 'drive')
  - access_token (encrypted)
  - refresh_token (encrypted)
  - expires_at
  - is_active
  - created_at
  ```

#### **2.3 Hooks Personalizados**
- [ ] **`useDropboxAuth`** - Gerenciar autenticação
- [ ] **`useDropboxStorage`** - Upload/download/info
- [ ] **`useExerciciosPersonalizados`** - CRUD de personalizações
- [ ] **`useStorageStatus`** - Status e quota

---

### **🟢 FASE 3 - FRONTEND CORE (3-4 semanas)**

#### **3.1 Refatoração de Exercícios**
- [ ] **Atualizar `ExerciciosPT.tsx`:**
  - Remover aba "Personalizados"
  - Adicionar botão "Personalizar" em cada exercício
  - Mostrar indicador visual se já personalizado

#### **3.2 Nova Tela de Personalização**
- [ ] **`PersonalizarExercicio.tsx`:**
  ```typescript
  // /exercicios-pt/personalizar/:exercicioId
  - Dados do exercício base (readonly)
  - Upload de 2 imagens
  - Upload de 1 vídeo
  - Campo YouTube URL
  - Opções: Dropbox | URL externa
  - Preview das mídias
  ```

#### **3.3 Componentes de Storage**
- [ ] **`StorageSelector.tsx`** - Escolher Dropbox/URL
- [ ] **`DropboxFilePicker.tsx`** - Navegar arquivos
- [ ] **`StorageStatusWidget.tsx`** - Quota e usage
- [ ] **`DropboxConnector.tsx`** - Setup inicial

---

### **🔵 FASE 4 - ONBOARDING & UX (2 semanas)**

#### **4.1 Novo Step no Onboarding PT**
- [ ] **Adicionar Passo 4 - Storage:**
  ```
  Passo 1: Dados Básicos
  Passo 2: Experiência  
  Passo 3: Redes Sociais
  Passo 4: Armazenamento ← NOVO
  Passo 5: Finalizar
  ```

#### **4.2 Tela de Onboarding Storage**
- [ ] **`OnboardingStorage.tsx`:**
  - Explicar benefícios
  - Opção conectar Dropbox
  - Opção pular (usar URLs)
  - Link para criar conta Dropbox

#### **4.3 Fluxos de Fallback**
- [ ] **Modal de primeira conexão** quando PT tenta personalizar
- [ ] **Educação sobre** storage options
- [ ] **Guided tour** do processo

---

### **🟣 FASE 5 - PÁGINA ARMAZENAMENTO (2 semanas)**

#### **5.1 Menu Avatar**
- [ ] **Adicionar opção "Armazenamento"** no dropdown
- [ ] **Rota `/armazenamento`**

#### **5.2 Página Armazenamento**
- [ ] **`Armazenamento.tsx`:**
  ```typescript
  - Status e quota do Dropbox
  - Breakdown por tipo (imagens/vídeos)
  - Navegador básico de arquivos
  - Upload contextual
  - Limpeza inteligente
  - Bridge para app Dropbox
  ```

#### **5.3 Funcionalidades Smart**
- [ ] **Detecção de arquivos não utilizados**
- [ ] **Sugestões de organização**
- [ ] **Analytics de uso de storage**

---

### **🟢 FASE 6 - INTEGRAÇÃO & POLISH (1-2 semanas)**

#### **6.1 Integração com Sistema Existente**
- [ ] **Atualizar criação de rotinas** para usar exercícios personalizados
- [ ] **Lookup de mídias** durante execução de treinos
- [ ] **Cache inteligente** de URLs do Dropbox

#### **6.2 Performance & UX**
- [ ] **Loading states** em todas as operações
- [ ] **Error handling** robusto
- [ ] **Retry automático** para uploads
- [ ] **Compressão automática** de imagens

---

## 🗃️ **Migração de Dados**

### **Script de Migração**
```sql
-- 1. Backup exercícios personalizados existentes
CREATE TABLE exercicios_personalizados_backup AS 
SELECT * FROM exercicios WHERE personal_trainer_id IS NOT NULL;

-- 2. Migrar para nova estrutura
INSERT INTO exercicios_personalizados (
  exercicio_base_id,
  personal_trainer_id, 
  imagem_1_url,
  imagem_2_url,
  video_url,
  storage_type
)
SELECT 
  exercicio_base_id, -- mapear para exercício similar na base
  personal_trainer_id,
  imagem_1_url,
  imagem_2_url, 
  video_url,
  'external_url'
FROM exercicios_personalizados_backup;

-- 3. Limpar exercícios personalizados da tabela base
DELETE FROM exercicios WHERE personal_trainer_id IS NOT NULL;
```

---

## 📅 **Timeline Consolidado**

| Fase | Duração | Período | Entregável Principal |
|------|---------|---------|---------------------|
| **1 - Preparação** | 2-3 sem | Sem 1-3 | Base expandida + Estrutura DB |
| **2 - Backend** | 2-3 sem | Sem 3-6 | APIs Dropbox funcionais |
| **3 - Frontend Core** | 3-4 sem | Sem 6-10 | Personalização completa |
| **4 - Onboarding** | 2 sem | Sem 10-12 | Fluxo de setup integrado |
| **5 - Armazenamento** | 2 sem | Sem 12-14 | Página de gerenciamento |
| **6 - Polish** | 1-2 sem | Sem 14-16 | Sistema completo em produção |

**🎯 Total: 12-16 semanas (~3-4 meses)**

---

## 🎛️ **Feature Flags**

Para deploy gradual e testes:

```typescript
const FEATURE_FLAGS = {
  DROPBOX_INTEGRATION: false,    // Liga/desliga Dropbox
  NEW_EXERCISE_SYSTEM: false,    // Sistema novo vs antigo
  STORAGE_ONBOARDING: false,     // Step adicional onboarding
  STORAGE_PAGE: false           // Página de armazenamento
};
```

---

## 🧪 **Estratégia de Testes**

### **Fase Beta (Semana 8-10)**
- [ ] **Selecionar 10-15 PTs** para beta test
- [ ] **Testar fluxo completo** de personalização
- [ ] **Validar integração Dropbox** em cenários reais
- [ ] **Coletar feedback** e iterar

### **Rollout Gradual (Semana 14-16)**
- [ ] **20% dos PTs** → Validar estabilidade
- [ ] **50% dos PTs** → Monitorar performance  
- [ ] **100% dos PTs** → Launch completo

---

## 📊 **Métricas de Sucesso**

### **Técnicas:**
- [ ] **99%+ uptime** das APIs Dropbox
- [ ] **<3s** tempo de upload médio
- [ ] **Zero** perda de dados durante migração

### **Produto:**
- [ ] **60%+** dos PTs conectam Dropbox
- [ ] **3x** aumento em exercícios personalizados
- [ ] **90%+** satisfação no feedback beta

### **Negócio:**
- [ ] **80%** redução em custos de storage
- [ ] **Diferencial competitivo** validado
- [ ] **Base para funcionalidades sociais** estabelecida

---

## 🚨 **Riscos e Contingências**

### **Risco: Aprovação Dropbox demorar**
- **Contingência:** Começar com OneDrive em paralelo
- **Alternativa:** Sistema híbrido (Cloudflare + Dropbox)

### **Risco: PTs não adotarem Dropbox**
- **Contingência:** Manter sistema de URLs como fallback
- **Mitigação:** Educação e incentivos no onboarding

### **Risco: Problemas de performance**
- **Contingência:** Cache agressivo de URLs
- **Mitigação:** Compressão automática e CDN

---

## ✅ **Checklist Final**

### **Antes do Launch:**
- [ ] Backup completo do sistema atual
- [ ] Testes de carga nas APIs Dropbox
- [ ] Documentação completa para suporte
- [ ] Treinamento da equipe
- [ ] Plano de rollback definido

### **Pós Launch:**
- [ ] Monitoramento de métricas 24/7
- [ ] Canal de feedback direto com PTs
- [ ] Análise de uso semanal
- [ ] Preparação para funcionalidades sociais

---

**🎯 Este plano transforma o Titans de um app de treinos limitado para uma plataforma de personalização ilimitada, estabelecendo a base para evolução para comunidade fitness social.** 🚀