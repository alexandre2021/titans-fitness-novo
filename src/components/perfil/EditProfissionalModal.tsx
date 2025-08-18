// src/components/perfil/EditProfissionalModal.tsx

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { X } from "lucide-react";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  cref: z.string().optional(),
  anos_experiencia: z.string().optional(),
  bio: z.string().optional(),
});

const ESPECIALIZACOES_OPTIONS = [
  "Musculação",
  "Funcional",
  "Crossfit",
  "Pilates",
  "Yoga",
  "Natação",
  "Corrida",
  "Ciclismo",
  "Boxe",
  "Muay Thai",
  "Fisioterapia",
  "Reabilitação",
  "Emagrecimento",
  "Hipertrofia",
  "Idosos",
  "Gestantes",
  "Crianças"
];

interface ProfileData {
  cref?: string;
  anos_experiencia?: string;
  bio?: string;
  especializacoes?: string[];
}

interface EditProfissionalModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  profile: ProfileData | null;
  onSave: () => void;
}

export const EditProfissionalModal = ({ open, onOpenChange, profile, onSave }: EditProfissionalModalProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [especializacoes, setEspecializacoes] = useState<string[]>([]);
  const [novaEspecializacao, setNovaEspecializacao] = useState("");
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cref: "",
      anos_experiencia: "",
      bio: "",
    },
  });

  useEffect(() => {
    if (profile && open) {
      form.reset({
        cref: profile.cref || "",
        anos_experiencia: profile.anos_experiencia || "",
        bio: profile.bio || "",
      });
      setEspecializacoes(profile.especializacoes || []);
    }
  }, [profile, open, form]);

  const adicionarEspecializacao = () => {
    if (novaEspecializacao && !especializacoes.includes(novaEspecializacao)) {
      setEspecializacoes([...especializacoes, novaEspecializacao]);
      setNovaEspecializacao("");
    }
  };

  const removerEspecializacao = (esp: string) => {
    setEspecializacoes(especializacoes.filter(e => e !== esp));
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('personal_trainers')
        .update({
          cref: values.cref || null,
          anos_experiencia: values.anos_experiencia || null,
          bio: values.bio || null,
          especializacoes: especializacoes.length > 0 ? especializacoes : null,
        })
        .eq('id', user.data.user.id);

      if (error) throw error;

      toast({
        title: "Perfil atualizado",
        description: "Suas informações profissionais foram atualizadas com sucesso.",
      });

      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar perfil. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="cref"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CREF</FormLabel>
              <FormControl>
                <Input placeholder="000000-G/SP" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="anos_experiencia"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Anos de Experiência</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="menos_1">Menos de 1 ano</SelectItem>
                  <SelectItem value="1_2">1-2 anos</SelectItem>
                  <SelectItem value="3_5">3-5 anos</SelectItem>
                  <SelectItem value="6_10">6-10 anos</SelectItem>
                  <SelectItem value="mais_10">Mais de 10 anos</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <FormLabel>Especializações</FormLabel>
          <div className="space-y-2">
            <div className="flex gap-2">
              <Select onValueChange={setNovaEspecializacao} value={novaEspecializacao}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Adicionar especialização" />
                </SelectTrigger>
                <SelectContent>
                  {ESPECIALIZACOES_OPTIONS.map((esp) => (
                    <SelectItem key={esp} value={esp}>
                      {esp}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button type="button" onClick={adicionarEspecializacao} variant="outline">
                Adicionar
              </Button>
            </div>
            
            <div className="flex flex-wrap gap-2">
              {especializacoes.map((esp) => (
                <Badge key={esp} className="bg-[#AA1808] text-white border-transparent flex items-center gap-1">
                  {esp}
                  <X
                    className="h-3 w-3 cursor-pointer"
                    onClick={() => removerEspecializacao(esp)}
                  />
                </Badge>
              ))}
            </div>
          </div>
        </div>

        <FormField
          control={form.control}
          name="bio"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Biografia</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Conte um pouco sobre sua experiência e metodologia..."
                  rows={4}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end space-x-2 pt-4">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Salvando..." : "Salvar"}
          </Button>
        </div>
      </form>
    </Form>
  );
};