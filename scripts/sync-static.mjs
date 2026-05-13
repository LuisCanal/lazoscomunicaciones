#!/usr/bin/env node
/**
 * Sincroniza sitio estático en la RAÍZ del repo (patrón Consultora Osadia).
 * - Copia uploads y JS mínimos desde export/
 * - Descarga index.html desde producción y reemplaza el formulario por el estático + captcha
 * - Copia y limpia subpáginas desde export/
 *
 * Uso: node scripts/sync-static.mjs
 * Requiere red (fetch de la home).
 */
import { cpSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync, existsSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const EXPORT = join(ROOT, "export");
const PROD = "https://www.lazoscomunicaciones.com";

const SUBDIRS = [
  "como-competir-con-la-inteligencia-artificial",
  "como-estudiar-el-mercado-para-tomar-mejores-decisiones",
  "creatividad-diversificacion-claves-para-garantizar-impacto",
  "gestion-de-crisis-como-sinonimo-de-prevencion-y-planificacion",
  "profesionalizamos-la-comunicacion-politica-o-seguimos-el-camino-de-la-improvisacion",
  "lo-importante-es-la-pelicula-no-la-foto",
  "category/sumando-valor",
];

const WPFORM_BLOCK =
  /<section class="avia_codeblock_section[^>]*>[\s\S]*?<!-- \.wpforms-container -->\s*<\/div><\/section>/i;

const FORM_AND_SCRIPT = `
<section class="avia_codeblock_section avia_code_block_0" itemscope itemtype="https://schema.org/ContactPage">
  <div class="avia_codeblock" itemprop="text">
<style>
.contact-honeypot{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;}
#sumate-form.contact-form-wrap .contact-field{margin:0 0 0.85em;}
#sumate-form.contact-form-wrap .contact-sr-only{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0;}
#sumate-form.contact-form-wrap input.wpcf7-form-control,
#sumate-form.contact-form-wrap textarea.wpcf7-form-control{width:100%;max-width:100%;box-sizing:border-box;}
#sumate-form.contact-form-wrap input.wpcf7-form-control::placeholder,
#sumate-form.contact-form-wrap textarea.wpcf7-form-control::placeholder{color:#5a5a5a;opacity:1;}
</style>
<div class="contact-form-wrap" id="sumate-form">
<form id="site-contact-form" method="post" aria-label="Formulario de contacto">
<p class="contact-honeypot" aria-hidden="true"><label>Empresa <input type="text" name="company" tabindex="-1" autocomplete="off"></label></p>
<p class="contact-field"><label class="contact-sr-only" for="cf-name">Nombre y apellido (obligatorio)</label><input class="wpcf7-form-control" required type="text" name="name" id="cf-name" maxlength="400" autocomplete="name" placeholder="Nombre y apellido *"></p>
<p class="contact-field"><label class="contact-sr-only" for="cf-email">Correo electrónico (obligatorio)</label><input class="wpcf7-form-control" required type="email" name="email" id="cf-email" maxlength="320" autocomplete="email" placeholder="Correo electrónico *"></p>
<p class="contact-field"><label class="contact-sr-only" for="cf-message">Mensaje</label><textarea class="wpcf7-form-control" name="message" id="cf-message" rows="6" maxlength="8000" placeholder="Comentario o mensaje"></textarea></p>
<p class="contact-field"><label class="contact-sr-only" for="cf-captcha">Verificación: resultado de la suma (obligatorio)</label>
<input size="10" maxlength="4" class="wpcf7-form-control" required type="text" inputmode="numeric" pattern="[0-9]*" id="cf-captcha" autocomplete="off" title="Resultado de la suma" placeholder="Cargando verificación…" aria-describedby="cf-status"></p>
<p><button class="wpcf7-form-control wpcf7-submit" type="submit" id="cf-submit">Enviar</button></p>
<div id="cf-status" aria-live="polite" role="status" style="min-height:1.5em;color:#fff;"></div>
</form>
</div>
<script>
(function () {
  var form = document.getElementById("site-contact-form");
  if (!form) return;
  var statusEl = document.getElementById("cf-status");
  function loadCaptcha() {
    var cap = document.getElementById("cf-captcha");
    delete form.dataset.captchaN1;
    delete form.dataset.captchaN2;
    delete form.dataset.captchaSig;
    if (cap) {
      cap.value = "";
      cap.placeholder = "Cargando verificación…";
      cap.setAttribute("aria-label", "Verificación numérica");
    }
    return fetch("/api/captcha", { method: "GET", credentials: "same-origin" })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (!x.ok || !x.j || typeof x.j.n1 !== "number" || typeof x.j.n2 !== "number" || !x.j.sig) throw new Error("bad");
        form.dataset.captchaN1 = String(x.j.n1);
        form.dataset.captchaN2 = String(x.j.n2);
        form.dataset.captchaSig = x.j.sig;
        if (cap) {
          var ph = "¿Cuánto es " + x.j.n1 + " + " + x.j.n2 + "? *";
          cap.placeholder = ph;
          cap.setAttribute("aria-label", "¿Cuánto es " + x.j.n1 + " más " + x.j.n2 + "? Escribí el resultado.");
        }
      })
      .catch(function () {
        if (cap) {
          cap.placeholder = "Error: recargá la página";
          cap.setAttribute("aria-label", "Error al cargar la verificación");
        }
      });
  }
  loadCaptcha();
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (form.querySelector('[name="company"]').value) return;
    var btn = document.getElementById("cf-submit");
    var capVal = (document.getElementById("cf-captcha") || {}).value;
    if (!form.dataset.captchaSig || capVal === "" || capVal === undefined) {
      statusEl.textContent = "Completá la suma de verificación.";
      loadCaptcha();
      return;
    }
    var payload = {
      name: (document.getElementById("cf-name") || {}).value || "",
      email: (document.getElementById("cf-email") || {}).value || "",
      message: (document.getElementById("cf-message") || {}).value || "",
      captcha_n1: parseInt(form.dataset.captchaN1, 10),
      captcha_n2: parseInt(form.dataset.captchaN2, 10),
      captcha_sig: form.dataset.captchaSig,
      captcha_answer: String(capVal).trim()
    };
    btn.disabled = true;
    statusEl.textContent = "Enviando…";
    fetch("/api/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, j: j }; }); })
      .then(function (x) {
        if (x.ok) {
          statusEl.textContent = "¡Gracias! Tu mensaje fue enviado.";
          form.reset();
          loadCaptcha();
        } else {
          statusEl.textContent = (x.j && x.j.error) || "No se pudo enviar. Intentá de nuevo.";
          loadCaptcha();
        }
      })
      .catch(function () {
        statusEl.textContent = "Error de red. Intentá de nuevo.";
        loadCaptcha();
      })
      .finally(function () { btn.disabled = false; });
  });
})();
</script>
  </div>
</section>`;

function absolutize(html) {
  return html.split(PROD).join("").replaceAll("http://www.lazoscomunicaciones.com", "");
}

function stripHead(html) {
  let h = html;
  h = h.replace(/<link[^>]+rel=['"]canonical['"][^>]*>/gi, "");
  h = h.replace(/<meta[^>]+name=['"]robots['"][^>]*max-image-preview[^>]*>/gi, "");
  h = h.replace(/<link[^>]+rel=['"]alternate['"][^>]*application\/rss\+xml[^>]*>/gi, "");
  h = h.replace(/<link[^>]+oembed[^>]*>/gi, "");
  h = h.replace(/<link[^>]+api\.w\.org[^>]*>/gi, "");
  h = h.replace(/<link[^>]+EditURI[^>]*>/gi, "");
  h = h.replace(/<link[^>]+pingback[^>]*>/gi, "");
  h = h.replace(/<link[^>]+shortlink[^>]*>/gi, "");
  h = h.replace(/<meta[^>]+name=['"]generator['"][^>]*>/gi, "");
  h = h.replace(/<style id=['"]wp-img-auto-sizes[^<]*<\/style>/gi, "");
  h = h.replace(/<style id=['"]wp-block-library[^<]*<\/style>/gi, "");
  h = h.replace(/<style id=['"]global-styles-inline-css['"][^<]*<\/style>/gi, "");
  h = h.replace(/<link[^>]+wpforms[^>]*>/gi, "");
  h = h.replace(/<style id=['"]wpforms[^<]*<\/style>/gi, "");
  h = h.replace(/<link[^>]+mediaelement[^>]*>/gi, "");
  h = h.replace(/<link[^>]+wp-mediaelement[^>]*>/gi, "");
  h = h.replace(/<script[^>]+speculationrules[^<]*<\/script>/gis, "");
  h = h.replace(/<!--\s*Fragmento de código de Google Analytics[\s\S]*?<\/script>/gi, "");
  h = h.replace(/<!--\s*Fragmento de código de la etiqueta de Google[\s\S]*?<\/script>/gi, "");
  h = h.replace(/<!--\s*Debugging Info for Theme support:[\s\S]*?-->/, "");
  return h;
}

function stripFooterScripts(html) {
  let h = html;
  h = h.replace(/<script[^>]+wpforms[^<]*<\/script>/gi, "");
  h = h.replace(/<script[^>]+jquery\.validate[^<]*<\/script>/gi, "");
  h = h.replace(/<script[^>]+mailcheck[^<]*<\/script>/gi, "");
  h = h.replace(/<script[^>]+punycode[^<]*<\/script>/gi, "");
  h = h.replace(/<script[^>]+wpforms-generic-utils[^<]*<\/script>/gi, "");
  h = h.replace(/<script[^>]+wpforms-js[^<]*<\/script>/gi, "");
  h = h.replace(/<script[^>]+wpforms-modern[^<]*<\/script>/gi, "");
  h = h.replace(/<script[^>]+wpforms-recaptcha[^<]*<\/script>/gi, "");
  h = h.replace(/<script[^>]+recaptcha\/api\.js[^<]*<\/script>/gi, "");
  h = h.replace(/<script[^>]+wpforms-address[^<]*<\/script>/gi, "");
  h = h.replace(/<script[^>]+id=['"]wpforms-recaptcha-js-after['"][^<]*<\/script>/gi, "");
  h = h.replace(/<script[^>]+var wpforms_settings[\s\S]*?<\/script>/gi, "");
  h = h.replace(/<script[^>]+mediaelement-core[^<]*<\/script>/gi, "");
  h = h.replace(/<script[^>]+mediaelement-migrate[^<]*<\/script>/gi, "");
  h = h.replace(/<script[^>]+wp-mediaelement[^<]*<\/script>/gi, "");
  h = h.replace(/<script[^>]+id=['"]mediaelement-core-js-before['"][^<]*<\/script>/gi, "");
  h = h.replace(/<script[^>]+id=['"]mediaelement-js-extra['"][^<]*<\/script>/gi, "");
  h = h.replace(/<script[^>]+id=['"]avia_google_recaptcha_front_script-js-extra['"][^<]*<\/script>/gi, "");
  h = h.replace(/<script[^>]+id=['"]avia-footer-scripts-js-extra['"][^<]*<\/script>/gi, "");
  return h;
}

function fixQuienes(html) {
  return html.replace(
    /\n<\/p>\n<\/div><\/div><\/div><!-- close content main div --><\/div><\/div><\/div><div id=['"]sumate['"]/,
    "\n</div></div></div><!-- close content main div --></div></div></div><div id='sumate'"
  );
}

/** Enfold + WP: imágenes con avia-img-lazy-loading suelen ir con loading=lazy y sizes="auto, …".
 *  En sliders (.slide-entry-wrap visibility:hidden hasta el JS) Chrome puede no cargar/pintar el src.
 *  Quitamos lazy + prefijo "auto," en sizes y la clase placeholder. */
function fixAviaLazyImages(html) {
  return html.replace(/<img\b([^>]*)>/gi, (full, inner) => {
    if (!/avia-img-lazy-loading-\d+/.test(inner)) return full;
    let s = inner
      .replace(/\sloading="lazy"/gi, "")
      .replace(/\sloading='lazy'/gi, "")
      .replace(/\s*avia-img-lazy-loading-\d+\s*/g, " ")
      .replace(/sizes\s*=\s*"auto,\s*/gi, 'sizes="')
      .replace(/sizes\s*=\s*'auto,\s*/gi, "sizes='");
    return `<img${s}>`;
  });
}

/** Pie de página: «Todos los Derechos Reservados YYYY» al año actual. */
function refreshCopyrightYear(html) {
  const y = String(new Date().getFullYear());
  return html.replace(
    /(Todos los Derechos Reservados )\d{4}(\s*\|\s*Lazos Comunicaciones)/gi,
    `$1${y}$2`
  );
}

function injectCanonicalAndDesc(html, title, description, path) {
  const canon = `${PROD}${path.endsWith("/") ? path : path + "/"}`;
  const block = `
<link rel="canonical" href="${canon}" />
<meta name="description" content="${description.replace(/"/g, "&quot;")}" />`;
  if (html.includes('<meta name="description"')) return html;
  return html.replace(/<\/title>/i, `</title>\n${block}`);
}

async function fetchText(url) {
  const r = await fetch(url, {
    redirect: "follow",
    headers: { "user-agent": "Mozilla/5.0 (compatible; LazosStaticSync/1)" },
  });
  const text = await r.text();
  if (!r.ok && !/<!DOCTYPE/i.test(text)) {
    throw new Error(`GET ${url} → ${r.status}`);
  }
  return text;
}

function copyTree(src, dest) {
  mkdirSync(dirname(dest), { recursive: true });
  cpSync(src, dest, { recursive: true });
}

async function main() {
  console.log("Copiando wp-content/uploads desde export…");
  const uploadsSrc = join(EXPORT, "wp-content", "uploads");
  const uploadsDest = join(ROOT, "wp-content", "uploads");
  if (!existsSync(uploadsSrc)) throw new Error("No existe export/wp-content/uploads");
  rmSync(uploadsDest, { recursive: true, force: true });
  copyTree(uploadsSrc, uploadsDest);

  const jqDir = join(ROOT, "wp-includes", "js", "jquery");
  mkdirSync(jqDir, { recursive: true });
  cpSync(join(EXPORT, "wp-includes", "js", "jquery", "jquery.min.js"), join(jqDir, "jquery.min.js"));
  cpSync(join(EXPORT, "wp-includes", "js", "jquery", "jquery-migrate.min.js"), join(jqDir, "jquery-migrate.min.js"));

  const fontBase = join(EXPORT, "wp-content", "themes", "enfold", "config-templatebuilder", "avia-template-builder", "assets", "fonts");
  for (const sub of ["entypo-fontello", "entypo-fontello-enfold"]) {
    const srcDir = join(fontBase, sub);
    if (!existsSync(srcDir)) continue;
    const dest = join(ROOT, "wp-content", "themes", "enfold", "config-templatebuilder", "avia-template-builder", "assets", "fonts", sub);
    mkdirSync(dest, { recursive: true });
    for (const f of readdirSync(srcDir)) {
      if (/\.(woff2?|ttf|svg|eot)$/i.test(f)) cpSync(join(srcDir, f), join(dest, f));
    }
  }
  const html5 = join(EXPORT, "wp-content", "themes", "enfold", "js", "html5shiv.js");
  if (existsSync(html5)) {
    mkdirSync(join(ROOT, "wp-content", "themes", "enfold", "js"), { recursive: true });
    cpSync(html5, join(ROOT, "wp-content", "themes", "enfold", "js", "html5shiv.js"));
  }

  const dotsDir = join(ROOT, "wp-content", "themes", "enfold", "images", "background-images");
  mkdirSync(dotsDir, { recursive: true });
  const dotsPath = join(dotsDir, "dots-mini-strong-compressed.png");
  if (!existsSync(dotsPath)) {
    console.log("Descargando textura de fondo…");
    const buf = await fetch(`${PROD}/wp-content/themes/enfold/images/background-images/dots-mini-strong-compressed.png`).then((r) => r.arrayBuffer());
    writeFileSync(dotsPath, Buffer.from(buf));
  }

  console.log("Descargando home…");
  let home = await fetchText(`${PROD}/`);
  home = absolutize(home);
  home = stripHead(home);
  home = stripFooterScripts(home);
  home = fixQuienes(home);
  home = fixAviaLazyImages(home);
  home = home.replace(WPFORM_BLOCK, FORM_AND_SCRIPT);
  home = injectCanonicalAndDesc(
    home,
    "Lazos Comunicaciones",
    "Estrategia de comunicación, estudios de opinión y asesoramiento en Entre Ríos. Lazos Comunicaciones.",
    "/"
  );
  home = refreshCopyrightYear(home);
  writeFileSync(join(ROOT, "index.html"), home, "utf8");

  for (const sub of SUBDIRS) {
    const src = join(EXPORT, sub, "index.html");
    if (!existsSync(src)) {
      console.warn("Omitido (no hay archivo):", sub);
      continue;
    }
    let h = readFileSync(src, "utf8");
    h = absolutize(h);
    h = stripHead(h);
    h = stripFooterScripts(h);
    h = fixAviaLazyImages(h);
    const titleM = h.match(/<title>([^<]*)<\/title>/i);
    const rawTitle = titleM ? titleM[1].replace(/\s*[–-]\s*Lazos.*$/i, "").trim() : sub;
    const desc = `${rawTitle} — Lazos Comunicaciones.`;
    const path = "/" + sub + "/";
    h = injectCanonicalAndDesc(h, `${rawTitle} | Lazos`, desc, path);
    h = refreshCopyrightYear(h);
    const outDir = join(ROOT, sub);
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "index.html"), h, "utf8");
    console.log("Subpágina:", sub);
  }

  writeFileSync(
    join(ROOT, "_redirects"),
    ["/inicio / 301", "/inicio/ / 301", "/inicio-2 /#sumando-valor 301", "/inicio-2/ /#sumando-valor 301"].join("\n") + "\n",
    "utf8"
  );

  writeFileSync(
    join(ROOT, "_headers"),
    `/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
`,
    "utf8"
  );

  writeFileSync(
    join(ROOT, "robots.txt"),
    `User-agent: *
Allow: /

Sitemap: ${PROD}/sitemap.xml
`,
    "utf8"
  );

  const urls = ["/", ...SUBDIRS.map((s) => "/" + s + "/")];
  const sm = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${PROD}${u}</loc>
    <changefreq>monthly</changefreq>
    <priority>${u === "/" ? "1.0" : "0.7"}</priority>
  </url>`
  )
  .join("\n")}
</urlset>
`;
  writeFileSync(join(ROOT, "sitemap.xml"), sm, "utf8");

  console.log("Listo. Cloudflare Pages: build output = . (raíz), sin comando de build.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
