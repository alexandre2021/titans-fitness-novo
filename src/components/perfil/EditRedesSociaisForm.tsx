// src/components/perfil/EditRedesSociaisForm.tsx

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
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  instagram: z.string().optional(),
  facebook: z.string().optional(),
  linkedin: z.string().optional(),
  website: z.string().optional(),
});

interface ProfileData {
  instagram?: string;
  facebook?: string;
  linkedin?: string;
  website?: string;
}

interface EditRedesSociaisFormProps {
  profile: ProfileData | null;
  onSave: () => void;
}

export const EditRedesSociaisForm = ({ profile, onSave }: EditRedesSociaisFormProps) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      instagram: "",
      facebook: "",
      linkedin: "",
      website: "",
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        instagram: profile.instagram || "",
        facebook: profile.facebook || "",
        linkedin: profile.linkedin || "",
        website: profile.website || "",
      });
    }
  }, [profile, form]);

  const handleReset = () => {
    if (profile) {
      form.reset({
        instagram: profile.instagram || "",
        facebook: profile.facebook || "",
        linkedin: profile.linkedin || "",
        website: profile.website || "",
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
          instagram: values.instagram || null,
          facebook: values.facebook || null,
          linkedin: values.linkedin || null,
          website: values.website || null,
        })
        .eq('id', user.id);

      if (error) throw error;

      toast({
        title: "Perfil atualizado",
        description: "Suas redes sociais foram atualizadas com sucesso.",
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
        <FormField control={form.control} name="instagram" render={({ field }) => (<FormItem><FormLabel>Instagram</FormLabel><FormControl><Input placeholder="@seuinstagram" {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="facebook" render={({ field }) => (<FormItem><FormLabel>Facebook</FormLabel><FormControl><Input placeholder="facebook.com/seuperfil" {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="linkedin" render={({ field }) => (<FormItem><FormLabel>LinkedIn</FormLabel><FormControl><Input placeholder="linkedin.com/in/seuperfil" {...field} /></FormControl><FormMessage /></FormItem>)} />
        <FormField control={form.control} name="website" render={({ field }) => (<FormItem><FormLabel>Website</FormLabel><FormControl><Input placeholder="https://seusite.com" {...field} /></FormControl><FormMessage /></FormItem>)} />

        <div className="flex justify-end space-x-2 pt-6">
          <Button type="button" variant="outline" onClick={handleReset} disabled={isLoading || !form.formState.isDirty}>
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