import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // 1. Proteger a API Route, verificando o segredo
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  // 2. Garantir que a requisição é do tipo POST
  if (req.method === 'POST') {
    try {
      // ===========================================================
      // AQUI VAI A LÓGICA PRINCIPAL DA SUA TAREFA
      // (Ex: conectar ao Supabase, buscar usuários, deletar, etc.)
      // ===========================================================

      console.log("API Route para verificação de usuários inativos foi chamada com sucesso.");

      // Retorna uma resposta de sucesso
      res.status(200).json({ success: true });

    } catch (error: unknown) {
      let errorMessage = 'An unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      console.error("Erro na execução da cron job:", errorMessage);
      res.status(500).json({ success: false, error: errorMessage });
    }
  } else {
    // Se o método não for POST, retorna erro
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
}