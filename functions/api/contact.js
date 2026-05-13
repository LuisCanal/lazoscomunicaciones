import { captchaSecret, signCaptchaChallenge, timingSafeEqualHex } from "../lib/captcha-hmac.js";

/**
 * POST /api/contact — Resend (variables en Cloudflare Pages).
 * RESEND_API_KEY, RESEND_FROM, CONTACT_TO; opcional CAPTCHA_SECRET.
 */
export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.RESEND_API_KEY || !env.RESEND_FROM || !env.CONTACT_TO) {
    return Response.json({ error: "El servidor de correo no está configurado." }, { status: 503 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "JSON inválido." }, { status: 400 });
  }

  if (body.company) {
    return Response.json({ ok: true }, { status: 200 });
  }

  const secret = captchaSecret(env);
  const n1 = parseInt(body.captcha_n1, 10);
  const n2 = parseInt(body.captcha_n2, 10);
  const sigIn = typeof body.captcha_sig === "string" ? body.captcha_sig.trim() : "";
  const ans = parseInt(String(body.captcha_answer ?? "").trim(), 10);

  if (
    !Number.isInteger(n1) ||
    !Number.isInteger(n2) ||
    n1 < 1 ||
    n1 > 20 ||
    n2 < 1 ||
    n2 > 20 ||
    !sigIn ||
    sigIn.length !== 64 ||
    !Number.isInteger(ans) ||
    ans < 2 ||
    ans > 40
  ) {
    return Response.json({ error: "Completá la verificación numérica." }, { status: 400 });
  }

  const expectedSig = await signCaptchaChallenge(secret, n1, n2);
  if (!timingSafeEqualHex(sigIn.toLowerCase(), expectedSig.toLowerCase()) || ans !== n1 + n2) {
    return Response.json({ error: "La verificación numérica no es correcta." }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 400) : "";
  const email = typeof body.email === "string" ? body.email.trim().slice(0, 320) : "";
  const message = typeof body.message === "string" ? body.message.trim().slice(0, 8000) : "";

  if (!name || !email) {
    return Response.json({ error: "Nombre y correo son obligatorios." }, { status: 400 });
  }

  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  if (!emailOk) {
    return Response.json({ error: "Correo electrónico no válido." }, { status: 400 });
  }

  const subject = `Lazos Comunicaciones — ${name}`;
  const text = `Nombre: ${name}\nCorreo: ${email}\n\n${message || "(sin mensaje)"}`;
  const html = `<p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
<p><strong>Correo:</strong> <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></p>
<p><strong>Mensaje:</strong></p><pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(message)}</pre>`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: env.RESEND_FROM,
      to: [env.CONTACT_TO],
      reply_to: email,
      subject,
      text,
      html,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("Resend error", res.status, errText);
    return Response.json({ error: "No se pudo enviar el mensaje." }, { status: 502 });
  }

  return Response.json({ ok: true });
}

function escapeHtml(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
