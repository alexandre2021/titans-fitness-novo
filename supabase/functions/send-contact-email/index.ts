import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import axios from "https://deno.land/x/axiod@0.26.2/mod.ts";

const BREVO_API_KEY = Deno.env.get("BREVO_API_KEY");
const CONTACT_EMAIL = "contato@titans.fitness";

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    const { nome, email, assunto, mensagem } = await req.json();

    if (!nome || !email || !assunto || !mensagem) {
      return new Response(JSON.stringify({ error: "Todos os campos são obrigatórios." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const emailPayload = {
      sender: {
        name: nome,
        email: "noreply@titans.fitness", // Use um e-mail genérico do seu domínio
      },
      to: [{ email: CONTACT_EMAIL }],
      replyTo: { email: email, name: nome },
      subject: `Contato via Site: ${assunto}`,
      htmlContent: `
        <p><strong>Nome:</strong> ${nome}</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Assunto:</strong> ${assunto}</p>
        <hr>
        <p>${mensagem.replace(/\n/g, "<br>")}</p>
      `,
    };

    await axios.post("https://api.brevo.com/v3/smtp/email", emailPayload, {
      headers: {
        "api-key": BREVO_API_KEY,
        "Content-Type": "application/json",
      },
    });

    return new Response(JSON.stringify({ success: true }), {
      headers: { 
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
    });
  }
});

