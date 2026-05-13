# Lazos Comunicaciones — estático en Cloudflare Pages

Mismo enfoque que [Consultora Osadia](https://github.com): HTML en la **raíz**, activos bajo `wp-content/` y `wp-includes/js/jquery/`, formulario con **Pages Functions** + **Resend** y captcha numérico (`GET /api/captcha` + `POST /api/contact`).

## Actualizar el sitio desde el export + producción

```bash
node scripts/sync-static.mjs
```

Eso copia `export/wp-content/uploads`, genera `index.html` desde la home en vivo, limpia cabeceras WordPress y vuelca las subpáginas listadas en el script. Editá `SUBDIRS` en `scripts/sync-static.mjs` si agregás entradas.

## Cloudflare Pages

1. Repo / rama `main`.
2. **Build command:** vacío o `exit 0`.
3. **Build output directory:** `.` (punto = raíz del repo).

### Variables (solo en el panel de Pages)

| Nombre | Tipo | Descripción |
|--------|------|-------------|
| `RESEND_API_KEY` | Secret | API de Resend |
| `RESEND_FROM` | Texto | Remitente verificado, ej. `Lazos <hola@tudominio.com>` |
| `CONTACT_TO` | Texto | Correo que recibe los mensajes |
| `CAPTCHA_SECRET` | Secret (opcional) | Si no va, se usa `RESEND_API_KEY` para firmar el captcha |

Sin `wrangler.toml` obligatorio: todo por variables en el proyecto.
