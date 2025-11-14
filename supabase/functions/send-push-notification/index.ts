import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const VAPID_PRIVATE_KEY = Deno.env.get('VAPID_PRIVATE_KEY')!
const VAPID_PUBLIC_KEY = Deno.env.get('VAPID_PUBLIC_KEY')!
const VAPID_SUBJECT = Deno.env.get('VAPID_SUBJECT') || 'mailto:contato@titans.fitness'

interface PushPayload {
  title: string
  body: string
  icon?: string
  badge?: string
  data?: any
}

interface PushSubscription {
  endpoint: string
  keys: {
    p256dh: string
    auth: string
  }
}

serve(async (req) => {
  try {
    const { recipientId, payload }: { recipientId: string; payload: PushPayload } = await req.json()

    // Cria cliente Supabase
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Busca subscriptions do destinatário
    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription_object')
      .eq('user_id', recipientId)

    if (error) {
      throw error
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No subscriptions found for user' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Envia notificação para cada subscription
    const results = await Promise.allSettled(
      subscriptions.map(async ({ subscription_object }) => {
        const sub = subscription_object as PushSubscription

        // Prepara o payload
        const message = JSON.stringify(payload)

        // Importa web-push (necessário instalar como dependência do Deno)
        const webpush = await import('npm:web-push@3.6.6')

        webpush.setVapidDetails(
          VAPID_SUBJECT,
          VAPID_PUBLIC_KEY,
          VAPID_PRIVATE_KEY
        )

        try {
          await webpush.sendNotification(sub, message)
          return { success: true, endpoint: sub.endpoint }
        } catch (error: any) {
          // Se a subscription é inválida (410 Gone), remove do banco
          if (error.statusCode === 410) {
            await supabaseAdmin
              .from('push_subscriptions')
              .delete()
              .eq('user_id', recipientId)
              .eq('endpoint', sub.endpoint)
          }
          throw error
        }
      })
    )

    const succeeded = results.filter((r) => r.status === 'fulfilled').length
    const failed = results.filter((r) => r.status === 'rejected').length

    return new Response(
      JSON.stringify({
        message: 'Push notifications sent',
        succeeded,
        failed,
        total: subscriptions.length,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
