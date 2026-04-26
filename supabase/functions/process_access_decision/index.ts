import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const JWT_SECRET = Deno.env.get('JWT_SECRET') || 'your-secret-key';

// Função auxiliar para decodificar JWT (simplificado)
function decodeJWT(token: string): { email: string; action: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const payload = JSON.parse(atob(parts[1]));
    return { email: payload.email, action: payload.action };
  } catch {
    return null;
  }
}

// Gera uma senha temporária
function generateTemporaryPassword(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 'Content-Type': 'application/json' } });
  }

  try {
    const { token, action } = await req.json();

    if (!token || !action) {
      return new Response(
        JSON.stringify({ error: 'Token e action são obrigatórios' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Decodifica JWT
    const decoded = decodeJWT(token);
    if (!decoded || decoded.action !== action) {
      return new Response(
        JSON.stringify({ error: 'Token inválido ou expirado' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const email = decoded.email;

    // Cria cliente Supabase com service role
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    if (action === 'approve') {
      // 1. Gera senha temporária
      const tempPassword = generateTemporaryPassword();

      // 2. Busca dados do usuário em access_requests
      const { data: accessRequest, error: fetchError } = await supabase
        .from('access_requests')
        .select('full_name')
        .eq('email', email)
        .single();

      if (fetchError || !accessRequest) {
        return new Response(
          JSON.stringify({ error: 'Requisição de acesso não encontrada' }),
          { status: 404, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // 3. Cria usuário no Auth com a senha temporária
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true, // Confirma email automaticamente
        user_metadata: {
          full_name: accessRequest.full_name,
        },
      });

      if (authError) {
        // Se usuário já existe, apenas atualiza a senha
        if (authError.message.includes('already registered')) {
          const { error: updateError } = await supabase.auth.admin.updateUserById(
            email, // Será tratado pelo admin SDK
            { password: tempPassword }
          );

          if (updateError) {
            return new Response(
              JSON.stringify({ error: 'Erro ao atualizar usuário existente' }),
              { status: 500, headers: { 'Content-Type': 'application/json' } }
            );
          }
        } else {
          return new Response(
            JSON.stringify({ error: `Erro ao criar usuário: ${authError.message}` }),
            { status: 500, headers: { 'Content-Type': 'application/json' } }
          );
        }
      }

      // 4. Atualiza access_requests com status = 'approved'
      const { error: updateError } = await supabase
        .from('access_requests')
        .update({
          status: 'approved',
          resolved_at: new Date().toISOString(),
          resolved_by: 'allef@grupovorp.com',
        })
        .eq('email', email);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Erro ao atualizar requisição de acesso' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // 5. Envia email ao usuário com a senha temporária
      const emailHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #4CAF50, #66BB6A); color: white; padding: 20px; border-radius: 8px; text-align: center; }
              .content { padding: 20px; background: #f9f9f9; margin: 20px 0; border-radius: 8px; }
              .password-box { background: #fff; border: 2px solid #ff6b1a; padding: 15px; border-radius: 6px; text-align: center; margin: 15px 0; }
              .password-text { font-size: 18px; font-weight: bold; font-family: monospace; color: #ff6b1a; letter-spacing: 2px; }
              .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 4px; color: #856404; margin: 15px 0; font-size: 12px; }
              .footer { font-size: 12px; color: #999; text-align: center; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Bem-vindo ao AXIS! ✓</h1>
                <p>Sua solicitação de acesso foi aprovada</p>
              </div>

              <div class="content">
                <p>Olá ${accessRequest.full_name},</p>

                <p>Sua solicitação de acesso ao AXIS Dashboard foi <strong>aprovada</strong>!</p>

                <p>Use as credenciais abaixo para fazer login:</p>

                <div class="password-box">
                  <p style="margin: 0 0 10px 0; font-size: 12px; color: #666;">Email</p>
                  <p style="margin: 0; font-size: 14px; font-family: monospace;">${email}</p>

                  <p style="margin: 15px 0 10px 0; font-size: 12px; color: #666;">Senha Temporária</p>
                  <div class="password-text">${tempPassword}</div>
                </div>

                <p style="margin-bottom: 10px;"><strong>Link de acesso:</strong></p>
                <p><a href="https://axis-performance.pages.dev" style="color: #ff6b1a; text-decoration: none; font-weight: bold;">https://axis-performance.pages.dev</a></p>

                <div class="warning">
                  <strong>⚠️ Importante:</strong> Por sua segurança, você deve alterar sua senha no primeiro acesso.
                </div>

                <p style="margin-top: 15px; font-size: 14px;">
                  Se você tiver dúvidas, entre em contato com seu administrador.
                </p>
              </div>

              <div class="footer">
                <p>AXIS Dashboard — Grupo VORP</p>
              </div>
            </div>
          </body>
        </html>
      `;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'noreply@axis-dashboard.com',
          to: email,
          subject: 'Acesso ao AXIS Dashboard Aprovado',
          html: emailHTML,
        }),
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Acesso aprovado! Usuário receberá suas credenciais por email.',
          email,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else if (action === 'reject') {
      // 1. Atualiza access_requests com status = 'rejected'
      const { error: updateError } = await supabase
        .from('access_requests')
        .update({
          status: 'rejected',
          resolved_at: new Date().toISOString(),
          resolved_by: 'allef@grupovorp.com',
        })
        .eq('email', email);

      if (updateError) {
        return new Response(
          JSON.stringify({ error: 'Erro ao atualizar requisição de acesso' }),
          { status: 500, headers: { 'Content-Type': 'application/json' } }
        );
      }

      // 2. Envia email ao usuário informando a rejeição
      const emailHTML = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #f44336, #ef5350); color: white; padding: 20px; border-radius: 8px; text-align: center; }
              .content { padding: 20px; background: #f9f9f9; margin: 20px 0; border-radius: 8px; }
              .footer { font-size: 12px; color: #999; text-align: center; margin-top: 20px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Solicitação Rejeitada</h1>
                <p>Sua solicitação de acesso foi rejeitada</p>
              </div>

              <div class="content">
                <p>Olá,</p>

                <p>Sua solicitação de acesso ao AXIS Dashboard foi <strong>rejeitada</strong>.</p>

                <p>Se você acredita que isso foi um erro ou tem dúvidas, entre em contato com um administrador.</p>
              </div>

              <div class="footer">
                <p>AXIS Dashboard — Grupo VORP</p>
              </div>
            </div>
          </body>
        </html>
      `;

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`,
        },
        body: JSON.stringify({
          from: 'noreply@axis-dashboard.com',
          to: email,
          subject: 'Solicitação de Acesso ao AXIS Dashboard - Rejeitada',
          html: emailHTML,
        }),
      });

      return new Response(
        JSON.stringify({
          success: true,
          message: 'Acesso rejeitado. Usuário foi notificado.',
          email,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Action deve ser "approve" ou "reject"' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : 'Erro desconhecido';
    console.error('[Error]:', errorMsg);
    return new Response(
      JSON.stringify({ error: errorMsg }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
