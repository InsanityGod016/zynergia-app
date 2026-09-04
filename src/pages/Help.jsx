import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, ChevronDown, ChevronUp } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

const FAQ = [
  {
    category: 'Contactos',
    items: [
      {
        q: '¿Cómo agrego un contacto nuevo?',
        a: 'Ve a la sección Contactos y toca el botón "+" en la esquina inferior derecha. Llena el nombre y teléfono. El tipo de contacto define qué tareas automáticas se crean para él.'
      },
      {
        q: '¿Qué significa el tipo de contacto?',
        a: 'Puedes usar Prospecto Producto, Prospecto Partner, Cliente o Partner. Cambiar el tipo genera automáticamente las tareas de seguimiento correspondientes.'
      },
      {
        q: '¿Cómo cambio el tipo a varios contactos a la vez?',
        a: 'En Contactos, toca el botón "Seleccionar", elige las personas y después toca "Cambiar tipo".'
      },
    ]
  },
  {
    category: 'Tareas',
    items: [
      {
        q: '¿Cómo funcionan las tareas automáticas?',
        a: 'Cuando asignas un tipo a un contacto o registras una venta, Zynergia crea automáticamente las tareas de seguimiento para los días correctos. Tú solo tienes que ejecutarlas.'
      },
      {
        q: '¿Qué hago cuando completo una tarea?',
        a: 'Toca la tarea en la lista para ver su detalle. Hay un botón de WhatsApp para contactar al prospecto directamente, y un botón para marcarla como completada.'
      },
      {
        q: '¿Por qué veo tareas "vencidas"?',
        a: 'Son tareas cuya fecha límite ya pasó y no fueron completadas. Aparecen en el filtro "Vencidas" en la pantalla de Tareas. Te recomendamos atenderlas lo antes posible.'
      },
    ]
  },
  {
    category: 'Ventas y Productos',
    items: [
      {
        q: '¿Cómo registro una venta?',
        a: 'En la sección Ventas, toca el botón "+" y sigue los 4 pasos: elige el contacto, el producto, la fecha y confirma. La venta queda registrada y Zynergia programa las tareas de recompra automáticamente.'
      },
      {
        q: '¿Qué es "nueva" vs "recompra"?',
        a: '"Nueva" es la primera compra de un cliente. "Recompra" es cuando un cliente compra de nuevo. Zynergia diferencia ambas para calcular mejor tus métricas de retención.'
      },
    ]
  },
  {
    category: 'Partners y Fast Start',
    items: [
      {
        q: '¿Qué es el programa Fast Start?',
        a: 'La sección Fast Start organiza el avance inicial de tu equipo. Las metas visibles son referencias de seguimiento y deben compararse con el plan oficial vigente de tu mercado; Zynergia no garantiza bonos ni ingresos.'
      },
      {
        q: '¿Cómo agrego un partner?',
        a: 'En la sección Partners, toca el botón "+". Selecciona el contacto existente que se convirtió en partner y confirma. Zynergia calculará su progreso en Fast Start automáticamente.'
      },
      {
        q: '¿Cuándo recibo las notificaciones de Fast Start?',
        a: 'Zynergia puede avisarte cuando se acerca una fecha de seguimiento o cuando conviene revisar el avance de un integrante del equipo.'
      },
    ]
  },
  {
    category: 'Marketing',
    items: [
      {
        q: '¿Cómo genero un código QR?',
        a: 'Ve a Herramientas → Generador QR. Pega un enlace que comience con http:// o https:// y toca “Crear QR”. Puedes descargarlo, compartirlo o colocarlo sobre una imagen. Todo se prepara en tu dispositivo.'
      },
      {
        q: '¿Puedo editar las plantillas de mensajes?',
        a: 'Sí. En Marketing → Plantillas encontrarás mensajes listos para WhatsApp por categoría (seguimiento, recompra, reactivación). Toca cualquiera para editar el texto a tu estilo.'
      },
    ]
  },
  {
    category: 'Cuenta y Configuración',
    items: [
      {
        q: '¿Cómo cambio mi moneda?',
        a: 'Ve a Configuración (icono de menú → Configuración). En la sección "Preferencias" puedes cambiar la moneda. Esto afecta cómo se muestran los valores en toda la app.'
      },
      {
        q: '¿Cómo cancelo mi suscripción?',
        a: 'Ve a Configuración → Estado de la cuenta → Cancelar mi suscripción. No habrá otro cobro y conservarás el acceso hasta que termine el periodo pagado.'
      },
    ]
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-[#F1F5F9] last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
          className="w-full min-h-14 flex items-start justify-between py-4 text-left gap-3"
          aria-expanded={open}
      >
        <span className="text-[16px] font-medium text-[#0F172A] leading-snug">{q}</span>
        {open
          ? <ChevronUp className="w-5 h-5 text-[#64748B] shrink-0 mt-0.5" aria-hidden="true" />
          : <ChevronDown className="w-5 h-5 text-[#64748B] shrink-0 mt-0.5" aria-hidden="true" />
        }
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <p className="text-[15px] text-[#64748B] leading-relaxed pb-4">{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function Help() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="bg-white px-5 pt-14 pb-4 flex items-center gap-3 border-b border-[#F1F5F9]">
        <button
          onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/Settings')}
          className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#F1F5F9] active:scale-95 transition-transform"
          aria-label="Volver a Configuración"
        >
          <ChevronLeft className="w-5 h-5 text-[#0F172A]" aria-hidden="true" />
        </button>
        <h1 className="text-[18px] font-bold text-[#0F172A]">Ayuda</h1>
      </div>

      <div className="px-5 py-5 space-y-4">
        <p className="text-[16px] text-[#64748B]">Preguntas frecuentes sobre Zynergia</p>

        {FAQ.map(section => (
          <div key={section.category} className="bg-white rounded-2xl border border-[#F1F5F9] shadow-sm px-5">
            <p className="text-[15px] font-bold text-[#004AFE] uppercase tracking-widest pt-4 pb-1">
              {section.category}
            </p>
            {section.items.map(item => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        ))}

        <a
          href="https://zynergia.pro/soporte"
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-12 flex items-center justify-center rounded-xl text-center text-[15px] font-semibold text-[#004AFE] active:bg-[#EEF2FF]"
        >
          Abrir el centro de soporte
        </a>
      </div>
    </div>
  );
}
