import { useMemo, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clipboard,
  MessageCircle,
  Plus,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import TaskFilterSheet from '@/components/tasks/TaskFilterSheet';
import { deriveDemoPartnerTask } from '@/demo/DemoTeamOriginal';

/** @typedef {'late' | 'today' | 'upcoming'} DemoTaskPeriod */
/** @typedef {'recompra' | 'seguimiento' | 'reactivacion'} DemoTaskCategory */
/** @typedef {'producto' | 'prospecto_producto' | 'prospecto_partner' | 'partner'} DemoTaskArea */
/** @typedef {'general' | 'amigable' | 'directo'} MessageTone */
/**
 * @typedef {object} DemoPartner
 * @property {string | number} id
 * @property {string} name
 * @property {string} phone
 * @property {string | null} partnerUserId
 * @property {string} startDate
 * @property {{ premierClients: number, partnersCount: number, duplicatedTeams: number } | null} metrics
 * @property {number | null} lastActiveDays
 */
/**
 * @typedef {object} DemoTask
 * @property {string} id
 * @property {string} person
 * @property {string} phone
 * @property {string} action
 * @property {string} context
 * @property {DemoTaskCategory} category
 * @property {DemoTaskArea} area
 * @property {DemoTaskPeriod} period
 * @property {string} when
 * @property {{ general: string, amigable: string, directo: string }} messages
 */

const periodMeta = {
  late: { title: 'Atrasadas', badge: 'Atrasada', className: 'bg-red-50 text-red-700' },
  today: { title: 'Hoy', badge: 'Hoy', className: 'bg-blue-50 text-primary' },
  upcoming: { title: 'Próximas', badge: 'Próxima', className: 'bg-slate-100 text-slate-700' },
};

const categoryMeta = {
  recompra: { label: 'Recompra', className: 'bg-amber-50 text-amber-800' },
  seguimiento: { label: 'Seguimiento', className: 'bg-blue-50 text-primary' },
  reactivacion: { label: 'Reactivación', className: 'bg-violet-50 text-violet-800' },
};

const areaMeta = {
  producto: 'Producto / cliente',
  prospecto_producto: 'Prospecto a cliente',
  prospecto_partner: 'Prospecto a partner',
  partner: 'Partner · Fast Start',
};

const timeOptions = [
  { value: 'all', label: 'Todas las fechas' },
  { value: 'late', label: 'Atrasadas' },
  { value: 'today', label: 'Hoy' },
  { value: 'upcoming', label: 'Próximas' },
];

const categoryOptions = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'recompra', label: 'Recompra' },
  { value: 'seguimiento', label: 'Seguimiento' },
  { value: 'reactivacion', label: 'Reactivación' },
];

const areaOptions = [
  { value: 'all', label: 'Todas las áreas' },
  { value: 'producto', label: 'Producto / cliente' },
  { value: 'prospecto_producto', label: 'Prospecto a cliente' },
  { value: 'prospecto_partner', label: 'Prospecto a partner' },
  { value: 'partner', label: 'Partner · Fast Start' },
];

const labels = options => Object.fromEntries(options.map(option => [option.value, option.label]));
const timeLabels = labels(timeOptions);
const categoryLabels = labels(categoryOptions);
const areaLabels = labels(areaOptions);

const baseTasks = /** @type {DemoTask[]} */ ([
  {
    id: 'product-repurchase-jose',
    person: 'José Ramírez',
    phone: '+52 55 0000 0103',
    action: 'Recordar la recompra de José',
    context: 'Recompra · Bienestar diario · 7 días antes · ciclo de 30 días',
    category: 'recompra',
    area: 'producto',
    period: 'late',
    when: 'Ayer, 5:00 p. m.',
    messages: {
      general: 'Hola José, te aviso que en aproximadamente una semana terminará tu producto de bienestar diario. ¿Te ayudo a preparar tu siguiente pedido?',
      amigable: '¡Hola José! 😊 Ya se acerca tu fecha de recompra del producto de bienestar diario. ¿Te ayudo para que no se interrumpa tu rutina?',
      directo: 'Hola José. Tu recompra del producto de bienestar diario se acerca. ¿Preparamos hoy tu siguiente pedido?',
    },
  },
  {
    id: 'post-sale-laura',
    person: 'Laura Medina',
    phone: '+52 55 0000 0105',
    action: 'Revisar cómo va Laura con su producto',
    context: 'Posventa · Kit inicial · día 3 desde su compra',
    category: 'seguimiento',
    area: 'producto',
    period: 'today',
    when: 'Hoy, 10:30 a. m.',
    messages: {
      general: 'Hola Laura, ya llevas 3 días con tu kit inicial. ¿Cómo te ha ido? Estoy aquí para ayudarte con cualquier pregunta.',
      amigable: '¡Hola Laura! 😊 Ya llevas 3 días con tu kit inicial. ¿Cómo te has sentido? Si tienes cualquier duda, aquí estoy.',
      directo: 'Hola Laura. Quiero confirmar que estés usando bien tu kit inicial. ¿Tienes alguna duda después de estos 3 días?',
    },
  },
  {
    id: 'prospect-product-maria',
    person: 'María López',
    phone: '+52 55 0000 0101',
    action: 'Retomar la conversación con María',
    context: 'Prospecto a cliente · mensaje 4 de 6 · día 12',
    category: 'seguimiento',
    area: 'prospecto_producto',
    period: 'today',
    when: 'Hoy, 1:00 p. m.',
    messages: {
      general: 'Hola María, quería retomar la información que te compartí sobre el producto. ¿Te quedó alguna duda que pueda resolver?',
      amigable: '¡Hola María! 😊 ¿Cómo estás? Quería saber qué te pareció la información del producto y si puedo ayudarte con alguna duda.',
      directo: 'Hola María. ¿Pudiste revisar la información del producto? Dime qué duda tienes y te ayudo a resolverla.',
    },
  },
  {
    id: 'prospect-partner-elena',
    person: 'Elena Navarro',
    phone: '+52 55 0000 0110',
    action: 'Invitar a Elena a conocer el negocio',
    context: 'Prospecto a partner · mensaje 2 de 6 · día 3',
    category: 'seguimiento',
    area: 'prospecto_partner',
    period: 'upcoming',
    when: 'Mañana, 11:00 a. m.',
    messages: {
      general: 'Hola Elena, quería retomar la oportunidad de negocio que te comenté. ¿Qué día te viene bien para explicártela con calma?',
      amigable: '¡Hola Elena! 😊 Me acordé de nuestra conversación sobre el negocio. ¿Cuándo tienes unos minutos para que te cuente cómo funciona?',
      directo: 'Hola Elena. Quiero mostrarte cómo funciona la oportunidad de negocio. ¿Tienes 15 minutos esta semana?',
    },
  },
  {
    id: 'reactivation-roberto',
    person: 'Roberto Silva',
    phone: '+52 55 0000 0111',
    action: 'Ayudar a Roberto a retomar su producto',
    context: 'Reactivación · Bienestar diario · 35 días después de su recompra',
    category: 'reactivacion',
    area: 'producto',
    period: 'upcoming',
    when: 'En 3 días',
    messages: {
      general: 'Hola Roberto, hace tiempo que no sé de ti. ¿Cómo te fue con tu producto de bienestar diario? Con gusto te ayudo si quieres retomarlo.',
      amigable: '¡Hola Roberto! 😊 ¿Cómo has estado? Me acordé de ti y quería saber cómo te fue con tu producto. Si quieres retomarlo, cuenta conmigo.',
      directo: 'Hola Roberto. Veo que pasó tu fecha de recompra. ¿Qué ocurrió? Puedo ayudarte a retomar tu producto.',
    },
  },
]);

const startOfToday = () => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  return date;
};

const elapsedDays = startDate => {
  const [year, month, day] = String(startDate || '').split('-').map(Number);
  if (!year || !month || !day) return 0;
  const start = new Date(year, month - 1, day, 12);
  return Math.max(0, Math.floor((startOfToday().getTime() - start.getTime()) / 86_400_000));
};

const partnerMessages = task => ({
  general: task.message,
  amigable: task.message.replace(/^Hola ([^,]+),/, '¡Hola $1! 😊'),
  directo: task.message
    .replace(/^Hola ([^,]+),/, 'Hola $1.')
    .replace('¿Revisamos hoy', 'Revisemos hoy')
    .replace('¿Revisamos cuál', 'Revisemos cuál'),
});

/**
 * Construye la lista desde los mismos tipos de eventos del motor real. Las
 * personas son ficticias, pero ninguna tarea es una explicación genérica.
 * @param {DemoPartner[]} [partners]
 * @returns {DemoTask[]}
 */
export function buildDemoTasks(partners = []) {
  const partnerTasks = partners.map((partner, index) => {
    const task = deriveDemoPartnerTask(partner);
    const day = elapsedDays(partner.startDate);
    const late = typeof partner.lastActiveDays === 'number' && partner.lastActiveDays > 14;
    const period = late ? 'late' : index < 2 ? 'today' : 'upcoming';
    return {
      id: String(task.id),
      person: task.person,
      phone: task.phone,
      action: task.action,
      context: `${task.reason} · Día ${day} de 120`,
      category: /** @type {DemoTaskCategory} */ ('seguimiento'),
      area: /** @type {DemoTaskArea} */ ('partner'),
      period: /** @type {DemoTaskPeriod} */ (period),
      when: late ? `Atrasada · ${partner.lastActiveDays} días sin actividad` : period === 'today' ? 'Hoy, 4:00 p. m.' : 'Esta semana',
      messages: partnerMessages(task),
    };
  });

  return [...baseTasks, ...partnerTasks];
}

/** @param {{ task: DemoTask, complete: boolean, onMessage: (task: DemoTask) => void, onToggle: (id: string) => void }} props */
function TaskRow({ task, complete, onMessage, onToggle }) {
  const category = categoryMeta[task.category];
  const period = periodMeta[task.period];
  return (
    <article className={`px-4 py-5 ${complete ? 'opacity-65' : ''}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-full px-2.5 py-1 text-[14px] font-bold ${period.className}`}>{period.badge}</span>
        <span className={`rounded-full px-2.5 py-1 text-[14px] font-bold ${category.className}`}>{category.label}</span>
      </div>
      <p className="mt-3 text-[15px] font-semibold text-primary">{task.person}</p>
      <h3 className={`mt-1 text-[18px] font-bold leading-snug ${complete ? 'line-through' : ''}`}>{task.action}</h3>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{task.context}</p>
      <p className="mt-1 text-[14px] font-semibold text-muted-foreground">{task.when}</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <Button type="button" size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => onMessage(task)}>
          <MessageCircle aria-hidden="true" /> Mensaje listo
        </Button>
        <Button type="button" size="lg" variant="outline" className="w-full bg-white" onClick={() => onToggle(task.id)} aria-pressed={complete}>
          <Check aria-hidden="true" /> {complete ? 'Volver a pendiente' : 'Marcar como hecha'}
        </Button>
      </div>
    </article>
  );
}

/** @param {{ completed: number, total: number }} props */
function DayProgress({ completed, total }) {
  const percentage = total ? Math.round((completed / total) * 100) : 0;
  return (
    <Card className="p-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[15px] font-semibold text-muted-foreground">AVANCE DE HOY</p>
          <h2 className="mt-1 text-2xl font-bold">{completed} de {total} terminadas</h2>
        </div>
        <span className="text-[17px] font-bold text-primary">{percentage}%</span>
      </div>
      <div className="mt-4 h-3 overflow-hidden rounded-full bg-blue-100" role="progressbar" aria-label={`${completed} de ${total} tareas terminadas`} aria-valuemin={0} aria-valuemax={total || 1} aria-valuenow={completed}>
        <div className="h-full rounded-full bg-primary transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${percentage}%` }} />
      </div>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">Incluye lo atrasado y lo que corresponde hacer hoy.</p>
    </Card>
  );
}

/**
 * Hoy usa tareas ficticias pero fieles a los disparadores del motor real.
 * @param {{ partners?: DemoPartner[], onRegisterSale?: () => void, onOpenTools?: () => void }} props
 */
export function DemoToday({ partners = [], onRegisterSale = () => {}, onOpenTools = () => {} }) {
  const [completedIds, setCompletedIds] = useState(() => new Set(['post-sale-laura']));
  const [timeFilter, setTimeFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [areaFilter, setAreaFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState(/** @type {'time' | 'category' | 'area' | null} */ (null));
  const [messageTask, setMessageTask] = useState(/** @type {DemoTask | null} */ (null));
  const [tone, setTone] = useState(/** @type {MessageTone} */ ('general'));
  const [copyStatus, setCopyStatus] = useState('');

  const tasks = useMemo(() => buildDemoTasks(partners), [partners]);
  const dueTasks = tasks.filter(task => task.period !== 'upcoming');
  const completeCount = dueTasks.filter(task => completedIds.has(task.id)).length;
  const visibleTasks = tasks.filter(task => (
    (timeFilter === 'all' || task.period === timeFilter)
    && (categoryFilter === 'all' || task.category === categoryFilter)
    && (areaFilter === 'all' || task.area === areaFilter)
  ));

  const groups = /** @type {DemoTaskPeriod[]} */ (['late', 'today', 'upcoming']).map(period => ({
    period,
    tasks: visibleTasks.filter(task => task.period === period),
  })).filter(group => group.tasks.length);

  const filterConfig = activeFilter === 'time'
    ? { title: 'Cuándo', description: 'Elige las fechas que quieres revisar.', options: timeOptions, selected: timeFilter, onSelect: setTimeFilter }
    : activeFilter === 'category'
      ? { title: 'Tipo de tarea', description: 'Filtra recompra, seguimiento o reactivación.', options: categoryOptions, selected: categoryFilter, onSelect: setCategoryFilter }
      : activeFilter === 'area'
        ? { title: 'Área', description: 'Elige de dónde viene el seguimiento.', options: areaOptions, selected: areaFilter, onSelect: setAreaFilter }
        : null;

  const toggleTask = id => {
    setCompletedIds(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const showMessage = task => {
    setTone('general');
    setCopyStatus('');
    setMessageTask(task);
  };

  const selectedMessage = messageTask?.messages[tone] || '';

  const copyMessage = async () => {
    if (!selectedMessage) return;
    try {
      await navigator.clipboard.writeText(selectedMessage);
      setCopyStatus('Mensaje copiado.');
    } catch {
      setCopyStatus('No se pudo copiar. Mantén presionado el mensaje para seleccionarlo.');
    }
  };

  const openWhatsApp = () => {
    if (!messageTask || !selectedMessage) return;
    const number = messageTask.phone.replace(/\D/g, '');
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(selectedMessage)}`, '_blank', 'noopener,noreferrer');
  };

  const clearFilters = () => {
    setTimeFilter('all');
    setCategoryFilter('all');
    setAreaFilter('all');
  };

  return (
    <div className="space-y-5">
      <DayProgress completed={completeCount} total={dueTasks.length} />

      <div className="flex flex-wrap gap-2" role="group" aria-label="Filtros de tareas">
        {[
          { key: 'time', label: timeLabels[timeFilter] },
          { key: 'category', label: categoryLabels[categoryFilter] },
          { key: 'area', label: areaLabels[areaFilter] },
        ].map(filter => (
          <button key={filter.key} type="button" onClick={() => setActiveFilter(/** @type {'time' | 'category' | 'area'} */ (filter.key))} className="flex min-h-12 items-center gap-2 rounded-full bg-white px-4 text-[15px] font-bold text-foreground shadow-sm">
            {filter.label}<ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
          </button>
        ))}
      </div>

      {groups.map(group => (
        <section key={group.period} aria-labelledby={`demo-task-group-${group.period}`}>
          <div className="mb-3 flex items-center justify-between gap-3 px-1">
            <h2 id={`demo-task-group-${group.period}`} className={`text-2xl font-bold ${group.period === 'late' ? 'text-red-700' : ''}`}>{periodMeta[group.period].title}</h2>
            <span className="rounded-full bg-white px-3 py-1.5 text-[14px] font-bold text-muted-foreground shadow-sm">{group.tasks.length}</span>
          </div>
          <Card className="divide-y overflow-hidden p-0">
            {group.tasks.map(task => <TaskRow key={task.id} task={task} complete={completedIds.has(task.id)} onMessage={showMessage} onToggle={toggleTask} />)}
          </Card>
        </section>
      ))}

      {!groups.length && (
        <Card className="p-6 text-center">
          <h2 className="text-xl font-bold">No hay tareas con estos filtros</h2>
          <p className="mt-2 text-[16px] leading-relaxed text-muted-foreground">Tus tareas siguen guardadas. Cambia los filtros para volver a verlas.</p>
          <Button type="button" size="lg" className="mt-4 w-full" onClick={clearFilters}>Mostrar todas</Button>
        </Card>
      )}

      <Button type="button" size="lg" variant="outline" className="w-full bg-white" onClick={onRegisterSale}><Plus aria-hidden="true" /> Registrar venta</Button>
      <button type="button" onClick={onOpenTools} className="flex min-h-20 w-full items-center gap-4 rounded-3xl border border-primary/15 bg-primary/5 p-4 text-left">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white text-primary shadow-sm"><Wrench aria-hidden="true" /></span>
        <span className="min-w-0 flex-1"><strong className="block text-[18px]">Herramientas</strong><span className="block text-[15px] text-muted-foreground">Mensajes, productos y códigos QR</span></span>
        <ChevronRight className="text-primary" aria-hidden="true" />
      </button>

      {filterConfig && <TaskFilterSheet isOpen onClose={() => setActiveFilter(null)} {...filterConfig} />}

      <Sheet open={Boolean(messageTask)} onOpenChange={open => { if (!open) setMessageTask(null); }}>
        <SheetContent side="bottom" className="mx-auto max-h-[92dvh] max-w-lg overflow-y-auto rounded-t-[30px] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6">
          <SheetHeader className="pr-14 text-left">
            <SheetTitle className="text-2xl">Mensaje para {messageTask?.person}</SheetTitle>
            <SheetDescription className="text-[16px] leading-relaxed">{messageTask?.context}</SheetDescription>
          </SheetHeader>
          <div className="mt-5 grid grid-cols-3 gap-2" role="group" aria-label="Tono del mensaje">
            {[
              ['general', 'General'],
              ['amigable', 'Amigable'],
              ['directo', 'Directo'],
            ].map(([value, label]) => (
              <button key={value} type="button" onClick={() => { setTone(/** @type {MessageTone} */ (value)); setCopyStatus(''); }} aria-pressed={tone === value} className={`min-h-12 rounded-2xl px-2 text-[15px] font-bold ${tone === value ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>{label}</button>
            ))}
          </div>
          <p className="mt-5 select-text rounded-2xl bg-muted p-4 text-[17px] leading-relaxed">{selectedMessage}</p>
          {copyStatus && <p className="mt-3 text-[15px] font-semibold text-primary" role="status">{copyStatus}</p>}
          <div className="mt-5 space-y-3">
            <Button type="button" size="lg" variant="outline" className="w-full bg-white" onClick={copyMessage}><Clipboard aria-hidden="true" /> Copiar mensaje</Button>
            <Button type="button" size="lg" className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={openWhatsApp}><MessageCircle aria-hidden="true" /> Abrir WhatsApp</Button>
            <SheetClose asChild><Button type="button" size="lg" variant="ghost" className="w-full">Cerrar</Button></SheetClose>
          </div>
          <p className="mt-4 text-[14px] leading-relaxed text-muted-foreground">Datos ficticios. WhatsApp sólo se abre cuando presionas el botón.</p>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default DemoToday;
