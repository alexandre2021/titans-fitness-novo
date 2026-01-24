# Atualizar Imagens de Exercícios Padrão em Lote

Script para substituir/atualizar imagens de exercícios padrão de forma automatizada, convertendo GIFs para WebP animado otimizado.

## Localização

**Script**: `src/scripts/atualizar-imagens-exercicios.ts`
**Pasta de trabalho**: `data/atualizar_imagens/`

## Quando usar

- Substituir imagens de vários exercícios padrão de uma vez
- Trocar GIFs não otimizados por versões compactadas (GIF→WebP)
- Atualizar imagens em lote após receber novo pacote de mídia

## Como funciona

### 1. Preparação

Coloque os arquivos na pasta `data/atualizar_imagens/` com **nome exato** do exercício:

```
data/atualizar_imagens/
├── Supino reto com barra.gif
├── Agachamento livre.gif
├── Rosca direta com barra.jpg
└── Leg press 45 graus.png
```

**⚠️ IMPORTANTE**: O nome do arquivo deve ser **exatamente igual** ao campo `nome` no banco de dados.

### 2. Execução

```bash

```npx tsx src/scripts/atualizar-imagens-exercicios.ts

### 3. Processo automático

O script executa automaticamente:

1. ✅ **Busca o exercício** no banco pelo nome exato
2. ✅ **Converte GIF→WebP animado** (mantém todos os frames)
   - Redimensiona para 640px
   - Compacta com qualidade 75%
   - Redução média de 70% no tamanho
3. ✅ **Otimiza outras imagens** (JPG, PNG) para WebP
4. ✅ **Faz upload** via Edge Function para bucket `exercicios-padrao`
5. ✅ **Atualiza banco** com novo caminho da imagem
6. ✅ **Remove imagem antiga** do bucket

### 4. Resultado

Ao final, exibe resumo:

```
📊 RESUMO DA ATUALIZAÇÃO

✅ Sucesso: 3
❓ Não encontrados: 0
❌ Erros: 0
```

## Formatos suportados

| Formato | Conversão | Resultado |
|---------|-----------|-----------|
| **GIF** | Sim → WebP animado | Mantém animação, ~70% menor |
| **JPG/JPEG** | Sim → WebP estático | Otimizado, redimensionado |
| **PNG** | Sim → WebP estático | Otimizado, redimensionado |
| **WebP** | Sim → WebP otimizado | Re-otimizado |

## Dicas e troubleshooting

### Como descobrir o nome exato do exercício?

**Opção 1 - SQL no Supabase:**
```sql
SELECT nome FROM exercicios
WHERE tipo = 'padrao'
ORDER BY nome;
```

**Opção 2 - Verificar na aplicação:**
- Acessar lista de exercícios padrão
- Copiar o nome exato como aparece

### Exercício não encontrado

**Erro**: `❓ Exercício não encontrado: "nome_do_arquivo"`

**Causas comuns**:
- Nome do arquivo diferente do banco
- Maiúsculas/minúsculas incorretas
- Acentos/caracteres especiais diferentes
- Exercício não existe ou não é do tipo `padrao`

**Solução**:
1. Verificar nome exato no banco (usar SQL acima)
2. Renomear arquivo para corresponder exatamente
3. Executar script novamente

### Erro no upload

**Erro**: `❌ Erro no upload`

**Causas comuns**:
- Variáveis de ambiente incorretas
- Edge Function indisponível
- Problema de conectividade

**Solução**:
1. Verificar `.env` tem `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY`
2. Testar conexão com Supabase
3. Verificar se Edge Function `upload-media` está deployada

### Imagem antiga não foi removida

**Comportamento esperado**:
- URLs antigas do Google Storage (`storage.googleapis.com`) **não** são removidas automaticamente
- Apenas arquivos no Cloudflare R2 são removidos

**Motivo**: Arquivos legados podem estar em uso por outros exercícios.

### Testar antes de processar tudo

**Recomendação**: Teste com 2-3 arquivos primeiro

```bash
# Mover apenas alguns arquivos para teste
data/atualizar_imagens/
├── Supino reto.gif    # Teste 1
└── Agachamento.gif    # Teste 2
```

Após confirmar sucesso, adicionar o resto.

## Comparação: Script vs Edição Manual

| Aspecto | Script (este) | Edição Manual (UI) |
|---------|---------------|-------------------|
| **Volume** | Muitos exercícios | Um exercício |
| **Conversão GIF** | Sim, automática (GIF→WebP) | ❌ Não aceita GIF |
| **Compactação** | Sim, otimizada | Não |
| **Redução tamanho** | ~70% | 0% |
| **Velocidade** | Rápido (lote) | Lento (manual) |
| **Formatos aceitos** | GIF, JPG, PNG, WebP | JPG, PNG, WebP |
| **Uso** | Atualização em massa / GIFs animados | Correções pontuais (imagens estáticas) |

**⚠️ IMPORTANTE**: Para adicionar/atualizar GIFs animados, **use este script**. A interface de edição manual não aceita GIFs.

## Fluxo de trabalho recomendado

### Para atualizações em massa (10+ exercícios):

1. ✅ Receber pacote de novas imagens
2. ✅ Renomear arquivos com nomes exatos dos exercícios
3. ✅ Colocar em `data/atualizar_imagens/`
4. ✅ Executar script
5. ✅ Conferir resultado no app
6. ✅ Limpar pasta após sucesso

### Para correções pontuais (1-3 exercícios):

1. ✅ Usar interface de edição manual
2. ✅ Acessar exercício → Editar → Alterar imagem
3. ✅ Salvar

## Backup e segurança

**Antes de executar**:
- ✅ Fazer backup do banco de dados
- ✅ Testar com poucos arquivos primeiro
- ✅ Confirmar nomes dos arquivos

**O script é seguro?**
- ✅ Não altera exercícios não encontrados
- ✅ Remove apenas imagens antigas correspondentes
- ✅ Ignora URLs legadas (Google Storage)
- ✅ Mostra log detalhado de cada operação

## Logs e debugging

O script exibe logs detalhados:

```
🔄 Processando: Nome do Exercício
  ✅ Exercício encontrado: Nome (ID: abc123)
  📝 Convertendo GIF para WebP animado...
  ✅ Convertido: 250KB → 75KB (redução de 70%)
  📤 Fazendo upload: padrao_123456_nome.webp
  ✅ Upload concluído
  💾 Atualizando banco de dados...
  ✅ Banco atualizado
  🗑️  Removendo arquivo antigo: antiga_imagem.webp
  ✅ Arquivo antigo removido
  ✅ Processamento concluído com sucesso!
```

## Limitações

- ⚠️ Requer Node.js e TypeScript
- ⚠️ Precisa de `SUPABASE_SERVICE_ROLE_KEY` configurada
- ⚠️ Não funciona para exercícios personalizados (apenas `tipo='padrao'`)
- ⚠️ Nome do arquivo deve ser exatamente igual ao banco

## Manutenção

**Última atualização**: 2025-01-18
**Versão**: 1.0
**Autor**: Documentação técnica Titans Fitness

**Histórico de mudanças**:
- v1.0 (2025-01-18): Versão inicial com suporte a GIF→WebP animado
