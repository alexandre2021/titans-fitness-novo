No groq:
https://console.groq.com/docs/rate-limits

Modelo:
meta-llama/llama-4-scout-17b-16e-instruct
RPM: 30
RPD: 1K
TPM: 30K
TPD: 500K


Gerar 1.000 posts/dia
Com ~500 tokens cada
A uma taxa de até 30 posts/minuto → 1 post a cada 2 segundos

No Google Dev
https://ai.google.dev/gemini-api/docs/rate-limits?hl=pt-br

Modelo:
Gemini 2.5 Flash-Lite

Usando a modalidade com apenas as informações que possui em seu treinamento para gerar a resposta posso ter 1.000 RPD. É ideal para tarefas de rotina, criativas, resumos, traduções, formatação de dados e raciocínio lógico. Nessa modalidade não tem acesso em tempo real à web. Se você perguntar sobre notícias de hoje, a resposta pode estar desatualizada.


Usando um servidor virtual compartilhado sem GPU, modelo VCPU:

Opções de servidores:
https://contabo.com/en/vps/
https://www.hetzner.com/cloud/


Modelo LLM:
Phi-3-mini-4k-instruct

Formato: GGUF
Versão recomendada: Q4_K_M (ótimo equilíbrio entre velocidade, qualidade e uso de RAM)
Tamanho na RAM: ~4–5 GB
Ideal para posts curtos, instruções, tom natural — perfeito para redes sociais

Motor de execução:

Programa em C++ otimizado para CPU (não precisa de GPU)
Suporta modelos no formato GGUF
Pode rodar como servidor HTTP (modo ./server)
Usa threads para acelerar a geração (ex: --threads 6)


Instruções:

Você roda o llama.cpp uma única vez, carregando o Phi-3-mini, e ele fica escutando em http://localhost:8080.

Workers:

São scripts leves em Python (ou outra linguagem)
Não carregam o modelo
Chamam o servidor do llama.cpp via HTTP para gerar texto
Podem rodar vários em paralelo (2–4 é ideal no CX42)
Exemplo de chamada do worker:
response = requests.post("http://localhost:8080/completion", json={
   "prompt": "Crie um post sobre remada curvada...",
   "n_predict": 150
})
post = response.json()["content"]





Para moderação:

Google Perspective (100.000/mês)
https://developers.google.com/codelabs/setup-perspective-api?hl=pt-br#0

PI do Google para detectar toxicidade, insultos, ataques.


Hugging Face (30.000/mês)

Conclusão:

Não vale a pena criar um sitema de posts para Professores. Ideia inicial era usar o modelo Gemini 2.5 Flash-Lite para gerar a lista de temas de post, usar o meta-llama/llama-4-scout-17b-16e-instruct para gerar os posts e as ferrametas Google Perspective e Hugging Face para moderar. Esse modelo permitiria criar até 1.000 posts por dia, tendo a necessidade de expandir o caminho seria partir para o modelo com servidor VCPU na nuvem.



Categorias:

Exercícios
Planos de Treino
Nutrição
Suplementação
Recuperação
Bem-estar
Saúde mental
Tendências
Ciência
Performance



