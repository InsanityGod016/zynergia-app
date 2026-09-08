import { Link, useLocation } from 'react-router-dom';

export default function LegalDocument({ type }) {
  const { pathname } = useLocation();
  const privacy = type === 'privacy' || pathname.includes('privacidad');

  return (
    <main className="legal-page">
      <Link className="back-link" to="/">← Volver a Zynergia</Link>
      <article className="legal-card">
        <p className="eyebrow">Legal</p>
        <h1>{privacy ? 'Política de privacidad' : 'Términos de servicio'}</h1>
        <p className="legal-updated">Última actualización: 7 de septiembre de 2026</p>
        {privacy ? <PrivacyContent /> : <TermsContent />}
      </article>
    </main>
  );
}

function PrivacyContent() {
  return <>
    <p>CoreFlowAI LLC opera Zynergia, una herramienta de organización y seguimiento de relaciones comerciales. Este aviso se aplica a la aplicación móvil y al servicio web. Para consultas de privacidad, usa el <Link to="/soporte">centro de soporte</Link>.</p>

    <h2>1. Datos que tratamos</h2>
    <ul>
      <li><strong>Cuenta:</strong> correo electrónico, identificador de usuario y datos necesarios para autenticarte.</li>
      <li><strong>Perfil opcional:</strong> nombre, teléfono, foto, moneda y preferencias.</li>
      <li><strong>Contenido que proporcionas:</strong> contactos que agregas o eliges importar, teléfonos, notas, etiquetas, tareas, ventas, socios, enlaces de productos, plantillas y recordatorios. Con tu permiso, al importar leemos localmente nombres y teléfonos para mostrarte la lista; sólo guardamos en tu cuenta los contactos que eliges y confirmas.</li>
      <li><strong>Acceso al servicio:</strong> estado de acceso y referencias técnicas de la sesión de pago. Zynergia no recibe ni almacena el número completo de tu tarjeta.</li>
      <li><strong>Datos técnicos:</strong> sesión, dirección IP, región aproximada derivada de esa IP, navegador, sistema operativo, identificadores técnicos que puedan asignar los proveedores y registros de rendimiento, seguridad o error. Zynergia no solicita GPS ni ubicación precisa.</li>
      <li><strong>Imágenes y códigos QR:</strong> guardamos la foto de perfil y las imágenes de productos que decides subir. Procesamos las imágenes que eliges para crear o compartir un QR.</li>
      <li><strong>Notificaciones:</strong> si las habilitas, tratamos un identificador técnico del dispositivo, tus preferencias y el estado de entrega para enviarte recordatorios sin duplicarlos.</li>
    </ul>
    <p>No vendemos datos personales, no mostramos publicidad conductual y no usamos tus datos para rastrearte entre aplicaciones o sitios de otras empresas.</p>

    <h2>2. Para qué usamos los datos</h2>
    <ul>
      <li>Crear y proteger tu cuenta, mantener tu sesión y prestar las funciones solicitadas.</li>
      <li>Guardar, sincronizar y mostrar el contenido que registras.</li>
      <li>Programar los recordatorios que habilitas.</li>
      <li>Confirmar el acceso al servicio y atender facturación, soporte, seguridad y prevención de abuso.</li>
      <li>Cumplir obligaciones legales y hacer valer nuestros términos.</li>
    </ul>

    <h2>3. Proveedores y transferencias</h2>
    <p>Supabase presta autenticación, base de datos y almacenamiento privado de imágenes; Vercel aloja el sitio y las funciones del servidor; nuestro proveedor de correo entrega mensajes de cuenta; OneSignal transporta las notificaciones push que habilitas; Stripe procesa el checkout y administra el pago realizado en el sitio web; Apple y Google distribuyen las aplicaciones.</p>
    <p>Para las altas nuevas sujetas al reparto acordado, Stripe puede mostrar al socio de pagos el importe, moneda, estado y referencias técnicas necesarias para calcular y conciliar su participación. Ni Zynergia ni ese socio reciben el número completo de tu tarjeta.</p>
    <p>Si te vinculas voluntariamente con un líder mediante un código de partner, Zynergia le muestra tu nombre, identificador de cuenta, actividad reciente y métricas agregadas de Fast Start. No compartimos con él tu lista privada de contactos, notas ni ventas individuales.</p>
    <p>Las imágenes originales incluidas y los QR se procesan localmente. Una imagen personalizada de producto se optimiza y se sube al almacenamiento privado de tu cuenta sólo después de que confirmas guardarla. Al abrir WhatsApp u otro recurso externo que elijas, el contenido necesario y los datos técnicos normales de conexión pueden enviarse a ese proveedor.</p>
    <p>Los proveedores pueden tratar datos en otros países y aplican sus propias medidas contractuales y técnicas. No vendemos información; sólo la comunicamos cuando es necesario para la función solicitada, operar y proteger el servicio o cumplir la ley.</p>

    <h2>4. Notificaciones</h2>
    <p>Las tareas con fecha y hora usan notificaciones locales. Si habilitas resúmenes o avisos de Fast Start/equipo, OneSignal entrega esos avisos al dispositivo vinculado con tu cuenta. Puedes elegir cada categoría, cambiar la hora del resumen o desactivar todo desde Cuenta y desde los ajustes del sistema. Al cerrar sesión desvinculamos ese dispositivo. No usamos identificadores publicitarios.</p>

    <h2>5. Conservación y seguridad</h2>
    <p>Conservamos los datos mientras exista la cuenta o sean necesarios para prestar el servicio. Aplicamos cifrado en tránsito y controles de acceso, pero ningún sistema es infalible; protege también tu contraseña y dispositivo.</p>
    <p>Al eliminar la cuenta, borramos los datos operativos de los sistemas activos. Algunos registros de seguridad, copias de respaldo y registros fiscales o de pago pueden conservarse durante el plazo necesario para recuperación, controversias u obligaciones legales, y después se eliminan o anonimizan.</p>

    <h2>6. Tus opciones y derechos</h2>
    <p>Puedes consultar y corregir datos desde la app o pedir ayuda en el <Link to="/soporte">centro de soporte</Link>. Revocar el permiso de Contactos impide lecturas nuevas, pero no elimina las copias que ya confirmaste; puedes eliminarlas en Zynergia sin modificar la libreta de tu teléfono. Podemos solicitar información razonable para verificar tu identidad.</p>
    <p>Puedes solicitar la eliminación desde Configuración en la app o desde <Link to="/eliminar-cuenta">Eliminar cuenta</Link> sin reinstalarla. La solicitud detiene la renovación de Stripe. Si queda un periodo pagado, conservas el acceso y el borrado se programa para su final; sin periodo vigente, se procesa de inmediato.</p>

    <h2>7. Menores</h2>
    <p>Zynergia está dirigida a personas adultas y no está diseñada para menores de 18 años. Usa el <Link to="/soporte">centro de soporte</Link> si crees que un menor proporcionó datos.</p>

    <h2>8. Independencia y marcas</h2>
    <p>Zynergia es un servicio independiente. No está afiliado, patrocinado, respaldado ni administrado por Zinzino AB ni por otras empresas cuyos nombres, productos o marcas puedan aparecer como referencia. Las marcas pertenecen a sus respectivos titulares.</p>

    <h2>9. Cambios</h2>
    <p>Podemos actualizar este aviso cuando cambien el servicio, los proveedores o la ley. Publicaremos aquí la fecha de la versión vigente.</p>
  </>;
}

function TermsContent() {
  return <>
    <p>Estos términos regulan el uso de la aplicación móvil y del servicio web Zynergia. Al usar el servicio aceptas estos términos y el <Link to="/privacidad">Aviso de privacidad</Link>.</p>

    <h2>1. Elegibilidad y cuenta</h2>
    <p>Debes tener al menos 18 años y proporcionar información veraz. Eres responsable de proteger tus credenciales y de la actividad de tu cuenta. Usa el <Link to="/soporte">centro de soporte</Link> si detectas acceso no autorizado.</p>

    <h2>2. Servicio</h2>
    <p>Zynergia permite organizar contactos, tareas, ventas, materiales y seguimientos. Puedes usar la app móvil con una cuenta existente. Podemos corregir errores, modificar funciones o realizar mantenimiento procurando no afectar injustificadamente el acceso.</p>

    <h2>3. Contenido del usuario</h2>
    <p>Conservas la titularidad de lo que registras. Nos autorizas a alojarlo y procesarlo sólo para operar, proteger y mejorar el servicio. Debes contar con una base legítima para importar o almacenar datos de terceros, seleccionar únicamente los contactos necesarios y respetar sus derechos de privacidad.</p>

    <h2>4. Uso permitido</h2>
    <p>No puedes usar Zynergia para infringir derechos, enviar comunicaciones ilícitas o no solicitadas, introducir código malicioso, intentar acceder a otras cuentas, eludir medidas de seguridad o presentar el servicio como oficial de una empresa ajena. Importar un contacto o una plantilla no envía mensajes automáticamente.</p>

    <h2>5. Plantillas compartidas</h2>
    <p>Puedes crear un enlace revocable que contiene una copia de las plantillas que eliges, sin contactos ni datos de sesión. El enlace vence a los 30 días. Quien lo reciba debe iniciar sesión, revisar la vista previa y confirmar la importación; la copia importada deja de sincronizarse con el creador.</p>

    <h2>6. Acceso de pago</h2>
    <p>Las altas nuevas cuestan 17 USD al mes, precio final mostrado antes de confirmar. El acceso se contrata en el sitio web y Stripe procesa el pago. La app móvil no procesa compras ni dirige a un flujo de pago.</p>
    <p>La renovación es automática hasta que canceles desde Configuración en la app o desde tu cuenta web. La cancelación conserva acceso hasta el final del periodo pagado y no genera un reembolso automático. Tras el primer fallo de pago puede aplicarse una gracia de tres días, sin que nuevos reintentos extiendan ese plazo. Los planes o precios anteriores continúan bajo las condiciones aplicables a cada cuenta.</p>

    <h2>7. Eliminación y facturación</h2>
    <p>Puedes solicitar la eliminación siguiendo <Link to="/eliminar-cuenta">estas instrucciones</Link>. Al confirmar, Zynergia detiene la renovación en Stripe. Si queda un periodo pagado, el acceso continúa hasta su vencimiento y el borrado se programa para esa fecha; sin periodo vigente, la cuenta y sus datos operativos se eliminan de inmediato.</p>
    <p>Si no podemos detener la facturación, no programamos ni completamos el borrado. La solicitud no crea por sí misma un derecho a reembolso, sin perjuicio de los derechos que otorgue la ley.</p>

    <h2>8. Servicios y marcas de terceros</h2>
    <p>El servicio puede abrir enlaces o mostrar recursos de terceros, cuyas condiciones se aplican por separado. Zynergia y CoreFlowAI LLC son independientes y no están afiliados, patrocinados, respaldados ni administrados por Zinzino AB ni por otras empresas mencionadas como referencia. Sus marcas pertenecen a sus titulares.</p>

    <h2>9. Sin garantía de resultados</h2>
    <p>Zynergia es una herramienta organizativa y no garantiza ventas, ingresos, rangos, comisiones ni resultados comerciales. La información de la app no sustituye los términos oficiales de ninguna empresa ni asesoría legal, fiscal o financiera.</p>

    <h2>10. Disponibilidad y responsabilidad</h2>
    <p>Prestamos el servicio con cuidado razonable, pero no prometemos disponibilidad ininterrumpida. En la máxima medida permitida por la ley, no respondemos por decisiones comerciales, contenido introducido por el usuario ni servicios externos. Nada limita derechos irrenunciables del consumidor.</p>

    <h2>11. Cambios y contacto</h2>
    <p>Podemos actualizar estos términos y publicaremos la fecha vigente. Si un cambio requiere consentimiento adicional, lo solicitaremos. Para preguntas, usa el <Link to="/soporte">centro de soporte</Link>.</p>
  </>;
}
