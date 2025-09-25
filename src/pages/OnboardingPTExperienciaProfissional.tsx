import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import CustomSelect from "@/components/ui/CustomSelect";

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
  anosExperiencia: z.string().optional(),
  especializacoes: z.array(z.string()).optional(),
  bio: z.string().optional(),
  cref: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const ANOS_EXPERIENCIA_OPTIONS = [
  { value: 'Menos de 1 ano', label: 'Menos de 1 ano' },
  { value: '1-2 anos', label: '1-2 anos' },
  { value: '3-5 anos', label: '3-5 anos' },
  { value: '5-10 anos', label: '5-10 anos' },
  { value: 'Mais de 10 anos', label: 'Mais de 10 anos' },
];

const ESPECIALIZACOES_OPTIONS = especializacoesOpcoes.map(o => ({ value: o, label: o }));

const OnboardingPTExperienciaProfissional = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [especializacoesSelecionadas, setEspecializacoesSelecionadas] = useState<string[]>([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      especializacoes: especializacoesSelecionadas,
      cref: "",
    }
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('professores')
            .select('anos_experiencia, especializacoes, bio, cref')
            .eq('id', user.id)
            .single();

          if (error) throw error;

          if (data) {
            reset({
              anosExperiencia: data.anos_experiencia || '',
              especializacoes: data.especializacoes || [],
              bio: data.bio || '',
              cref: data.cref || '',
            });
            if (data.especializacoes) {
              setEspecializacoesSelecionadas(data.especializacoes);
            }
          }
        } catch (err) {
          console.error("Erro ao buscar perfil profissional:", err);
          toast.error("Erro ao carregar seus dados.");
        }
      }
    };
    fetchProfile();
  }, [user, reset]);

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
        .from('professores')
        .update({
          anos_experiencia: data.anosExperiencia || null,
          especializacoes: data.especializacoes || [],
          bio: data.bio || null,
          cref: data.cref || null,
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
            <Progress value={50} className="w-full" />
            <p className="text-sm text-text-secondary mt-2">Etapa 1 de 2</p>
          </div>
          <CardTitle className="text-2xl text-text-primary">
            Informações Profissionais
          </CardTitle>
          <p className="text-text-secondary">
            Conte-nos sobre sua experiência profissional
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="anosExperiencia" className="text-text-primary">
                CREF
              </Label>
              <Input
                id="cref"
                placeholder="000000-G/SP"
                {...register("cref")}
                className="border-border focus:ring-primary"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="anosExperiencia" className="text-text-primary">
                Anos de Experiência
              </Label>
              <CustomSelect
                inputId="anosExperiencia"
                value={ANOS_EXPERIENCIA_OPTIONS.find(opt => opt.value === anosExperiencia)}
                onChange={(option) => setValue("anosExperiencia", option ? option.value : '')}
                options={ANOS_EXPERIENCIA_OPTIONS}
                placeholder="Selecione seus anos de experiência (opcional)"
              />
              {errors.anosExperiencia && (
                <p className="text-sm text-destructive">{errors.anosExperiencia.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="text-text-primary">
                Especializações
              </Label>
              <CustomSelect
                inputId="especializacoes"
                value={null}
                onChange={(option) => option && adicionarEspecializacao(option.value)}
                options={ESPECIALIZACOES_OPTIONS.filter(opt => !especializacoesSelecionadas.includes(opt.value))}
                placeholder="Adicionar especialização (opcional)"
              />
              
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
                Biografia Profissional
              </Label>
              <Textarea
                id="bio"
                placeholder="Descreva sua experiência, formação e abordagem profissional... (opcional)"
                {...register("bio")}
                className="border-border focus:ring-primary min-h-32"
              />
              <p className="text-xs text-text-secondary">
                {bio?.length || 0} caracteres
              </p>
              {errors.bio && (
                <p className="text-sm text-destructive">{errors.bio.message}</p>
              )}
            </div>
            
            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
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