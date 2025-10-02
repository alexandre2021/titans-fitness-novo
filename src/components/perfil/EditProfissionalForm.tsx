// src/components/perfil/EditProfissionalForm.tsx

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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { isEqual } from 'lodash';
import CustomSelect from "@/components/ui/CustomSelect";

const formSchema = z.object({
  cref: z.string().optional(),
  anos_experiencia: z.string().optional(),
  bio: z.string().optional(),
});

const ESPECIALIZACOES_OPTIONS = [
  "Musculação", "Funcional", "Crossfit", "Pilates", "Yoga", "Natação",
  "Corrida", "Ciclismo", "Boxe", "Muay Thai", "Fisioterapia", "Reabilitação",
  "Emagrecimento", "Hipertrofia", "Idosos", "Gestantes", "Crianças"
];

const ANOS_EXPERIENCIA_OPTIONS = [
  { value: 'menos_1', label: 'Menos de 1 ano' },
  { value: '1_2', label: '1-2 anos' },
  { value: '3_5', label: '3-5 anos' },
  { value: '6_10', label: '6-10 anos' },
  { value: 'mais_10', label: 'Mais de 10 anos' },
];

const ESPECIALIZACOES_SELECT_OPTIONS = ESPECIALIZACOES_OPTIONS.map(esp => ({ value: esp, label: esp }));

interface ProfileData {
  cref?: string;
  anos_experiencia?: string;
  bio?: string;
  especializacoes?: string[];
}

interface EditProfissionalFormProps {
  profile: ProfileData | null;
  onSave: () => void;
}

export const EditProfissionalForm = ({ profile, onSave }: EditProfissionalFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const [especializacoes, setEspecializacoes] = useState<string[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      cref: "",
      anos_experiencia: "",
      bio: "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        cref: profile.cref || "",
        anos_experiencia: profile.anos_experiencia || "",
        bio: profile.bio || "",
      });
      setEspecializacoes(profile.especializacoes || []);
    }
  }, [profile, form]);

  const isEspecializacoesDirty = !isEqual([...(profile?.especializacoes || [])].sort(), [...especializacoes].sort());
  const isFormDirty = form.formState.isDirty || isEspecializacoesDirty;

  const handleReset = () => {
    if (profile) {
      form.reset({
        cref: profile.cref || "",
        anos_experiencia: profile.anos_experiencia || "",
        bio: profile.bio || "",
      });
      setEspecializacoes(profile.especializacoes || []);
    }
  };

  const adicionarEspecializacao = (especializacao: string) => {
    if (especializacao && !especializacoes.includes(especializacao)) {
      setEspecializacoes([...especializacoes, especializacao]);
    }
  };

  const removerEspecializacao = (esp: string) => {
    setEspecializacoes(especializacoes.filter(e => e !== esp));
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('professores')
        .update({
          cref: values.cref || null,
          anos_experiencia: values.anos_experiencia || null,
          bio: values.bio || null,
          especializacoes: especializacoes.length > 0 ? especializacoes : null,
        })
        .eq('id', user.id);

      if (error) throw error;

      onSave();
      form.reset(values);
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("Erro", {
        description: error instanceof Error ? error.message : "Erro ao atualizar perfil. Tente novamente."
      })
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
              <FormControl>
                <CustomSelect
                  inputId="anos_experiencia"
                  value={ANOS_EXPERIENCIA_OPTIONS.find(opt => opt.value === field.value)}
                  onChange={(option) => field.onChange(option ? option.value : '')}
                  options={ANOS_EXPERIENCIA_OPTIONS}
                  placeholder="Selecione"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div>
          <FormLabel>Especializações</FormLabel>
          <div className="space-y-2">
            <CustomSelect
              inputId="especializacoes"
              value={null}
              onChange={(option) => option && adicionarEspecializacao(option.value)}
              options={ESPECIALIZACOES_SELECT_OPTIONS.filter(opt => !especializacoes.includes(opt.value))}
              placeholder="Adicionar especialização"
            />
            
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

        <div className="flex justify-end space-x-2 pt-6">
          <Button
            type="button"
            variant="outline"
            onClick={handleReset}
            disabled={isLoading || !isFormDirty}
          >
            Desfazer
          </Button>
          <Button type="submit" disabled={isLoading || !isFormDirty}>
            {isLoading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </Form>
  );
};