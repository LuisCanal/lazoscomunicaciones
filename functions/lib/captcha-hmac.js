/**
 * Firma del captcha numérico (compartido por /api/captcha y /api/contact).
 * Secreto: CAPTCHA_SECRET si existe; si no, RESEND_API_KEY.
 */
export function captchaSecret(env) {
  return (env.CAPTCHA_SECRET || env.RESEND_API_KEY || "").trim();
}

export async function signCaptchaChallenge(secret, n1, n2) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret.slice(0, 256)),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const payload = enc.encode(`lazos-captcha|v1|${n1}|${n2}`);
  const buf = await crypto.subtle.sign("HMAC", key, payload);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function timingSafeEqualHex(a, b) {
  if (typeof a !== "string" || typeof b !== "string" || a.length !== b.length) {
    return false;
  }
  let x = 0;
  for (let i = 0; i < a.length; i++) {
    x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return x === 0;
}
