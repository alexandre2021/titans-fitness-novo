// src/scripts/seed-exercicios.ts
import { createClient } from '@supabase/supabase-js';
import { google } from 'googleapis';
import dotenv from 'dotenv';

// Carrega as variáveis de ambiente do arquivo .env na raiz do projeto
dotenv.config({ path: '.env' });

// --- CONFIGURAÇÃO ---
const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const GOOGLE_SHEET_ID = process.env.GOOGLE_SHEET_ID;
const GOOGLE_SHEET_RANGE = 'Exercicios!A2:Z'; // Ajuste o nome da aba e o range conforme sua planilha

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GOOGLE_SHEET_ID) {
  throw new Error('Variáveis de ambiente do Supabase ou Google Sheets não configuradas no arquivo .env');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// --- AUTENTICAÇÃO GOOGLE ---
// 1. Crie credenciais de serviço no Google Cloud (https://console.cloud.google.com/iam-admin/serviceaccounts).
// 2. Baixe o arquivo JSON com as chaves.
// 3. Salve o arquivo na raiz do projeto (ex: 'google-credentials.json') e adicione-o ao .gitignore.
// 4. Compartilhe sua Planilha Google com o email do "client_email" que está no arquivo JSON.
const auth = new google.auth.GoogleAuth({
  keyFile: 'google-credentials.json', // Caminho para o seu arquivo de credenciais
  scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
});

const sheets = google.sheets({ version: 'v4', auth });

// --- FUNÇÃO PRINCIPAL ---
async function seedExercicios() {
  console.log('🚀 Iniciando o script de seeding de exercícios...');

  try {
    // 1. Buscar dados da Planilha Google
    console.log(`📄 Lendo dados da planilha: ${GOOGLE_SHEET_ID}`);
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: GOOGLE_SHEET_ID,
      range: GOOGLE_SHEET_RANGE,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
      console.log('⚠️ Nenhuma linha encontrada na planilha.');
      return;
    }

    console.log(`✅ Encontradas ${rows.length} linhas para processar.`);

    // Mapeamento de colunas para índices. Facilita a manutenção e leitura.
    // Ajuste os nomes e índices conforme a sua Planilha Google.
    const COLUMNS = {
      NOME: 0,
      DESCRICAO: 1,
      GRUPO_MUSCULAR: 2,
      EQUIPAMENTO: 3,
      DIFICULDADE: 4,
      INSTRUCOES: 5,
      IMAGEM_1_URL: 6,
      IMAGEM_2_URL: 7,
      VIDEO_URL: 8,
      YOUTUBE_URL: 9,
      GRUPO_MUSCULAR_PRIMARIO: 10,
      GRUPOS_MUSCULARES_SECUNDARIOS: 11,
    };

    // 2. Mapear linhas para o formato do banco de dados
    const exerciciosParaInserir = rows.map(row => {
      return {
        nome: row[COLUMNS.NOME],
        descricao: row[COLUMNS.DESCRICAO],
        grupo_muscular: row[COLUMNS.GRUPO_MUSCULAR],
        equipamento: row[COLUMNS.EQUIPAMENTO],
        dificuldade: row[COLUMNS.DIFICULDADE] || 'Média', // 'Baixa', 'Média', 'Alta'
        instrucoes: row[COLUMNS.INSTRUCOES] || null, // Pode ser texto com '#' como separador
        imagem_1_url: row[COLUMNS.IMAGEM_1_URL] || null,
        imagem_2_url: row[COLUMNS.IMAGEM_2_URL] || null,
        video_url: row[COLUMNS.VIDEO_URL] || null,
        youtube_url: row[COLUMNS.YOUTUBE_URL] || null,
        grupo_muscular_primario: row[COLUMNS.GRUPO_MUSCULAR_PRIMARIO] || null,
        grupos_musculares_secundarios: row[COLUMNS.GRUPOS_MUSCULARES_SECUNDARIOS] ? row[COLUMNS.GRUPOS_MUSCULARES_SECUNDARIOS].split(',').map((s: string) => s.trim()) : null,
        tipo: 'padrao', // Todos os exercícios da planilha são 'padrao'
        is_ativo: true,
      };
    });

    // 3. Inserir dados no Supabase
    console.log('⏳ Inserindo/atualizando dados no Supabase...');
    const { data, error } = await supabase.from('exercicios').upsert(exerciciosParaInserir, { onConflict: 'nome' });

    if (error) throw error;

    console.log(`🎉 Sucesso! ${exerciciosParaInserir.length} exercícios foram processados.`);

  } catch (error) {
    console.error('🔥 Erro fatal durante o seeding:', error);
  }
}

// Executar a função
void seedExercicios();