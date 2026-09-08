# Zynergia 1.2.0 — guía de release y cumplimiento

Actualizada: 7 de septiembre de 2026.

## Estado del artefacto

| Plataforma | Identificador | Versión | Build |
|---|---|---:|---:|
| Android | `com.zynergia.app` | `1.2.0` | `versionCode 9` confirmado libre |
| iOS | `com.zynergia.app` | `1.2.0` | `CFBundleVersion 15` confirmado libre |

Apple Team ID verificado el 2026-09-01: `NR7VZQ9R89`. Este valor alimenta `apple-app-site-association` para Universal Links y Password AutoFill.

Android está configurado para API 36. El 7 de septiembre de 2026 se comprobó en App Store Connect que el último build cargado es `14` y en Google Play que los códigos usados son `1, 4, 5, 6 y 7`; por ello se fijaron el build iOS `15` y Android `versionCode 9`. Los binarios iOS y Android deben salir del mismo SHA verificado; no se activa el manifiesto remoto hasta que cada ficha sea pública.

## Bloqueadores antes de enviar

- [ ] **Aplicar y exportar las migraciones 1.2 antes de compilar.** El release gate debe comprobar tablas, columnas, RLS y cuerpos reales de RPC contra un snapshot de producción sin filas ni secretos. Mantener temporalmente los contratos 1.1 para instalaciones antiguas.
- [ ] **Desplegar primero el sitio y los textos legales 1.2.** Verificar desde fuera que `/.well-known/mobile-releases.json`, `/privacidad`, `/terminos`, `/soporte` y `/eliminar-cuenta` sirven la versión nueva antes de distribuir binarios.
- [ ] **Mantener desactivada cada plataforma en el manifiesto hasta que su ficha sea pública.** Al publicar 1.2, cambiar `latestBuild`; conservar el `minimumBuild` anterior salvo incompatibilidad confirmada. Un error de red o de JSON nunca debe bloquear la app.
- [ ] **Configurar y probar OneSignal extremo a extremo.** Confirmar el mismo App ID en cliente y servidor, REST API key sólo en servidor, APNs y FCM en OneSignal, perfiles con Push/App Group/Associated Domains y entrega en dispositivos físicos.
- [x] **Programador compatible con Vercel Hobby preparado.** El worker `/api/notifications/process` no usa un cron horario de Vercel. `supabase/scripts/configure-notification-cron.sql` configura `pg_cron` + `pg_net` cada diez minutos y obtiene URL/secreto desde Vault; falta aplicarlo en producción junto con las migraciones.
- [ ] **Rotar la contraseña de la cuenta de revisión.** La guía anterior contenía credenciales en Git. Guardar la nueva contraseña sólo en App Store Connect, Play Console y un gestor de secretos.
- [x] **Upload key Android fijada en Codemagic.** SHA-1: `16:54:71:1F:4B:E5:93:99:AD:95:A7:4A:20:88:CF:BF:1C:65:CB:B7`; SHA-256: `33:3A:D5:C4:5D:6B:12:7D:94:EF:B6:D8:90:5E:D0:C6:66:4C:0F:E6:1C:3E:E0:9A:C5:74:D7:EB:2B:B9:BF:6E`. El SHA-256 de **Play App Signing**, usado sólo en Android App Links, sigue siendo `48:E3:32:2F:76:49:4B:3A:86:2D:F0:E4:9D:23:7C:0E:25:C0:03:F7:4A:7A:C4:11:51:5F:09:68:78:DA:D0:61`. No intercambiar ambas llaves.
- [ ] **Revisar permisos y declaraciones contra el binario 1.2 final.** Deben aparecer `READ_CONTACTS` y notificaciones; deben quedar fuera `WRITE_CONTACTS` y permisos de alarma exacta. Declarar contactos seleccionados, imágenes privadas de productos y el identificador técnico de OneSignal en App Privacy y Data Safety.
- [ ] **Probar la eliminación coordinada con Stripe.** La solicitud debe detener la renovación y programar el borrado para `current_period_end`; sólo una cuenta sin periodo vigente se borra de inmediato. Si Stripe falla, no debe programarse ni ejecutarse el borrado.
- [ ] **Desplegar y vigilar el job de borrado programado.** El cron debe procesar solicitudes vencidas de forma idempotente, borrar datos y autenticación una sola vez, reintentar fallos y generar evidencia operativa sin registrar datos sensibles.
- [x] **Código móvil sin precio, checkout, CTA ni enlace de compra en la experiencia nativa.** Volver a comprobarlo en el AAB/IPA 1.2 final; la app debe seguir siendo estrictamente de inicio de sesión.
- [x] **Copy móvil corregido** para describir facturación web mediante Stripe. La app móvil sólo muestra estado y cancelación de renovación; no contiene compra, precio, actualización de tarjeta ni enlaces de pago. Volver a comprobar las URLs después de desplegar.
- [x] **Autorización del catálogo confirmada por el propietario.** Los 24 productos conservan sus nombres e imágenes originales por instrucción expresa del propietario y las imágenes ya están incluidas localmente, sin hotlinks. Mantener disponible la evidencia escrita de derechos si Apple o Google la solicitan; el disclaimer no sustituye esa autorización.
- [ ] **Confirmar el titular legal del servicio.** CoreFlowAI LLC aparece como publisher en Play, pero falta evidencia local de su domicilio y de que sea el responsable jurídico correcto para estos avisos. Completar nombre, domicilio y datos exigidos antes de publicar; no se inventaron en el repositorio.
- [x] **Logs de producción inventariados.** Vercel y Supabase registran IP, región aproximada, user-agent, rendimiento, errores y datos técnicos ligados a solicitudes. La declaración conservadora incluye ubicación aproximada, identificadores de dispositivo y diagnósticos; no incluye GPS, ubicación precisa, crash SDK, publicidad ni tracking.
- [ ] Comprobar que `equipo@coreflowia.com` recibe una solicitud real desde `/soporte` y que coincide con la app y ambas fichas de tienda.
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
| Fotos | Opcional | No | Sí | Foto de perfil e imágenes de producto elegidas por el usuario |
| Contactos | Opcional | No | Sí | Nombre y teléfonos de los contactos que el usuario selecciona para importar |
| Historial de compras | Sí | Sí, para reparto y conciliación de pagos nuevos | Sí | Suscripción, acceso y ventas registradas en el CRM |
| Otro contenido generado por el usuario | Opcional | Sólo métricas agregadas con equipo vinculado | Sí | Notas, tareas, etiquetas, enlaces, plantillas y recordatorios |
| Interacciones con la app | Sí | Sí, actividad reciente con equipo vinculado | Sí | Seguimiento, progreso y funcionamiento |
| Ubicación aproximada | Sí, inferida de IP por infraestructura | No; proveedores como encargados | Sí | Seguridad y funcionamiento |
| ID de dispositivo u otros IDs | Sí, declaración conservadora de infraestructura y push | No; proveedores como encargados | Sí | Seguridad, funcionamiento y entrega de avisos habilitados |
| Diagnósticos | Sí | No; proveedores como encargados | Sí | Rendimiento, errores y seguridad |

Respuestas de seguridad actuales:

- Datos cifrados en tránsito: **Sí**, siempre que el binario final mantenga sólo HTTPS.
- Solicitud de eliminación: **Sí**, dentro de Configuración y en la URL pública.
- Seguimiento o publicidad: **No** en la implementación auditada.
- Permiso/libreta de contactos del dispositivo: **Sí, opcional y por acción explícita**. El permiso se solicita al tocar `Importar contactos`; la app lee sólo nombre y teléfonos, muestra selección sin preseleccionar y sube únicamente los contactos confirmados.
- Datos de tarjeta en la app móvil: **No**; Stripe los recoge en el sitio web. Declarar por separado **Purchase history** por las ventas de clientes que el usuario registra en el CRM.

El generador QR y las 24 imágenes incluidas funcionan localmente en el dispositivo; no envían contenido a un proveedor de QR o CDN. Las imágenes personalizadas de producto se optimizan y se guardan en un bucket privado de Supabase después de la confirmación del usuario. El contenido compartido mediante el menú del sistema sale sólo por acción explícita.

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

El workflow compara la upload key con la huella aprobada antes de compilar. Codemagic debe usar exclusivamente `ANDROID_KEYSTORE` cifrado; cualquier copia de recuperación debe estar fuera del repositorio, cifrada y bajo control del propietario. La app-signing key permanece administrada por Google Play.

## CI y artefactos

Los workflows de Codemagic fijan Node 22.14.0, Xcode 26.6, Java 21 en Android y usan `npm ci`. Antes de sincronizar Capacitor ejecutan `lint`, ambos `typecheck`, pruebas, el release gate, `build:native` y la verificación de que el bundle móvil no contiene compra.

Android:

```sh
npm ci
npm run lint
npm run typecheck
npm run typecheck:backend
npm test
npm run build:native
npm run verify:native-bundle
npx cap sync android
cd android && ./gradlew bundleRelease
```

Validar el AAB con Play Console o `bundletool`, instalar una versión derivada y probar inicio de sesión, notificaciones, cámara/fotos, QR, eliminación y ausencia total de compra.

iOS:

```sh
npm ci
npm run lint
npm run typecheck
npm run typecheck:backend
npm test
npm run build:native
npm run verify:native-bundle
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
3. Probar `/app` y `/app/plantillas/{token}` con la app instalada, cerrada, sin sesión y sin instalar. Inicio de sesión y restablecimiento siguen siendo rutas web y no deben abrirse como App Links.
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
