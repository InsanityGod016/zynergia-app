# Zynergia 1.1.0 — guía de release y cumplimiento

Actualizada: 1 de septiembre de 2026.

## Estado del artefacto

| Plataforma | Identificador | Versión | Build |
|---|---|---:|---:|
| Android | `com.zynergia.app` | `1.1.0` | `versionCode 7` |
| iOS | `com.zynergia.app` | `1.1.0` | `CFBundleVersion 13` |

Apple Team ID verificado el 2026-09-01: `NR7VZQ9R89`. Este valor alimenta `apple-app-site-association` para Universal Links y Password AutoFill.

Android está configurado para API 36, requisito para apps nuevas y actualizaciones a partir del 31 de agosto de 2026. El build web pasa; el AAB nativo todavía debe generarse en Codemagic, porque esta máquina no tiene Java utilizable. Google Play muestra actualmente `versionCode 6`, por lo que `versionCode 7` está disponible. TestFlight muestra únicamente hasta el build `12`, por lo que el build iOS `13` también está disponible.

## Bloqueadores antes de enviar

- [ ] **Desplegar primero la contención web.** El 19 de agosto de 2026 la producción todavía respondió desde los handlers antiguos de `finalize-account`, `create-checkout`, `connect-create` y `verify-payment`; no devolvía el `410 ENDPOINT_RETIRED` de esta rama. Desplegar estas rutas retiradas, verificar el 410 desde fuera y rotar las credenciales de revisión antes de tocar las llaves de Stripe.
- [ ] **Mantener `NEW_SIGNUPS_ENABLED=false`.** No habilitar Checkout hasta exportar y conciliar Customers, suscripciones, precios y cuentas de Supabase; los duplicados o conflictos pasan a revisión manual.
- [ ] **Exportar y auditar el esquema de producción.** El release gate exige RLS, cuerpos de RPC y pruebas adversariales con dos usuarios y un JWT anterior al borrado. `record_sale` y `anonymize_contact` permanecen bloqueados hasta contar con ese esquema real.
- [ ] **Rotar la contraseña de la cuenta de revisión.** La guía anterior contenía credenciales en Git. Guardar la nueva contraseña sólo en App Store Connect, Play Console y un gestor de secretos.
- [x] **Certificado Android verificado en Play Console (2026-09-01).** El grupo `android_credentials` ya fue validado con la upload key registrada, cuyo SHA-1 es `F0:43:5D:11:94:23:90:57:2D:26:56:1F:CB:1C:CB:94:CC:86:A2:4A`. No sustituir esa llave. El App Signing SHA-256 usado para Android App Links es `48:E3:32:2F:76:49:4B:3A:86:2D:F0:E4:9D:23:7C:0E:25:C0:03:F7:4A:7A:C4:11:51:5F:09:68:78:DA:D0:61`.
- [ ] **Probar la eliminación coordinada con Stripe.** La solicitud debe detener la renovación y programar el borrado para `current_period_end`; sólo una cuenta sin periodo vigente se borra de inmediato. Si Stripe falla, no debe programarse ni ejecutarse el borrado.
- [ ] **Desplegar y vigilar el job de borrado programado.** El cron debe procesar solicitudes vencidas de forma idempotente, borrar datos y autenticación una sola vez, reintentar fallos y generar evidencia operativa sin registrar datos sensibles.
- [x] **Código 1.1 sin precio, checkout, CTA ni enlace de compra en la experiencia nativa.** Volver a comprobarlo en el AAB/IPA final; la app debe seguir siendo estrictamente de inicio de sesión.
- [x] **Copy local 1.1 corregido** para describir facturación web mediante Stripe. La app móvil sólo muestra estado y cancelación de renovación; no contiene compra, precio, actualización de tarjeta ni enlaces de pago. Volver a comprobar las URLs después de desplegar.
- [x] **Autorización del catálogo confirmada por el propietario.** Los 24 productos conservan sus nombres e imágenes originales por instrucción expresa del propietario y las imágenes ya están incluidas localmente, sin hotlinks. Mantener disponible la evidencia escrita de derechos si Apple o Google la solicitan; el disclaimer no sustituye esa autorización.
- [ ] **Confirmar el titular legal del servicio.** CoreFlowAI LLC aparece como publisher en Play, pero falta evidencia local de su domicilio y de que sea el responsable jurídico correcto para estos avisos. Completar nombre, domicilio y datos exigidos antes de publicar; no se inventaron en el repositorio.
- [x] **Logs de producción inventariados.** Vercel y Supabase registran IP, región aproximada, user-agent, rendimiento, errores y datos técnicos ligados a solicitudes. La declaración conservadora incluye ubicación aproximada, identificadores de dispositivo y diagnósticos; no incluye GPS, ubicación precisa, crash SDK, publicidad ni tracking.
- [ ] Configurar y probar un canal atendido en `/soporte`; ningún correo encontrado en el repositorio se considera confirmado. Después, usar el mismo contacto en el sitio, la app y ambas fichas de tienda.
- [ ] **Validar las rutas legales desplegadas.** Vercel redirige los archivos `.html` a páginas React; por ello `/privacidad`, `/terminos`, `/soporte` y `/eliminar-cuenta` deben contener el copy final. Tras iniciar sesión desde `/eliminar-cuenta`, devolver al usuario a esa solicitud, no sólo a `/cuenta`.
- [ ] Publicar y abrir sin autenticación las cuatro URLs legales indicadas abajo.

## Modelo de pagos que debe revisar la tienda

### iOS

La defensa aplicable es **App Review Guideline 3.1.3(f), Free Stand-alone Apps**, no 3.1.3(b). Zynergia se presenta como acompañante gratuito de una herramienta web de pago y la app no debe contener compras ni llamados a comprar fuera.

Texto sugerido para App Review Notes:

```text
Zynergia is a free stand-alone companion to a paid web-based CRM and
productivity service. The iOS app is sign-in only. It contains no purchase
mechanism, pricing, subscription screen, sign-up call to action, or link to
purchase outside the app. Existing customers use their account credentials.

Account deletion is available in Settings > Eliminar mi cuenta. Reviewers can
also use the public deletion resource listed in App Store Connect.

Zynergia is an independent product and is not affiliated with or endorsed by
Zinzino AB or any other company referenced by users or catalog content.
```

No comparar la app con otras marcas ni afirmar que Apple ya aprobó el modelo. Si Review exige IAP, resolverlo antes de volver a enviar; una nota no sustituye la política.

### Marca y contenido de Zinzino

El disclaimer de independencia evita sugerir afiliación, pero **no concede licencia**. Los términos regionales publicados por Zinzino restringen el uso de sus marcas y materiales a lo permitido por sus Marketing Rules & Ethics. Antes de enviar:

1. Obtener autorización escrita aplicable al país del publisher para nombres de producto, imágenes, tablas y terminología de compensación; o sustituirlos por contenido genérico propio.
2. Mantener “Zinzino” fuera del nombre de app, icono, developer name y primeras líneas de metadata salvo permiso expreso.
3. Entregar a Apple/Google la autorización cuando se solicite; Google permite contactar al equipo de Play antes del envío con prueba escrita.

### Google Play

Google permite apps **consumption-only**: un usuario puede iniciar sesión y usar un servicio pagado en otro lugar, pero dentro de la app no debe poder comprar ni ser conducido a un método de pago externo, salvo inscripción formal en un programa regional aplicable.

En Play Console:

- Aplicación gratis; sin productos integrados mientras permanezca consumption-only.
- Acceso a la app: toda la funcionalidad requiere cuenta; proporcionar credenciales de revisión sólo en el campo privado de Play Console.
- No incluir precio, URL de checkout ni instrucciones para pagar en la ficha o dentro de la app.
- Declarar que no contiene anuncios si la compilación revisada efectivamente no los contiene.

## Credenciales de revisión

No guardar correos ni contraseñas reales en el repositorio.

1. Crear una cuenta de revisión estable y con datos ficticios.
2. Confirmar que no caduca durante la revisión.
3. Guardar correo, contraseña y pasos únicamente en:
   - App Store Connect → App Review Information → Sign-In Information.
   - Play Console → App content → App access.
4. Probarla en una instalación limpia antes de cada envío.

## URLs públicas

- Política de privacidad: `https://zynergia.pro/privacidad`
- Opciones de privacidad/eliminación: `https://zynergia.pro/eliminar-cuenta`
- Términos: `https://zynergia.pro/terminos`
- Soporte: `https://zynergia.pro/soporte`

En App Store Connect usar privacidad como **Privacy Policy URL** y eliminación como **User Privacy Choices URL**. En Play Console usar eliminación como la URL web requerida para solicitar borrado de cuenta.

## Google Play Data Safety

Completar el formulario contra el binario final, no copiando respuestas antiguas. Base actual:

| Tipo de dato | Recopilado | Compartido | Vinculado | Finalidad |
|---|---|---|---|---|
| Nombre | Obligatorio | Sí, sólo con equipo vinculado | Sí | Perfil, cuenta y vinculación |
| Correo electrónico | Obligatorio | No; proveedores operan como encargados | Sí | Cuenta, autenticación y soporte |
| Teléfono | Opcional | No; WhatsApp sólo por acción del usuario | Sí | Perfil y CRM |
| ID de usuario | Obligatorio | Sí, sólo con equipo vinculado | Sí | Cuenta, seguridad y vinculación |
| Fotos | Opcional | No | Sí | Foto de perfil y funciones solicitadas |
| Contactos | Opcional | No | Sí | Nombres, teléfonos y red comercial capturados manualmente |
| Historial de compras | Sí | Sí, para reparto y conciliación de pagos nuevos | Sí | Suscripción, acceso y ventas registradas en el CRM |
| Otro contenido generado por el usuario | Opcional | Sólo métricas agregadas con equipo vinculado | Sí | Notas, tareas, etiquetas, enlaces, plantillas y recordatorios |
| Interacciones con la app | Sí | Sí, actividad reciente con equipo vinculado | Sí | Seguimiento, progreso y funcionamiento |
| Ubicación aproximada | Sí, inferida de IP por infraestructura | No; proveedores como encargados | Sí | Seguridad y funcionamiento |
| ID de dispositivo u otros IDs | Sí, declaración conservadora de infraestructura | No; proveedores como encargados | Sí | Seguridad y funcionamiento |
| Diagnósticos | Sí | No; proveedores como encargados | Sí | Rendimiento, errores y seguridad |

Respuestas de seguridad actuales:

- Datos cifrados en tránsito: **Sí**, siempre que el binario final mantenga sólo HTTPS.
- Solicitud de eliminación: **Sí**, dentro de Configuración y en la URL pública.
- Seguimiento o publicidad: **No** en la implementación auditada.
- Permiso/libreta de contactos del dispositivo: **No**; la app no la lee. Aun así, declarar **Contacts** porque almacena nombres, teléfonos y relaciones introducidos manualmente.
- Datos de tarjeta en la app móvil: **No**; Stripe los recoge en el sitio web. Declarar por separado **Purchase history** por las ventas de clientes que el usuario registra en el CRM.

El generador QR, las 24 imágenes incluidas y la composición con imágenes funcionan localmente en el dispositivo; no envían el enlace ni la imagen a un proveedor de QR o CDN. El contenido sólo sale de la app cuando el usuario elige compartirlo mediante el menú del sistema. Volver a revisar esta declaración si se añaden imágenes remotas o un servicio de generación en el futuro.

La infraestructura infiere región aproximada desde IP y conserva logs de solicitudes y autenticación. Por ello el primer release declara **Approximate location**, **Device or other IDs** y **Diagnostics**, todos recopilados, obligatorios, no compartidos para fines publicitarios y no usados para tracking. Vercel y Supabase se tratan como proveedores de servicio.

## App Store Privacy

La declaración de App Store Connect y `PrivacyInfo.xcprivacy` deben coincidir. Declarar, todos vinculados al usuario, para **App Functionality** y sin tracking:

- Name.
- Email Address.
- Phone Number.
- User ID.
- Photos or Videos.
- Contacts.
- Purchase History.
- Other User Content.
- Product Interaction.
- Coarse Location.
- Device ID.
- Performance Data.
- Other Diagnostic Data.

No declarar analítica, publicidad ni tracking mientras no existan en el binario. Volver a revisar si se añade cualquier SDK.

## Eliminación de cuenta

Flujos disponibles:

- App: Configuración → Eliminar mi cuenta → confirmación.
- Web: `https://zynergia.pro/eliminar-cuenta` → inicio de sesión y solicitud autenticada.

Prueba obligatoria antes de enviar:

1. Crear una cuenta de prueba con periodo vigente y registros en todas las tablas.
2. Solicitar la eliminación desde la app y comprobar en Stripe que la renovación queda detenida para `current_period_end`.
3. Confirmar que la cuenta conserva acceso hasta esa fecha y que el estado visible es `pending_deletion`.
4. Ejecutar el job con una fecha de prueba vencida y verificar que elimina filas y autenticación exactamente una vez.
5. Repetir sin periodo vigente y confirmar borrado inmediato.
6. Simular un fallo de Stripe y confirmar que no se programa ni se ejecuta el borrado.
7. Repetir el proceso mediante soporte web y conservar evidencia interna de atención.
8. Reutilizar el JWT emitido antes del borrado e intentar leer, insertar y ejecutar RPC;
   todas las operaciones deben fallar aun antes de que expire el token.

## Firma Android

El AAB de producción debe usar siempre la misma upload key registrada en Play Console. Codemagic espera `ANDROID_KEYSTORE` y `ANDROID_KEY_PASSWORD`, con alias `zynergia`.

En una máquina con Java y la contraseña autorizada:

```sh
keytool -list -v -keystore zynergia.jks -alias zynergia
```

Comparar `SHA-256` con Play Console. Sólo después de confirmar coincidencia:

1. Guardar dos copias cifradas fuera de Git.
2. Quitar el archivo del tracking sin borrar la copia local.
3. Ignorar `*.jks` y `*.keystore`.
4. Si el archivo ya fue público, solicitar rotación de la upload key; nunca rotar la app-signing key por cuenta propia.

El certificado de la upload key ya se comparó con Play App Signing. El archivo local se conserva intacto e ignorado; Git deja de rastrearlo y Codemagic utiliza exclusivamente `ANDROID_KEYSTORE` cifrado.

## CI y artefactos

Los workflows de Codemagic fijan Node 22.14.0, Xcode 26.6, Java 21 en Android y usan `npm ci`. Antes de sincronizar Capacitor ejecutan `lint`, `typecheck`, las pruebas unitarias y el build web.

Android:

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npx cap sync android
cd android && ./gradlew bundleRelease
```

Validar el AAB con Play Console o `bundletool`, instalar una versión derivada y probar inicio de sesión, notificaciones, cámara/fotos, QR, eliminación y ausencia total de compra.

iOS:

```sh
npm ci
npm run lint
npm run typecheck
npm test
npm run build
npx cap sync ios
```

Archivar con el perfil de distribución en Codemagic/Xcode y probar el IPA de TestFlight en instalación limpia.

## Tracks de Google Play

- Internal testing no tiene requisito mínimo y debe usarse primero.
- Si la cuenta es personal y fue creada después del 13 de noviembre de 2023, producción requiere closed test con al menos 12 testers inscritos continuamente durante 14 días, seguido de solicitud de acceso a producción.
- Cuentas de organización o personales anteriores deben confirmar en su Dashboard si Play Console exige el mismo paso.

## App Links y Universal Links

Los archivos `.well-known`, el SHA-256 de Play App Signing, el Team ID de Apple, los entitlements y el enrutamiento `appUrlOpen` ya están versionados. Después de desplegar el release candidate:

1. Verificar HTTP 200, sin redirección y `Content-Type: application/json` en ambos archivos.
2. Regenerar el perfil App Store de `com.zynergia.app` con Associated Domains antes del archive firmado.
3. Probar `/app`, `/iniciar-sesion` y `/set-password` con la app instalada y sin instalar.
4. Confirmar que ningún enlace contiene JWT, contraseña ni `session_id`.

## Fuentes oficiales vigentes

- [Google Play Payments policy](https://support.google.com/googleplay/android-developer/answer/9858738)
- [Google Play: consumption-only y comunicación de pagos](https://support.google.com/googleplay/android-developer/answer/10281818)
- [Google Play Data Safety](https://support.google.com/googleplay/android-developer/answer/10787469)
- [Google Play account deletion](https://support.google.com/googleplay/android-developer/answer/13327111)
- [Google Play testing for new personal accounts](https://support.google.com/googleplay/android-developer/answer/14151465)
- [Google Play target API requirements](https://support.google.com/googleplay/android-developer/answer/11926878)
- [Apple App Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [Apple account deletion](https://developer.apple.com/support/offering-account-deletion-in-your-app/)
- [Apple App Store privacy](https://developer.apple.com/help/app-store-connect/manage-app-information/manage-app-privacy)
- [Google Play Impersonation](https://support.google.com/googleplay/android-developer/answer/9888374)
- [Google Play Intellectual Property](https://support.google.com/googleplay/android-developer/answer/9888072)
- [Zinzino: términos de partner publicados (ejemplo regional)](https://www.zinzino.com/site/in/en-gb/policys-and-terms-india/)
- [Android FileProvider security](https://developer.android.com/privacy-and-security/risks/file-providers)
- [Android backup security](https://developer.android.com/privacy-and-security/risks/backup-best-practices)
- [Codemagic Xcode 26.6 build image](https://docs.codemagic.io/specs-macos/xcode-26-6/)
