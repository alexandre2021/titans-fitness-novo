import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PhoneInput } from "@/components/ui/phone-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const formSchema = z.object({
  nomeCompleto: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  genero: z.string().optional(),
  dataNascimento: z.string().optional(),
  telefone: z.string().optional(),
  cref: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const OnboardingPTInformacoesBasicas = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

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
      telefone: "",
      cref: "",
    },
  });

  const hoje = new Date().toISOString().split("T")[0]; // Formato YYYY-MM-DD

  useEffect(() => {
    const fetchProfile = async () => {
      if (user) {
        try {
          const { data, error } = await supabase
            .from('personal_trainers')
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
              telefone: data.telefone || "",
              cref: data.cref || "",
            });
          }
        } catch (err) {
          console.error("Erro inesperado ao buscar perfil:", err);
        }
      }
    };

    fetchProfile();
  }, [user, reset]);

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('personal_trainers')
        .update({
          nome_completo: data.nomeCompleto,
          genero: data.genero || null,
          data_nascimento: data.dataNascimento || null,
          telefone: data.telefone || null,
          cref: data.cref || null,
        })
        .eq('id', user.id);

      if (error) {
        toast.error(`Erro ao salvar dados: ${error.message}`);
        return;
      }

      navigate("/onboarding-pt/experiencia-profissional");
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
            <Progress value={33} className="w-full" />
            <p className="text-sm text-text-secondary mt-2">Etapa 1 de 3</p>
          </div>
          <CardTitle className="text-2xl text-text-primary">
            Informações Básicas
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
                Gênero
              </Label>
              <Controller
                name="genero"
                control={control}
                render={({ field }) => (
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      clearErrors("genero");
                    }} 
                    value={field.value}
                  >
                    <SelectTrigger className="border-border">
                      <SelectValue placeholder="Selecione seu gênero" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Feminino">Feminino</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                      <SelectItem value="Prefiro não informar">Prefiro não informar</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.genero && (
                <p className="text-sm text-destructive">{errors.genero.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="dataNascimento" className="text-text-primary">
                Data de Nascimento
              </Label>
              <Input
                id="dataNascimento"
                type="date"
                max={hoje}
                {...register("dataNascimento")}
                className="border-border focus:ring-primary"
              />
              {errors.dataNascimento && (
                <p className="text-sm text-destructive">{errors.dataNascimento.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="telefone" className="text-text-primary">
                Telefone
              </Label>
              <Controller
                name="telefone"
                control={control}
                render={({ field }) => (
                  <PhoneInput
                    id="telefone"
                    value={field.value}
                    onChange={field.onChange}
                    className="border-border focus:ring-primary"
                  />
                )}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="cref" className="text-text-primary">
                CREF
              </Label>
              <Input
                id="cref"
                placeholder="000000-G/SP"
                {...register("cref")}
                className="border-border focus:ring-primary"
              />
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

export default OnboardingPTInformacoesBasicas;