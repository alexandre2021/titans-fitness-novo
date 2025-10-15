import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";

import LandingHeader from "@/components/landing/LandingHeader";
import LandingFooter from "@/components/landing/LandingFooter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { supabase } from "@/integrations/supabase/client";

const formSchema = z.object({
  nome: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  email: z.string().email("Por favor, insira um e-mail válido."),
  assunto: z.string().min(5, "O assunto deve ter pelo menos 5 caracteres."),
  mensagem: z.string().min(10, "A mensagem deve ter pelo menos 10 caracteres."),
});

type FormData = z.infer<typeof formSchema>;

const Contato = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nome: "",
      email: "",
      assunto: "",
      mensagem: "",
    },
  });

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: data,
      });

      if (error) {
        throw new Error(error.message);
      }

      toast.success("Mensagem enviada!", {
        description: "Obrigado por entrar em contato. Responderemos em breve.",
      });
      form.reset();
    } catch (error) {
      toast.error("Erro ao enviar mensagem", {
        description: "Houve um problema ao enviar sua mensagem. Por favor, tente novamente mais tarde.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />

      <main>
        <section className="py-12 md:py-20">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tighter">
                Entre em Contato
              </h1>
              <p className="mt-4 text-lg text-muted-foreground">
                Tem alguma dúvida, sugestão ou feedback? Adoraríamos ouvir você.
              </p>
            </div>

            <div className="max-w-2xl mx-auto">
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField control={form.control} name="nome" render={({ field }) => (
                      <FormItem><FormLabel>Nome</FormLabel><FormControl><Input placeholder="Seu nome" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem><FormLabel>E-mail</FormLabel><FormControl><Input type="email" placeholder="seu@email.com" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                  <FormField control={form.control} name="assunto" render={({ field }) => (
                    <FormItem><FormLabel>Assunto</FormLabel><FormControl><Input placeholder="Sobre o que você gostaria de falar?" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="mensagem" render={({ field }) => (
                    <FormItem><FormLabel>Mensagem</FormLabel><FormControl><Textarea placeholder="Digite sua mensagem aqui..." rows={6} {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <div className="flex justify-end">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? "Enviando..." : "Enviar Mensagem"}
                    </Button>
                  </div>
                </form>
              </Form>
            </div>
          </div>
        </section>
      </main>

      <LandingFooter />
    </div>
  );
};

export default Contato;