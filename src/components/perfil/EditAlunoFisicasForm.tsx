// src/components/perfil/EditAlunoFisicasForm.tsx

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
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const formSchema = z.object({
  peso: z.string().optional(),
  altura: z.string().optional(),
});

interface AlunoFisicasData {
  peso?: number;
  altura?: number;
}

interface EditAlunoFisicasFormProps {
  profile: AlunoFisicasData;
  onSave: () => void;
}

export const EditAlunoFisicasForm = ({ profile, onSave }: EditAlunoFisicasFormProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      peso: profile.peso?.toString() || "",
      altura: profile.altura?.toString() || "",
    },
  });

  useEffect(() => {
    form.reset({
      peso: profile.peso?.toString() || "",
      altura: profile.altura?.toString() || "",
    });
  }, [profile, form]);

  const handleReset = () => {
    form.reset({
      peso: profile.peso?.toString() || "",
      altura: profile.altura?.toString() || "",
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
          peso: values.peso ? parseFloat(values.peso) : null,
          altura: values.altura ? parseFloat(values.altura) : null,
        })
        .eq("id", user.id);

      if (error) throw error;

      onSave();
      form.reset(values);
    } catch (error) {
      console.error("Error updating profile:", error);
      toast.error("Erro", {
        description: error instanceof Error ? error.message : "Erro ao atualizar perfil. Tente novamente."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField control={form.control} name="peso" render={({ field }) => (<FormItem><FormLabel>Peso (kg)</FormLabel><FormControl><Input type="number" step="0.1" placeholder="Ex: 70.5" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
          <FormField control={form.control} name="altura" render={({ field }) => (<FormItem><FormLabel>Altura (cm)</FormLabel><FormControl><Input type="number" placeholder="Ex: 175" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>)} />
        </div>
        <div className="flex justify-end space-x-2 pt-6">
          <Button type="button" variant="outline" onClick={handleReset} disabled={isLoading || !form.formState.isDirty}>Desfazer</Button>
          <Button type="submit" disabled={isLoading || !form.formState.isDirty}>{isLoading ? "Salvando..." : "Salvar Alterações"}</Button>
        </div>
      </form>
    </Form>
  );
};