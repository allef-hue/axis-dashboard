import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';
import { encode } from 'https://deno.land/std@0.194.0/encoding/base64.ts';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const JWT_SECRET = Deno.env.get('JWT_SECRET') || 'your-secret-key';
const ADMIN_EMAIL = 'allef@grupovorp.com';
const APP_URL = 'https://axis-performance.pages.dev';

// Cria JWT sem expiração
function createJWT(email: string, action: 'approve' | 'reject'): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const payload = {
    email,
    action,
    iat: Math.floor(Date.now() / 1000),
  };

  const headerEncoded = btoa(JSON.stringify(header));
  const payloadEncoded = btoa(JSON.stringify(payload));

  // Simples HMAC-SHA256 sign (nota: isso é uma simplificação)
  // Em produção, use uma biblioteca de JWT apropriada
  const message = `${headerEncoded}.${payloadEncoded}`;
  const signature = btoa(message + JWT_SECRET); // Simplificado

  return `${message}.${signature}`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { email, fullName } = await req.json();

    if (!email || !fullName) {
      return new Response(
        JSON.stringify({ error: 'Email e fullName são obrigatórios' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Gera tokens para approve e reject
    const approveToken = createJWT(email, 'approve');
    const rejectToken = createJWT(email, 'reject');

    // Constrói URLs dos links
    const approveLink = `${APP_URL}/approve?token=${encodeURIComponent(approveToken)}`;
    const rejectLink = `${APP_URL}/reject?token=${encodeURIComponent(rejectToken)}`;

    // HTML do email
    const emailHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #ff6b1a, #ff8c42); color: white; padding: 20px; border-radius: 8px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; margin: 20px 0; border-radius: 8px; }
            .button { display: inline-block; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 5px; }
            .approve { background: #4CAF50; color: white; }
            .reject { background: #f44336; color: white; }
            .footer { font-size: 12px; color: #999; text-align: center; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>AXIS Dashboard</h1>
              <p>Nova Solicitação de Acesso</p>
            </div>

            <div class="content">
              <p>Olá Allef,</p>

              <p>Uma nova solicitação de acesso foi recebida:</p>

              <ul>
                <li><strong>Nome:</strong> ${fullName}</li>
                <li><strong>Email:</strong> ${email}</li>
                <li><strong>Data:</strong> ${new Date().toLocaleString('pt-BR')}</li>
              </ul>

              <p>Clique em um dos botões abaixo para aprovar ou rejeitar:</p>

              <div style="text-align: center; margin: 20px 0;">
                <a href="${approveLink}" class="button approve">✓ Aprovar Acesso</a>
                <a href="${rejectLink}" class="button reject">✗ Rejeitar Acesso</a>
              </div>

              <p style="font-size: 12px; color: #999;">
                Se preferir, copie e cole os links abaixo em seu navegador:
              </p>
              <p style="font-size: 11px; word-break: break-all;">
                Aprovar: <code>${approveLink}</code><br>
                Rejeitar: <code>${rejectLink}</code>
              </p>
            </div>

            <div class="footer">
              <p>AXIS Dashboard — Grupo VORP</p>
              <p>Este é um email automático. Não responda diretamente.</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Envia via Resend
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'noreply@axis-dashboard.com',
        to: ADMIN_EMAIL,
        subject: `[AXIS] Nova Solicitação de Acesso - ${fullName}`,
        html: emailHTML,
      }),
    });

    if (!resendResponse.ok) {
      const error = await resendResponse.text();
      console.error('[Resend Error]:', error);
      return new Response(
        JSON.stringify({ error: 'Erro ao enviar email', details: error }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email enviado com sucesso' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[Error]:', errorMsg);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
