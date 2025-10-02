// src/components/perfil/EditAlunoPessoalForm.tsx

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { DatePicker } from "@/components/ui/date-picker";
import { PhoneInput } from "@/components/ui/phone-input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CustomSelect from "@/components/ui/CustomSelect";

const formSchema = z.object({
  nome_completo: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  telefone: z.string().optional(),
  data_nascimento: z.string().optional(),
  genero: z.string().optional(),
  descricao_pessoal: z.string().optional(),
});

const GENERO_OPTIONS = [
  { value: 'masculino', label: 'Masculino' },
  { value: 'feminino', label: 'Feminino' },
  { value: 'outro', label: 'Outro' },
  { value: 'nao_informar', label: 'Prefiro não informar' },
];

interface AlunoProfileData {
  nome_completo: string;
  telefone?: string;
  data_nascimento?: string;
  genero?: string;
  descricao_pessoal?: string;
}

interface EditAlunoPessoalFormProps {
  profile: AlunoProfileData;
  onSave: () => void;
}

export const EditAlunoPessoalForm = ({ profile, onSave }: EditAlunoPessoalFormProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome_completo: profile.nome_completo || "",
      telefone: profile.telefone || "",
      data_nascimento: profile.data_nascimento || "",
      genero: profile.genero || "",
      descricao_pessoal: profile.descricao_pessoal || "",
    },
  });

  useEffect(() => {
    form.reset({
      nome_completo: profile.nome_completo || "",
      telefone: profile.telefone || "",
      data_nascimento: profile.data_nascimento || "",
      genero: profile.genero || "",
      descricao_pessoal: profile.descricao_pessoal || "",
    });
  }, [profile, form]);

  const handleReset = () => {
    form.reset({
      nome_completo: profile.nome_completo || "",
      telefone: profile.telefone || "",
      data_nascimento: profile.data_nascimento || "",
      genero: profile.genero || "",
      descricao_pessoal: profile.descricao_pessoal || "",
    });
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase
        .from("alunos")
        .update({
          nome_completo: values.nome_completo,
          telefone: values.telefone || null,
          data_nascimento: values.data_nascimento || null,
          genero: values.genero || null,
          descricao_pessoal: values.descricao_pessoal || null,
        })
        .eq("id", user.id);

      if (error) throw error;

      // Atualiza os metadados do usuário no Supabase Auth para refletir o novo nome
      const { error: userUpdateError } = await supabase.auth.updateUser({
        data: { full_name: values.nome_completo }
      });

      if (userUpdateError) throw userUpdateError;

      onSave();
      form.reset(values);
    } catch (error) {
      console.error("Error updating profile:", error);
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
          name="nome_completo"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome Completo</FormLabel>
              <FormControl>
                <Input {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="telefone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Telefone</FormLabel>
              <FormControl>
                <PhoneInput value={field.value || ''} onChange={field.onChange} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="data_nascimento"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Nascimento</FormLabel>
                <FormControl>
                  <DatePicker value={field.value} onChange={field.onChange} className="w-full" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="genero"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Gênero</FormLabel>
                <FormControl>
                  <CustomSelect
                    inputId="genero"
                    value={GENERO_OPTIONS.find(opt => opt.value === field.value)}
                    onChange={(option) => field.onChange(option ? option.value : '')}
                    options={GENERO_OPTIONS}
                    placeholder="Selecione"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="descricao_pessoal"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição Pessoal</FormLabel>
              <FormControl>
                <Textarea placeholder="Conte um pouco sobre você, seus objetivos, experiências..." {...field} value={field.value || ''} />
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
            disabled={isLoading || !form.formState.isDirty}
          >
            Desfazer
          </Button>
          <Button type="submit" disabled={isLoading || !form.formState.isDirty}>
            {isLoading ? "Salvando..." : "Salvar Alterações"}
          </Button>
        </div>
      </form>
    </Form>
  );
};