// src/components/perfil/EditPessoalForm.tsx

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
import { DatePicker } from "@/components/ui/date-picker";
import { PhoneInput } from "@/components/ui/phone-input";
import { Button } from "@/components/ui/button";
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
  nome_completo: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  telefone: z.string().optional(),
  data_nascimento: z.string().optional(),
  genero: z.string().optional(),
});

interface ProfileData {
  nome_completo?: string;
  telefone?: string;
  data_nascimento?: string;
  genero?: string;
}

interface EditPessoalFormProps {
  profile: ProfileData | null;
  onSave: () => void;
}

export const EditPessoalForm = ({ profile, onSave }: EditPessoalFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome_completo: "",
      telefone: "",
      data_nascimento: "",
      genero: "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        nome_completo: profile.nome_completo || "",
        telefone: profile.telefone || "",
        data_nascimento: profile.data_nascimento || "",
        genero: profile.genero || "",
      });
    }
  }, [profile, form]);

  const handleReset = () => {
    if (profile) {
      form.reset({
        nome_completo: profile.nome_completo || "",
        telefone: profile.telefone || "",
        data_nascimento: profile.data_nascimento || "",
        genero: profile.genero || "",
      });
    }
  };

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const { error } = await supabase
        .from('personal_trainers')
        .update({
          nome_completo: values.nome_completo,
          telefone: values.telefone || null,
          data_nascimento: values.data_nascimento || null,
          genero: values.genero || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Perfil atualizado",
        description: "Suas informações pessoais foram atualizadas com sucesso.",
      });

      onSave();
      form.reset(values); 
    } catch (error) {
      console.error('Error updating profile:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao atualizar perfil. Tente novamente.",
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
                <PhoneInput 
                  value={field.value || ''} 
                  onChange={field.onChange}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="data_nascimento"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data de Nascimento</FormLabel>
              <FormControl>
                <DatePicker
                  value={field.value}
                  onChange={field.onChange}
                  className="w-full"
                />
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
              <Select onValueChange={field.onChange} value={field.value || ''}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="masculino">Masculino</SelectItem>
                  <SelectItem value="feminino">Feminino</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                  <SelectItem value="nao_informar">Prefiro não informar</SelectItem>
                </SelectContent>
              </Select>
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