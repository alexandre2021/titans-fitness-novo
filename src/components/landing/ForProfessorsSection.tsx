import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle } from "lucide-react";

const features = [
  "Gestão completa de alunos",
  "Criação de rotinas e treinos personalizados",
  "Avaliações físicas detalhadas",
  "Acompanhamento de progresso",
];

const ForProfessorsSection = () => {
  return (
    <section className="py-12 md:py-20 bg-background">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">Ferramentas poderosas para o seu negócio</h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Otimize seu tempo e entregue resultados incríveis para seus alunos com um sistema pensado para você.
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
            {/* Mockup visual da interface do app */}
            <Card className="w-full max-w-md shadow-2xl bg-card">
              <CardHeader><CardTitle>Dashboard do Aluno</CardTitle></CardHeader>
              <CardContent><img src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/mockup-dashboard.png" alt="Dashboard Mockup" className="rounded-lg" /></CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ForProfessorsSection;