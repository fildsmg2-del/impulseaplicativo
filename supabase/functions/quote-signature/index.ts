import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SignatureRequest {
  token: string;
  signature: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/");
    const action = pathParts[pathParts.length - 1];

    // GET quote by token
    if (req.method === "GET") {
      const token = url.searchParams.get("token");
      
      if (!token) {
        return new Response(
          JSON.stringify({ error: "Token é obrigatório" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("Fetching quote with token:", token);

      // Fetch quote with client data
      const { data: quote, error: quoteError } = await supabase
        .from("quotes")
        .select(`
          *,
          clients (
            id,
            name,
            email,
            phone,
            document,
            document_type
          )
        `)
        .eq("signature_token", token)
        .single();

      if (quoteError || !quote) {
        console.error("Quote not found:", quoteError);
        return new Response(
          JSON.stringify({ error: "Orçamento não encontrado ou token inválido" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check if already signed
      if (quote.client_signature) {
        return new Response(
          JSON.stringify({ 
            error: "Este orçamento já foi assinado",
            signed: true,
            signed_at: quote.client_signed_at
          }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Fetch company settings
      const { data: company } = await supabase
        .from("company_settings")
        .select("*")
        .limit(1)
        .single();

      return new Response(
        JSON.stringify({ quote, company }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // POST signature
    if (req.method === "POST") {
      const body: SignatureRequest = await req.json();
      const { token, signature } = body;

      if (!token || !signature) {
        return new Response(
          JSON.stringify({ error: "Token e assinatura são obrigatórios" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("Signing quote with token:", token);

      // Verify quote exists and is not signed
      const { data: existingQuote, error: checkError } = await supabase
        .from("quotes")
        .select("id, client_signature, status")
        .eq("signature_token", token)
        .single();

      if (checkError || !existingQuote) {
        return new Response(
          JSON.stringify({ error: "Orçamento não encontrado" }),
          { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      if (existingQuote.client_signature) {
        return new Response(
          JSON.stringify({ error: "Este orçamento já foi assinado" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Update quote with signature
      const { data: updatedQuote, error: updateError } = await supabase
        .from("quotes")
        .update({
          client_signature: signature,
          client_signed_at: new Date().toISOString(),
          status: "SENT" // Keep as SENT, waiting for internal approval
        })
        .eq("signature_token", token)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating quote:", updateError);
        return new Response(
          JSON.stringify({ error: "Erro ao salvar assinatura" }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("Quote signed successfully:", updatedQuote.id);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: "Orçamento assinado com sucesso! Aguarde a aprovação da empresa." 
        }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Método não permitido" }),
      { status: 405, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );

  } catch (error) {
    console.error("Error in quote-signature function:", error);
    return new Response(
      JSON.stringify({ error: "Erro interno do servidor" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
