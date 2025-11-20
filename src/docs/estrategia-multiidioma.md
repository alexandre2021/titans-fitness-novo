# Estratégia de Internacionalização (i18n) - Titans Fitness

## Visão Geral

Este documento descreve a estratégia para implementar suporte a múltiplos idiomas no aplicativo Titans Fitness, com foco inicial no espanhol como segundo idioma.

## Complexidade Estimada

- **Tempo de implementação**: 8-13 horas
- **Custo estimado de tradução via IA**: ~$0.50-1.00 (dependendo do volume total de texto)
- **Nível de complexidade**: Médio

## Arquitetura Proposta

### 1. Frontend - Interface do Usuário

**Biblioteca**: `react-i18next`

```bash
npm install i18next react-i18next i18next-browser-languagedetector
```

**Estrutura de arquivos**:
```
src/
  i18n/
    index.ts           # Configuração do i18next
    locales/
      pt/
        common.json    # Textos comuns
        exercises.json # Textos de exercícios (se necessário)
      es/
        common.json
        exercises.json
```

**Exemplo de configuração (src/i18n/index.ts)**:
```typescript
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ptCommon from './locales/pt/common.json';
import esCommon from './locales/es/common.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      pt: { common: ptCommon },
      es: { common: esCommon }
    },
    fallbackLng: 'pt',
    defaultNS: 'common',
    interpolation: {
      escapeValue: false
    }
  });

export default i18n;
```

**Uso no componente**:
```typescript
import { useTranslation } from 'react-i18next';

const MeuComponente = () => {
  const { t, i18n } = useTranslation();

  return (
    <div>
      <h1>{t('welcome')}</h1>
      <button onClick={() => i18n.changeLanguage('es')}>
        Español
      </button>
    </div>
  );
};
```

### 2. Backend - Banco de Dados (Supabase)

#### Estrutura da Tabela de Traduções

Criar nova tabela `exercicios_traducoes`:

```sql
CREATE TABLE exercicios_traducoes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exercicio_id UUID REFERENCES exercicios(id) ON DELETE CASCADE,
  idioma VARCHAR(5) NOT NULL, -- 'pt', 'es', 'en', etc
  nome TEXT NOT NULL,
  descricao TEXT,
  instrucoes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(exercicio_id, idioma)
);

-- Índice para queries rápidas
CREATE INDEX idx_exercicios_traducoes_exercicio_idioma
ON exercicios_traducoes(exercicio_id, idioma);
```

#### Query para Buscar Exercícios com Tradução

```typescript
// Buscar exercício com tradução em espanhol
const { data, error } = await supabase
  .from('exercicios')
  .select(`
    id,
    categoria,
    grupo_muscular,
    equipamento,
    nivel,
    exercicios_traducoes!inner(
      nome,
      descricao,
      instrucoes
    )
  `)
  .eq('exercicios_traducoes.idioma', 'es');
```

**Estratégia de Fallback**:
```typescript
// Hook para buscar exercício com fallback para português
const useExercicioComTraducao = (exercicioId: string, idioma: string) => {
  const { data: traducao } = useQuery({
    queryKey: ['exercicio', exercicioId, idioma],
    queryFn: async () => {
      // Tentar buscar na tradução
      let { data } = await supabase
        .from('exercicios_traducoes')
        .select('*')
        .eq('exercicio_id', exercicioId)
        .eq('idioma', idioma)
        .single();

      // Se não encontrar, usar português
      if (!data) {
        const { data: exercicio } = await supabase
          .from('exercicios')
          .select('nome, descricao, instrucoes')
          .eq('id', exercicioId)
          .single();
        return exercicio;
      }

      return data;
    }
  });

  return traducao;
};
```

## Processo de Tradução dos 350 Exercícios

### Estratégia: Tradução Automatizada via IA

#### Passo 1: Script de Exportação

Criar script para exportar todos os exercícios do Supabase:

```typescript
// scripts/exportar-exercicios.ts
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function exportarExercicios() {
  const { data: exercicios, error } = await supabase
    .from('exercicios')
    .select('id, nome, descricao, instrucoes');

  if (error) throw error;

  fs.writeFileSync(
    'exercicios-pt.json',
    JSON.stringify(exercicios, null, 2)
  );

  console.log(`${exercicios.length} exercícios exportados`);
}

exportarExercicios();
```

#### Passo 2: Script de Tradução com IA

Usar OpenAI/Claude API para tradução em lote:

```typescript
// scripts/traduzir-exercicios.ts
import Anthropic from '@anthropic-ai/sdk';
import fs from 'fs';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

interface Exercicio {
  id: string;
  nome: string;
  descricao: string;
  instrucoes: string;
}

async function traduzirExercicio(exercicio: Exercicio, idioma: string) {
  const prompt = `Traduza o seguinte exercício de musculação para ${idioma}.
  Mantenha a terminologia técnica apropriada.

  Nome: ${exercicio.nome}
  Descrição: ${exercicio.descricao}
  Instruções: ${exercicio.instrucoes}

  Retorne APENAS um JSON no formato:
  {
    "nome": "...",
    "descricao": "...",
    "instrucoes": "..."
  }`;

  const message = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: prompt
    }]
  });

  const content = message.content[0];
  if (content.type === 'text') {
    return JSON.parse(content.text);
  }
}

async function traduzirTodos() {
  const exercicios: Exercicio[] = JSON.parse(
    fs.readFileSync('exercicios-pt.json', 'utf-8')
  );

  const traducoes = [];

  for (let i = 0; i < exercicios.length; i++) {
    console.log(`Traduzindo ${i + 1}/${exercicios.length}...`);

    const traducao = await traduzirExercicio(exercicios[i], 'espanhol');

    traducoes.push({
      exercicio_id: exercicios[i].id,
      idioma: 'es',
      ...traducao
    });

    // Rate limiting: aguardar 1 segundo entre requisições
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  fs.writeFileSync(
    'exercicios-es.json',
    JSON.stringify(traducoes, null, 2)
  );

  console.log('Tradução concluída!');
}

traduzirTodos();
```

#### Passo 3: Script de Importação

Importar traduções de volta para o Supabase:

```typescript
// scripts/importar-traducoes.ts
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function importarTraducoes() {
  const traducoes = JSON.parse(
    fs.readFileSync('exercicios-es.json', 'utf-8')
  );

  // Inserir em lotes de 50
  const batchSize = 50;

  for (let i = 0; i < traducoes.length; i += batchSize) {
    const batch = traducoes.slice(i, i + batchSize);

    const { error } = await supabase
      .from('exercicios_traducoes')
      .insert(batch);

    if (error) {
      console.error('Erro no batch', i, error);
    } else {
      console.log(`Importados ${i + batch.length}/${traducoes.length}`);
    }
  }

  console.log('Importação concluída!');
}

importarTraducoes();
```

## Fluxo de Trabalho Completo

### Fase 1: Preparação (1-2 horas)
1. Instalar dependências i18next
2. Criar estrutura de pastas i18n
3. Configurar i18next no projeto
4. Criar tabela `exercicios_traducoes` no Supabase

### Fase 2: Tradução da Interface (3-4 horas)
1. Extrair todos os textos hardcoded do código
2. Criar arquivos JSON de tradução (pt/common.json, es/common.json)
3. Substituir textos por chamadas `t()`
4. Adicionar seletor de idioma na interface

### Fase 3: Tradução dos Exercícios (2-3 horas)
1. Criar scripts de exportação/importação
2. Executar tradução via IA (350 exercícios ~6 minutos com rate limit)
3. Revisar traduções (amostragem)
4. Importar para banco de dados

### Fase 4: Adaptação das Queries (2-3 horas)
1. Modificar queries do Supabase para incluir traduções
2. Implementar lógica de fallback (pt como padrão)
3. Testar todas as telas com exercícios
4. Ajustes de UI para textos mais longos/curtos

### Fase 5: Testes e Refinamento (1-2 horas)
1. Testar troca de idiomas em todas as telas
2. Verificar persistência da escolha do usuário
3. Validar traduções técnicas
4. Correções finais

## Considerações Importantes

### Vantagens da Abordagem Proposta
- Separação clara entre dados originais e traduções
- Fácil adição de novos idiomas no futuro
- Não modifica a estrutura existente da tabela `exercicios`
- Fallback automático para português

### Pontos de Atenção
- **Cache**: Considerar cache de traduções no frontend
- **Performance**: Índices adequados na tabela de traduções
- **Validação**: Revisar amostra das traduções da IA
- **Termos técnicos**: Criar glossário de termos de musculação
- **Atualização**: Quando adicionar novos exercícios, lembrar de traduzir

### Custos Estimados
- **IA (Claude/OpenAI)**: ~$0.50-1.00 para 350 exercícios
- **Tempo de desenvolvimento**: 8-13 horas
- **Manutenção**: Baixa (automatizada via scripts)

## Exemplo de Implementação no Componente

```typescript
import { useTranslation } from 'react-i18next';
import { useExerciciosComTraducao } from '@/hooks/useExerciciosComTraducao';

const ListaExercicios = () => {
  const { t, i18n } = useTranslation();
  const { data: exercicios } = useExerciciosComTraducao(i18n.language);

  return (
    <div>
      <h1>{t('exercises.title')}</h1>

      {/* Seletor de idioma */}
      <select onChange={(e) => i18n.changeLanguage(e.target.value)}>
        <option value="pt">Português</option>
        <option value="es">Español</option>
      </select>

      {/* Lista de exercícios traduzidos */}
      {exercicios?.map(ex => (
        <div key={ex.id}>
          <h3>{ex.nome}</h3>
          <p>{ex.descricao}</p>
        </div>
      ))}
    </div>
  );
};
```

## Próximos Passos

Quando for implementar:

1. Decidir quais idiomas suportar inicialmente (sugestão: espanhol)
2. Criar tabela `exercicios_traducoes` no Supabase
3. Executar scripts de tradução via IA
4. Revisar amostra de traduções
5. Implementar i18next no frontend
6. Testar fluxo completo

---

**Documento criado em**: 2025-11-18
**Versão**: 1.0
**Autor**: Documentação técnica Titans Fitness
