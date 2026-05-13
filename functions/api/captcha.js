import { captchaSecret, signCaptchaChallenge } from "../lib/captcha-hmac.js";

/** GET /api/captcha — suma aleatoria + firma (no cachear). */
export async function onRequestGet(context) {
  const { env } = context;
  const secret = captchaSecret(env);
  if (!secret) {
    return Response.json({ error: "Captcha no disponible." }, { status: 503 });
  }

  const n1 = 1 + Math.floor(Math.random() * 12);
  const n2 = 1 + Math.floor(Math.random() * 12);
  const sig = await signCaptchaChallenge(secret, n1, n2);

  return Response.json(
    { n1, n2, sig },
    {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    }
  );
}
