import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Privacidade = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border py-4">
        <div className="flex items-center justify-center relative px-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="h-10 w-10 p-0 absolute left-6"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <img
            src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/titans-horizontal.png"
            alt="Titans.fitness"
            className="h-12"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-6 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-text-primary mb-8">
          Política de Privacidade
        </h1>
        
        <div className="prose prose-gray max-w-none">
          <p className="text-text-secondary text-lg mb-8">
            Última atualização: 18 de agosto de 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">1. Introdução</h2>
            <p className="text-text-secondary mb-4">
              Esta Política de Privacidade descreve como o Titans.fitness coleta, usa, armazena e 
              protege suas informações pessoais. Aplicamos os mesmos padrões de proteção tanto para 
              Personal Trainers quanto para Alunos, respeitando as especificidades de cada perfil.
            </p>
            <p className="text-text-secondary mb-4">
              Estamos comprometidos com a proteção de seus dados pessoais conforme a Lei Geral de 
              Proteção de Dados (LGPD - Lei 13.709/2018) e demais regulamentações aplicáveis.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">2. Informações que Coletamos</h2>
            <p className="text-text-secondary mb-4">
              Coletamos diferentes tipos de informações dependendo do seu perfil e uso da plataforma:
            </p>
            
            <h3 className="text-xl font-semibold text-text-primary mb-2">2.1 Dados Básicos (Todos os Usuários):</h3>
            <ul className="list-disc pl-6 text-text-secondary space-y-1 mb-4">
              <li>Nome completo, email e telefone</li>
              <li>Data de nascimento e localização</li>
              <li>Informações de autenticação (senha criptografada)</li>
              <li>Dados de uso da plataforma (logs, atividades)</li>
            </ul>

            <h3 className="text-xl font-semibold text-text-primary mb-2">2.2 Dados Específicos de Personal Trainers:</h3>
            <ul className="list-disc pl-6 text-text-secondary space-y-1 mb-4">
              <li>Informações profissionais e certificações</li>
              <li>Experiência e especializações</li>
              <li>Biografia profissional e redes sociais</li>
              <li>Histórico de treinos criados e metodologias</li>
            </ul>

            <h3 className="text-xl font-semibold text-text-primary mb-2">2.3 Dados Específicos de Alunos:</h3>
            <ul className="list-disc pl-6 text-text-secondary space-y-1 mb-4">
              <li>Informações de saúde e condicionamento físico</li>
              <li>Objetivos e preferências de treino</li>
              <li>Histórico de exercícios e progresso</li>
              <li>Medidas corporais e avaliações físicas</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">3. Como Usamos suas Informações</h2>
            <p className="text-text-secondary mb-4">Utilizamos seus dados para:</p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li><strong>Fornecer nossos serviços:</strong> Permitir o funcionamento da plataforma e suas funcionalidades</li>
              <li><strong>Personalização:</strong> Adaptar a experiência às necessidades de cada usuário</li>
              <li><strong>Comunicação:</strong> Facilitar a interação entre Personal Trainers e Alunos</li>
              <li><strong>Melhoria contínua:</strong> Analisar uso para aprimorar produtos e serviços</li>
              <li><strong>Segurança:</strong> Proteger contra fraudes e uso inadequado</li>
              <li><strong>Inteligência Artificial:</strong> Análise de dados para sugestões e insights (sempre anonimizados)</li>
              <li><strong>Suporte técnico:</strong> Resolver problemas e responder dúvidas</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">4. Compartilhamento de Informações</h2>
            <p className="text-text-secondary mb-4">
              <strong>Não vendemos seus dados pessoais.</strong> O compartilhamento ocorre apenas nas seguintes situações:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li><strong>Entre usuários conectados:</strong> Personal Trainers e seus Alunos compartilham informações relevantes para o serviço</li>
              <li><strong>Provedores de serviço:</strong> Empresas que nos auxiliam (hospedagem, analytics, suporte) sob rigorosos acordos de confidencialidade</li>
              <li><strong>Obrigações legais:</strong> Quando exigido por lei, órgãos reguladores ou processos judiciais</li>
              <li><strong>Proteção de direitos:</strong> Para proteger nossos direitos, segurança dos usuários ou investigar atividades suspeitas</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">5. Exclusão de Dados por Inatividade</h2>
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-4">
              <p className="text-text-primary font-semibold mb-2">Política de Retenção de Dados</p>
              <p className="text-text-secondary">
                Contas inativas por <strong>3 (três) meses consecutivos</strong> serão automaticamente 
                excluídas, incluindo todos os dados pessoais associados. Esta exclusão é permanente 
                e irreversível.
              </p>
            </div>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>A exclusão remove todos os dados pessoais, treinos, históricos e comunicações</li>
              <li>Dados agregados e anonimizados podem ser mantidos para fins estatísticos</li>
              <li>É responsabilidade do usuário manter sua conta ativa</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">6. Segurança dos Dados</h2>
            <p className="text-text-secondary mb-4">
              Implementamos medidas de segurança rigorosas para proteger suas informações:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li><strong>Criptografia:</strong> Dados sensíveis são criptografados em trânsito e em repouso</li>
              <li><strong>Controle de acesso:</strong> Acesso limitado por função e necessidade</li>
              <li><strong>Monitoramento:</strong> Sistemas de detecção de intrusão e atividades suspeitas</li>
              <li><strong>Backups seguros:</strong> Cópias de segurança com criptografia e acesso restrito</li>
              <li><strong>Atualizações:</strong> Manutenção regular de sistemas e protocolos de segurança</li>
              <li><strong>Treinamento:</strong> Equipe treinada em boas práticas de segurança</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">7. Seus Direitos (LGPD)</h2>
            <p className="text-text-secondary mb-4">
              Conforme a LGPD, você tem os seguintes direitos sobre seus dados pessoais:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li><strong>Acesso:</strong> Conhecer quais dados possuímos sobre você</li>
              <li><strong>Correção:</strong> Atualizar dados incompletos, inexatos ou desatualizados</li>
              <li><strong>Exclusão:</strong> Solicitar a remoção de dados desnecessários ou tratados inadequadamente</li>
              <li><strong>Portabilidade:</strong> Receber seus dados em formato estruturado e interoperável</li>
              <li><strong>Oposição:</strong> Opor-se ao tratamento quando baseado em interesse legítimo</li>
              <li><strong>Revogação:</strong> Retirar consentimento previamente dado</li>
              <li><strong>Informação:</strong> Obter dados sobre compartilhamento com terceiros</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">8. Retenção de Dados</h2>
            <p className="text-text-secondary mb-4">
              Mantemos seus dados pessoais apenas pelo tempo necessário para:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Fornecer nossos serviços enquanto sua conta estiver ativa</li>
              <li>Cumprir obrigações legais e contratuais</li>
              <li>Resolver disputas e fazer cumprir nossos acordos</li>
              <li>Atender requisitos de órgãos reguladores</li>
            </ul>
            <p className="text-text-secondary mt-4">
              Após a exclusão da conta (por inatividade ou solicitação), os dados são 
              permanentemente removidos, exceto quando a retenção for exigida por lei.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">9. Cookies e Tecnologias Similares</h2>
            <p className="text-text-secondary mb-4">
              Utilizamos cookies e tecnologias similares para:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Manter você conectado à plataforma</li>
              <li>Lembrar suas preferências e configurações</li>
              <li>Analisar como você usa nossos serviços</li>
              <li>Melhorar a funcionalidade e desempenho</li>
              <li>Personalizar conteúdo e funcionalidades</li>
            </ul>
            <p className="text-text-secondary mt-4">
              Você pode controlar cookies através das configurações do seu navegador.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">10. Transferência Internacional</h2>
            <p className="text-text-secondary mb-4">
              Seus dados são processados e armazenados em servidores localizados no Brasil. 
              Caso seja necessária transferência internacional, será feita apenas para países 
              com nível adequado de proteção ou com garantias apropriadas conforme a LGPD.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">11. Menores de Idade</h2>
            <p className="text-text-secondary mb-4">
              Nossa plataforma não é direcionada a menores de 18 anos. Caso identifiquemos 
              dados de menores coletados sem autorização adequada, tomaremos medidas para 
              removê-los imediatamente.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">12. Alterações nesta Política</h2>
            <p className="text-text-secondary mb-4">
              Podemos atualizar esta Política periodicamente. Mudanças significativas serão 
              comunicadas através da plataforma. O uso continuado após as alterações constitui 
              aceitação da nova versão.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">13. Contato e Exercício de Direitos</h2>
            <p className="text-text-secondary mb-4">
              Para questões sobre privacidade, exercer seus direitos ou reportar incidentes:
            </p>
            <ul className="list-none text-text-secondary space-y-1">
              <li><strong>Email:</strong> privacidade@titans.fitness</li>
              <li><strong>Prazo de resposta:</strong> Até 15 dias úteis</li>
            </ul>
            <p className="text-text-secondary mt-4">
              Caso não fique satisfeito com nossa resposta, você pode entrar em contato com a 
              Autoridade Nacional de Proteção de Dados (ANPD).
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Privacidade;