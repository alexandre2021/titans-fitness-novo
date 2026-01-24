/**
 * Script para gerar descrições dos artigos da Central de Ajuda
 * As descrições serão usadas pelo LLM para busca semântica mais precisa
 */

const SUPABASE_URL = 'https://prvfvlyzfyprjliqniki.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Mapeamento de descrições para cada artigo
// Cada descrição é elaborada para ajudar o LLM a identificar o artigo correto
const articleDescriptions = {
  // === Acesso e Cadastro ===
  "Como faço para acessar minha conta (Login)?": "Instruções de como fazer login no app, seja com email/senha ou com conta Google. Para quem já tem conta e quer entrar.",
  "Como me cadastro na plataforma?": "Passo a passo para criar uma conta nova no Titans. Escolha entre conta de Professor ou Aluno.",
  "Esqueci minha senha, o que eu faço?": "Como solicitar redefinição de senha quando esqueceu. Passo a passo para recuperar acesso à conta.",
  "Pedi para redefinir a senha, mas não recebi o e-mail. O que fazer?": "Solução para quando o email de redefinição de senha não chega. Verificar spam, aguardar, ou tentar novamente.",
  "O link para redefinir a senha expirou ou é inválido.": "O que fazer quando o link de redefinição de senha não funciona mais. Como solicitar novo link.",
  "O que acontece depois que eu me cadastro?": "Explicação do fluxo após criar conta: confirmação de email e configuração inicial (onboarding).",
  "Posso mudar meu tipo de conta depois do cadastro?": "Não é possível alterar de Professor para Aluno ou vice-versa. Precisa criar conta nova.",
  "Posso ter uma conta de Aluno e uma de Professor?": "Sim, pode ter duas contas usando emails diferentes. Uma para cada perfil.",
  "Qual a diferença entre a conta de Professor e a de Aluno?": "Comparação das funcionalidades: Professor cria rotinas e gerencia alunos. Aluno executa treinos e acompanha progresso.",
  "Recebi uma mensagem de Credenciais inválidas.": "Erro de login quando email ou senha estão incorretos. Verificar digitação ou redefinir senha.",
  "Recebi uma mensagem de \"Email não confirmado\". O que fazer?": "Como resolver erro de email não confirmado. Verificar caixa de entrada ou reenviar confirmação.",

  // === Configuração Inicial ===
  "O que é o processo de Configuração inicial (Onboarding)?": "Explicação do onboarding: etapas que novos usuários passam para configurar perfil após criar conta.",
  "Posso editar minhas informações profissionais depois?": "Sim, informações profissionais podem ser editadas a qualquer momento na página Meu Perfil.",
  "Preciso preencher todos os meus dados no primeiro acesso?": "Não é obrigatório, mas ajuda outros usuários a conhecerem você. Pode preencher depois.",
  "Preciso preencher minhas informações profissionais e redes sociais no primeiro acesso?": "Não é obrigatório preencher informações profissionais e redes sociais imediatamente.",
  "O que é o Questionário de Saúde (PAR-Q)?": "Explicação do PAR-Q: questionário de prontidão para atividade física que alunos respondem.",
  "Por que devo preencher minhas informações profissionais?": "Benefícios de preencher dados profissionais: credibilidade e facilita alunos encontrarem você.",
  "Posso responder o Questionário de Saúde (PAR-Q) depois?": "Sim, o PAR-Q pode ser respondido posteriormente na página Meu Perfil.",
  "Por onde começo? Primeiros passos para professores": "Guia inicial para professores: cadastrar alunos, criar exercícios personalizados, montar rotinas de treino.",

  // === Funcionalidades do Aplicativo ===
  "Como faço para instalar o aplicativo no meu celular?": "Instruções para instalar o PWA no celular. Funciona como app nativo sem baixar da loja.",
  "Como funciona a atualização do aplicativo?": "Atualizações são automáticas. Às vezes precisa fechar e abrir o app para carregar nova versão.",
  "Como funciona o sistema de mensagens?": "Visão geral do chat interno: conversas individuais, grupos, e mensagens do sistema.",
  "Posso usar o aplicativo sem conexão com a internet?": "Não, o Titans precisa de internet para funcionar. Dados são armazenados na nuvem.",

  // === Mensagens e Notificações ===
  "O que são Alertas de Mensagem?": "Explicação das notificações push que avisam sobre novas mensagens no celular.",
  "Como ativo os Alertas de Mensagem?": "Passo a passo para ativar notificações push de mensagens no navegador ou celular.",
  "O que são as Mensagens do Sistema?": "Explicação das mensagens automáticas enviadas pelo sistema sobre eventos importantes.",
  "Como inicio uma conversa?": "Como começar um novo chat: através do botão de mensagens ou do menu do aluno/professor.",
  "Como sei que tenho novas mensagens?": "Indicadores de mensagens não lidas: bolinha no ícone e notificações push se ativadas.",
  "Como crio um grupo de mensagens?": "Passo a passo para criar grupo de conversa com múltiplos participantes.",
  "Posso adicionar ou remover participantes de um grupo?": "Sim, o criador do grupo pode gerenciar membros através das configurações do grupo.",
  "Posso apagar uma mensagem que enviei?": "Não é possível apagar mensagens enviadas. Revise antes de enviar.",
  "Posso enviar imagens ou arquivos no chat?": "Atualmente só texto é suportado. Imagens e arquivos serão adicionados em breve.",

  // === Meu Perfil ===
  "Como acesso e edito meu perfil?": "Como acessar a página Meu Perfil para editar informações pessoais, foto e configurações.",
  "Como altero minha foto de perfil (avatar)?": "Instruções para trocar a foto de perfil através da página Meu Perfil.",
  "Como edito minhas informações pessoais?": "Como alterar nome, data de nascimento e outros dados pessoais no perfil.",
  "O que posso editar no meu perfil de aluno?": "Lista de informações editáveis para alunos: dados pessoais, foto, e configurações.",
  "Como edito minhas informações profissionais?": "Para professores: como editar especialidades, formação e experiência profissional.",
  "Como adiciono minhas redes sociais?": "Como vincular Instagram, WhatsApp e outras redes ao perfil de professor.",
  "Como altero minha senha?": "Passo a passo para trocar a senha atual por uma nova através do perfil.",
  "Como cancelo minha conta?": "Processo de exclusão de conta e o que acontece com os dados após cancelamento.",

  // === Painel Inicial ===
  "O que o aluno encontra em seu Painel Inicial?": "Visão geral do painel do aluno: treino do dia, progresso, pontos e agendamentos.",
  "O que o professor encontra em seu Painel Inicial?": "Visão geral do painel do professor: agenda, alunos recentes e acesso rápido às funções.",
  "Como faço para criar um novo agendamento?": "Instruções para agendar sessão de treino ou compromisso com aluno na agenda.",
  "Como reagendo ou excluo um agendamento?": "Como alterar data/hora ou cancelar um agendamento existente na agenda.",
  "Como respondo a um convite de agendamento?": "Como aceitar ou recusar convite de agendamento recebido de professor ou aluno.",
  "O que significam as cores na agenda?": "Legenda das cores dos agendamentos: confirmado, pendente, recusado, etc.",
  "Posso cancelar um agendamento que já confirmei?": "Sim, é possível cancelar agendamento confirmado. Avise o outro participante.",
  "Um aluno recusou um agendamento. O que acontece?": "Explicação do fluxo quando aluno recusa: agendamento fica marcado e professor é notificado.",

  // === Alunos ===
  "Como adiciono um novo aluno?": "ARTIGO GERAL sobre vincular alunos. Apresenta os 3 métodos: email, QR Code ou código. Use este para perguntas genéricas sobre adicionar/cadastrar aluno.",
  "Como convido um aluno por email?": "Método específico: enviar convite por e-mail. Passo a passo do processo de convite por email.",
  "Como convido um aluno por QR Code?": "Método específico: mostrar QR Code para aluno escanear e se vincular ao professor.",
  "Como vinculo um aluno pelo código?": "Método específico: aluno digita código de 6 caracteres para se vincular ao professor.",
  "Como removo o vínculo com um aluno?": "Como desvincular um aluno da sua lista. O aluno não é excluído, apenas desvinculado.",
  "O que posso fazer na página de um aluno?": "Funcionalidades disponíveis no perfil do aluno: rotinas, avaliações, mensagens e mais.",
  "O que significa a situação Pendente em um aluno?": "Aluno pendente ainda não aceitou o convite ou não completou o cadastro.",
  "Qual a diferença entre as páginas Rotinas no menu de opções do aluno e no menu principal?": "Diferença entre ver rotinas de um aluno específico vs todas as rotinas criadas.",
  "Qual a diferença entre as páginas Avaliações no menu de opções do aluno e no menu principal?": "Diferença entre ver avaliações de um aluno específico vs todas as avaliações.",

  // === Exercícios ===
  "Qual a diferença entre exercícios Padrão e Personalizados?": "Padrão são pré-cadastrados no sistema. Personalizados são criados pelo professor.",
  "Como crio um exercício personalizado?": "Passo a passo para criar exercício personalizado com nome, descrição e mídia.",
  "Existe um limite para exercícios personalizados?": "Informação sobre limite de exercícios personalizados que podem ser criados.",
  "Como encontro um exercício na biblioteca?": "Como usar busca e filtros para encontrar exercícios por nome, grupo muscular ou tipo.",
  "Como funciona o upload de mídias (fotos e vídeos) para os exercícios?": "Instruções para adicionar fotos e vídeos aos exercícios personalizados.",
  "Posso editar ou excluir um exercício?": "Regras para edição e exclusão de exercícios. Padrão não pode, personalizado sim.",

  // === Rotinas de Treino (Criação) ===
  "O que significam as situações da rotina (Ativa, Bloqueada, etc.)?": "Explicação dos status: Ativa (em uso), Bloqueada (pausada), Rascunho (em criação), Concluída.",
  "O aluno pode ter mais de uma rotina Ativa ao mesmo tempo?": "Não, apenas uma rotina pode estar Ativa por vez. Novas rotinas bloqueiam a anterior.",
  "Como crio uma nova rotina para um aluno?": "ARTIGO GERAL sobre criar rotina/treino. Passo a passo completo do processo de criação de rotina de treino para aluno.",
  "O que são Modelos de Rotina?": "Explicação de modelos: rotinas salvas para reutilizar com diferentes alunos.",
  "Otimizando seu tempo com Modelos de Rotina": "Dicas práticas de como usar modelos para criar rotinas mais rápido.",
  "Como crio um modelo de rotina?": "Passo a passo para criar e salvar um modelo de rotina reutilizável.",
  "Como criar uma rotina a partir de um modelo?": "Como usar um modelo existente para criar rotina nova para um aluno.",
  "Posso salvar uma rotina com Rascunho para continuar com a criação depois?": "Sim, rotinas podem ser salvas como rascunho e editadas posteriormente.",
  "Por que o objetivo e a disponibilidade são definidos na rotina e não no perfil do aluno?": "Explicação: objetivos podem variar entre rotinas do mesmo aluno.",
  "Quais são as etapas no processo de criação de rotina?": "Visão geral das etapas: configuração, treinos, exercícios e revisão.",
  "Por que meus treinos/exercícios são reiniciados ao alterar uma etapa anterior?": "Explicação técnica: alterações anteriores afetam etapas seguintes.",
  "Como organizo a ordem dos treinos e exercícios?": "Como arrastar e reorganizar a ordem de treinos e exercícios na rotina.",
  " O que são e como configurar Série Simples e Série Combinada?": "Diferença entre série simples (um exercício) e combinada (bi-set, tri-set). Como configurar cada uma.",
  "O que é e como configuro um Drop Set?": "Explicação e configuração de drop set: redução de carga sem descanso.",
  "Como adiciono exercícios aos meus treinos?": "Como selecionar e adicionar exercícios da biblioteca aos treinos da rotina.",
  "Como a Meta é exibida para o aluno durante o treino?": "Como o aluno vê a meta de repetições/tempo durante execução do treino.",
  "O que são intervalos e como configurá-los?": "Configuração de tempo de descanso entre séries e exercícios.",
  "Como configuro exercícios com peso corporal?": "Como marcar exercício como peso corporal quando não usa carga externa.",

  // === Rotinas de Treino (Execução) ===
  "Qual a diferença entre Bloquear e Excluir uma rotina de treino?": "Bloquear pausa a rotina (mantém histórico). Excluir remove permanentemente.",
  "Quando o professor deve Bloquear uma rotina de treino?": "Situações para bloquear: férias do aluno, lesão, troca de foco, etc.",
  "Qual a diferença entre Modo Aluno e Modo Assistido na execução do treino?": "Modo Aluno: treina sozinho. Modo Assistido: professor acompanha presencialmente.",
  "Onde encontro a lista de sessões disponíveis da atual rotina de treino?": "Como acessar lista de treinos disponíveis na rotina ativa.",
  " Como o sistema sugere a próxima sessão de treino?": "Lógica de sugestão: baseada na sequência e último treino realizado.",
  "O que temos na tela de execução do treino?": "Visão geral da interface de treino: exercício atual, séries, tempo, histórico.",
  "Como Pausar e Retomar uma Sessão de Treino?": "Como interromper treino e continuar depois sem perder progresso.",
  "Qual a diferença entre Série Simples e Série Combinada?": "Na execução: simples faz um exercício, combinada alterna entre exercícios.",
  "O que é um Drop Set?": "Na execução: como funciona o drop set durante o treino.",
  "Posso fazer os exercícios em uma ordem diferente?": "Sim, pode pular exercícios e fazer em ordem diferente da planejada.",
  "Posso pular o tempo de descanso (intervalo)?": "Sim, pode pular o intervalo e ir direto para próxima série.",
  "O que é o botão de Histórico?": "Função do botão histórico: ver resultados anteriores do mesmo exercício.",
  "Como ver os detalhes de um exercício durante o treino?": "Como acessar descrição, vídeo e instruções do exercício durante execução.",
  "O que acontece ao finalizar a última série do treino?": "Fluxo de finalização: resumo, pontos ganhos e opções pós-treino.",
  "O que acontece se eu finalizar um treino sem completar todos os exercícios?": "Treino incompleto: é salvo parcialmente, exercícios pulados ficam registrados.",
  "Terminei minha rotina de treino. E agora?": "O que fazer após completar todas as sessões: aguardar nova rotina do professor.",
  " Por que o aluno não pode criar sua própria rotina de treino?": "Filosofia do app: rotinas são criadas por profissionais para segurança e eficácia.",

  // === Pontos e Conquistas ===
  "O que é o Sistema de Pontos?": "Explicação da gamificação: como funciona o sistema de pontos e recompensas.",
  "Como ganho pontos?": "Formas de ganhar pontos: completar treinos, manter sequência, atingir metas.",
  "O que é a Sequência (Streak)?": "Explicação do streak: dias consecutivos de treino e bônus de pontos.",
  "O que são os Níveis (Bronze, Prata, Ouro)?": "Sistema de níveis baseado em pontos acumulados e benefícios de cada nível.",
  "Onde vejo meus pontos e progresso?": "Onde encontrar informações de pontos: painel inicial e página de perfil.",
  "O que acontece quando finalizo um treino?": "Resumo pós-treino: pontos ganhos, streak atualizado e celebração.",

  // === Avaliações Físicas ===
  "O que são as Avaliações Físicas?": "Explicação geral: medidas corporais, fotos e acompanhamento de evolução.",
  "Como acesso as avaliações dos meus alunos?": "Para professor: onde encontrar e gerenciar avaliações dos alunos.",
  "Como vejo minhas avaliações e meu progresso?": "Para aluno: onde acessar suas avaliações e acompanhar evolução.",
  "Quais informações temos em avaliações?": "Dados registrados: peso, medidas, fotos, percentual de gordura, etc.",
  "Em avaliações como posso ver a evolução do aluno?": "Como visualizar gráficos e comparativos entre avaliações diferentes.",
  "Qual o intervalo ideal entre Avaliações Físicas?": "Recomendação: a cada 4-8 semanas para observar mudanças significativas.",
  "Como criar uma nova Avaliação Física para o aluno?": "Passo a passo para professor criar nova avaliação com medidas e fotos.",
  "As fotos das avaliações são armazenadas de forma segura?": "Informação sobre segurança e privacidade das fotos de avaliação.",

  // === Termos e Privacidade ===
  "O Titans é gratuito para professores?": "Informação sobre preços e modelo de negócio para professores.",
  "Como o Titans.fitness usa meus dados?": "Política de privacidade resumida: como dados são coletados e usados.",
  "Meus dados são compartilhados com alguém?": "Política de compartilhamento de dados: o que é e não é compartilhado.",
  "O que acontece com meus dados se minha conta for excluída?": "Política de retenção: dados são excluídos após cancelamento da conta.",
  "Quais são minhas responsabilidades como Aluno?": "Termos de uso para alunos: responsabilidades e regras de conduta.",
  "Quais são minhas responsabilidades como Professor na plataforma?": "Termos de uso para professores: responsabilidades profissionais e éticas.",
  "Qual é a política de exclusão de contas por inatividade?": "Regras de inatividade: quando contas são excluídas automaticamente."
};

async function fetchArticles() {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/knowledge_base_articles?select=id,title`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch articles: ${response.statusText}`);
  }

  return response.json();
}

async function updateArticleDescription(id, description) {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/knowledge_base_articles?id=eq.${id}`,
    {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal',
      },
      body: JSON.stringify({ description }),
    }
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to update article ${id}: ${text}`);
  }

  return true;
}

async function main() {
  if (!SUPABASE_SERVICE_KEY) {
    console.error('SUPABASE_SERVICE_ROLE_KEY not set. Please set it as environment variable.');
    process.exit(1);
  }

  console.log('Fetching articles...');
  const articles = await fetchArticles();
  console.log(`Found ${articles.length} articles\n`);

  let updated = 0;
  let notFound = [];

  for (const article of articles) {
    const description = articleDescriptions[article.title];

    if (description) {
      try {
        await updateArticleDescription(article.id, description);
        console.log(`✓ ${article.title}`);
        updated++;
      } catch (err) {
        console.error(`✗ ${article.title}: ${err.message}`);
      }
    } else {
      notFound.push(article.title);
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Updated: ${updated}/${articles.length}`);

  if (notFound.length > 0) {
    console.log(`\nArticles without description (${notFound.length}):`);
    notFound.forEach(title => console.log(`- ${title}`));
  }
}

main().catch(console.error);
