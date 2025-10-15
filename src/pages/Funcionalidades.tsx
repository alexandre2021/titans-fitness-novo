import LandingHeader from "@/components/landing/LandingHeader";
import { Button } from "@/components/ui/button";
import LandingFooter from "@/components/landing/LandingFooter";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MonitorSmartphone, Users, Dumbbell, Repeat, BookOpen, Calendar, MessageSquare, BarChart3, CloudOff, LifeBuoy, Workflow, Gift } from "lucide-react";

const featuresProfessor = [
  "Gestão de Alunos: Centralize todos os seus alunos, adicione novos por código de vínculo e acesse perfis detalhados.",
  "Criação de Rotinas Avançadas: Monte treinos completos, com séries simples, combinadas (supersets) e drop sets.",
  "Modelos de Treino Reutilizáveis: Crie e salve templates de rotina para otimizar seu tempo e escalar seu negócio.",
  "Biblioteca de Exercícios: Utilize nossa base de exercícios padrão ou crie até 100 exercícios personalizados com suas próprias mídias (fotos e vídeos).",
  "Avaliações Físicas Completas: Registre medidas corporais e fotos de progresso para uma análise detalhada da evolução do aluno.",
  "Agenda Inteligente: Agende sessões de treino e avaliações, e gerencie os convites de forma simples.",
  "Comunicação Direta: Converse individualmente ou crie grupos de mensagens com seus alunos.",
];

const featuresAluno = [
  "Treino na Palma da Mão: Acesse sua rotina de treino atual a qualquer momento, com todos os detalhes de execução.",
  "Registro de Progresso: Anote suas cargas, repetições e observações a cada série, construindo um histórico valioso.",
  "Acompanhamento Visual: Visualize sua evolução através do histórico de avaliações físicas, incluindo medidas e fotos.",
  "Agenda Integrada: Receba e confirme os agendamentos de sessões e avaliações enviados pelo seu professor.",
  "Comunicação Fácil: Fale diretamente com seu professor pelo chat integrado para tirar dúvidas e receber orientações.",
  "Acesso Offline: Execute e registre seus treinos mesmo sem conexão com a internet.",
];

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
          <img src={imageSrc} alt={imageAlt} className="w-full h-auto object-cover" />
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
      imageSrc="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/mockup-gratuito.png"
      imageAlt="Plataforma Gratuita"
    >
      <p>Acreditamos no seu trabalho. Por isso, nossa plataforma é <strong>100% gratuita para você, professor</strong>. Gerencie alunos, crie treinos, acompanhe a evolução e use todas as nossas ferramentas sem pagar nada. Nosso compromisso é com o seu sucesso.</p>
    </FeatureCard>

    <FeatureCard
      icon={Users}
      title="Alunos Ilimitados, de Verdade"
      imageSrc="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/mockup-alunos.png"
      imageAlt="Tela de Gestão de Alunos"
      reverse
    >
      <p>Gerencie quantos alunos você quiser, sem restrições. Do seu primeiro ao centésimo cliente, nosso plano gratuito oferece gestão completa para toda a sua base. Sem pegadinhas.</p>
    </FeatureCard>

    <FeatureCard
      icon={Dumbbell}
      title="Criação de Rotinas Avançadas"
      imageSrc="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/mockup-rotina.png"
      imageAlt="Tela de Criação de Rotinas"
    >
      <p>Vá além do básico. Monte treinos completos com séries simples, combinadas (supersets) e drop sets. Nossa interface intuitiva permite que você crie programas de treino complexos em minutos.</p>
    </FeatureCard>

    <FeatureCard
      icon={Repeat}
      title="Modelos de Treino Reutilizáveis"
      imageSrc="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/mockup-modelos.png"
      imageAlt="Tela de Modelos de Treino"
      reverse
    >
      <p>Pare de repetir trabalho. Crie e salve templates de rotinas para diferentes objetivos e perfis de alunos. Aplique um modelo a um novo cliente e faça apenas os ajustes necessários, otimizando seu tempo e escalando seu negócio.</p>
    </FeatureCard>

    <FeatureCard
      icon={BookOpen}
      title="Biblioteca de Exercícios Personalizada"
      imageSrc="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/mockup-exercicios.png"
      imageAlt="Tela da Biblioteca de Exercícios"
    >
      <p>Utilize nossa vasta base de exercícios ou crie até 100 exercícios personalizados com suas próprias mídias. Faça upload de fotos e vídeos para garantir a execução perfeita por parte dos seus alunos.</p>
    </FeatureCard>

    <FeatureCard
      icon={BarChart3}
      title="Avaliações Físicas Completas"
      imageSrc="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/mockup-avaliacoes.png"
      imageAlt="Tela de Avaliações Físicas"
      reverse
    >
      <p>Registre medidas corporais e fotos de progresso para uma análise detalhada da evolução do aluno. Identifique desequilíbrios e ajuste o plano de treino com base em dados concretos.</p>
    </FeatureCard>

    <FeatureCard
      icon={Calendar}
      title="Agenda Inteligente"
      imageSrc="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/mockup-agenda.png"
      imageAlt="Tela da Agenda"
    >
      <p>Agende sessões de treino e avaliações de forma simples e rápida. Seus alunos recebem notificações para confirmar ou recusar, mantendo sua agenda sempre organizada e otimizada.</p>
    </FeatureCard>

    <FeatureCard
      icon={MessageSquare}
      title="Comunicação Direta"
      imageSrc="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/mockup-chat.png"
      imageAlt="Tela de Chat"
      reverse
    >
      <p>Converse individualmente ou crie grupos de mensagens com seus alunos. Tire dúvidas, envie motivação e mantenha um canal de comunicação aberto e eficiente, tudo dentro da plataforma.</p>
    </FeatureCard>

    <FeatureCard
      icon={MonitorSmartphone}
      title="Plataforma Completa: Web e Mobile"
      imageSrc="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/mockup-multiplataforma.png"
      imageAlt="Aplicativo no desktop e no celular"
    >
      <p>Gerencie seus alunos e crie treinos complexos com a agilidade do desktop. Seus alunos treinam com um aplicativo moderno e prático no celular, que funciona até offline.</p>
    </FeatureCard>

    <FeatureCard
      icon={LifeBuoy}
      title="Central de Ajuda Completa"
      imageSrc="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/mockup-ajuda.png"
      imageAlt="Tela da Central de Ajuda"
      reverse
    >
      <p>Encontre respostas para suas dúvidas rapidamente. Nossa base de conhecimento completa está organizada para que você encontre tutoriais e guias sobre todas as funcionalidades da plataforma, permitindo que você foque no que mais importa: seus alunos.</p>
    </FeatureCard>

    <FeatureCard
      icon={Workflow}
      title="Flexível para seu Modelo de Trabalho"
      imageSrc="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/mockup-modo-assistido.png"
      imageAlt="Modo de execução assistido e independente"
    >
      <p>A ferramenta se adapta a você. Use o <strong>Modo Assistido</strong> para acompanhar e registrar o treino do aluno em tempo real, ideal para sessões de personal. Ou deixe que o aluno treine no <strong>Modo Independente</strong> e analise os dados depois, perfeito para consultorias online e professores de academia.</p>
    </FeatureCard>
  </div>
);

const AlunoFeaturesSection = () => (
  <div className="space-y-24">
    <FeatureCard
      icon={Dumbbell}
      title="Seu Treino na Palma da Mão"
      imageSrc="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/mockup-execucao.png"
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

    <FeatureCard
      icon={Calendar}
      title="Agenda Integrada"
      imageSrc="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/mockup-agenda-aluno.png"
      imageAlt="Tela da Agenda do Aluno"
      reverse
    >
      <p>Receba e confirme os agendamentos de sessões e avaliações enviados pelo seu professor. Tenha uma visão clara dos seus compromissos e nunca mais perca um treino agendado.</p>
    </FeatureCard>

    <FeatureCard
      icon={MessageSquare}
      title="Comunicação Fácil"
      imageSrc="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/mockup-chat-aluno.png"
      imageAlt="Tela de Chat do Aluno"
    >
      <p>Fale diretamente com seu professor pelo chat integrado. Tire dúvidas sobre exercícios, peça orientações e receba o suporte que precisa para evoluir com segurança.</p>
    </FeatureCard>

    <FeatureCard
      icon={MonitorSmartphone}
      title="Acesso em Qualquer Dispositivo"
      imageSrc="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/mockup-multiplataforma-aluno.png"
      imageAlt="Aplicativo no celular e tablet"
      reverse
    >
      <p>Acesse seus treinos, histórico e converse com seu professor no celular, tablet ou computador. Nossa plataforma se adapta a qualquer tela para você nunca perder o foco.</p>
    </FeatureCard>

    <FeatureCard
      icon={LifeBuoy}
      title="Suporte e Central de Ajuda"
      imageSrc="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/mockup-ajuda.png"
      imageAlt="Tela da Central de Ajuda para Alunos"
    >
      <p>Dúvidas sobre o aplicativo ou seu treino? Nossa Central de Ajuda oferece respostas rápidas e precisas para as perguntas mais comuns, para que você nunca fique sem suporte.</p>
    </FeatureCard>
  </div>
);

const Funcionalidades = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4 max-w-4xl">
            <Tabs defaultValue="professores" className="w-full">
              <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto h-12">
                <TabsTrigger value="professores" className="text-base">Para Professores</TabsTrigger>
                <TabsTrigger value="alunos" className="text-base">Para Alunos</TabsTrigger>
              </TabsList>

              {/* Aba Professores */}
              <TabsContent value="professores" className="mt-10">
                <div className="text-center">
                  <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter">
                    Eleve seu negócio como <span className="text-primary">Professor(a)</span>
                  </h1>
                  <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                    Gerencie seus alunos com ferramentas de ponta, otimize seu tempo e entregue resultados extraordinários.
                  </p>
                  <div className="mt-10">
                    <Link to="/cadastro/professor">
                      <Button size="lg" className="w-full sm:w-auto">Comece a usar gratuitamente</Button>
                    </Link>
                  </div>
                </div>
                <div className="mt-20"><ProfessorFeaturesSection /></div>
              </TabsContent>

              {/* Aba Alunos */}
              <TabsContent value="alunos" className="mt-10">
                <div className="text-center">
                  <h1 className="text-4xl md:text-6xl font-extrabold tracking-tighter">
                    Seu treino, sua evolução, <span className="text-primary">na palma da mão</span>
                  </h1>
                  <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                    Tenha o acompanhamento do seu professor e todas as ferramentas para atingir seus objetivos.
                  </p>
                  <div className="mt-10">
                    <Link to="/cadastro/aluno">
                      <Button size="lg" className="w-full sm:w-auto">Crie sua conta de aluno</Button>
                    </Link>
                  </div>
                </div>
                <div className="mt-20"><AlunoFeaturesSection /></div>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
};

export default Funcionalidades;