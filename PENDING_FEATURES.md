# Zynergia — Features Pendientes (Requieren cuentas de developer)

> Documento de implementación lista para ejecutar.
> Cuando lleguen las cuentas de Apple Developer y Google Play, abrir este archivo y seguir los pasos en orden.
> Cada sección incluye los comandos exactos, SQL, y código listo para pegar.

---

## Estado actual (antes de developer accounts)
- ✅ Auth (Supabase email/password)
- ✅ Sistema de tareas + plantillas
- ✅ Partners + Fast Start
- ✅ Código único de partner (viral loop)
- ✅ Importar clientes de partner inactivo
- ✅ Smart tasks según progreso real
- ✅ Deploy en Vercel (landing — sin links de descarga aún)
- ⏳ **Landing page final** — actualizar con links App Store + Google Play cuando la app esté aprobada. El botón "Invitar a Zynergia" dentro de la app también debe apuntar a esas URLs.
- ⏳ Push notifications — falta Firebase + APNs cert
- ⏳ Paywall — falta cuenta RevenueCat + products en stores
- ⏳ Deep linking con código pre-llenado
- ⏳ Sign-In con Apple / Google
- ⏳ Build nativo firmado para stores

---

## 1. PUSH NOTIFICATIONS (Firebase + APNs)

### 1.1 Prerequisitos
- Firebase project creado: `zynergia-app`
- Apple: APNs Auth Key descargada (.p8) → subir a Firebase Console → Project Settings → Cloud Messaging → APNs Auth Key
- Android: `google-services.json` descargado → poner en `android/app/`
- iOS: `GoogleService-Info.plist` descargado → poner en `ios/App/App/`

### 1.2 Instalar plugin

```bash
npm install @capacitor/push-notifications
npx cap sync
```

### 1.3 `src/lib/notifications.js` — reemplazar `initNotifications`

```js
import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';
import { supabase } from './supabaseClient';

export async function initNotifications(userId) {
  if (!Capacitor.isNativePlatform()) return;

  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') return;

  await PushNotifications.register();

  PushNotifications.addListener('registration', async ({ value: token }) => {
    // Guardar token en Supabase
    const uid = userId || (await supabase.auth.getSession()).data.session?.user?.id;
    if (uid) {
      await supabase.from('push_tokens').upsert(
        { user_id: uid, token, platform: Capacitor.getPlatform() },
        { onConflict: 'user_id,platform' }
      );
    }
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('[Push] Received:', notification);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    // Navegar según data.route si existe
    const route = action.notification.data?.route;
    if (route) window.location.hash = route;
  });
}
```

### 1.4 SQL — tabla push_tokens

```sql
CREATE TABLE IF NOT EXISTS push_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  token TEXT NOT NULL,
  platform TEXT DEFAULT 'ios',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, platform)
);
ALTER TABLE push_tokens ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own tokens" ON push_tokens FOR ALL USING (auth.uid() = user_id);
```

### 1.5 Supabase Edge Function — enviar notificaciones de tareas vencidas

```
supabase/functions/send-task-reminders/index.ts
```

```ts
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async () => {
  const today = new Date().toISOString().split('T')[0];

  // Obtener tareas vencidas hoy por usuario
  const { data: tasks } = await supabase
    .from('tasks')
    .select('user_id, task_name')
    .eq('due_date', today)
    .eq('completed', false);

  if (!tasks?.length) return new Response('No tasks today');

  // Agrupar por usuario
  const byUser: Record<string, string[]> = {};
  tasks.forEach(t => {
    if (!byUser[t.user_id]) byUser[t.user_id] = [];
    byUser[t.user_id].push(t.task_name);
  });

  // Enviar notificación a cada usuario
  for (const [userId, taskNames] of Object.entries(byUser)) {
    const { data: tokens } = await supabase
      .from('push_tokens')
      .select('token, platform')
      .eq('user_id', userId);

    if (!tokens?.length) continue;

    const count = taskNames.length;
    const body = count === 1
      ? taskNames[0]
      : `Tienes ${count} tareas pendientes para hoy`;

    // Enviar via Firebase FCM (HTTP v1 API)
    for (const { token } of tokens) {
      await fetch(`https://fcm.googleapis.com/v1/projects/zynergia-app/messages:send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${Deno.env.get('FCM_ACCESS_TOKEN')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token,
            notification: { title: '📋 Zynergia', body },
            data: { route: '/tasks' },
          },
        }),
      });
    }
  }

  return new Response('Done');
});
```

### 1.6 Activar cron en Supabase

```sql
-- En Supabase Dashboard → Database → Extensions → habilitar pg_cron
SELECT cron.schedule(
  'send-task-reminders',
  '0 9 * * *',  -- Todos los días a las 9am UTC
  $$SELECT net.http_post(
    url := 'https://TU_PROJECT.supabase.co/functions/v1/send-task-reminders',
    headers := '{"Authorization": "Bearer TU_ANON_KEY"}'::jsonb
  )$$
);
```

---

## 2. PAYWALL / SUSCRIPCIÓN (RevenueCat)

### 2.1 Prerequisitos
- RevenueCat cuenta creada: https://app.revenuecat.com
- App creada en RevenueCat con bundle ID `com.zynergia.app`
- Producto configurado en App Store Connect: `zynergia_monthly` ($9.99/mes)
- Producto configurado en Google Play: `zynergia_monthly`
- Productos importados en RevenueCat → Offerings → Default

### 2.2 Instalar plugin

```bash
npm install @revenuecat/purchases-capacitor
npx cap sync
```

### 2.3 `src/lib/paywall.js` — archivo nuevo

```js
import { Purchases, LOG_LEVEL } from '@revenuecat/purchases-capacitor';
import { Capacitor } from '@capacitor/core';

const RC_API_KEY_IOS = 'appl_XXXXXX';       // RevenueCat → App Settings → API Keys
const RC_API_KEY_ANDROID = 'goog_XXXXXX';

export async function initPurchases(userId) {
  if (!Capacitor.isNativePlatform()) return;

  const apiKey = Capacitor.getPlatform() === 'ios' ? RC_API_KEY_IOS : RC_API_KEY_ANDROID;
  await Purchases.configure({ apiKey, appUserID: userId });
  if (import.meta.env.DEV) await Purchases.setLogLevel({ level: LOG_LEVEL.DEBUG });
}

export async function checkEntitlement() {
  if (!Capacitor.isNativePlatform()) return true; // En web/dev siempre activo
  try {
    const { customerInfo } = await Purchases.getCustomerInfo();
    return !!customerInfo.entitlements.active['premium'];
  } catch {
    return false;
  }
}

export async function getOfferings() {
  try {
    const { current } = await Purchases.getOfferings();
    return current;
  } catch {
    return null;
  }
}

export async function purchasePackage(pkg) {
  const { customerInfo } = await Purchases.purchasePackage({ aPackage: pkg });
  return !!customerInfo.entitlements.active['premium'];
}

export async function restorePurchases() {
  const { customerInfo } = await Purchases.restorePurchases();
  return !!customerInfo.entitlements.active['premium'];
}
```

### 2.4 `src/pages/Paywall.jsx` — pantalla nueva

```jsx
import { useState, useEffect } from 'react';
import { getOfferings, purchasePackage, restorePurchases } from '@/lib/paywall';
import { Loader2, Star, Check, X } from 'lucide-react';
import { toast } from 'sonner';

const FEATURES = [
  'Tareas de seguimiento ilimitadas',
  'Plantillas de mensajes WhatsApp',
  'Seguimiento de partners y Fast Start',
  'Estadísticas y reportes',
  'Código de partner único',
];

export default function Paywall({ onSuccess, onClose }) {
  const [offering, setOffering] = useState(null);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState(false);

  useEffect(() => {
    getOfferings().then(o => { setOffering(o); setLoading(false); });
  }, []);

  const handlePurchase = async () => {
    if (!offering?.monthly) return;
    setPurchasing(true);
    try {
      const success = await purchasePackage(offering.monthly);
      if (success) { toast.success('¡Suscripción activada!'); onSuccess?.(); }
    } catch (err) {
      if (!err.userCancelled) toast.error('No se pudo procesar el pago');
    } finally {
      setPurchasing(false);
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    try {
      const ok = await restorePurchases();
      if (ok) { toast.success('Suscripción restaurada'); onSuccess?.(); }
      else toast.error('No se encontró suscripción activa');
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-[#001A70] to-[#004AFE] z-[100] flex flex-col">
      {onClose && (
        <button onClick={onClose} className="absolute top-14 right-5 w-9 h-9 flex items-center justify-center rounded-full bg-white/20">
          <X className="w-5 h-5 text-white" />
        </button>
      )}
      <div className="flex-1 flex flex-col items-center justify-center px-8 pt-16">
        <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center mb-6">
          <Star className="w-8 h-8 text-white fill-white" />
        </div>
        <h1 className="text-[28px] font-bold text-white text-center mb-2">Zynergia Pro</h1>
        <p className="text-[15px] text-white/70 text-center mb-8">
          Todo lo que necesitas para hacer crecer tu negocio Zinzino
        </p>
        <div className="w-full space-y-3 mb-8">
          {FEATURES.map(f => (
            <div key={f} className="flex items-center gap-3">
              <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0">
                <Check className="w-4 h-4 text-white" />
              </div>
              <span className="text-[15px] text-white">{f}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="px-6 pb-12 pt-4 space-y-3">
        {loading ? (
          <div className="flex justify-center py-4"><Loader2 className="w-6 h-6 text-white animate-spin" /></div>
        ) : (
          <>
            <button
              onClick={handlePurchase}
              disabled={purchasing}
              className="w-full py-4 bg-white text-[#004AFE] font-bold text-[17px] rounded-2xl active:scale-[0.98] transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {purchasing ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
              {offering?.monthly?.product?.priceString || '$9.99'} / mes
            </button>
            <button onClick={handleRestore} className="w-full py-3 text-white/60 text-[14px] text-center">
              Restaurar compra
            </button>
            <p className="text-[11px] text-white/40 text-center">
              Se renueva automáticamente. Cancela cuando quieras desde App Store / Google Play.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
```

### 2.5 Integrar en `App.jsx` — gate de suscripción

```jsx
// En App.jsx, después de verificar onboarding:
import { checkEntitlement } from '@/lib/paywall';
import Paywall from '@/pages/Paywall';

// En el componente:
const [hasSubscription, setHasSubscription] = useState(null);

useEffect(() => {
  if (user) {
    checkEntitlement().then(setHasSubscription);
  }
}, [user]);

// En el render, después del onboarding check:
if (hasSubscription === false) {
  return <Paywall onSuccess={() => setHasSubscription(true)} />;
}
```

### 2.6 Llamar `initPurchases` en Auth

```jsx
// En AuthContext.jsx, cuando el usuario hace login:
import { initPurchases } from '@/lib/paywall';
// En onAuthStateChange:
if (session?.user?.id) {
  initPurchases(session.user.id).catch(() => {});
}
```

---

## 3. DEEP LINKING — Código pre-llenado en onboarding

### 3.1 Instalar plugin

```bash
npm install @capacitor/app
npx cap sync
```

### 3.2 iOS — `ios/App/App/Info.plist` — agregar URL scheme

```xml
<key>CFBundleURLTypes</key>
<array>
  <dict>
    <key>CFBundleURLName</key>
    <string>com.zynergia.app</string>
    <key>CFBundleURLSchemes</key>
    <array>
      <string>zynergia</string>
    </array>
  </dict>
</array>
```

### 3.3 Android — `android/app/src/main/AndroidManifest.xml` — agregar intent filter

```xml
<intent-filter android:autoVerify="true">
  <action android:name="android.intent.action.VIEW" />
  <category android:name="android.intent.category.DEFAULT" />
  <category android:name="android.intent.category.BROWSABLE" />
  <data android:scheme="zynergia" android:host="invite" />
</intent-filter>
```

### 3.4 `src/App.jsx` — escuchar deep links y pre-llenar código

```jsx
import { App as CapApp } from '@capacitor/app';

useEffect(() => {
  CapApp.addListener('appUrlOpen', ({ url }) => {
    // zynergia://invite?code=RAFA23
    const parsed = new URL(url);
    if (parsed.hostname === 'invite') {
      const code = parsed.searchParams.get('code');
      if (code) {
        // Guardar en localStorage para que Onboarding lo lea
        localStorage.setItem('zynergia_pending_invite_code', code.toUpperCase());
      }
    }
  });
  return () => CapApp.removeAllListeners();
}, []);
```

### 3.5 `src/pages/Onboarding.jsx` — leer código pre-llenado

```jsx
// Al montar el componente (useEffect inicial):
useEffect(() => {
  const pendingCode = localStorage.getItem('zynergia_pending_invite_code');
  if (pendingCode) {
    handleInviteCode(pendingCode);
    localStorage.removeItem('zynergia_pending_invite_code');
  }
}, []);
```

### 3.6 Link de invitación generado en Settings

```jsx
// En Settings.jsx, botón compartir código:
const handleShareCode = () => {
  const deepLink = `zynergia://invite?code=${settings.partner_code}`;
  const text = `Únete a mi equipo en Zynergia. Descarga la app y usa mi código ${settings.partner_code}: ${deepLink}`;
  if (navigator.share) navigator.share({ text });
  else navigator.clipboard.writeText(text).then(() => toast.success('Link copiado'));
};
```

---

## 4. SIGN-IN CON APPLE / GOOGLE

### 4.1 Google Sign-In

```bash
npm install @codetrix-studio/capacitor-google-auth
npx cap sync
```

```js
// src/lib/socialAuth.js
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { supabase } from './supabaseClient';

export async function signInWithGoogle() {
  await GoogleAuth.initialize({
    clientId: 'TU_WEB_CLIENT_ID.apps.googleusercontent.com',
    scopes: ['email', 'profile'],
    grantOfflineAccess: true,
  });
  const googleUser = await GoogleAuth.signIn();
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'google',
    token: googleUser.authentication.idToken,
  });
  if (error) throw error;
  return data;
}
```

### 4.2 Sign-In con Apple

```bash
npm install @capacitor-community/apple-sign-in
npx cap sync
```

```js
// En src/lib/socialAuth.js (agregar):
import { SignInWithApple } from '@capacitor-community/apple-sign-in';

export async function signInWithApple() {
  const response = await SignInWithApple.authorize({
    clientId: 'com.zynergia.app',
    redirectURI: 'https://TU_PROJECT.supabase.co/auth/v1/callback',
    scopes: 'email name',
  });
  const { data, error } = await supabase.auth.signInWithIdToken({
    provider: 'apple',
    token: response.response.identityToken,
  });
  if (error) throw error;
  return data;
}
```

### 4.3 Botones en `src/pages/Login.jsx`

```jsx
// Agregar después del botón de email/password:
import { signInWithGoogle, signInWithApple } from '@/lib/socialAuth';
import { Capacitor } from '@capacitor/core';

// En el render:
{Capacitor.isNativePlatform() && (
  <div className="space-y-3 mt-4">
    <button onClick={signInWithGoogle} className="w-full py-3.5 flex items-center justify-center gap-3 border border-[#E2E8F0] rounded-2xl font-semibold text-[15px] text-[#0F172A]">
      <img src="/google-icon.svg" className="w-5 h-5" />
      Continuar con Google
    </button>
    {Capacitor.getPlatform() === 'ios' && (
      <button onClick={signInWithApple} className="w-full py-3.5 flex items-center justify-center gap-3 bg-black rounded-2xl font-semibold text-[15px] text-white">
        <img src="/apple-icon.svg" className="w-5 h-5" />
        Continuar con Apple
      </button>
    )}
  </div>
)}
```

---

## 5. BUILD Y SUBMISSION A STORES

### 5.1 Configuración final en `capacitor.config.ts`

```ts
const config: CapacitorConfig = {
  appId: 'com.zynergia.app',
  appName: 'Zynergia',
  webDir: 'dist',
  plugins: {
    PushNotifications: {
      presentationOptions: ['badge', 'sound', 'alert'],
    },
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#004AFE',
      showSpinner: false,
    },
  },
};
```

### 5.2 Comandos para build

```bash
# Rebuild web
npm run build

# Sync a nativo
npx cap sync

# Abrir iOS (requiere Xcode en Mac)
npx cap open ios

# Abrir Android
npx cap open android
```

### 5.3 iOS — pasos en Xcode

1. Seleccionar target `App`
2. Signing & Capabilities → seleccionar tu Team (Apple Developer account)
3. Bundle Identifier: `com.zynergia.app`
4. Agregar capability: Push Notifications
5. Agregar capability: Sign In with Apple
6. Product → Archive → Distribute App → App Store Connect

### 5.4 Android — pasos en Android Studio

1. Build → Generate Signed Bundle / APK → Android App Bundle
2. Crear keystore nuevo (guardar el `.jks` y contraseña en lugar seguro)
3. Subir `.aab` a Google Play Console → Producción → Release

### 5.5 Checklist pre-submission

- [ ] Privacy Policy URL: https://zynergia.app/privacy
- [ ] Terms of Service URL: https://zynergia.app/terms
- [ ] App icon 1024x1024 PNG (sin transparencia)
- [ ] Screenshots iPhone 6.5": 6 capturas de pantalla
- [ ] Screenshots iPhone 5.5": 6 capturas de pantalla
- [ ] Screenshots iPad 12.9" (si aplica)
- [ ] Screenshots Android: 8 capturas de pantalla
- [ ] Descripción en español (máx 4000 caracteres)
- [ ] Keywords (máx 100 caracteres en iOS)
- [ ] Categoría: Productivity o Business
- [ ] Rating: 4+ (no hay contenido adulto)

---

## 6. ANALYTICS (Opcional pero recomendado)

### 6.1 Instalar Mixpanel

```bash
npm install mixpanel-browser
```

### 6.2 `src/lib/analytics.js`

```js
import mixpanel from 'mixpanel-browser';

const TOKEN = 'TU_MIXPANEL_TOKEN';

export function initAnalytics(userId) {
  mixpanel.init(TOKEN, { debug: import.meta.env.DEV });
  if (userId) mixpanel.identify(userId);
}

export function track(event, props = {}) {
  try { mixpanel.track(event, props); } catch {}
}

// Eventos a trackear:
// track('Signup Completed', { has_invite_code: bool })
// track('First Sale Added', { product_category: str })
// track('Partner Added', { method: 'code' | 'contact' })
// track('Task Completed', { task_area: str })
// track('Paywall Viewed')
// track('Subscription Started', { plan: 'monthly' })
```

---

## Orden de implementación recomendado al tener las cuentas

1. **Día 1**: Deep linking (no requiere stores, solo config nativa)
2. **Día 1**: Sign-In con Apple + Google (Supabase OAuth)
3. **Día 2**: Paywall con RevenueCat (sandbox testing primero)
4. **Día 3**: Push notifications (Firebase + Edge Function)
5. **Día 4**: Build y submission inicial (TestFlight + Play Internal Testing)
6. **Día 5-7**: Review de Apple (3-5 días típicamente)
7. **Cuando la app esté aprobada y live**: Actualizar landing page con links reales
   - Botón "Descargar en App Store" → link App Store
   - Botón "Descargar en Google Play" → link Play Store
   - Botón "Invitar a Zynergia" dentro de la app → apuntar a la landing con los links
   - Redeploy en Vercel (`vercel --prod`)

---

*Última actualización: 2026-03-25*
