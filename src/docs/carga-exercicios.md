src\scripts\seed-exercicios-csv.ts
npx tsx src/scripts/seed-exercicios-csv.ts

Como o script funciona:
1. Lê o CSV:

📄 Arquivo: data/exercicios.csv (sem cabeçalho)
Lê linha por linha pegando as informações

2. Para cada exercício:

🔍 Busca uma imagem com o mesmo nome do exercício em data/imagens_exercicios/
Testa várias extensões: .webp, .jpg, .jpeg, .png, .gif
Exemplo: se o exercício é "Flexão com fitas de suspensão", busca por:

Flexão com fitas de suspensão.webp
Flexão com fitas de suspensão.jpg
etc.



3. Processa e faz upload da imagem:

📄 Arquivo: data\imagens_exercicios

✅ Redimensiona para 360x360 pixels (1:1)
✅ Para animações (.gif, .webp): converte para WebP mantendo a animação
✅ Para imagens estáticas: converte para JPEG
📤 Faz upload para o Cloudflare R2 através da edge function upload-media
🗂️ Bucket usado: exercicios-padrao (especificado em bucket_type: 'exercicios-padrao')
📁 Organiza por pasta: {grupo_muscular}/{nome_do_exercicio}.webp

Exemplo: peito/flexao_com_fitas_de_suspensao.webp



4. Salva no Supabase:

💾 Insere na tabela exercicios com:

Todos os dados do CSV
imagem_1_url: URL da imagem no R2
tipo: 'padrao'
is_ativo: true


🔎 Verifica duplicatas antes: não insere se já existe exercício com mesmo nome + grupo_muscular

5. Tratamento de erros:

⚠️ Se imagem não for encontrada: avisa mas continua
🔁 Se upload falhar: tenta novamente ao final
✅ Mostra resumo completo ao terminar

Resumo:
CSV → Busca Imagem → Processa (360x360) → Upload R2 (bucket: exercicios-padrao) → Salva Supabase com URL
Observação importante: As imagens precisam ter exatamente o mesmo nome do exercício no CSV (primeira coluna), incluindo espaços e acentos!