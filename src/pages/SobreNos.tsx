import LandingHeader from "@/components/landing/LandingHeader";
import LandingFooter from "@/components/landing/LandingFooter";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Heart, Target, Code } from "lucide-react";

const SobreNos = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        <section className="py-12 md:py-20 bg-muted/20">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter">
                A força por trás do seu treino
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Nossa jornada é sobre empoderar você, profissional de educação física.
              </p>
            </div>

            <div className="prose prose-lg max-w-none mx-auto text-foreground">
              <p>
                O Titans Fitness nasceu de uma pergunta simples: <strong>como a tecnologia pode, de fato, servir ao profissional de educação física?</strong>
              </p>
              <p className="mt-4">
                Eu sou Alexandre Ramos, o fundador e desenvolvedor por trás desta plataforma. Com uma mente cheia de ideias e uma paixão por criar soluções que realmente fazem a diferença, mergulhei no universo de personal trainers e professores para entender suas dores, desafios e, acima de tudo, suas aspirações.
              </p>

              <div className="my-12 grid md:grid-cols-3 gap-8 text-center">
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Target className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-xl mb-2">Nossa Missão</h3>
                  <p className="text-base text-muted-foreground">Simplificar a gestão e potencializar o seu talento, para que você foque no que mais importa: seus alunos.</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Code className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-xl mb-2">Construído com Paixão</h3>
                  <p className="text-base text-muted-foreground">Cada linha de código é pensada para resolver problemas reais, com agilidade e sem burocracia corporativa.</p>
                </div>
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                    <Heart className="w-7 h-7 text-primary" />
                  </div>
                  <h3 className="font-semibold text-xl mb-2">Nosso Compromisso</h3>
                  <p className="text-base text-muted-foreground">Oferecer uma ferramenta poderosa, intuitiva e acessível, que evolui junto com as suas necessidades.</p>
                </div>
              </div>

              <p>
                Por ser uma iniciativa solo, tenho a liberdade de construir uma ferramenta que não responde a investidores, mas sim a você. A plataforma é um reflexo do meu compromisso em criar algo que eu mesmo, como usuário, adoraria usar: <strong>intuitivo, poderoso e sem complicações.</strong>
              </p>
              <p className="mt-4">
                O Titans Fitness é mais do que um aplicativo; é um parceiro digital na sua jornada profissional. Esta é apenas o começo, e eu convido você a fazer parte desta evolução.
              </p>

              <div className="mt-12 text-center">
                <Link to="/cadastro">
                  <Button size="lg">Junte-se a nós</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
};

export default SobreNos;
