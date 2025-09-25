import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DatePicker } from "@/components/ui/date-picker";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import OnboardingContinuarModal from "@/components/OnboardingContinuarModal";
import CustomSelect from "@/components/ui/CustomSelect";

const formSchema = z.object({
  nomeCompleto: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  genero: z.string().min(1, "Gênero é obrigatório"),
  dataNascimento: z.string().min(1, "Data de nascimento é obrigatória"),
});

type FormData = z.infer<typeof formSchema>;

const GENERO_OPTIONS = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'feminino', label: 'Feminino' },
  { value: 'outro', label: 'Outro' },
  { value: 'prefiro_nao_dizer', label: 'Prefiro não dizer' },
];

const OnboardingPTInformacoesBasicas = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const [showContinuarModal, setShowContinuarModal] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
    control,
    clearErrors,
    reset,
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nomeCompleto: "",
      genero: "",
      dataNascimento: "",
    },
  });

  const hoje = new Date().toISOString().split("T")[0]; // Formato YYYY-MM-DD

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('professores')
            .select('*')
            .eq('id', user.id)
            .single();

          if (error) {
            console.error("Erro ao buscar perfil:", error);
            return;
          }

          if (data) {
            reset({
              nomeCompleto: data.nome_completo || "",
              genero: data.genero || "",
              dataNascimento: data.data_nascimento || "",
            });
          }
        } catch (err) {
          console.error("Erro inesperado ao buscar perfil:", err);
        }
      }
    };

    fetchProfile();
  }, [user, reset]);

  const generateAvatar = (nome: string) => {
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#84CC16'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    const letter = nome?.charAt(0).toUpperCase() || 'P';
    
    return {
      avatar_type: 'letter',
      avatar_letter: letter,
      avatar_color: randomColor
    };
  };

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const avatarData = generateAvatar(data.nomeCompleto);

      const { error } = await supabase
        .from('professores')
        .update({
          nome_completo: data.nomeCompleto,
          genero: data.genero || null,
          data_nascimento: data.dataNascimento || null,
          ...avatarData
        })
        .eq('id', user.id);

      if (error) {
        toast.error(`Erro ao salvar dados: ${error.message}`);
        return;
      }
      
      // Em vez de navegar, abre o modal
      setShowContinuarModal(true);

    } catch (error) {
      toast.error("Erro inesperado");
      console.error("Erro:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleModalResponse = async (continuar: boolean) => {
    setShowContinuarModal(false);
    if (continuar) {
      navigate("/onboarding-pt/experiencia-profissional");
    } else {
      // Finaliza o onboarding aqui se o usuário escolher não continuar
      setIsLoading(true);
      try {
        const { error } = await supabase
          .from('professores')
          .update({ onboarding_completo: true })
          .eq('id', user?.id);

        if (error) throw error;

        toast.success("Perfil básico salvo!", { description: "Você pode completar o restante depois."});
        navigate("/index-professor");
      } catch (error) {
        toast.error("Erro ao finalizar", { description: "Não foi possível finalizar seu onboarding."});
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6 py-12">
      <Card className="w-full max-w-2xl border-border">
        <CardHeader className="text-center pt-10">
          <CardTitle className="text-2xl text-text-primary">
            Bem-vindo(a) ao Titans!
          </CardTitle>
          <p className="text-text-secondary">
            Vamos começar coletando suas informações pessoais
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nomeCompleto" className="text-text-primary">
                Nome Completo *
              </Label>
              <Input
                id="nomeCompleto"
                {...register("nomeCompleto")}
                className="border-border focus:ring-primary"
              />
              {errors.nomeCompleto && (
                <p className="text-sm text-destructive">{errors.nomeCompleto.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="genero" className="text-text-primary">
                Gênero *
              </Label>
              <Controller
                name="genero"
                control={control}
                render={({ field }) => (
                  <CustomSelect
                    inputId="genero"
                    value={GENERO_OPTIONS.find(opt => opt.value === field.value)}
                    onChange={(option) => {
                      field.onChange(option ? option.value : '');
                      clearErrors("genero");
                    }}
                    options={GENERO_OPTIONS}
                    placeholder="Selecione seu gênero"
                  />
                )}
              />
              {errors.genero && (
                <p className="text-sm text-destructive">{errors.genero.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dataNascimento" className="text-text-primary">
                Data de Nascimento *
              </Label>
              <Controller
                name="dataNascimento"
                control={control}
                render={({ field }) => (
                  <DatePicker
                    value={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              {errors.dataNascimento && (
                <p className="text-sm text-destructive">{errors.dataNascimento.message}</p>
              )}
            </div>
            
            <div className="pt-4">
              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <OnboardingContinuarModal
        open={showContinuarModal}
        onOpenChange={setShowContinuarModal}
        onResponse={handleModalResponse}
        isLoading={isLoading}
        title="Continuar Configuração?"
        description="Deseja adicionar suas informações profissionais e redes sociais agora para um perfil mais completo?"
        confirmText="Sim, continuar"
        cancelText="Não, ir para o início"
      />
    </div>
  );
};

export default OnboardingPTInformacoesBasicas;