// src/components/perfil/AlunoParQForm.tsx

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const questoes = [
  "Você possui algum problema cardíaco?",
  "Você sente dor no peito quando faz atividade física?",
  "No último mês, você sentiu dor no peito quando não estava fazendo atividade física?",
  "Você já perdeu o equilíbrio por tonturas ou perdeu a consciência?",
  "Você tem algum problema ósseo ou articular que poderia ser agravado pela atividade física?",
  "Você toma medicamentos para pressão arterial ou problemas cardíacos?",
  "Você tem conhecimento de alguma razão pela qual não deveria fazer atividade física?"
];

interface AlunoParQData {
  par_q_respostas?: Record<string, boolean | null> | null;
}

interface AlunoParQFormProps {
  profile: AlunoParQData;
  onSave: () => void;
}

export const AlunoParQForm = ({ profile, onSave }: AlunoParQFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const parQPrenchido = profile.par_q_respostas !== null && profile.par_q_respostas !== undefined;

  const defaultValues = questoes.reduce((acc, _, index) => {
    const key = `questao_${index + 1}`;
    const value = profile.par_q_respostas?.[key];
    acc[key] = value === true ? 'sim' : value === false ? 'nao' : (profile.par_q_respostas ? 'nao_respondido' : 'nao');
    return acc;
  }, {} as Record<string, string>);

  const form = useForm({
    defaultValues: { respostas: defaultValues },
  });

  useEffect(() => {
    form.reset({ respostas: defaultValues });
  }, [profile, form, defaultValues]);

  const onSubmit = async (values: { respostas: Record<string, string> }) => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const respostasFormatadas = Object.entries(values.respostas).reduce((acc, [key, value]) => {
        acc[key] = value === 'sim' ? true : value === 'nao' ? false : null;
        return acc;
      }, {} as Record<string, boolean | null>);

      const { error } = await supabase
        .from("alunos")
        .update({ par_q_respostas: respostasFormatadas })
        .eq("id", user.id);

      if (error) throw error;

      toast.success("Questionário salvo com sucesso!");
      onSave();
    } catch (error) {
      toast.error("Erro ao salvar questionário", {
        description: error instanceof Error ? error.message : "Tente novamente."
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {parQPrenchido ? (
          <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg border leading-relaxed">
            Este questionário já foi preenchido.
            As respostas não podem ser alteradas e servem como um registro de sua condição de saúde no momento do preenchimento.
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Este questionário de saúde (PAR-Q) ainda não foi preenchido. Suas respostas ajudarão seu professor a criar um plano de treino mais seguro.
          </p>
        )}


        {questoes.map((questao, index) => {
          const fieldName = `respostas.questao_${index + 1}` as const;
          return (
            <FormField
              key={index}
              control={form.control}
              name={fieldName}
              render={({ field }) => (
                <FormItem className="space-y-3 p-4 border rounded-lg bg-muted/50">
                  <FormLabel className="text-base">{index + 1}. {questao}</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      value={field.value}
                      className="flex flex-col sm:flex-row gap-2 sm:gap-4"
                      disabled={parQPrenchido}
                    >
                      <FormItem className="flex items-center space-x-2">
                        <FormControl><RadioGroupItem value="sim" /></FormControl>
                        <FormLabel className="font-normal">Sim</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <FormControl><RadioGroupItem value="nao" /></FormControl>
                        <FormLabel className="font-normal">Não</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2">
                        <FormControl><RadioGroupItem value="nao_respondido" /></FormControl>
                        <FormLabel className="font-normal">Prefiro não responder</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                </FormItem>
              )}
            />
          );
        })}

        {!parQPrenchido && (
          <div className="flex justify-end pt-6">
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "Salvando..." : "Salvar Respostas"}
            </Button>
          </div>
        )}
      </form>
    </Form>
  );
};