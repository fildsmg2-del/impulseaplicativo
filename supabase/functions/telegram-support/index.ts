import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const TELEGRAM_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN');
    const ADMIN_CHAT_ID = Deno.env.get('TELEGRAM_CHAT_ID');

    const body = await req.json();
    console.log("Recebido:", JSON.stringify(body));

    // ==========================================================
    // FLUXO 1: WEBHOOK DO TELEGRAM (ADMIN/SUPORTE RESPONDENDO)
    // ==========================================================
    if (body.message && body.message.chat.id.toString() === ADMIN_CHAT_ID) {
      const { message } = body;
      const replyTo = message.reply_to_message;

      if (!replyTo) {
        console.log("Mensagem ignorada: Não é uma resposta.");
        return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Tenta encontrar o UserID no texto da mensagem original (ID: uuid)
      // O formato enviado pelo App é "ID: <code>USER_ID</code>"
      const userIdMatch = replyTo.text?.match(/ID:\s+([a-f0-9-]{36})/i) || replyTo.caption?.match(/ID:\s+([a-f0-9-]{36})/i);
      const targetUserId = userIdMatch ? userIdMatch[1] : null;

      if (!targetUserId) {
        console.error("UserID não encontrado na mensagem respondida.");
        return new Response(JSON.stringify({ error: "UserID not found" }), { status: 404 });
      }

      let content = message.text || "";
      let fileUrl = null;
      let fileType = null;

      // Tratar Mídia vinda do Telegram
      if (message.photo || message.document) {
        const fileId = message.photo ? message.photo[message.photo.length - 1].file_id : message.document.file_id;
        const mimeType = message.photo ? "image/jpeg" : message.document.mime_type;
        
        const getFileRes = await fetch(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`);
        const getFileData = await getFileRes.json();

        if (getFileData.ok) {
          const filePath = getFileData.result.file_path;
          const downloadUrl = `https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`;
          const fileRes = await fetch(downloadUrl);
          const fileBuffer = await fileRes.arrayBuffer();

          const fileName = `${targetUserId}/${Date.now()}_${filePath.split('/').pop()}`;
          const { data: uploadData, error: uploadError } = await supabaseClient.storage
            .from("chat-attachments")
            .upload(fileName, fileBuffer, { contentType: mimeType, upsert: true });

          if (!uploadError) {
            const { data: { publicUrl } } = supabaseClient.storage.from("chat-attachments").getPublicUrl(fileName);
            fileUrl = publicUrl;
            if (!content) content = message.photo ? "📷 Foto" : "📄 Arquivo";
            fileType = message.photo ? "image" : "document";
          }
        }
      }

      // Salvar a resposta no banco (Impulse usa dev_chat_messages)
      const { error: insertError } = await supabaseClient.from("dev_chat_messages").insert({
        user_id: targetUserId,
        user_name: 'Suporte Dev',
        message: content,
        is_from_dev: true,
        file_url: fileUrl,
        file_type: fileType,
        telegram_message_id: message.message_id
      });

      if (insertError) throw insertError;
      return new Response(JSON.stringify({ ok: true }));
    }

    // ==========================================================
    // FLUXO 2: APP -> TELEGRAM (CLIENTE ENVIANDO)
    // Gatilho do Banco envia o registro aqui (payload.record)
    // ==========================================================
    const record = body.record || body;
    if (record && record.user_id && !record.is_from_dev) {
      const { message: userMsg, user_id, user_name, file_url, file_type } = record;

      const caption = `<b>🛡️ Suporte Impulse</b>\n` +
                      `<b>De:</b> ${user_name}\n\n` +
                      `${userMsg || ""}\n\n` +
                      `<code>ID: ${user_id}</code>`;

      let tgMethod = "sendMessage";
      let tgBody: any = {
        chat_id: ADMIN_CHAT_ID,
        parse_mode: "HTML",
      };

      if (file_url) {
        if (file_type === 'image') {
          tgMethod = "sendPhoto";
          tgBody.photo = file_url;
          tgBody.caption = caption;
        } else {
          tgMethod = "sendDocument";
          tgBody.document = file_url;
          tgBody.caption = caption;
        }
      } else {
        tgBody.text = caption;
      }

      const tgUrl = `https://api.telegram.org/bot${TELEGRAM_TOKEN}/${tgMethod}`;
      const tgRes = await fetch(tgUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tgBody),
      });

      const tgData = await tgRes.json();
      if (tgData.ok) {
        // Atualiza o registro com o ID do Telegram para futuras respostas
        await supabaseClient
          .from("dev_chat_messages")
          .update({ telegram_message_id: tgData.result.message_id })
          .eq("id", record.id);
      }

      return new Response(JSON.stringify({ success: true }));
    }

    return new Response(JSON.stringify({ ok: true, status: 'no_action' }));

  } catch (error: any) {
    console.error("telegram-support error:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 200 });
  }
});
