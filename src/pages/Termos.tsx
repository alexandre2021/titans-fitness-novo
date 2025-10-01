import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Termos = () => {
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
            src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/titans-horizontal-simples.png"
            alt="Titans.fitness"
            className="h-12"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 container mx-auto px-6 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-text-primary mb-8">
          Termos de Uso
        </h1>
        
        <div className="prose prose-gray max-w-none">
          <p className="text-text-secondary text-lg mb-8">
            Última atualização: 29 de agosto de 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">1. Aceitação dos Termos</h2>
            <p className="text-text-secondary mb-4">
              Ao acessar e usar a plataforma Titans.fitness, você concorda em estar vinculado a estes 
              Termos de Uso e a todas as leis e regulamentos aplicáveis. Estes termos se aplicam tanto 
              a Personal Trainers quanto a Alunos que utilizam nossa plataforma.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">2. Descrição do Serviço</h2>
            <p className="text-text-secondary mb-4">
              O Titans.fitness é uma plataforma digital que conecta Personal Trainers e seus alunos, 
              oferecendo ferramentas para gestão de treinos, acompanhamento de progresso, comunicação 
              e análise de desempenho através de inteligência artificial.
            </p>
            <p className="text-text-secondary mb-4">
              <strong>Para Personal Trainers:</strong> Oferecemos ferramentas para gerenciar clientes, 
              criar treinos personalizados, acompanhar progressos e manter comunicação eficiente.
            </p>
            <p className="text-text-secondary mb-4">
              <strong>Para Alunos:</strong> Fornecemos acesso aos treinos criados pelo seu Personal Trainer, 
              ferramentas de acompanhamento e comunicação direta com seu profissional.
            </p>
            <p className="text-text-secondary mb-4">
              Para garantir a performance e a relevância do histórico, a plataforma mantém um número limitado de registros para dados como avaliações físicas e rotinas concluídas. O sistema opera de forma automática, substituindo o registro mais antigo por um novo quando o limite é atingido.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">3. Cadastro e Contas de Usuário</h2>
            <p className="text-text-secondary mb-4">
              Para usar nossa plataforma, você deve criar uma conta fornecendo informações precisas e atualizadas. 
              Você é responsável por manter a confidencialidade de sua senha e por todas as atividades que 
              ocorrerem em sua conta.
            </p>
            <p className="text-text-secondary mb-4">
              <strong>Alunos</strong> devem ser convidados por um Personal Trainer para completar o cadastro. 
              <strong>Personal Trainers</strong> podem convidar alunos através da plataforma após validação 
              de seu perfil profissional.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">4. Política de Contas e Inatividade</h2>
            <div className="bg-orange-50 border-l-4 border-orange-500 p-4 mb-4">
              <p className="text-text-primary font-semibold mb-2">Exclusão de Contas por Inatividade</p>
              <p className="text-text-secondary">
                Contas de <strong>Alunos e Personal Trainers</strong> que permanecerem inativas por <strong>90 (noventa) dias consecutivos</strong> serão 
                automaticamente programadas para exclusão de nossa plataforma.
              </p>
            </div>
            <ul className="list-disc pl-6 text-text-secondary space-y-2 mb-4">
              <li><strong>Atividade:</strong> Login na plataforma, visualização de treinos, ou uso de qualquer função são consideradas atividades</li>
              <li><strong>Aviso prévio:</strong> Usuários recebem um email de aviso aos 60 dias de inatividade</li>
              <li><strong>Dados:</strong> Após a exclusão, todos os dados serão permanentemente removidos e não poderão ser recuperados</li>
              <li><strong>Reativação:</strong> Para evitar a exclusão, basta fazer login na plataforma antes do prazo</li>
              <li><strong>Personal Trainers:</strong> A exclusão de uma conta de Personal Trainer resultará no cancelamento de todas as rotinas ativas e na desvinculação de todos os alunos associados.</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">5. Responsabilidades do Personal Trainer</h2>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Possuir qualificações adequadas e certificações válidas para exercer a profissão</li>
              <li>Realizar avaliação física adequada e coletar informações de saúde antes de iniciar treinos</li>
              <li>Criar treinos seguros, apropriados e baseados em evidências científicas para cada aluno</li>
              <li>Monitorar continuamente a saúde e bem-estar dos alunos durante o treinamento</li>
              <li>Manter a confidencialidade de todas as informações pessoais e de saúde dos alunos</li>
              <li>Seguir as diretrizes de segurança, ética profissional e boas práticas do setor</li>
              <li>Responder às dúvidas e solicitações dos alunos de forma profissional e em tempo hábil</li>
              <li>Manter seus dados profissionais e certificações atualizados na plataforma</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">6. Responsabilidades do Aluno</h2>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Fornecer informações de saúde precisas, completas e atualizadas ao Personal Trainer</li>
              <li>Seguir as orientações e treinos prescritos pelo Personal Trainer de forma responsável</li>
              <li>Comunicar imediatamente qualquer problema de saúde, lesão ou desconforto</li>
              <li>Usar a plataforma de forma adequada e respeitosa</li>
              <li>Informar sobre limitações físicas, medicamentos ou condições médicas relevantes</li>
              <li>Manter contato regular com seu Personal Trainer sobre seu progresso e dificuldades</li>
              <li>Buscar acompanhamento médico quando orientado pelo Personal Trainer</li>
              <li>Respeitar suas próprias limitações e não exceder orientações recebidas</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">7. Relacionamento Profissional</h2>
            <p className="text-text-secondary mb-4">
              A plataforma facilita a comunicação entre Personal Trainers e Alunos, mas não é responsável 
              pela qualidade do relacionamento profissional ou pelos resultados obtidos.
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Os acordos financeiros devem ser estabelecidos diretamente entre Personal Trainer e Aluno</li>
              <li>A plataforma não processa pagamentos nem participa de transações financeiras</li>
              <li>Disputas profissionais devem ser resolvidas entre as partes ou através de órgãos competentes</li>
              <li>O Personal Trainer deve seguir as normas do CREF e legislação profissional aplicável</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">8. Privacidade e Proteção de Dados</h2>
            <p className="text-text-secondary mb-4">
              Seus dados pessoais são protegidos de acordo com nossa Política de Privacidade e a 
              Lei Geral de Proteção de Dados (LGPD). Não compartilhamos suas informações com terceiros 
              sem seu consentimento explícito, exceto quando exigido por lei.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">9. Limitação de Responsabilidade</h2>
            <p className="text-text-secondary mb-4">
              O Titans.fitness é uma plataforma de tecnologia que facilita a conexão entre profissionais 
              e clientes. Não nos responsabilizamos por:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2 mb-6">
              <li>Lesões ou danos resultantes da execução inadequada de exercícios</li>
              <li>Qualidade dos serviços prestados pelos Personal Trainers</li>
              <li>Resultados específicos de treinos ou programas</li>
              <li>Disputas entre Personal Trainers e Alunos</li>
              <li>Perda de dados devido a problemas técnicos ou inatividade da conta</li>
            </ul>
            
            <div className="bg-blue-50 border-l-4 border-blue-500 p-4">
              <p className="text-text-primary font-semibold mb-2">Responsabilidade Profissional</p>
              <p className="text-text-secondary">
                Embora a plataforma não se responsabilize pelos serviços prestados, é <strong>obrigação 
                legal e ética do Personal Trainer</strong> seguir as normas do CREF (Conselho Regional 
                de Educação Física), realizar avaliações adequadas, monitorar a saúde dos alunos e atuar 
                dentro de seu escopo profissional. A negligência nessas responsabilidades pode resultar 
                em consequências legais e profissionais para o Personal Trainer.
              </p>
            </div>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">10. Uso Adequado da Plataforma</h2>
            <p className="text-text-secondary mb-4">É proibido usar a plataforma para:</p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Atividades ilegais ou não autorizadas</li>
              <li>Assédio, discriminação ou comportamento inadequado</li>
              <li>Compartilhar conteúdo ofensivo, falso ou prejudicial</li>
              <li>Violar direitos de propriedade intelectual</li>
              <li>Tentar acessar sistemas ou dados de outros usuários</li>
              <li>Fornecer informações falsas sobre qualificações ou certificações</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">11. Modificações dos Termos</h2>
            <p className="text-text-secondary mb-4">
              Reservamo-nos o direito de modificar estes termos a qualquer momento. Usuários serão 
              notificados sobre mudanças significativas através da plataforma ou por email. O uso 
              continuado após as modificações constitui aceitação dos novos termos.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">12. Rescisão</h2>
            <p className="text-text-secondary mb-4">
              Você pode encerrar sua conta a qualquer momento através das configurações da plataforma. 
              Nós podemos suspender ou encerrar contas que violem estes termos ou por inatividade 
              conforme descrito no item 4.
            </p>
            <p className="text-text-secondary mb-4">
              Personal Trainers podem desvincular alunos de suas contas, mas isso não exclui a conta 
              do aluno da plataforma.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">13. Contato</h2>
            <p className="text-text-secondary mb-4">
              Para dúvidas sobre estes Termos de Uso, entre em contato:
            </p>
            <ul className="list-none text-text-secondary space-y-1">
              <li><strong>Email:</strong> contato@titans.fitness</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Termos;