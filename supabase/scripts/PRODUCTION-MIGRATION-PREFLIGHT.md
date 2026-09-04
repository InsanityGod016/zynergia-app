# Preflight de migraciones de producción

Este gate verifica el estado real antes de aplicar, en orden, las migraciones
`202609010000`, `001`, `002`, `003`, `004` y `006`. No modifica la base ni
incluye PII: sólo devuelve conteos y nombres de objetos de esquema.

1. En el SQL Editor del proyecto de producción, ejecuta completo
   `production-migration-preflight.sql`.
2. Copia la celda `production_migration_preflight` a un archivo JSON fuera del
   repositorio, por ejemplo `/private/tmp/zynergia-production-preflight.json`.
3. Valídalo durante las siguientes 24 horas:

```sh
node supabase/scripts/check-production-migration-preflight.mjs \
  /private/tmp/zynergia-production-preflight.json
```

El proceso termina con código `0` únicamente cuando no detecta bloqueos. Los
objetivos que todavía serán creados por esas migraciones aparecen como
`observations`, no como errores. Las cuentas sin grant actual se reportan como
observación y quedan inactivas con las políticas de entitlement. Antes de
aplicar esas políticas, toda cuenta legacy debe tener una clasificación en
`access_grants`: activa/grace si conserva acceso, o `revoked` si queda
inactiva. Una cuenta sin clasificación, o con facturación activa o vencida
pero sin grant actual, sí es un bloqueo; nunca se conceden accesos en masa para
hacer pasar el gate.

Una cuenta sin configuración también se reporta como observación si no tiene
acceso ni facturación; no se crea un perfil vacío para una alta incompleta.

Después de aplicar la secuencia, vuelve a exportar el esquema y ejecuta el gate
de release existente:

```sh
node supabase/scripts/predeploy-gate.mjs supabase/schema.production.json
```
