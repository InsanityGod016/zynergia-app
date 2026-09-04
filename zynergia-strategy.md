# Zynergia — contexto estratégico 1.1

Este documento resume las decisiones vigentes del producto. La implementación operativa y los bloqueos de publicación están detallados en `README.md` y `SUBMISSION-GUIDE.md`.

## Producto y audiencia

Zynergia es una app móvil de CoreFlowAI LLC para organizar contactos, ventas, tareas y equipos de personas que trabajan en redes de mercadeo. Su audiencia prioritaria es hispanohablante en Latinoamérica e incluye personas de 55 años o más con poca confianza digital.

La experiencia debe ser simple por defecto:

- una acción principal por pantalla;
- lenguaje literal y botones con texto;
- navegación en cuatro destinos: Hoy, Contactos, Ventas y Equipo;
- objetivos táctiles grandes, atrás visible y errores recuperables;
- movimiento breve y semántico inspirado en Left, sin copiar sus assets o código.

## Modelo comercial

- Las altas nuevas cuestan 17 USD finales al mes.
- La cuenta y la verificación de correo ocurren antes del pago.
- Stripe procesa la compra y administración desde `zynergia.pro`.
- Las apps iOS y Android son de consumo: no contienen checkout, upgrade ni enlaces hacia Stripe.
- Los precios o planes legacy se conservan y concilian; no se migran automáticamente.
- El split 80/20 está fuera de 1.1 y sólo se activará después de estabilizar identidad y facturación.

## Web y adquisición

La landing explica el valor y lleva a `/crear-cuenta`. La web también contiene inicio de sesión, verificación, cuenta, facturación, soporte, legal, descarga y eliminación. El CRM permanece exclusivamente en las apps móviles.

El flujo canónico es:

```text
Recomendación → landing → cuenta verificada → Stripe → app iOS/Android → mismo correo y contraseña
```

El QR público sólo abre `https://zynergia.pro/app`; nunca transporta sesión, contraseña o token.

## Fast Start y marcas

Los motores existentes se conservan para no alterar datos históricos. La interfaz no muestra importes, promesas de ingreso ni requisitos comerciales no verificados.

Zynergia usa identidad propia y se presenta como herramienta independiente. No debe usar logos, fotografías, hotlinks, trade dress ni claims de Zinzino u otras marcas sin autorización y fuente vigentes. Cualquier término o regla Fast Start visible se valida antes de publicar.

## Release 1.1

Android actualizará la ficha existente `com.zynergia.app`; iOS y Android salen desde el mismo release candidate. Antes de producción deben pasar seguridad, conciliación Stripe/Supabase, RLS adversarial, legal/Data Safety, pruebas con usuarios 55+ y los gates descritos en `SUBMISSION-GUIDE.md`.

_Última actualización: 19 de agosto de 2026._
