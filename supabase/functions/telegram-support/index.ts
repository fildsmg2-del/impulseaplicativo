import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TELEGRAM_BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const TELEGRAM_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      throw new Error('Telegram credentials not configured');
    }

    const payload = await req.json();
    console.log('Payload received:', payload);

    // If payload comes from Supabase Webhook, the data is in payload.record
    const record = payload.record || payload;
    const { message, user_name, file_url, file_type } = record;

    if (!message && !file_url) {
      return new Response(JSON.stringify({ success: true, message: 'No content to send' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    let body: any = {
      chat_id: TELEGRAM_CHAT_ID,
      parse_mode: 'HTML',
    };

    const formattedMessage = `<b>🛡️ Suporte Impulse</b>\n\n<b>De:</b> ${user_name}\n<b>Mensagem:</b>\n${message}\n\n#Suporte #Atendimento`;

    if (file_url) {
      if (file_type === 'image') {
        telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`;
        body = {
          ...body,
          photo: file_url,
          caption: formattedMessage,
        };
      } else {
        telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`;
        body = {
          ...body,
          document: file_url,
          caption: formattedMessage,
        };
      }
    } else {
      body.text = formattedMessage;
    }

    console.log('Sending message to Telegram...');
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    console.log('Telegram API response:', result);

    if (!response.ok) {
      throw new Error(result.description || 'Failed to send to Telegram');
    }

    return new Response(JSON.stringify({ success: true, result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error:', error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
