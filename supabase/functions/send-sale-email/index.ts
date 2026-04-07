import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SaleEmailRequest {
  clientEmail: string;
  clientName: string;
  saleNumber: string;
  total: number;
  items: Array<{
    name: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
  companyName: string;
  companyEmail?: string;
  companyPhone?: string;
  saleDate: string;
  estimatedCompletionDate?: string;
  paymentMethod?: string;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value || 0);
};

const handler = async (req: Request): Promise<Response> => {
  console.log("send-sale-email function called");

  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: SaleEmailRequest = await req.json();
    console.log("Received data:", JSON.stringify(data, null, 2));

    const {
      clientEmail,
      clientName,
      saleNumber,
      total,
      items,
      companyName,
      companyEmail,
      companyPhone,
      saleDate,
      estimatedCompletionDate,
      paymentMethod,
    } = data;

    // Build items table HTML
    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.unit_price)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.total)}</td>
      </tr>
    `).join('');

    const emailHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Comprovante de Venda - ${saleNumber}</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #0f343c 0%, #1a4a54 100%); padding: 30px; border-radius: 12px 12px 0 0; text-align: center;">
          <h1 style="color: #eab308; margin: 0; font-size: 24px;">${companyName}</h1>
          <p style="color: #fff; margin: 10px 0 0 0; font-size: 14px;">Comprovante de Venda</p>
        </div>

        <!-- Sale Info -->
        <div style="background: #f8f9fa; padding: 20px; border-left: 1px solid #eee; border-right: 1px solid #eee;">
          <table style="width: 100%;">
            <tr>
              <td style="padding: 5px 0;">
                <strong style="color: #0f343c;">Nº da Venda:</strong>
                <span style="color: #eab308; font-weight: bold;">${saleNumber}</span>
              </td>
              <td style="padding: 5px 0; text-align: right;">
                <strong style="color: #0f343c;">Data:</strong>
                ${new Date(saleDate).toLocaleDateString('pt-BR')}
              </td>
            </tr>
            ${estimatedCompletionDate ? `
            <tr>
              <td colspan="2" style="padding: 5px 0;">
                <strong style="color: #0f343c;">Previsão de Conclusão:</strong>
                ${new Date(estimatedCompletionDate).toLocaleDateString('pt-BR')}
              </td>
            </tr>
            ` : ''}
          </table>
        </div>

        <!-- Client Info -->
        <div style="padding: 20px; border-left: 1px solid #eee; border-right: 1px solid #eee; background: #fff;">
          <h3 style="color: #0f343c; margin: 0 0 10px 0; border-bottom: 2px solid #eab308; padding-bottom: 5px;">
            Dados do Cliente
          </h3>
          <p style="margin: 5px 0;"><strong>Nome:</strong> ${clientName}</p>
          <p style="margin: 5px 0;"><strong>Email:</strong> ${clientEmail}</p>
        </div>

        <!-- Items Table -->
        <div style="padding: 20px; border-left: 1px solid #eee; border-right: 1px solid #eee; background: #fff;">
          <h3 style="color: #0f343c; margin: 0 0 10px 0; border-bottom: 2px solid #eab308; padding-bottom: 5px;">
            Produtos/Serviços
          </h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #0f343c; color: #fff;">
                <th style="padding: 12px; text-align: left;">Item</th>
                <th style="padding: 12px; text-align: center;">Qtd</th>
                <th style="padding: 12px; text-align: right;">Valor Unit.</th>
                <th style="padding: 12px; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
            <tfoot>
              <tr style="background: #eab308;">
                <td colspan="3" style="padding: 15px; text-align: right; font-weight: bold; color: #0f343c;">
                  TOTAL:
                </td>
                <td style="padding: 15px; text-align: right; font-weight: bold; font-size: 18px; color: #0f343c;">
                  ${formatCurrency(total)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        <!-- Payment Info -->
        ${paymentMethod ? `
        <div style="padding: 20px; border-left: 1px solid #eee; border-right: 1px solid #eee; background: #f8f9fa;">
          <h3 style="color: #0f343c; margin: 0 0 10px 0;">Forma de Pagamento</h3>
          <p style="margin: 0; font-weight: bold;">${paymentMethod.replace('_', ' ')}</p>
        </div>
        ` : ''}

        <!-- Footer -->
        <div style="background: #0f343c; padding: 20px; border-radius: 0 0 12px 12px; text-align: center;">
          <p style="color: #fff; margin: 0 0 10px 0; font-size: 14px;">
            Em caso de dúvidas, entre em contato conosco:
          </p>
          ${companyEmail ? `<p style="color: #eab308; margin: 5px 0;">${companyEmail}</p>` : ''}
          ${companyPhone ? `<p style="color: #eab308; margin: 5px 0;">${companyPhone}</p>` : ''}
          <p style="color: #888; margin: 15px 0 0 0; font-size: 12px;">
            Este é um email automático. Por favor, não responda diretamente.
          </p>
        </div>

      </body>
      </html>
    `;

    console.log("Sending email to:", clientEmail);

    // Send email using Resend API directly
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: `${companyName} <onboarding@resend.dev>`,
        to: [clientEmail],
        subject: `Comprovante de Venda ${saleNumber} - ${companyName}`,
        html: emailHtml,
      }),
    });

    const emailResult = await emailResponse.json();

    if (!emailResponse.ok) {
      console.error("Email send failed:", emailResult);
      throw new Error(emailResult.message || "Failed to send email");
    }

    console.log("Email sent successfully:", emailResult);

    return new Response(JSON.stringify({ success: true, data: emailResult }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-sale-email function:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
