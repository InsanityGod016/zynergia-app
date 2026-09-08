import { expect, test } from '@playwright/test';

async function enterDemo(page) {
  await page.goto('/demo');
  await page.getByRole('button', { name: 'Entrar a la demostración' }).click();
  await expect(page.locator('h1').filter({ hasText: 'Hoy' })).toBeVisible();
}

test('Hoy explica la tarea y prepara el mensaje antes de abrir WhatsApp', async ({ page }) => {
  await enterDemo(page);
  await expect(page.getByText('AVANCE DE HOY')).toBeVisible();
  await page.getByRole('button', { name: /Mensaje listo/ }).first().click();
  await expect(page.getByRole('heading', { name: /Mensaje para/ })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Copiar mensaje' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Abrir WhatsApp' })).toBeVisible();
});

test('permite agregar y volver a encontrar un contacto sin tocar datos reales', async ({ page }) => {
  await enterDemo(page);
  await page.getByRole('button', { name: 'Contactos', exact: true }).click();
  await page.getByRole('button', { name: 'Agregar', exact: true }).click();
  await page.getByLabel('Nombre completo').fill('Elena Torres');
  await page.getByLabel('Teléfono').fill('+52 55 0000 0199');
  await page.getByLabel('Tipo de contacto').selectOption('cliente');
  await page.getByLabel('Siguiente acción').fill('Revisar entrega mañana');
  await page.getByRole('button', { name: 'Agregar contacto' }).click();
  await expect(page.getByRole('heading', { name: 'Elena Torres' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: /Elena Torres/ })).toBeVisible();
});

test('registra una venta con los mismos cuatro pasos de la app real', async ({ page }) => {
  await enterDemo(page);
  await page.getByRole('button', { name: 'Ventas', exact: true }).click();
  await page.getByRole('button', { name: 'Registrar venta' }).click();
  await expect(page.getByText('Paso 1 de 4')).toBeVisible();
  await page.getByRole('button', { name: /María López/ }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: /Kit de bienestar/ }).click();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await expect(page.getByRole('heading', { name: 'Fecha de compra' })).toBeVisible();
  await page.getByRole('button', { name: 'Continuar' }).click();
  await page.getByRole('button', { name: /Nueva venta/ }).click();
  await page.getByRole('button', { name: 'Registrar venta' }).click();
  await expect(page.getByRole('heading', { name: 'Venta registrada' })).toBeVisible();
});

test('muestra Fast Start, vincula un partner y crea un QR local', async ({ page }) => {
  await enterDemo(page);
  await page.getByRole('button', { name: 'Equipo', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Fast Start (120 días)' })).toBeVisible();
  await page.getByRole('button', { name: /Mi equipo/ }).click();
  await page.getByRole('button', { name: 'Agregar partner', exact: true }).click();
  await page.getByLabel('Código de partner').fill('SOFIA24');
  await expect(page.getByText('Sofía Valdés')).toBeVisible();
  await page.getByRole('button', { name: 'Agregar partner', exact: true }).last().click();
  await expect(page.getByRole('button', { name: /Sofía Valdés/ })).toBeVisible();

  await page.getByRole('button', { name: 'Hoy', exact: true }).click();
  await page.getByRole('button', { name: /Herramientas/ }).click();
  await page.getByRole('button', { name: /Crear código QR/ }).click();
  await expect(page.getByRole('heading', { name: 'Crear un código QR' })).toBeVisible();
  await page.getByRole('button', { name: 'Crear QR', exact: true }).click();
  await expect(page.getByRole('img', { name: 'Código QR de demostración listo' })).toBeVisible();
});

test('los flujos principales no se desbordan en una pantalla de 320 px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await enterDemo(page);

  for (const destination of ['Hoy', 'Contactos', 'Ventas', 'Equipo']) {
    await page.getByRole('button', { name: destination, exact: true }).click();
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scrollWidth, `${destination} tiene desbordamiento horizontal`).toBe(dimensions.clientWidth);
  }
});
