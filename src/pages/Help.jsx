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
        a: 'Hay 3 tipos: Prospecto Producto (persona interesada en comprar), Prospecto Partner (persona interesada en ser distribuidor), y Partner (ya es parte de tu red). Cambiar el tipo genera automáticamente las tareas de seguimiento correctas.'
      },
      {
        q: '¿Cómo cambio el tipo a varios contactos a la vez?',
        a: 'En la lista de Contactos, mantén presionado un contacto para entrar al modo selección. Selecciona los que quieras y toca "Cambiar tipo" en la barra inferior.'
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
        a: 'Fast Start es el programa de arranque de Zynergia. Tienes 120 días para completar 4 fases: Q-Team (4 clientes activos), FS Level 1 (2 socios activos), FS Level 2 (socios con 4 clientes) y X-Team (10 clientes). Cada fase tiene un bono.'
      },
      {
        q: '¿Cómo agrego un partner?',
        a: 'En la sección Partners, toca el botón "+". Selecciona el contacto existente que se convirtió en partner y confirma. Zynergia calculará su progreso en Fast Start automáticamente.'
      },
      {
        q: '¿Cuándo recibo las notificaciones de Fast Start?',
        a: 'Zynergia te notifica cuando un socio está a 7, 3 y 1 día de vencer su plazo Fast Start, y también cuando están cerca de alcanzar un bono (a 1 cliente o socio de distancia).'
      },
    ]
  },
  {
    category: 'Marketing',
    items: [
      {
        q: '¿Cómo genero un código QR?',
        a: 'Ve a Marketing → QR. Pega la URL que quieres convertir, elige el estilo del QR y toca "Generar". Puedes agregar tu logo encima del QR y descargarlo o compartirlo directamente.'
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
        a: 'Las suscripciones se gestionan directamente desde tu cuenta de App Store (iOS) o Google Play (Android). Ve a Ajustes → tu nombre → Suscripciones en tu iPhone, o a Play Store → Suscripciones en Android.'
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
        className="w-full flex items-start justify-between py-4 text-left gap-3"
      >
        <span className="text-[15px] font-medium text-[#0F172A] leading-snug">{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-[#94A3B8] shrink-0 mt-0.5" />
          : <ChevronDown className="w-4 h-4 text-[#94A3B8] shrink-0 mt-0.5" />
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
            <p className="text-[14px] text-[#64748B] leading-relaxed pb-4">{a}</p>
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
          onClick={() => navigate(-1)}
          className="w-9 h-9 flex items-center justify-center rounded-full bg-[#F1F5F9] active:scale-95 transition-transform"
        >
          <ChevronLeft className="w-5 h-5 text-[#0F172A]" />
        </button>
        <h1 className="text-[18px] font-bold text-[#0F172A]">Ayuda</h1>
      </div>

      <div className="px-5 py-5 space-y-4">
        <p className="text-[14px] text-[#64748B]">Preguntas frecuentes sobre Zynergia</p>

        {FAQ.map(section => (
          <div key={section.category} className="bg-white rounded-2xl border border-[#F1F5F9] shadow-sm px-5">
            <p className="text-[11px] font-bold text-[#004AFE] uppercase tracking-widest pt-4 pb-1">
              {section.category}
            </p>
            {section.items.map(item => (
              <FaqItem key={item.q} q={item.q} a={item.a} />
            ))}
          </div>
        ))}

        <p className="text-center text-[12px] text-[#CBD5E1] pb-4">
          ¿Necesitas más ayuda? Contáctanos en soporte@zynergia.app
        </p>
      </div>
    </div>
  );
}