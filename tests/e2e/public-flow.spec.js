import { expect, test } from '@playwright/test';

async function allowNewSignups(page) {
  await page.route('**/api/billing/signup-status', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ enabled: true }),
  }));
}

test('landing lleva a una cuenta primero y muestra el precio final', async ({ page }) => {
  await allowNewSignups(page);
  await page.goto('/');
  await expect(page.getByRole('link', { name: /17 USD\/mes/i }).first()).toBeVisible();
  await page.getByRole('link', { name: /crear (mi )?cuenta|empezar/i }).first().click();
  await expect(page).toHaveURL(/\/crear-cuenta$/);
  await expect(page.getByRole('heading', { name: 'Crea tu cuenta' })).toBeVisible();
  await expect(page.getByLabel('Nombre completo')).toBeVisible();
  await expect(page.getByLabel('Correo electrónico')).toBeVisible();
  await expect(page.getByLabel('Crea una contraseña')).toHaveAttribute('autocomplete', 'new-password');
  await expect(page.getByLabel('Repite la contraseña')).toHaveAttribute('autocomplete', 'new-password');
  await expect(page.getByRole('button', { name: 'Ver la primera contraseña' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver la contraseña repetida' })).toBeVisible();
});

test('registro explica el error, conserva lo escrito y guía hasta confirmar el correo', async ({ page }) => {
  await allowNewSignups(page);
  let signupRequests = 0;
  await page.route('**/auth/v1/signup**', async route => {
    signupRequests += 1;
    const request = route.request().postDataJSON();
    expect(request.email).toBe('persona@ejemplo.com');
    expect(request.password).toBe('ClaveSegura1!');
    expect(request).not.toHaveProperty('confirmPassword');
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: '11111111-1111-4111-8111-111111111111',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'persona@ejemplo.com',
        confirmation_sent_at: new Date().toISOString(),
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: { full_name: 'Persona Ejemplo' },
        identities: [],
      }),
    });
  });

  await page.goto('/crear-cuenta');
  await page.getByLabel('Nombre completo').fill('Persona Ejemplo');
  await page.getByLabel('Correo electrónico').fill('persona@ejemplo.com');
  await page.getByLabel('Crea una contraseña').fill('ClaveSegura1!');
  await page.getByLabel('Repite la contraseña').fill('ClaveDistinta1!');
  await page.getByLabel(/Acepto los términos/i).check();
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();

  await expect(page.getByText('Las contraseñas no coinciden. Escríbelas igual.')).toBeVisible();
  expect(signupRequests).toBe(0);
  await expect(page.getByLabel('Crea una contraseña')).toHaveValue('ClaveSegura1!');
  await expect(page.getByLabel('Repite la contraseña')).toHaveValue('ClaveDistinta1!');

  await page.getByLabel('Repite la contraseña').fill('ClaveSegura1!');
  await expect(page.getByText('Las contraseñas coinciden.')).toBeVisible();
  await page.getByRole('button', { name: 'Ver la contraseña repetida' }).click();
  await expect(page.getByLabel('Repite la contraseña')).toHaveAttribute('type', 'text');
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();

  await expect(page).toHaveURL(/\/verificar-correo$/);
  await expect(page.getByRole('heading', { name: 'Abre el correo que te enviamos' })).toBeVisible();
  await expect(page.getByText('persona@ejemplo.com')).toBeVisible();
  await expect(page.getByText(/Busca el correo de Zynergia/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Reenviar en \d+ s/ })).toBeDisabled();
  expect(signupRequests).toBe(1);
});

test('registro no crea una cuenta cuando las altas están pausadas', async ({ page }) => {
  let signupRequests = 0;
  await page.route('**/api/billing/signup-status', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ enabled: false }),
  }));
  await page.route('**/auth/v1/signup**', route => {
    signupRequests += 1;
    return route.abort();
  });

  await page.goto('/crear-cuenta');

  await expect(page.getByText(/Las cuentas nuevas están pausadas/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Crear cuenta', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Iniciar sesión' })).toBeVisible();
  expect(signupRequests).toBe(0);
});

test('registro vuelve a validar el cierre antes de enviar datos a Supabase', async ({ page }) => {
  let availabilityChecks = 0;
  let signupRequests = 0;
  await page.route('**/api/billing/signup-status', route => {
    availabilityChecks += 1;
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ enabled: availabilityChecks === 1 }),
    });
  });
  await page.route('**/auth/v1/signup**', route => {
    signupRequests += 1;
    return route.abort();
  });

  await page.goto('/crear-cuenta');
  await page.getByLabel('Nombre completo').fill('Persona Ejemplo');
  await page.getByLabel('Correo electrónico').fill('persona@ejemplo.com');
  await page.getByLabel('Crea una contraseña').fill('ClaveSegura1!');
  await page.getByLabel('Repite la contraseña').fill('ClaveSegura1!');
  await page.getByLabel(/Acepto los términos/i).check();
  await page.getByRole('button', { name: 'Crear cuenta', exact: true }).click();

  await expect(page.getByText(/Las cuentas nuevas están pausadas/i)).toBeVisible();
  expect(availabilityChecks).toBe(2);
  expect(signupRequests).toBe(0);
});

test('inicio y recuperación conservan controles claros', async ({ page }) => {
  let recoveryRequestUrl = '';
  await page.route('**/auth/v1/recover**', route => {
    recoveryRequestUrl = route.request().url();
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.goto('/iniciar-sesion');
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  await expect(page.locator('img.brand-logo')).toHaveCount(1);
  await expect(page.getByLabel('Correo electrónico')).toHaveAttribute('autocomplete', 'email');
  await expect(page.getByLabel('Contraseña', { exact: true })).toHaveAttribute('autocomplete', 'current-password');
  await page.getByLabel('Correo electrónico').fill('persona@ejemplo.com');
  await page.getByRole('button', { name: '¿Olvidaste tu contraseña?' }).click();
  await expect(page.getByRole('heading', { name: 'Restablecer contraseña' })).toBeVisible();
  await expect(page.getByLabel('Correo electrónico')).toHaveValue('persona@ejemplo.com');
  await expect(page.getByText('Remitente: Zynergia')).toBeVisible();
  await expect(page.getByText('Asunto: Zynergia — restablece tu contraseña')).toBeVisible();
  await page.getByRole('button', { name: 'Enviarme el enlace' }).click();
  await expect(page.getByText(/Busca un correo de “Zynergia”/i)).toBeVisible();
  expect(new URL(recoveryRequestUrl).searchParams.get('redirect_to')).toBe('http://127.0.0.1:4173/set-password');
});

test('el QR de descarga nunca contiene sesión ni credenciales', async ({ page }) => {
  await page.goto('/app');
  await expect(page.getByRole('heading', { name: 'Entra a Zynergia desde tu teléfono' })).toBeVisible();
  await expect(page.getByText(/correo y contraseña que acabas de crear/i)).toBeVisible();
  await expect(page.getByRole('link', { name: 'Descargar en App Store' }).first()).toHaveAttribute('href', /apps\.apple\.com\/mx\/app\/zynergia\/id6761772857/);
  await expect(page.getByRole('link', { name: 'Descargar en Google Play' }).first()).toHaveAttribute('href', 'https://play.google.com/store/apps/details?id=com.zynergia.app');
  const qrSources = await page.locator('img.download-qr').evaluateAll(images => images.map(image => image.getAttribute('src')));
  expect(qrSources).toHaveLength(2);
  for (const qrSource of qrSources) {
    expect(qrSource).toMatch(/^data:image\/png;base64,/);
    expect(qrSource).not.toMatch(/token|session|jwt|password/i);
  }
});

test('el login del subdominio permite crear la cuenta en el sitio oficial', async ({ page }) => {
  await page.route('http://app.zynergia.pro:4173/**', async route => {
    const target = new URL(route.request().url());
    const response = await route.fetch({ url: `http://127.0.0.1:4173${target.pathname}${target.search}` });
    await route.fulfill({ response });
  });

  await page.goto('http://app.zynergia.pro:4173/');
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Crear cuenta' })).toHaveAttribute('href', 'https://zynergia.pro/crear-cuenta');
});

test('una ruta CRM en web vuelve al inicio de sesión de Cuenta', async ({ page }) => {
  await page.goto('/Contacts');
  await expect(page).toHaveURL(/\/iniciar-sesion$/);
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
});

test('soporte y legales canónicos son accesibles sin instalar la app', async ({ page }) => {
  for (const path of ['/soporte', '/privacidad', '/terminos']) {
    await page.goto(path);
    await expect(page.getByRole('heading').first()).toBeVisible();
  }
});

test('la ruta web de eliminación explica el proceso y conserva el retorno al login', async ({ page }) => {
  await page.goto('/eliminar-cuenta');
  await expect(page.getByRole('heading', { name: 'Eliminar mi cuenta' })).toBeVisible();
  await expect(page.getByText(/conservar el acceso hasta que termine tu periodo pagado/i)).toBeVisible();
  await expect(page.getByText(/no genera un reembolso automático/i)).toBeVisible();
  await page.getByRole('link', { name: 'Iniciar sesión y continuar' }).click();
  await expect(page).toHaveURL(/\/iniciar-sesion\?returnTo=%2Feliminar-cuenta$/);
  await expect(page.getByText(/volverás a la solicitud/i)).toBeVisible();
});
