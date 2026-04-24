import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const ONESIGNAL_APP_ID = "999c9123-d911-4715-b49c-4d9814772dd5";
const ONESIGNAL_REST_API_KEY = Deno.env.get("onesignal_rest_api_key");

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json();
    const { record, table, type, manual_data } = payload; 

    console.log(`[Push] Evento ${type} na tabela ${table}`);

    if (!ONESIGNAL_REST_API_KEY) {
      throw new Error("ONESIGNAL_REST_API_KEY não configurada nas Secrets do Supabase");
    }

    let title = "Impulse Energia";
    let message = "Você tem uma nova notificação.";
    let targetCargo = null;
    let targetUserId = null;

    // --- LÓGICA MANUAL (Enviada pelo Painel DEV) ---
    if (type === 'MANUAL' || table === 'manual') {
      title = manual_data?.title || "Mensagem do Sistema";
      message = manual_data?.message || "Teste de notificação push.";
      targetUserId = manual_data?.user_id;
      targetCargo = manual_data?.cargo;
    } 
    // --- LÓGICA AUTOMÁTICA POR TABELA ---
    else if (table === 'service_orders') {
      title = "Nova Ordem de Serviço";
      message = `Uma nova OS de ${record.service_type || 'Serviço'} foi designada para você.`;
      targetUserId = record.assigned_to;
      targetCargo = record.assigned_role;
    } 
    else if (table === 'drone_services') {
      title = "Nova OS de Drone";
      message = "Um novo serviço de drone foi designado para você.";
      targetUserId = record.technician_id;
      targetCargo = record.assigned_role;
    }
    else if (table === 'projects') {
      title = "Projeto no seu Setor";
      message = `Um projeto chegou para o setor ${record.status}.`;
      targetCargo = record.status;
    }
    else if (table === 'transactions') {
      if (type === 'INSERT' || record.status === 'ATRASADO') {
        title = record.status === 'ATRASADO' ? "Conta Atrasada!" : "Novo Lançamento Financeiro";
        message = `${record.description}: R$ ${record.amount}`;
        targetCargo = "FINANCEIRO";
      } else {
        return new Response(JSON.stringify({ message: "Update financeiro sem relevância para push." }));
      }
    }

    // --- CONSTRUÇÃO DO PAYLOAD ONESIGNAL ---
    let notificationPayload: any = {
      app_id: ONESIGNAL_APP_ID,
      headings: { pt: title, en: title },
      contents: { pt: message, en: message },
      data: { id: record?.id || 'manual', table: table || 'manual' }
    };

    if (targetUserId) {
      notificationPayload.include_external_user_ids = [targetUserId];
    } else if (targetCargo) {
      notificationPayload.filters = [
        { field: "tag", key: "cargo", relation: "=", value: targetCargo }
      ];
    } else {
      return new Response(JSON.stringify({ message: "Sem destinatário definido." }));
    }

    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(notificationPayload),
    });

    const result = await response.json();
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error("[Push] Erro:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
})
