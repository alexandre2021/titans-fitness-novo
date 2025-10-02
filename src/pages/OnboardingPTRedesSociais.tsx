import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Instagram, Facebook, Linkedin, Globe } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const formSchema = z.object({
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  linkedin: z.string().optional(),
  website: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const OnboardingPTRedesSociais = () => {
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(formSchema),
  });

  const onSubmit = async (data: FormData) => {
    if (!user) return;
    
    setIsLoading(true);
    
    try {
      const { error } = await supabase
        .from('professores')
        .update({
          instagram: data.instagram || null,
          facebook: data.facebook || null,
          linkedin: data.linkedin || null,
          website: data.website || null,
          onboarding_completo: true,
        })
        .eq('id', user.id);

      if (error) {
        toast.error(`Erro ao salvar dados: ${error.message}`);
        return;
      }

      navigate("/index-professor");
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
            <Progress value={100} className="w-full" />
            <p className="text-sm text-text-secondary mt-2">Etapa 2 de 2</p>
          </div>
          <CardTitle className="text-2xl text-text-primary">
            Redes Sociais
          </CardTitle>
          <p className="text-text-secondary">
            Adicione suas redes sociais para que seus alunos possam te encontrar (opcional)
          </p>
        </CardHeader>
        
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="instagram" className="text-text-primary flex items-center gap-2">
                <Instagram size={16} />
                Instagram
              </Label>
              <Input
                id="instagram"
                placeholder="@seuusuario ou link completo"
                {...register("instagram")}
                className="border-border focus:ring-primary"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="facebook" className="text-text-primary flex items-center gap-2">
                <Facebook size={16} />
                Facebook
              </Label>
              <Input
                id="facebook"
                placeholder="Link do seu perfil do Facebook"
                {...register("facebook")}
                className="border-border focus:ring-primary"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="linkedin" className="text-text-primary flex items-center gap-2">
                <Linkedin size={16} />
                LinkedIn
              </Label>
              <Input
                id="linkedin"
                placeholder="Link do seu perfil do LinkedIn"
                {...register("linkedin")}
                className="border-border focus:ring-primary"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="website" className="text-text-primary flex items-center gap-2">
                <Globe size={16} />
                Website
              </Label>
              <Input
                id="website"
                placeholder="Seu site pessoal ou profissional"
                {...register("website")}
                className="border-border focus:ring-primary"
              />
            </div>
            
            <div className="flex gap-4 pt-6">
              <Button 
                type="button"
                variant="outline"
                onClick={() => navigate("/onboarding-pt/experiencia-profissional")}
                className="flex-1"
              >
                Voltar
              </Button>
              <Button 
                type="submit" 
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                disabled={isLoading}
              >
                {isLoading ? "Finalizando..." : "Finalizar Cadastro"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default OnboardingPTRedesSociais;