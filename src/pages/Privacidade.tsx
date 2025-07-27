import { Link } from "react-router-dom";


const Privacidade = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border">
        <div className="container mx-auto px-6 py-4">
          <Link to="/" className="flex items-center">
            <img 
              src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets//TitansFitnessLogo.png" 
              alt="Titans.fitness" 
              className="h-12"
            />
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12 max-w-4xl">
        <h1 className="text-4xl font-bold text-text-primary mb-8">
          Política de Privacidade
        </h1>
        
        <div className="prose prose-gray max-w-none">
          <p className="text-text-secondary text-lg mb-8">
            Última atualização: 24 de julho de 2025
          </p>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">1. Informações que Coletamos</h2>
            <p className="text-text-secondary mb-4">
              Coletamos informações que você nos fornece diretamente, como quando você cria uma conta, 
              atualiza seu perfil, ou usa nossos serviços.
            </p>
            <h3 className="text-xl font-semibold text-text-primary mb-2">Dados Pessoais:</h3>
            <ul className="list-disc pl-6 text-text-secondary space-y-1 mb-4">
              <li>Nome completo e informações de contato</li>
              <li>Data de nascimento e gênero</li>
              <li>Informações profissionais (para Personal Trainers)</li>
              <li>Dados de saúde e fitness (para Alunos)</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">2. Como Usamos suas Informações</h2>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Fornecer e melhorar nossos serviços</li>
              <li>Personalizar sua experiência na plataforma</li>
              <li>Facilitar a comunicação entre Personal Trainers e Alunos</li>
              <li>Enviar atualizações e notificações importantes</li>
              <li>Garantir a segurança da plataforma</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">3. Compartilhamento de Informações</h2>
            <p className="text-text-secondary mb-4">
              Não vendemos, alugamos ou compartilhamos suas informações pessoais com terceiros para 
              fins comerciais. Suas informações podem ser compartilhadas apenas:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Entre Personal Trainers e seus Alunos vinculados</li>
              <li>Quando exigido por lei ou processo legal</li>
              <li>Para proteger nossos direitos, propriedade ou segurança</li>
              <li>Com provedores de serviços que nos auxiliam na operação da plataforma</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">4. Segurança dos Dados</h2>
            <p className="text-text-secondary mb-4">
              Implementamos medidas de segurança técnicas e organizacionais para proteger suas 
              informações contra acesso não autorizado, alteração, divulgação ou destruição.
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Criptografia de dados sensíveis</li>
              <li>Acesso restrito baseado em necessidade</li>
              <li>Monitoramento contínuo de segurança</li>
              <li>Backups regulares e seguros</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">5. Seus Direitos</h2>
            <p className="text-text-secondary mb-4">
              Você tem o direito de:
            </p>
            <ul className="list-disc pl-6 text-text-secondary space-y-2">
              <li>Acessar suas informações pessoais</li>
              <li>Corrigir dados imprecisos ou incompletos</li>
              <li>Solicitar a exclusão de seus dados</li>
              <li>Retirar seu consentimento a qualquer momento</li>
              <li>Portabilidade de dados</li>
            </ul>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">6. Retenção de Dados</h2>
            <p className="text-text-secondary mb-4">
              Mantemos suas informações pessoais apenas pelo tempo necessário para cumprir os 
              propósitos descritos nesta política, salvo quando um período de retenção mais longo 
              for exigido por lei.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">7. Cookies e Tecnologias Similares</h2>
            <p className="text-text-secondary mb-4">
              Utilizamos cookies e tecnologias similares para melhorar sua experiência, 
              analisar o uso da plataforma e personalizar conteúdo.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">8. Alterações nesta Política</h2>
            <p className="text-text-secondary mb-4">
              Podemos atualizar esta Política de Privacidade periodicamente. Notificaremos sobre 
              mudanças significativas através da plataforma ou por email.
            </p>
          </section>

          <section className="mb-8">
            <h2 className="text-2xl font-semibold text-text-primary mb-4">9. Contato</h2>
            <p className="text-text-secondary mb-4">
              Para questões sobre esta Política de Privacidade ou exercer seus direitos, 
              entre em contato:
            </p>
            <ul className="list-none text-text-secondary space-y-1">
              <li>Email: privacidade@titans.fitness</li>
              <li>Telefone: (11) 99999-9999</li>
            </ul>
          </section>
        </div>
      </main>
    </div>
  );
};

export default Privacidade;