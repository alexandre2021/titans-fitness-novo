import LandingHeader from "@/components/landing/LandingHeader";
import LandingFooter from "@/components/landing/LandingFooter";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqItems = [
  {
    question: "O aplicativo é realmente gratuito? Como vocês ganham dinheiro?",
    answer: (
      <>
        <p>
          Sim, a plataforma é e sempre será <strong>100% gratuita</strong> para professores e seus alunos, com todas as funcionalidades essenciais, incluindo alunos ilimitados.
        </p>
        <p className="mt-2">
          Nossa fonte de receita virá da exibição de anúncios de parceiros de forma inteligente e não intrusiva. Durante a execução do treino, nos momentos de descanso (nos cronômetros de intervalo entre séries e entre exercícios), exibiremos publicidade relevante. Isso garante que sua experiência de treino não seja interrompida e nos permite manter a ferramenta totalmente gratuita para você.
        </p>
      </>
    ),
  },
  {
    question: "A versão gratuita tem alguma limitação?",
    answer: (
      <>
        <p>
          Nosso plano gratuito é extremamente generoso, mas possui algumas limitações justas para garantir a performance da plataforma para todos:
        </p>
        <ul className="list-disc pl-6 mt-2 space-y-1">
          <li><strong>Exercícios Personalizados:</strong> Você pode criar até 100 exercícios próprios, com suas fotos e vídeos.</li>
          <li><strong>Histórico de Rotinas:</strong> O sistema armazena o histórico das últimas 4 rotinas finalizadas por aluno.</li>
          <li><strong>Histórico de Avaliações:</strong> O sistema armazena o histórico das últimas 4 avaliações físicas por aluno.</li>
          <li><strong>Rotina Ativa:</strong> Cada aluno pode ter apenas uma rotina de treino ativa por vez.</li>
        </ul>
      </>
    ),
  },
  {
    question: "Para usar no celular, preciso baixar um aplicativo na App Store ou Play Store?",
    answer: (
      <>
        <p>
          Não. Nossa plataforma utiliza a tecnologia <strong>PWA (Progressive Web App)</strong>. Isso significa que você pode "instalar" o site diretamente na tela inicial do seu celular, e ele se comportará como um aplicativo nativo.
        </p>
        <p className="font-semibold mt-2">Vantagens:</p>
        <ul className="list-disc pl-6 mt-1 space-y-1">
          <li>Não ocupa espaço como um app tradicional.</li>
          <li>Funciona <strong>offline</strong>, permitindo que você e seus alunos registrem treinos mesmo sem internet.</li>
          <li>Está sempre atualizado, sem a necessidade de baixar novas versões.</li>
        </ul>
      </>
    ),
  },
  {
    question: "Qual a diferença entre a conta de Professor e a de Aluno?",
    answer: (
      <ul className="list-disc pl-6 space-y-2">
        <li>
          A <strong>conta de Professor</strong> foi feita para você gerenciar toda a sua base de clientes, criar rotinas de treino avançadas, salvar modelos, realizar avaliações físicas e se comunicar.
        </li>
        <li>
          A <strong>conta de Aluno</strong> é focada na experiência de treino: receber e executar as rotinas, registrar o progresso, visualizar a evolução e falar com o professor.
        </li>
      </ul>
    ),
  },
  {
    question: "Meus dados e os dados dos meus alunos estão seguros?",
    answer: (
      <p>
        Sim. A segurança é nossa prioridade. Todos os dados são criptografados. As fotos de avaliação, por exemplo, são armazenadas de forma privada e só podem ser acessadas por você e seu aluno através de links seguros e temporários gerados pela plataforma.
      </p>
    ),
  },
  {
    question: "O que acontece se minha conta ficar inativa?",
    answer: (
      <p>
        Para manter nossa base de dados otimizada, contas (de professores e alunos) que ficarem inativas por mais de <strong>90 dias</strong> são programadas para exclusão. Enviamos um e-mail de aviso aos 60 dias de inatividade. Para evitar a exclusão, basta fazer login na sua conta.
      </p>
    ),
  },
  {
    question: "O professor precisa ter CREF para usar a plataforma?",
    answer: (
      <p>
        A plataforma é uma ferramenta para auxiliar no seu trabalho. A responsabilidade pela prescrição de treinos e pela qualificação profissional (como o registro no CREF) é inteiramente do professor, conforme nossos Termos de Uso.
      </p>
    ),
  },
];

const PerguntasFrequentes = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter">
                Perguntas Frequentes
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Tire suas dúvidas sobre a plataforma Titans Fitness.
              </p>
            </div>

            <Accordion type="single" collapsible className="w-full">
              {faqItems.map((item, index) => (
                <AccordionItem value={`item-${index}`} key={index}>
                  <AccordionTrigger className="text-lg text-left">{item.question}</AccordionTrigger>
                  <AccordionContent className="text-base text-muted-foreground leading-relaxed">
                    {item.answer}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
};

export default PerguntasFrequentes;