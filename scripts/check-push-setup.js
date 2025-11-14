/**
 * Script para diagnosticar a configuração de Push Notifications
 * Executa as queries de verificação via Supabase client
 */

/* eslint-disable */

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  console.error('Configure VITE_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runDiagnostics() {
  console.log('🔍 DIAGNÓSTICO DE PUSH NOTIFICATIONS\n');
  console.log('='.repeat(60));

  // 1. Verifica trigger
  console.log('\n📌 1. Verificando trigger...');
  const { data: triggers, error: triggerError } = await supabase
    .rpc('sql', {
      query: `
        SELECT trigger_name, event_manipulation, event_object_table
        FROM information_schema.triggers
        WHERE trigger_name = 'on_new_message_push_notification'
      `
    })
    .single();

  if (triggerError) {
    // Tenta query alternativa
    const { data: triggerAlt } = await supabase
      .from('pg_trigger')
      .select('tgname')
      .ilike('tgname', '%push%');

    console.log(triggerAlt ? '✅ Trigger existe' : '❌ Trigger NÃO encontrado');
  } else {
    console.log('✅ Trigger:', triggers);
  }

  // 2. Verifica subscriptions
  console.log('\n📱 2. Verificando subscriptions cadastradas...');
  const { data: subs, error: subsError } = await supabase
    .from('push_subscriptions')
    .select('user_id, endpoint, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  if (subsError) {
    console.error('❌ Erro ao buscar subscriptions:', subsError.message);
  } else if (!subs || subs.length === 0) {
    console.log('⚠️  NENHUMA subscription encontrada!');
    console.log('   → Você precisa aceitar notificações no app primeiro');
  } else {
    console.log(`✅ ${subs.length} subscription(s) encontrada(s):`);
    subs.forEach((sub, i) => {
      console.log(`   ${i + 1}. User: ${sub.user_id}`);
      console.log(`      Endpoint: ${sub.endpoint.substring(0, 50)}...`);
      console.log(`      Criado em: ${sub.created_at}`);
    });
  }

  // 3. Verifica pg_net
  console.log('\n🌐 3. Verificando extensão pg_net...');
  const { data: extensions } = await supabase
    .from('pg_extension')
    .select('extname, extversion')
    .eq('extname', 'pg_net')
    .single();

  if (extensions) {
    console.log(`✅ pg_net instalada (versão ${extensions.extversion})`);
  } else {
    console.log('❌ pg_net NÃO instalada - necessária para enviar HTTP requests');
  }

  // 4. Verifica Edge Function
  console.log('\n⚡ 4. Testando Edge Function...');
  console.log('   Verificando se a URL está acessível...');

  const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-push-notification`;
  try {
    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({
        recipientId: 'test-user-id',
        payload: { title: 'Test', body: 'Diagnostic test' }
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Edge Function respondeu:', result);
    } else {
      const error = await response.text();
      console.log(`⚠️  Edge Function retornou status ${response.status}:`, error);
    }
  } catch (error) {
    console.error('❌ Erro ao chamar Edge Function:', error.message);
  }

  // 5. Verifica VAPID keys no .env
  console.log('\n🔑 5. Verificando VAPID keys...');
  const vapidPublic = process.env.VITE_VAPID_PUBLIC_KEY;

  if (vapidPublic) {
    console.log(`✅ VAPID_PUBLIC_KEY configurada: ${vapidPublic.substring(0, 20)}...`);
  } else {
    console.log('❌ VITE_VAPID_PUBLIC_KEY não encontrada no .env');
  }

  console.log('\n' + '='.repeat(60));
  console.log('✅ DIAGNÓSTICO CONCLUÍDO\n');

  console.log('📋 PRÓXIMOS PASSOS:');
  if (!subs || subs.length === 0) {
    console.log('   1. Abra o app no celular e aceite as notificações');
  }
  console.log('   2. Configure app.settings.service_role_key no banco (ver CONFIGURAR_PUSH_NOTIFICATIONS.md)');
  console.log('   3. Execute a migration 20251114_fix_push_trigger_config.sql');
  console.log('   4. Teste enviando uma mensagem\n');
}

runDiagnostics().catch(console.error);
