# Zynergia 1.2.0 — borrador de metadata para tiendas

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
Organiza prospectos, clientes y socios. Importa únicamente los contactos que elijas, clasifícalos por lote o agrégalos manualmente. Llama, abre WhatsApp, edita y programa seguimientos desde una ficha clara.

**VENTAS**
Registra en un solo pedido varios productos y cantidades, revisa el resumen antes de guardarlo y consulta tu actividad. Cada pedido se identifica como nueva venta o recompra.

**EQUIPO**
Acompaña el avance de tus socios, revisa el avance por kits Premier y detecta dónde hace falta seguimiento. Los requisitos de cualquier programa externo deben confirmarse siempre en la documentación oficial vigente.

**HERRAMIENTAS**
Prepara mensajes, organiza plantillas en categorías, comparte plantillas mediante enlaces temporales y crea códigos QR sin salir de tu flujo de trabajo. Personaliza tus productos con una foto tomada o elegida desde el dispositivo.

**AVISOS Y ACTUALIZACIONES**
Configura recordatorios de tareas, un resumen diario y avisos de Fast Start. Zynergia también puede avisarte cuando exista una actualización disponible.

Zynergia está diseñada para ser sencilla: botones grandes, instrucciones directas y una acción principal por pantalla.

Zynergia es una herramienta independiente de CoreFlowAI LLC. No está afiliada, patrocinada ni respaldada por Zinzino. Las marcas de terceros pertenecen a sus titulares.

El acceso se contrata y administra fuera de la app. La app móvil no incluye compra, upgrade ni enlaces hacia un checkout externo.

## Notas de versión — 1.2.0

- Importación opcional de contactos seleccionados, con detección de duplicados y clasificación por lote.
- Pedidos con varios productos y cantidades en un solo registro.
- Fast Start actualizado para contabilizar unidades de los kits Premier oficiales en pedidos de nueva venta.
- Fotos personalizadas para productos desde la cámara o fototeca.
- Categorías personalizadas y enlaces temporales para compartir e importar plantillas.
- Recordatorios de tareas, resumen diario y avisos de Fast Start configurables.
- Avisos de actualización opcional u obligatoria cuando exista una incompatibilidad.
- Mejoras de estabilidad en tareas, contactos, ventas, equipo y Cuenta.

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

La app solicita acceso a contactos únicamente después de que la persona toca `Importar contactos`; permite elegir contactos individuales y sólo lee nombre y teléfonos. No escribe ni elimina datos de la libreta del dispositivo. Cámara o fototeca se solicitan únicamente al agregar una foto a un producto. Las notificaciones son opcionales y se explican antes de solicitar el permiso del sistema.

Texto base para Apple:

> Zynergia is a consumption-only CRM for independent distributors. Users sign in with an existing account. The iOS app contains no purchase flow, upgrade button, or link to an external checkout. The review account has an explicit complimentary access grant. Account deletion is available in Settings and at https://zynergia.pro/eliminar-cuenta. Zynergia is an independent product of CoreFlowAI LLC and is not affiliated with or endorsed by Zinzino.

## Screenshots del release candidate

1. Hoy: siguiente acción, tareas del día y recordatorios configurables.
2. Contactos: búsqueda e importación con selección individual.
3. Venta: carrito con varios productos y resumen antes de registrar.
4. Productos: edición y selección de foto desde el dispositivo.
5. Plantillas: categorías, selección y compartir.
6. Equipo: avance por kits Premier sin promesas comerciales no verificadas.
7. Cuenta: preferencias de notificaciones y búsqueda de actualizaciones.

Capturar las resoluciones que App Store Connect y Play Console soliciten en el momento del envío; no reutilizar screenshots de versiones anteriores.
