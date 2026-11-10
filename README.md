# Contratos individuales de LOWCUT

Una sola página carga el documento `contracts/{id}` mediante `?contract=ID`. No hace falta crear un repositorio por artista ni renombrar este repositorio.

## Flujo

1. En el portal, un admin crea un contrato. Puede elegir un perfil existente o indicar el email de invitación para un artista nuevo. Cada documento tiene su propia disponibilidad y estado de firma.
2. El destinatario abre el enlace, crea su cuenta o inicia sesión y verifica el email.
3. Guarda su nombre artístico. Se escriben atómicamente `users/{uid}` y `artists/{artistId}`, y el contrato queda asignado al UID. Los pendientes ya aparecen en su portal.
4. El formulario completa nombre artístico, artista principal y email desde el perfil. Esos datos del contrato se pueden corregir. El nombre legal se pide por separado. Cambiar el email de contacto del contrato no cambia el email verificado de acceso.
5. La firma guarda los datos del lanzamiento y una copia del texto aceptado. Al reabrir un firmado, se muestran esos datos y ese texto en modo de lectura, tanto al artista autorizado como al admin.
6. El admin puede desactivar la disponibilidad. Un firmado conserva su aceptación; «Crear nueva versión» genera otro documento y otro enlace, con firma pendiente. El original se conserva.

## Esquema confirmado

- `users/{uid}`: `active`, `artistId`, `email`, `name`, `role`. Los usuarios nuevos añaden `registrationContractId` para validar la invitación en las reglas. `role` siempre es `artist` al registrarse; el artista no puede cambiar permisos ni activarse por su cuenta.
- `artists/{artistId}`: `active`, `name`. Para nuevos artistas sin ID asignado se usa el UID. Los perfiles existentes conservan su `artistId`. Las escrituras usan merge para preservar otros campos.
- `contracts/{id}`: conserva campos del portal/bot (`title`, `artistId`, `artistIds`, `authorizedUids`, `status`, `contractUrl`, `signedAt`, `type`) y añade `active`, `invitationEmail`, `pageContent`, `pageRevision`. Al firmar: `signedBy`, `signedAtTimestamp`, `signature`, `releaseData`. Las nuevas versiones pueden incluir `sourceContractId`.

## Activación coordinada

Estos cambios requieren publicar también los cambios del repositorio `LOWCUT-Records-Portal` y aplicar su `contract-profile.rules.fragment` a las reglas reales de Firestore. El fragmento reemplaza únicamente los matches de `users`, `artists` y `contracts`; no sustituye las reglas de las otras colecciones. No basta con agregar permisos nuevos dejando vigentes los antiguos permisos generales de edición de contratos firmados.

El método Email/Password debe estar habilitado en Firebase Authentication. La generación automática de PDFs y Cloud Functions no forman parte de esta versión. No se cambian contratos ni cuentas reales mediante la publicación del código.

Los enlaces anteriores sin `?contract=ID` piden una invitación; cada nuevo contrato se abre desde su enlace individual generado por el portal. Los contratos anteriores con otros enlaces o PDFs siguen usando sus URLs existentes; no se migran automáticamente.

## Dominio

El dominio final está pendiente de confirmar. No se incluye un archivo CNAME. Cuando esté listo, configurar el subdominio en GitHub Pages y su CNAME DNS hacia `lowcutrecords.github.io`; actualizar `TEMPLATE_URL` en `contract-model.mjs` del portal. El nombre del repositorio puede conservarse.

## Verificación

`node --test profile-model.test.mjs` valida el autocompletado, los IDs existentes y el rechazo de invitaciones incorrectas, cuentas desactivadas y emails sin verificar. Las pruebas de reglas y permisos están en el repositorio del portal. No se han probado registros ni firmas contra el Firebase de producción.

