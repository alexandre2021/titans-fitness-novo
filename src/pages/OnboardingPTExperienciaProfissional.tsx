import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const especializacoesOpcoes = [
  "Musculação e Hipertrofia",
  "Condicionamento Físico Geral",
  "Emagrecimento",
  "Funcional",
  "Crossfit",
  "Pilates",
  "Yoga",
  "Corrida",
  "Natação",
  "Artes Marciais",
  "Reabilitação",
  "Terceira Idade"
];

const formSchema = z.object({
  anosExperiencia: z.string().min(1, "Selecione os anos de experiência"),
  especializacoes: z.array(z.string()).min(1, "Selecione pelo menos uma especialização"),
  bio: z.string().min(50, "A biografia deve ter pelo menos 50 caracteres"),
});

type FormData = z.infer<typeof formSchema>;

const OnboardingPTExperienciaProfissional = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [especializacoesSelecionadas, setEspecializacoesSelecionadas] = useState<string[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      especializacoes: especializacoesSelecionadas,
    }
  });

  const anosExperiencia = watch("anosExperiencia");
  const bio = watch("bio");

  const adicionarEspecializacao = (especializacao: string) => {
    if (!especializacoesSelecionadas.includes(especializacao)) {
      const novasEspecializacoes = [...especializacoesSelecionadas, especializacao];
      setEspecializacoesSelecionadas(novasEspecializacoes);
      setValue("especializacoes", novasEspecializacoes);
    }
  };

  const removerEspecializacao = (especializacao: string) => {
    const novasEspecializacoes = especializacoesSelecionadas.filter(e => e !== especializacao);
    setEspecializacoesSelecionadas(novasEspecializacoes);
    setValue("especializacoes", novasEspecializacoes);
  };

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('personal_trainers')
        .update({
          anos_experiencia: data.anosExperiencia,
          especializacoes: data.especializacoes,
          bio: data.bio,
        })
        .eq('id', user.id);

      if (error) {
        toast.error(`Erro ao salvar dados: ${error.message}`);
        return;
      }

      navigate("/onboarding-pt/redes-sociais");
    } catch (error) {
      toast.error("Erro inesperado");
      console.error("Erro:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <Card className="w-full max-w-2xl border-border">
        <CardHeader className="text-center">
          <div className="mb-4">
            <Progress value={66} className="w-full" />
            <p className="text-sm text-text-secondary mt-2">Etapa 2 de 3</p>
          </div>
          <CardTitle className="text-2xl text-text-primary">
            Experiência Profissional
          </CardTitle>
          <p className="text-text-secondary">
            Conte-nos sobre sua experiência e especializações
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="anosExperiencia" className="text-text-primary">
                Anos de Experiência *
              </Label>
              <Select onValueChange={(value) => setValue("anosExperiencia", value)} value={anosExperiencia}>
                <SelectTrigger className="border-border">
                  <SelectValue placeholder="Selecione seus anos de experiência" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Menos de 1 ano">Menos de 1 ano</SelectItem>
                  <SelectItem value="1-2 anos">1-2 anos</SelectItem>
                  <SelectItem value="3-5 anos">3-5 anos</SelectItem>
                  <SelectItem value="5-10 anos">5-10 anos</SelectItem>
                  <SelectItem value="Mais de 10 anos">Mais de 10 anos</SelectItem>
                </SelectContent>
              </Select>
              {errors.anosExperiencia && (
                <p className="text-sm text-destructive">{errors.anosExperiencia.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="text-text-primary">
                Especializações * (selecione pelo menos uma)
              </Label>
              <Select onValueChange={adicionarEspecializacao}>
                <SelectTrigger className="border-border">
                  <SelectValue placeholder="Adicionar especialização" />
                </SelectTrigger>
                <SelectContent>
                  {especializacoesOpcoes.map((opcao) => (
                    <SelectItem 
                      key={opcao} 
                      value={opcao}
                      disabled={especializacoesSelecionadas.includes(opcao)}
                    >
                      {opcao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {especializacoesSelecionadas.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {especializacoesSelecionadas.map((especializacao) => (
                    <Badge 
                      key={especializacao} 
                      variant="secondary" 
                      className="flex items-center gap-1"
                    >
                      {especializacao}
                      <X 
                        size={14} 
                        className="cursor-pointer hover:text-destructive" 
                        onClick={() => removerEspecializacao(especializacao)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
              
              {errors.especializacoes && (
                <p className="text-sm text-destructive">{errors.especializacoes.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="bio" className="text-text-primary">
                Biografia Profissional * (mínimo 50 caracteres)
              </Label>
              <Textarea
                id="bio"
                placeholder="Descreva sua experiência, formação e abordagem profissional..."
                {...register("bio")}
                className="border-border focus:ring-primary min-h-32"
              />
              <p className="text-xs text-text-secondary">
                {bio?.length || 0} / 50 caracteres mínimos
              </p>
              {errors.bio && (
                <p className="text-sm text-destructive">{errors.bio.message}</p>
              )}
            </div>
            
            <div className="flex gap-4 pt-4">
              <Button 
                type="button"
                variant="outline"
                onClick={() => navigate("/onboarding-pt/informacoes-basicas")}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? "Salvando..." : "Continuar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingPTExperienciaProfissional;