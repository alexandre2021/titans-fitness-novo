import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MonitorSmartphone, Users, Dumbbell, Repeat, BookOpen, Calendar, MessageSquare, BarChart3, CloudOff, LifeBuoy, Workflow, Gift } from "lucide-react";
import exerciciosImg from "@/assets/exercicios.png";
import LandingHeader from "@/components/landing/LandingHeader";
import indexProfessorImg from "@/assets/index_professor.png";
import avaliacaoImg from "@/assets/avaliacao.png";
import alunosImg from "@/assets/alunos.png";
import rotinaImg from "@/assets/rotina.png";
import modeloRotinaImg from "@/assets/modelo_rotina.png";
import mobileImg from "@/assets/mobile.png";
import LandingFooter from "@/components/landing/LandingFooter";
const Landing = () => {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <LandingHeader />
      <main>
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-background">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter">
              Sua jornada fitness, <span className="text-primary">potencializada</span>.
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              A plataforma completa para Professores e Alunos que buscam resultados reais. Gerencie treinos, acompanhe o progresso e conecte-se de forma inteligente.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row justify-center items-center gap-4">
              <Link to="/cadastro/professor">
                <Button size="lg" className="w-full sm:w-auto">Sou Professor(a)</Button>
              </Link>
              <Link to="/cadastro/aluno">
                <Button size="lg" variant="outline" className="w-full sm:w-auto">Sou Aluno(a)</Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Funcionalidades Section - Empilhadas */}
        <section id="funcionalidades-professor" className="py-12 md:py-20 bg-muted/40">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter">
                Eleve seu negócio como <span className="text-primary">Professor(a)</span>
              </h2>
              <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                Gerencie seus alunos com ferramentas de ponta, otimize seu tempo e entregue resultados extraordinários.
              </p>
            </div>
            <div className="mt-20 max-w-5xl mx-auto">
              <ProfessorFeaturesSection />
            </div>
          </div>
        </section>

        <section id="funcionalidades-aluno" className="py-12 md:py-20 bg-background">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <h2 className="text-4xl md:text-5xl font-extrabold tracking-tighter">
                Para você, <span className="text-primary">Aluno(a)</span>
              </h2>
              <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                Sua evolução na palma da mão. Tenha o acompanhamento do seu professor e todas as ferramentas para atingir seus objetivos.
              </p>
            </div>
            <div className="mt-20 max-w-5xl mx-auto">
              <AlunoFeaturesSection />
            </div>
          </div>
        </section>

      </main>
      <LandingFooter />
    </div>
  );
};

const FeatureCard = ({ icon: Icon, title, children, imageSrc, imageAlt, reverse = false }: { icon: React.ElementType, title: string, children: React.ReactNode, imageSrc: string, imageAlt: string, reverse?: boolean }) => (
  <div className={`grid md:grid-cols-2 gap-12 items-center ${reverse ? 'md:grid-flow-col-dense' : ''}`}>
    <div className={reverse ? 'md:col-start-2' : ''}>
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
          <Icon className="w-6 h-6 text-primary" />
        </div>
        <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
      </div>
      <div className="text-lg text-muted-foreground space-y-4">
        {children}
      </div>
    </div>
    <div className={`flex items-center justify-center ${reverse ? 'md:col-start-1' : ''}`}>
      <Card className="w-full max-w-lg shadow-xl bg-card overflow-hidden">
        <CardContent className="p-0">
          <img src={imageSrc} alt={imageAlt} className="mx-auto h-auto object-contain" />
        </CardContent>
      </Card>
    </div>
  </div>
);

const ProfessorFeaturesSection = () => (
  <div className="space-y-24">
    <FeatureCard
      icon={Gift}
      title="Custo Zero, Valor Infinito"
      imageSrc={indexProfessorImg}
      imageAlt="Plataforma Gratuita"
    >
      <p>Acreditamos no seu trabalho. Por isso, nossa plataforma é <strong>100% gratuita para você, professor</strong>. Gerencie alunos, crie treinos, acompanhe a evolução e use todas as nossas ferramentas sem pagar nada. Nosso compromisso é com o seu sucesso.</p>
    </FeatureCard>

    <FeatureCard
      icon={Users}
      title="Alunos Ilimitados, de Verdade"
      imageSrc={alunosImg}
      imageAlt="Tela de Gestão de Alunos"
      reverse
    >
      <p>Gerencie quantos alunos você quiser, sem restrições. Do seu primeiro ao último aluno, nosso plano gratuito oferece gestão completa para toda a sua base. Sem pegadinhas.</p>
    </FeatureCard>

    <FeatureCard
      icon={BookOpen}
      title="Biblioteca de Exercícios Personalizada"
      imageSrc={exerciciosImg}
      imageAlt="Tela da Biblioteca de Exercícios"
    >
      <p>Utilize nossa vasta base de exercícios ou crie até 100 exercícios personalizados com suas próprias mídias. Faça upload de fotos e vídeos para garantir a execução perfeita por parte dos seus alunos.</p>
    </FeatureCard>

    <FeatureCard
      icon={Repeat}
      title="Modelos de Treino Reutilizáveis"
      imageSrc={modeloRotinaImg}
      imageAlt="Tela de Modelos de Treino"
      reverse
    >
      <p>Pare de repetir trabalho. Crie e salve templates de rotinas para diferentes objetivos e perfis de alunos. Aplique um modelo a um novo cliente e faça apenas os ajustes necessários, otimizando seu tempo e escalando seu negócio.</p>
    </FeatureCard>

    <FeatureCard
      icon={Dumbbell}
      title="Criação de Rotinas Avançadas"
      imageSrc={rotinaImg}
      imageAlt="Tela de Criação de Rotinas"
    >
      <p>Vá além do básico. Monte treinos completos com séries simples, combinadas (supersets) e drop sets. Nossa interface intuitiva permite que você crie programas de treino complexos em minutos.</p>
    </FeatureCard>

    <FeatureCard
      icon={BarChart3}
      title="Avaliações Físicas Completas"
      imageSrc={avaliacaoImg}
      imageAlt="Tela de Avaliações Físicas"
      reverse
    >
      <p>Registre medidas corporais e fotos de progresso para uma análise detalhada da evolução do aluno. Identifique desequilíbrios e ajuste o plano de treino com base em dados concretos.</p>
    </FeatureCard>
  </div>
);

const AlunoFeaturesSection = () => (
  <div className="space-y-24">
    <FeatureCard
      icon={Dumbbell}
      title="Seu Treino na Palma da Mão"
      imageSrc={mobileImg}
      imageAlt="Tela de Execução de Treino do Aluno"
    >
      <p>Acesse sua rotina de treino atual a qualquer momento, com todos os detalhes de execução, séries, repetições e vídeos demonstrativos. Registre suas cargas e observações a cada série para construir um histórico valioso.</p>
    </FeatureCard>

    <FeatureCard
      icon={BarChart3}
      title="Acompanhamento Visual da Evolução"
      imageSrc="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/mockup-avaliacoes.png"
      imageAlt="Tela de Avaliações Físicas do Aluno"
      reverse
    >
      <p>Visualize seu progresso de forma clara e motivadora. Acompanhe a evolução do seu peso, medidas corporais e veja a comparação das suas fotos de antes e depois, tudo em um só lugar.</p>
    </FeatureCard>

    <FeatureCard
      icon={CloudOff}
      title="Treine em Qualquer Lugar, a Qualquer Hora"
      imageSrc="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/mockup-offline.png"
      imageAlt="Mockup de Acesso Offline"
    >
      <p>Não deixe que a falta de internet atrapalhe seu treino. Nosso aplicativo funciona offline, permitindo que você acesse e registre seus treinos mesmo em academias com sinal ruim. Seus dados são sincronizados automaticamente assim que você se reconectar.</p>
    </FeatureCard>
  </div>
);

export default Landing;