import LandingHeader from "@/components/landing/LandingHeader";
import LandingFooter from "@/components/landing/LandingFooter";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const featuresProfessor = [
  "Gestão completa de alunos",
  "Criação de rotinas e treinos personalizados",
  "Avaliações físicas detalhadas com fotos",
  "Acompanhamento de progresso e evolução",
  "Comunicação direta com seus alunos",
  "Publicação de conteúdo para a comunidade",
];

const featuresAluno = [
  "Acesse seus treinos na palma da mão",
  "Registre suas cargas e repetições a cada série",
  "Visualize sua evolução com gráficos e fotos",
  "Comunicação fácil e direta com seu professor",
  "Acesso a uma comunidade de conhecimento",
];

const Aplicativo = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4">
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
                <div className="grid md:grid-cols-2 gap-12 items-center mt-20">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Tudo que você precisa, em um só lugar</h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                      Deixe a burocracia de lado e foque no que realmente importa: seus alunos.
                    </p>
                    <ul className="mt-8 space-y-4">
                      {featuresProfessor.map((feature) => (
                        <li key={feature} className="flex items-center gap-3">
                          <CheckCircle className="h-6 w-6 text-primary" />
                          <span className="text-lg">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex items-center justify-center">
                    <Card className="w-full max-w-md shadow-2xl bg-card">
                      <CardHeader><CardTitle>Dashboard do Aluno</CardTitle></CardHeader>
                      <CardContent><img src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/mockup-dashboard.png" alt="Dashboard Mockup" className="rounded-lg" /></CardContent>
                    </Card>
                  </div>
                </div>
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
                <div className="grid md:grid-cols-2 gap-12 items-center mt-20">
                  <div>
                    <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Foco total nos seus resultados</h2>
                    <p className="mt-4 text-lg text-muted-foreground">
                      Com nosso aplicativo, você tem a melhor experiência de treino e acompanhamento.
                    </p>
                    <ul className="mt-8 space-y-4">
                      {featuresAluno.map((feature) => (
                        <li key={feature} className="flex items-center gap-3">
                          <CheckCircle className="h-6 w-6 text-primary" />
                          <span className="text-lg">{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex items-center justify-center">
                    <Card className="w-full max-w-md shadow-2xl bg-card">
                      <CardHeader><CardTitle>Execução do Treino</CardTitle></CardHeader>
                      <CardContent><img src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/mockup-execucao.png" alt="Execução Mockup" className="rounded-lg" /></CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
};

export default Aplicativo;