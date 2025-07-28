# 📋 Padrões do Sistema - Exercícios PT

Este documento centraliza todos os padrões, valores e configurações utilizados no sistema de exercícios para Personal Trainers.

---

## 🏋️ **Grupos Musculares**

### **Valores no Banco de Dados:**
```typescript
const GRUPOS_MUSCULARES = [
  'Peito',
  'Costas', 
  'Ombros',
  'Bíceps',
  'Tríceps',
  'Abdômen',
  'Pernas',
  'Glúteos',
  'Panturrilha',
  'Trapézio'
];
```

### **🎨 Cores por Grupo Muscular:**
```typescript
const CORES_GRUPOS_MUSCULARES = {
  'Peito': '#F87171',      // Vermelho claro
  'Costas': '#60A5FA',     // Azul claro  
  'Pernas': '#34D399',     // Verde claro
  'Ombros': '#FBBF24',     // Amarelo
  'Bíceps': '#A78BFA',     // Roxo claro
  'Tríceps': '#F472B6',    // Rosa
  'Abdômen': '#F59E42',    // Laranja
  'Glúteos': '#34D399',    // Verde (mesmo de Pernas)
  'Panturrilha': '#34D399', // Verde (mesmo de Pernas)
  'Trapézio': '#60A5FA'    // Azul (mesmo de Costas)
};
```

---

## 🛠️ **Equipamentos**

### **Valores no Banco de Dados:**
```typescript
const EQUIPAMENTOS = [
  'Barra',
  'Halteres',
  'Máquina', 
  'Peso Corporal',
  'Cabo',
  'Kettlebell',
  'Fitas de Suspensão',
  'Elásticos',
  'Bola Suíça',
  'Bolas Medicinais'
];
```

### **🎨 Cores por Equipamento:**
```typescript
const CORES_EQUIPAMENTOS = {
  'Barra': '#3B82F6',           // Azul
  'Halteres': '#8B5CF6',        // Roxo
  'Máquina': '#6366F1',         // Índigo
  'Peso Corporal': '#F97316',   // Laranja
  'Cabo': '#14B8A6',            // Teal
  'Kettlebell': '#EF4444',      // Vermelho
  'Fitas de Suspensão': '#EAB308', // Amarelo
  'Elásticos': '#EC4899',       // Rosa
  'Bola Suíça': '#22C55E',      // Verde
  'Bolas Medicinais': '#06B6D4' // Ciano
};
```

---

## 📊 **Níveis de Dificuldade**

### **Valores no Banco de Dados:**
```typescript
const DIFICULDADES = [
  'Baixa',
  'Média', 
  'Alta'
];
```

### **🎨 Cores por Dificuldade:**
```typescript
const CORES_DIFICULDADES = {
  'Baixa': '#22C55E',  // Verde - Fácil de executar
  'Média': '#EAB308',  // Amarelo - Técnica moderada  
  'Alta': '#EF4444'    // Vermelho - Técnica avançada
};
```

### **📝 Descrições:**
- **Baixa**: Exercícios básicos, fáceis de executar, ideais para iniciantes
- **Média**: Exercícios com técnica moderada, requerem alguma experiência
- **Alta**: Exercícios avançados, técnica complexa, para praticantes experientes

---

## 🏷️ **Tipos de Exercício**

### **Valores no Banco de Dados:**
```typescript
const TIPOS_EXERCICIO = {
  PADRAO: 'padrao',           // Exercícios do sistema
  PERSONALIZADO: 'personalizado' // Exercícios criados pelo PT
};
```

### **🎨 Cores por Tipo:**
```typescript
const CORES_TIPOS = {
  'personalizado': '#A855F7'  // Roxo para exercícios personalizados
};
```

---

## 🎨 **Sistema de Cores - Paleta Completa**

### **Cores Primárias do Sistema:**
```css
:root {
  /* Grupos Musculares */
  --cor-peito: #F87171;
  --cor-costas: #60A5FA;  
  --cor-pernas: #34D399;
  --cor-ombros: #FBBF24;
  --cor-biceps: #A78BFA;
  --cor-triceps: #F472B6;
  --cor-abdomen: #F59E42;
  
  /* Dificuldades */
  --cor-baixa: #22C55E;
  --cor-media: #EAB308;
  --cor-alta: #EF4444;
  
  /* Status */
  --cor-personalizado: #A855F7;
  --cor-ativo: #22C55E;
  --cor-inativo: #6B7280;
}
```

---

## 📱 **Padrões de Interface**

### **🏷️ Badges/Etiquetas:**
```typescript
interface BadgeConfig {
  backgroundColor: string;
  color: 'white' | 'black';
  size: 'xs' | 'sm' | 'md';
}

// Aplicação padrão:
// - Grupo Muscular: Cor específica + texto branco
// - Equipamento: Cor específica + texto variável  
// - Dificuldade: Cor específica + texto branco
// - Tipo: Roxo + texto branco
```

### **🎛️ Filtros:**
```typescript
interface FiltrosPadrao {
  grupoMuscular: string; // 'todos' | GRUPOS_MUSCULARES
  equipamento: string;   // 'todos' | EQUIPAMENTOS  
  dificuldade: string;   // 'todos' | DIFICULDADES
}

const FILTROS_INICIAIS = {
  grupoMuscular: 'todos',
  equipamento: 'todos', 
  dificuldade: 'todos'
};
```

### **🃏 Cards de Exercício:**
```typescript
interface CardLayout {
  hover: 'shadow-md transition-shadow';
  spacing: 'p-4';
  grid: {
    mobile: '1 coluna',
    tablet: '2 colunas', 
    desktop: '3 colunas'
  };
  badges: {
    gap: '2px',
    size: 'text-xs',
    order: ['grupo', 'equipamento', 'dificuldade', 'tipo']
  };
}
```

---

## 🧭 **Rotas do Sistema**

### **Estrutura de Navegação:**
```typescript
const ROTAS_EXERCICIOS = {
  LISTAGEM: '/exercicios-pt',
  NOVO: '/exercicios-pt/novo',
  DETALHES: '/exercicios-pt/detalhes/:id',
  EDITAR: '/exercicios-pt/editar/:id', 
  COPIA: '/exercicios-pt/copia/:id'
};
```

### **Permissões por Rota:**
- **Listagem**: Todos os PTs autenticados
- **Novo**: PTs com limite disponível  
- **Detalhes**: Todos (padrão + próprios personalizados)
- **Editar**: Apenas exercícios personalizados próprios
- **Copia**: PTs com limite disponível

---

## 🔧 **Configurações Técnicas**

### **Validações de Arquivo:**
```typescript
const VALIDACOES_MIDIA = {
  IMAGEM: {
    formatos: ['jpg', 'jpeg', 'png', 'webp'],
    tamanho_max: '5MB',
    otimizacao: 'webp automático'
  },
  VIDEO: {
    formatos: ['mp4', 'webm'],
    tamanho_max: '20MB', 
    duracao_max: '30 segundos'
  },
  YOUTUBE: {
    formato: 'URL válida do YouTube',
    validacao: 'RegEx ou API'
  }
};
```

### **Limites por Plano:**
```typescript
const LIMITES_PLANOS = {
  GRATUITO: {
    exercicios: 10,
    alunos: 3
  },
  BASICO: {
    exercicios: 50,
    alunos: 15  
  },
  PREMIUM: {
    exercicios: 200,
    alunos: 50
  },
  PROFISSIONAL: {
    exercicios: 'ilimitado',
    alunos: 'ilimitado'
  }
};
```

---

## 📝 **Boas Práticas**

### **✅ Nomenclatura:**
- **Campos DB**: snake_case (`grupo_muscular`)
- **Props React**: camelCase (`grupoMuscular`) 
- **Classes CSS**: kebab-case (`grupo-muscular`)
- **Constantes**: UPPER_CASE (`GRUPOS_MUSCULARES`)

### **✅ Validação de Dados:**
- Sempre validar entrada do usuário
- Usar valores exatos da constante (não hardcode)
- Fallback para valores padrão quando null/undefined
- Logs detalhados para debug em desenvolvimento

### **✅ Componentes:**
- Props tipadas com TypeScript
- Estados controlados para formulários  
- Loading states para operações assíncronas
- Error boundaries para captura de erros

### **✅ Performance:**
- Lazy loading para componentes pesados
- Memoização de cálculos complexos
- Otimização de imagens automática
- Debounce em campos de busca

---

## 🔄 **Versionamento**

**Versão**: 1.0.0  
**Última atualização**: Janeiro 2025  
**Próxima revisão**: Conforme necessidade do projeto

---

**📌 Nota**: Este documento deve ser atualizado sempre que novos padrões forem definidos ou modificados. Manter consistência entre código e documentação é essencial para a manutenibilidade do projeto.