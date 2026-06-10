# Zynergia — Guía de envío a App Store y Google Play
> Generado 2026-06-10. Build iOS #9 / Android versionCode 3.

---

## 1. CUENTA DEMO para revisores (ya creada, funciona)

```
Email:    reviewer@zynergia.pro
Password: ReviewZyn2026!
```

Pegar en **App Store Connect → App Review Information → Sign-In Information**
y en **Google Play Console → Configuración de app → Acceso a la app**.

---

## 2. NOTAS DE REVISIÓN (App Review Notes — pegar tal cual)

```
Zynergia is a productivity/CRM app for independent network-marketing
distributors (general public). Anyone can subscribe on our website
(https://zynergia.pro) and then sign in to the app — similar to
multiplatform services like Netflix or Notion (guideline 3.1.3(b)).

The app itself contains NO purchases, NO paywall, and NO links to
external payment. It is sign-in only.

Demo account (already subscribed):
Email: reviewer@zynergia.pro
Password: ReviewZyn2026!

Account deletion is available in-app: Settings ("Configuración")
→ "Eliminar mi cuenta".

The blank-screen bug from previous submissions was caused by a
JavaScript bundling error and is fixed in this build. The app now
launches correctly on iPhone and on iPad (compatibility mode).
```

---

## 3. RESPUESTAS AL RECHAZO 3.2 (Business) — pegar en Resolution Center

```
1. Is the app restricted to users who are part of a single company or
   organization?
   No. Zynergia is not affiliated with, restricted to, or built for any
   specific company. It is a general-purpose follow-up/CRM tool that any
   independent network-marketing distributor can use, regardless of which
   company they distribute for.

2. Is the app designed for use by a limited or specific group of
   companies or organizations?
   No. Any individual from the general public can subscribe and use the
   app. There is no invitation, pre-approval, or company affiliation
   required.

3. What features are intended for use by the general public?
   All of them: contact management, automatic follow-up tasks, WhatsApp
   message templates, sales tracking, and partner progress tracking.
   Anyone can discover the product at https://zynergia.pro, subscribe,
   create an account, and download the app.

4. How do users obtain an account?
   Users subscribe on our public website (https://zynergia.pro) with a
   credit/debit card and create their account there, then sign in to the
   app — the same multiplatform model used by services like Netflix
   (guideline 3.1.3(b)). The app itself sells nothing and contains no
   external purchase links.

5. Is there any paid content in the app and if so who pays for it?
   The subscription ($17 USD/month) is purchased by the end user on our
   website, outside the app. Inside the app there are no purchases, no
   paid content, and no payment links.
```

---

## 4. CHECKLIST App Store Connect

- [ ] Nuevo build: correr workflow **ios-distribution** en Codemagic (build #9 ya configurado)
- [ ] App Information → Privacy Policy URL: `https://zynergia.pro/privacy-policy.html`
- [ ] App Review Information → pegar cuenta demo + notas (sección 1 y 2)
- [ ] Resolution Center → responder con el texto de la sección 3
- [ ] App Privacy (Data Collection): declarar
  - Contact Info (email) — App Functionality, linked to user
  - User Content (contactos, notas, fotos) — App Functionality, linked to user
  - Identifiers (user ID) — App Functionality, linked to user
  - NO tracking, NO data sold/shared con terceros
- [ ] Pricing: **Gratis** (la suscripción se compra fuera, NO declarar IAP)
- [ ] Category: Business o Productivity
- [ ] Enviar a revisión

## 5. CHECKLIST Google Play Console (primera publicación)

1. **Build**: correr workflow **android-distribution** en Codemagic → descargar el `.aab`
2. **Producción → Crear versión** → subir el `.aab`
3. **Configuración de app** (panel "Configura tu app" — TODOS son obligatorios):
   - Política de privacidad: `https://zynergia.pro/privacy-policy.html`
   - Acceso a la app: "Toda la funcionalidad requiere acceso" → agregar cuenta demo (sección 1)
   - Anuncios: **No contiene anuncios**
   - Clasificación de contenido: cuestionario → categoría "Utilidad/Productividad" → sin contenido sensible
   - Público objetivo: **18+** (herramienta de negocio)
   - Seguridad de datos (Data Safety):
     - Recopila: Email (funcionalidad), Nombre (funcionalidad), Fotos (opcional, funcionalidad), Contactos del usuario que él registra manualmente (funcionalidad)
     - Datos cifrados en tránsito: SÍ
     - El usuario puede solicitar eliminación: SÍ (in-app, Settings → Eliminar mi cuenta)
     - NO se comparten datos con terceros
   - App de gobierno: No / App financiera: No / Salud: No
4. Países: México + los que quieras (recomiendo: todos los de LATAM + US + España)
5. Enviar a revisión

## 6. Cuando las apps estén aprobadas

Editar `src/lib/app-links.js` con las URLs reales de cada store y hacer
`vercel --prod`. La pantalla `/download` mostrará los QRs automáticamente.
