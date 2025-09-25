import LandingHeader from "@/components/landing/LandingHeader";
import LandingFooter from "@/components/landing/LandingFooter";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

const features = [
  "Gestão completa de alunos",
  "Criação de rotinas e treinos personalizados",
  "Avaliações físicas detalhadas com fotos",
  "Acompanhamento de progresso e evolução",
  "Comunicação direta com seus alunos",
  "Publicação de conteúdo para a comunidade",
];

const ParaProfessores = () => {
  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <main>
        {/* Hero Section */}
        <section className="py-20 md:py-32 bg-background">
          <div className="container mx-auto px-4 text-center">
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
        </section>

        {/* Features Section */}
        <section className="py-12 md:py-20 bg-muted/40">
          <div className="container mx-auto px-4">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Tudo que você precisa, em um só lugar</h2>
                <p className="mt-4 text-lg text-muted-foreground">
                  Deixe a burocracia de lado e foque no que realmente importa: seus alunos.
                </p>
                <ul className="mt-8 space-y-4">
                  {features.map((feature) => (
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
          </div>
        </section>
      </main>
      <LandingFooter />
    </div>
  );
};

export default ParaProfessores;