# Zynergia 1.1 — borrador de metadata para tiendas

No copiar a producción hasta completar los gates de `SUBMISSION-GUIDE.md`, validar el texto legal y tomar screenshots del release candidate real.

## Ficha

- Nombre: **Zynergia**
- Subtítulo de App Store: **Seguimiento para tu red**
- Categoría principal: **Business**
- Categoría secundaria: **Productivity**
- Descripción corta de Google Play: **Organiza contactos, seguimientos, ventas y equipo desde una app sencilla.**

## Descripción larga

Zynergia ayuda a distribuidores independientes y líderes de red a saber qué seguimiento hacer y cuándo hacerlo.

**HOY**
Ve primero la siguiente acción importante. Revisa tareas atrasadas, del día y próximas sin perderte entre menús.

**CONTACTOS**
Organiza prospectos, clientes y socios. Llama, abre WhatsApp, edita y programa seguimientos desde una ficha clara.

**VENTAS**
Registra una venta paso a paso, revisa el resumen antes de guardarla y consulta tu actividad.

**EQUIPO**
Acompaña el avance de tus socios y detecta dónde hace falta seguimiento. Los requisitos de cualquier programa externo deben confirmarse siempre en la documentación oficial vigente.

**HERRAMIENTAS**
Prepara mensajes, plantillas y códigos QR sin salir de tu flujo de trabajo.

Zynergia está diseñada para ser sencilla: botones grandes, instrucciones directas y una acción principal por pantalla.

Zynergia es una herramienta independiente de CoreFlowAI LLC. No está afiliada, patrocinada ni respaldada por Zinzino. Las marcas de terceros pertenecen a sus titulares.

El acceso se contrata y administra fuera de la app. La app móvil no incluye compra, upgrade ni enlaces hacia un checkout externo.

## Notas de versión — 1.1.0

- Nueva pantalla Hoy con la siguiente acción visible.
- Navegación simplificada a Hoy, Contactos, Ventas, Equipo y Cuenta.
- Alta y edición de contactos más claras, con eliminación segura de datos personales.
- Registro de venta paso a paso con borrador recuperable.
- Mejoras de accesibilidad, tamaño de controles, contraste y manejo de errores.
- Inicio de sesión y estado de acceso renovados.
- Estado de acceso y cancelación al final del periodo pagado desde Cuenta; sin compra, precio, actualización de tarjeta ni enlace de pago móvil.
- Herramientas QR generadas localmente.

## Palabras clave de App Store

`contactos,seguimiento,ventas,equipo,tareas,distribuidores,red,negocios,CRM`

## URLs canónicas

- Marketing: `https://zynergia.pro/`
- Soporte: `https://zynergia.pro/soporte`
- Privacidad: `https://zynergia.pro/privacidad`
- Términos: `https://zynergia.pro/terminos`
- Eliminación de cuenta: `https://zynergia.pro/eliminar-cuenta`

## Notas para revisión

Proporcionar la cuenta estable creada mediante `access_grants` exclusivamente en App Store Connect y Play Console; nunca guardar sus credenciales en Git.

Texto base para Apple:

> Zynergia is a consumption-only CRM for independent distributors. Users sign in with an existing account. The iOS app contains no purchase flow, upgrade button, or link to an external checkout. The review account has an explicit complimentary access grant. Account deletion is available in Settings and at https://zynergia.pro/eliminar-cuenta. Zynergia is an independent product of CoreFlowAI LLC and is not affiliated with or endorsed by Zinzino.

## Screenshots del release candidate

1. Hoy: “Lo siguiente” y tareas del día.
2. Contactos: lista clara y búsqueda.
3. Ficha de contacto: Llamar, WhatsApp y Editar.
4. Venta: resumen antes de registrar.
5. Equipo: avance sin importes ni promesas comerciales no verificadas.

Capturar las resoluciones que App Store Connect y Play Console soliciten en el momento del envío; no reutilizar screenshots de 1.0.
