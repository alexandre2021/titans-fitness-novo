// supabase/functions/enviar-rotina-pdf/index.ts - VERSÃO CORRIGIDA PARA UUIDs
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { PDFDocument, StandardFonts, rgb } from 'https://cdn.skypack.dev/pdf-lib@^1.17.1?dts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

// ✅ FUNÇÃO CORRIGIDA PARA BUSCAR DADOS COM UUIDs
const buscarDadosRotinaDoBanco = async (supabase, rotinaId) => {
  console.log('🔍 Buscando dados da rotina no banco:', rotinaId);

  // 1. Buscar rotina
  const { data: rotina, error: rotinaError } = await supabase
    .from('rotinas')
    .select('*')
    .eq('id', rotinaId)
    .single();
  
  if (rotinaError) throw new Error(`Erro ao buscar rotina: ${rotinaError.message}`);

  // 2. Buscar treinos
  const { data: treinos, error: treinosError } = await supabase
    .from('treinos')
    .select('*')
    .eq('rotina_id', rotinaId)
    .order('ordem');
  
  if (treinosError) throw new Error(`Erro ao buscar treinos: ${treinosError.message}`);

  // 3. Para cada treino, buscar exercícios e séries
  const treinosCompletos = [];
  
  for (const treino of treinos) {
    console.log(`📋 Processando treino: ${treino.nome}`);
    
    // Buscar exercícios do treino
    const { data: exercicios, error: exerciciosError } = await supabase
      .from('exercicios_rotina')
      .select('*')
      .eq('treino_id', treino.id)
      .order('ordem');
    
    if (exerciciosError) throw new Error(`Erro ao buscar exercícios: ${exerciciosError.message}`);

    const exerciciosCompletos = [];
    
    for (const exercicio of exercicios) {
      console.log(`💪 Processando exercício: ${exercicio.exercicio_1_id}`);

      // ✅ BUSCAR DADOS DO EXERCÍCIO PRINCIPAL POR ID
      let nome1 = null, equipamento1 = null;
      if (exercicio.exercicio_1_id) {
        const { data: exercicioInfo1, error: equipamentoError1 } = await supabase
          .from('exercicios')
          .select('nome, equipamento')
          .eq('id', exercicio.exercicio_1_id)  // ← CORRIGIDO: busca por ID
          .single();
        
        if (!equipamentoError1 && exercicioInfo1) {
          nome1 = exercicioInfo1.nome;
          equipamento1 = exercicioInfo1.equipamento;
          console.log(`🏋️ Exercício 1: ${nome1} (${equipamento1})`);
        }
      }

      // ✅ BUSCAR DADOS DO SEGUNDO EXERCÍCIO POR ID (SE EXISTIR)
      let nome2 = null, equipamento2 = null;
      if (exercicio.exercicio_2_id) {
        console.log(`💪 Processando exercício combinado: ${exercicio.exercicio_2_id}`);
        const { data: exercicioInfo2, error: equipamentoError2 } = await supabase
          .from('exercicios')
          .select('nome, equipamento')
          .eq('id', exercicio.exercicio_2_id)  // ← CORRIGIDO: busca por ID
          .single();
        
        if (!equipamentoError2 && exercicioInfo2) {
          nome2 = exercicioInfo2.nome;
          equipamento2 = exercicioInfo2.equipamento;
          console.log(`🏋️ Exercício 2: ${nome2} (${equipamento2})`);
        }
      }

      // Buscar séries do exercício
      const { data: series, error: seriesError } = await supabase
        .from('series')
        .select('*')
        .eq('exercicio_id', exercicio.id)
        .order('numero_serie');
      
      if (seriesError) throw new Error(`Erro ao buscar séries: ${seriesError.message}`);
      
      console.log(`📊 Séries encontradas: ${series.length}`);

      // ✅ DEBUG: Log séries com dropset
      series.forEach((serie) => {
        if (serie.tem_dropset) {
          console.log(`🔥 Dropset encontrado na série ${serie.numero_serie}: carga_dropset = ${serie.carga_dropset}`);
        }
      });

      exerciciosCompletos.push({
        ...exercicio,
        // ✅ ADICIONAR NOMES E EQUIPAMENTOS BUSCADOS
        exercicio_1_nome: nome1,
        exercicio_2_nome: nome2,
        equipamento: equipamento1,
        equipamento2: equipamento2,
        series: series
      });
    }

    treinosCompletos.push({
      ...treino,
      exercicios: exerciciosCompletos
    });
  }

  return {
    rotina,
    treinos: treinosCompletos
  };
};

// ✅ FUNÇÃO CORRIGIDA PARA CARREGAR O LOGO
const carregarLogo = async (pdfDoc) => {
  console.log('🖼️ Tentando carregar logo...');
  
  const urlsParaTentar = [
    'https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/TitansFitnessLogo.png',
    'https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/TitanFitnessLogo.png',
    'https://titans.fitness/assets/logo.png',
    'https://titans.fitness/logo.png',
    'https://via.placeholder.com/200x100/A11E0A/FFFFFF?text=TITANS+FITNESS'
  ];

  for (const url of urlsParaTentar) {
    try {
      console.log(`🔄 Tentando carregar logo de: ${url}`);
      const response = await fetch(url);
      if (response.ok) {
        const logoBytes = await response.arrayBuffer();
        let logoImage;
        if (url.toLowerCase().includes('.jpg') || url.toLowerCase().includes('.jpeg')) {
          logoImage = await pdfDoc.embedJpg(new Uint8Array(logoBytes));
        } else {
          logoImage = await pdfDoc.embedPng(new Uint8Array(logoBytes));
        }
        console.log(`✅ Logo carregado com sucesso de: ${url}`);
        return logoImage;
      }
    } catch (error) {
      console.warn(`⚠️ Falha ao carregar logo de ${url}:`, error.message);
    }
  }
  
  console.log('❌ Não foi possível carregar nenhum logo');
  return null;
};

// ✅ FUNÇÃO AUXILIAR PARA FORMATAÇÃO DE PESO
const formatarPeso = (carga, equipamento) => {
  if (equipamento === 'Peso Corporal') {
    return 'Peso corporal';
  }
  return carga && carga > 0 ? `${carga}kg` : '0kg';
};

// ✅ GERADOR DE PDF CORRIGIDO PARA USAR NOMES BUSCADOS
const gerarPDFComPDFLib = async (dadosCompletos, personal_nome, aluno_nome) => {
  console.log('📄 Gerando PDF com PDF-LIB...');
  const { rotina, treinos } = dadosCompletos;

  const pdfDoc = await PDFDocument.create();
  const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const helveticaBoldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const logoImage = await carregarLogo(pdfDoc);
  
  let page = pdfDoc.addPage([595, 842]); // A4 size
  const { width, height } = page.getSize();
  let yPosition = height - 50;

  // ✅ DESENHAR LOGO CENTRALIZADO
  if (logoImage) {
    try {
      const logoAspectRatio = logoImage.width / logoImage.height;
      let logoWidth = 120;
      let logoHeight = logoWidth / logoAspectRatio;

      if (logoHeight > 60) {
        logoHeight = 60;
        logoWidth = logoHeight * logoAspectRatio;
      }

      const logoX = (width - logoWidth) / 2;
      const logoY = height - logoHeight - 20;

      page.drawImage(logoImage, {
        x: logoX,
        y: logoY,
        width: logoWidth,
        height: logoHeight
      });

      console.log(`✅ Logo centralizado: posição (${logoX}, ${logoY}), tamanho ${logoWidth}x${logoHeight}`);
      yPosition = logoY - 30;
    } catch (drawError) {
      console.error('❌ Erro ao desenhar logo no PDF:', drawError);
    }
  }

  // ✅ CABEÇALHO
  page.drawText(`${rotina.nome}`, {
    x: 50, y: yPosition, size: 18,
    font: helveticaBoldFont, color: rgb(0, 0, 0)
  });
  yPosition -= 30;

  page.drawText(`Aluno: ${aluno_nome}`, {
    x: 50, y: yPosition, size: 12,
    font: helveticaFont, color: rgb(0, 0, 0)
  });
  yPosition -= 20;

  page.drawText(`Personal: ${personal_nome}`, {
    x: 50, y: yPosition, size: 12,
    font: helveticaFont, color: rgb(0, 0, 0)
  });
  yPosition -= 20;

  page.drawText(`Objetivo: ${rotina.objetivo || 'N/A'}`, {
    x: 50, y: yPosition, size: 12,
    font: helveticaFont, color: rgb(0, 0, 0)
  });
  yPosition -= 40;

  // ✅ TREINOS E EXERCÍCIOS CORRIGIDOS
  for (const treino of treinos) {
    if (yPosition < 100) {
      page = pdfDoc.addPage([595, 842]);
      yPosition = height - 50;
    }

    console.log(`📋 Adicionando treino: ${treino.nome}`);

    // Nome do treino
    page.drawText(treino.nome, {
      x: 50, y: yPosition, size: 16,
      font: helveticaBoldFont, color: rgb(0, 0, 0)
    });
    yPosition -= 30;

    // Exercícios
    for (const exercicio of treino.exercicios) {
      if (yPosition < 100) {
        page = pdfDoc.addPage([595, 842]);
        yPosition = height - 50;
      }

      console.log(`💪 Adicionando exercício: ${exercicio.exercicio_1_nome}`);

      // ✅ NOME DO EXERCÍCIO USANDO NOMES BUSCADOS
      let nomeExercicio = exercicio.exercicio_1_nome || 'Exercício não encontrado';
      if (exercicio.exercicio_2_nome) {
        nomeExercicio += ` + ${exercicio.exercicio_2_nome}`;
      }

      page.drawText(nomeExercicio, {
        x: 70, y: yPosition, size: 12,
        font: helveticaBoldFont, color: rgb(0, 0, 0)
      });
      yPosition -= 20;

      // Séries
      for (const serie of exercicio.series) {
        if (yPosition < 50) {
          page = pdfDoc.addPage([595, 842]);
          yPosition = height - 50;
        }

        console.log(`📊 Adicionando série: ${serie.numero_serie}`);

        let serieText = `Série ${serie.numero_serie}: `;

        // ✅ VERIFICAR SE É COMBINADA
        if (exercicio.exercicio_2_nome) {
          // Série combinada
          const carga1Text = formatarPeso(serie.carga_1, exercicio.equipamento);
          const carga2Text = formatarPeso(serie.carga_2, exercicio.equipamento2);
          serieText += `${serie.repeticoes_1 || 12} reps (${carga1Text}) + ${serie.repeticoes_2 || 12} reps (${carga2Text})`;
        } else {
          // Série simples
          const cargaText = formatarPeso(serie.carga, exercicio.equipamento);
          serieText += `${serie.repeticoes || 12} reps (${cargaText})`;
        }

        // ✅ DROPSET
        if (serie.tem_dropset) {
          const cargaDropsetText = formatarPeso(serie.carga_dropset, exercicio.equipamento);
          serieText += ` (Drop: ${cargaDropsetText})`;
          console.log(`🔥 Dropset adicionado no PDF: série ${serie.numero_serie}, carga ${cargaDropsetText}`);
        }

        page.drawText(serieText, {
          x: 90, y: yPosition, size: 10,
          font: helveticaFont, color: rgb(0, 0, 0)
        });
        yPosition -= 15;
      }
      yPosition -= 10;
    }
    yPosition -= 20;
  }

  // ✅ RETORNAR PDF COMO BASE64
  const pdfBytes = await pdfDoc.save();
  const uint8Array = new Uint8Array(pdfBytes);
  let binaryString = '';
  for (let i = 0; i < uint8Array.length; i++) {
    binaryString += String.fromCharCode(uint8Array[i]);
  }
  const base64String = btoa(binaryString);
  
  console.log('✅ PDF gerado com sucesso!');
  return base64String;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  try {
    const { rotina_id, nome_aluno, email_aluno, nome_rotina, objetivo, nome_arquivo_pdf } = await req.json();
    
    console.log('📥 Dados recebidos:');
    console.log('- rotina_id:', rotina_id);
    console.log('- nome_aluno:', nome_aluno);
    console.log('- nome_rotina:', nome_rotina);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') }
        }
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication failed' }), {
        status: 401, headers: corsHeaders
      });
    }

    const { data: personalData } = await supabaseClient
      .from('personal_trainers')
      .select('nome_completo')
      .eq('id', user.id)
      .single();

    if (!personalData) {
      return new Response(JSON.stringify({ error: 'Personal trainer profile not found' }), {
        status: 404, headers: corsHeaders
      });
    }

    const nome_personal = personalData.nome_completo;

    if (!nome_aluno || !email_aluno || !nome_rotina || !rotina_id) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Dados obrigatórios ausentes'
      }), {
        status: 400, headers: corsHeaders
      });
    }

    // ✅ BUSCAR DADOS DO BANCO CORRIGIDO
    const dadosCompletos = await buscarDadosRotinaDoBanco(supabaseClient, rotina_id);
    console.log('✅ Dados buscados do banco com sucesso');

    // ✅ GERAR PDF CORRIGIDO
    const finalPdfBase64 = await gerarPDFComPDFLib(dadosCompletos, nome_personal, nome_aluno);

    // Email HTML
    const htmlEmail = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Nova Rotina de Treinos - Titans Fitness</title>
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; margin-bottom: 30px; }
        .logo { max-width: 200px; height: auto; }
        .content { background-color: #f9f9f9; padding: 20px; border-radius: 8px; }
        .highlight { color: #A11E0A; font-weight: bold; }
        .footer { margin-top: 30px; text-align: center; font-size: 12px; color: #666; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <img src="https://prvfvlyzfyprjliqniki.supabase.co/storage/v1/object/public/assets/TitansFitnessLogo.png" 
                 alt="Titans Fitness" 
                 class="logo"
                 onerror="this.src='https://via.placeholder.com/200x100/A11E0A/FFFFFF?text=TITANS+FITNESS';">
        </div>
        
        <div class="content">
            <h1 style="color: #A11E0A; margin-top: 0;">Nova Rotina de Treinos</h1>
            <p>Olá <strong>${nome_aluno}</strong>,</p>
            <p>Sua nova rotina "<span class="highlight">${nome_rotina}</span>" está pronta!</p>
            <p><strong>Objetivo:</strong> ${objetivo || 'Não especificado'}</p>
            <p>📎 Confira o arquivo PDF em anexo com todos os detalhes.</p>
        </div>
        
        <div class="footer">
            <p><strong>Titans Fitness</strong><br>
            Sua evolução é nossa missão<br>
            <a href="https://titans.fitness" style="color: #A11E0A;">titans.fitness</a></p>
        </div>
    </div>
</body>
</html>`;

    const brevoApiKey = Deno.env.get('BREVO_API_KEY');
    if (!brevoApiKey) throw new Error("BREVO_API_KEY não configurada");

    const nomeArquivo = nome_arquivo_pdf || `${nome_rotina}_${nome_aluno}`.replace(/[^a-zA-Z0-9\s]/g, '_');

    const brevoResponse = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': brevoApiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        sender: {
          name: 'Titans Fitness',
          email: 'contato@titans.fitness'
        },
        to: [{
          email: email_aluno,
          name: nome_aluno
        }],
        subject: `Sua nova rotina de treinos: ${nome_rotina}`,
        htmlContent: htmlEmail,
        attachment: [{
          name: `${nomeArquivo}.pdf`,
          content: finalPdfBase64
        }]
      })
    });

    if (!brevoResponse.ok) {
      const errorText = await brevoResponse.text();
      throw new Error(`Falha no envio: ${errorText}`);
    }

    const brevoResult = await brevoResponse.json();
    return new Response(JSON.stringify({
      success: true,
      brevo_response: brevoResult
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Erro:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});