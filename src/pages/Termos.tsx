import { Link } from "react-router-dom";
import titansLogo from "@/assets/titans-logo.png";

const Termos = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <Link to="/" className="flex items-center space-x-3">
            <img src={titansLogo} alt="Titans.fitness" className="h-10 w-10" />
            <span className="text-2xl font-bold text-text-primary">Titans.fitness</span>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-text-primary mb-8">
          Termos de Uso
        </h1>
        
        <div className="prose prose-gray max-w-none">
          <p className="text-text-secondary text-lg mb-8">
            Última atualização: 24 de julho de 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">1. Aceitação dos Termos</h2>
            <p className="text-text-secondary mb-4">
              Ao acessar e usar a plataforma Titans.fitness, você concorda em estar vinculado a estes 
              Termos de Uso e a todas as leis e regulamentos aplicáveis, e concorda que é responsável 
              pelo cumprimento de todas as leis locais aplicáveis.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">2. Descrição do Serviço</h2>
            <p className="text-text-secondary mb-4">
              O Titans.fitness é uma plataforma digital que conecta Personal Trainers e seus alunos, 
              oferecendo ferramentas para gestão de treinos, acompanhamento de progresso e comunicação.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">3. Cadastro e Contas de Usuário</h2>
            <p className="text-text-secondary mb-4">
              Para usar nossa plataforma, você deve criar uma conta fornecendo informações precisas e atualizadas. 
              Você é responsável por manter a confidencialidade de sua senha e por todas as atividades que 
              ocorrerem em sua conta.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">4. Responsabilidades do Personal Trainer</h2>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Possuir qualificações adequadas e certificações válidas</li>
              <li>Criar treinos seguros e apropriados para cada aluno</li>
              <li>Manter a confidencialidade das informações dos alunos</li>
              <li>Seguir as diretrizes de segurança e boas práticas</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">5. Responsabilidades do Aluno</h2>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Fornecer informações de saúde precisas e atualizadas</li>
              <li>Seguir as orientações do Personal Trainer</li>
              <li>Comunicar qualquer problema de saúde ou lesão</li>
              <li>Usar a plataforma de forma responsável</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">6. Privacidade e Proteção de Dados</h2>
            <p className="text-text-secondary mb-4">
              Seus dados pessoais são protegidos de acordo com nossa Política de Privacidade. 
              Não compartilhamos suas informações com terceiros sem seu consentimento explícito.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">7. Limitação de Responsabilidade</h2>
            <p className="text-text-secondary mb-4">
              O Titans.fitness não se responsabiliza por lesões ou danos resultantes do uso inadequado 
              da plataforma ou do não cumprimento das orientações profissionais.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">8. Modificações dos Termos</h2>
            <p className="text-text-secondary mb-4">
              Reservamo-nos o direito de modificar estes termos a qualquer momento. 
              As alterações entrarão em vigor imediatamente após a publicação na plataforma.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">9. Contato</h2>
            <p className="text-text-secondary mb-4">
              Se você tiver dúvidas sobre estes Termos de Uso, entre em contato conosco através do 
              email: suporte@titans.fitness
            </p>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Termos;