# Zynergia

Aplicación React/Vite empaquetada con Capacitor para iOS y Android. La autenticación y los datos usan Supabase; el alta y la facturación se realizan en el sitio web mediante Stripe.

## Desarrollo local

Requiere Node.js 22.14 y npm 10.9; `.nvmrc` y `package.json` fijan esas versiones.

```sh
npm ci
npm run dev
```

Configura `.env.local` sin subirlo a Git:

```text
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_API_BASE_URL=https://zynergia.pro
VITE_PUBLIC_SITE_URL=https://zynergia.pro
VITE_SUPPORT_EMAIL=
VITE_APP_STORE_URL=https://apps.apple.com/mx/app/zynergia/id6761772857?l=en-GB
VITE_PLAY_STORE_URL=
```

Parte de [`.env.example`](./.env.example). Las claves privilegiadas de Supabase,
Stripe y firma móvil deben existir únicamente en el proveedor de despliegue o
gestor de secretos.

## Verificación

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run test:e2e
```

El gate de release también exige un export `schema-only` de producción, las
políticas RLS/RPC auditadas y la atestación del cron de eliminación. Consulta
[`supabase/README.md`](./supabase/README.md); el gate falla de forma intencional
mientras esos insumos de producción no existan.

Después del build web, sincroniza sólo la plataforma que necesites:

```sh
npx cap sync android
npx cap sync ios
```

Para recorrer la interfaz con datos ficticios, sin iniciar sesión ni conectar
Supabase o Stripe, genera exclusivamente un build local de demostración:

```sh
npm run build:demo
npx cap sync ios
```

El modo exige simultáneamente `--mode demo` y `VITE_DEMO_MODE=true`, y el build
falla si se intenta generar en CI. `npm run build` nunca incluye esta galería.

## Release

La versión móvil candidata es `1.2.0`: Android `versionCode 9` e iOS build `15`. Consulta [SUBMISSION-GUIDE.md](./SUBMISSION-GUIDE.md) antes de generar o enviar artefactos.

Documentos públicos:

- `https://zynergia.pro/privacidad`
- `https://zynergia.pro/terminos`
- `https://zynergia.pro/eliminar-cuenta`
- `https://zynergia.pro/soporte`

## Conciliación de suscripciones anteriores

`POST /api/admin/reconcile-legacy` vincula suscripciones Zynergia existentes con
un único usuario de Supabase cuyo correo ya esté verificado. Sólo considera una
suscripción vigente con exactamente un Price incluido en `STRIPE_MONTHLY_PRICE_ID`,
`STRIPE_ANNUAL_PRICE_ID` o `STRIPE_LEGACY_PRICE_IDS`; cualquier correo, Customer,
suscripción o propietario ambiguo se omite sin fusionarlo.

Para una ejecución controlada, configura temporalmente
`LEGACY_RECONCILIATION_ENABLED=true` y un `LEGACY_RECONCILIATION_SECRET` aleatorio
de al menos 32 caracteres. Invoca el endpoint por `POST` con ese secreto en el
header `Authorization: Bearer …`. La respuesta sólo contiene conteos y motivos,
nunca correos. Al terminar y verificar los grants, vuelve a configurar
`LEGACY_RECONCILIATION_ENABLED=false` y rota o elimina el secreto.
