import { useMemo, useState } from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Hash,
  Lock,
  Network,
  Plus,
  Search,
  Share2,
  Smartphone,
  TrendingUp,
  Users,
  Zap,
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

const DAY_MS = 86_400_000;

function isoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addDays(dateString, days) {
  const [year, month, day] = dateString.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return isoDate(date);
}

function daysAgo(days) {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - days);
  return isoDate(date);
}

function elapsedDays(startDate) {
  const [year, month, day] = startDate.split('-').map(Number);
  const start = new Date(year, month - 1, day);
  const today = new Date();
  start.setHours(12, 0, 0, 0);
  today.setHours(12, 0, 0, 0);
  return Math.max(0, Math.floor((today.getTime() - start.getTime()) / DAY_MS));
}

const LEGACY_BONUSES = {
  qteam: { label: 'Q-Team', subtitle: 'Meta día 30', amount: '$1,900 MXN', target: 4 },
  fs1: { label: 'Fast Start Nivel 1', subtitle: 'Meta día 60', amount: '$7,600 MXN', target: 2 },
  fs2: { label: 'Fast Start Nivel 2', subtitle: 'Meta día 90', amount: '$22,800 MXN', target: 1 },
  xteam: { label: 'X-Team', subtitle: 'Meta día 120', amount: '$2,850 MXN', target: 10 },
};

const demoPartnerSeeds = [
  {
    id: 'partner-ana',
    contactId: 3,
    name: 'Ana García',
    phone: '+52 55 0000 0104',
    partnerUserId: 'demo-user-ana',
    startDate: daysAgo(18),
    metrics: { premierClients: 3, partnersCount: 0, duplicatedTeams: 0 },
    lastActiveDays: 1,
  },
  {
    id: 'partner-carlos',
    contactId: 'demo-contact-carlos',
    name: 'Carlos Ruiz',
    phone: '+52 55 0000 0102',
    partnerUserId: 'demo-user-carlos',
    startDate: daysAgo(48),
    metrics: { premierClients: 4, partnersCount: 1, duplicatedTeams: 0 },
    lastActiveDays: 4,
  },
  {
    id: 'partner-patricia',
    contactId: 'demo-contact-patricia',
    name: 'Patricia Méndez',
    phone: '+52 55 0000 0106',
    partnerUserId: null,
    startDate: daysAgo(8),
    metrics: null,
    lastActiveDays: null,
  },
  {
    id: 'partner-diego',
    contactId: 'demo-contact-diego',
    name: 'Diego Torres',
    phone: '+52 55 0000 0107',
    partnerUserId: 'demo-user-diego',
    startDate: daysAgo(82),
    metrics: { premierClients: 7, partnersCount: 2, duplicatedTeams: 1 },
    lastActiveDays: 16,
  },
];

export const demoInitialPartners = demoPartnerSeeds.map(partner => ({
  ...partner,
  deadline: addDays(partner.startDate, 120),
  metrics: partner.metrics ? { ...partner.metrics } : null,
}));

const foundDemoUser = {
  userId: 'demo-user-sofia',
  name: 'Sofía Valdés',
  phone: '+52 55 0000 0124',
  metrics: { premierClients: 4, partnersCount: 2, duplicatedTeams: 0 },
  startDate: daysAgo(66),
};

function safeName(partner) {
  return partner?.name || 'Partner';
}

function plural(value, singular, pluralLabel) {
  return value === 1 ? singular : pluralLabel;
}

function stageState(metrics) {
  const values = {
    qteam: Math.max(0, metrics?.premierClients || 0),
    fs1: Math.max(0, metrics?.partnersCount || 0),
    fs2: Math.max(0, metrics?.duplicatedTeams || 0),
    xteam: Math.max(0, metrics?.premierClients || 0),
  };
  const completed = {
    qteam: values.qteam >= LEGACY_BONUSES.qteam.target,
    fs1: false,
    fs2: false,
    xteam: false,
  };
  completed.fs1 = completed.qteam && values.fs1 >= LEGACY_BONUSES.fs1.target;
  completed.fs2 = completed.fs1 && values.fs2 >= LEGACY_BONUSES.fs2.target;
  completed.xteam = completed.fs2 && values.xteam >= LEGACY_BONUSES.xteam.target;

  return {
    values,
    completed,
    status: {
      qteam: completed.qteam ? 'completed' : 'active',
      fs1: completed.fs1 ? 'completed' : completed.qteam ? 'active' : 'locked',
      fs2: completed.fs2 ? 'completed' : completed.fs1 ? 'active' : 'locked',
      xteam: completed.xteam ? 'completed' : completed.fs2 ? 'active' : 'locked',
    },
  };
}

/**
 * Devuelve el seguimiento que corresponde a las métricas actuales del partner.
 * Los partners sin cuenta vinculada nunca reciben metas inventadas.
 */
export function deriveDemoPartnerTask(partner) {
  const person = safeName(partner);
  const base = {
    id: `partner-task-${partner?.id || 'unknown'}`,
    partnerId: partner?.id || null,
    person,
    phone: partner?.phone || '',
    taskArea: 'partner',
    category: 'seguimiento',
    period: 'today',
    when: 'Hoy',
    complete: false,
  };

  if (!partner?.partnerUserId || !partner.metrics) {
    return {
      ...base,
      stage: 'link',
      action: `Vincular la cuenta de ${person}`,
      reason: 'Partner sin cuenta vinculada. Primero vincula su código para consultar datos reales y generar el seguimiento correcto.',
      message: `Hola ${person.split(' ')[0]}, quiero ayudarte a organizar tu avance. ¿Me compartes tu código de Zynergia para vincular nuestras cuentas?`,
    };
  }

  const { premierClients, partnersCount, duplicatedTeams } = partner.metrics;
  if (premierClients < 4) {
    const missing = 4 - premierClients;
    return {
      ...base,
      stage: 'qteam',
      action: `Apoyar a ${person} con Q-Team`,
      reason: `Fast Start · Q-Team: ${premierClients} de 4 clientes Premier activos. Le ${plural(missing, 'falta 1 cliente', `faltan ${missing} clientes`)}.`,
      message: `Hola ${person.split(' ')[0]}, vi que llevas ${premierClients} de 4 clientes activos para Q-Team. ¿Revisamos hoy tu lista para ayudarte con ${plural(missing, 'el que falta', 'los que faltan')}?`,
    };
  }

  if (partnersCount < 2) {
    const missing = 2 - partnersCount;
    return {
      ...base,
      stage: 'fs1',
      action: `Apoyar a ${person} con Nivel 1`,
      reason: `Fast Start · Nivel 1: Q-Team completo y ${partnersCount} de 2 partners. Le ${plural(missing, 'falta 1 partner', `faltan ${missing} partners`)}.`,
      message: `Hola ${person.split(' ')[0]}, tu Q-Team ya está completo. Para Nivel 1 llevas ${partnersCount} de 2 partners. ¿Vemos hoy a quién puedes presentar la oportunidad?`,
    };
  }

  if (duplicatedTeams < 1) {
    return {
      ...base,
      stage: 'fs2',
      action: `Revisar duplicación con ${person}`,
      reason: 'Fast Start · Nivel 2: ya tiene Q-Team y 2 partners; ahora necesita ayudar a su equipo a construir su propio Q-Team.',
      message: `Hola ${person.split(' ')[0]}, ya completaste Q-Team y tienes tus 2 partners. ¿Revisamos cuál de ellos necesita más apoyo para construir su propio Q-Team?`,
    };
  }

  if (premierClients < 10) {
    const missing = 10 - premierClients;
    return {
      ...base,
      stage: 'xteam',
      action: `Dar seguimiento a X-Team con ${person}`,
      reason: `Fast Start · X-Team: ${premierClients} de 10 clientes Premier activos. Le ${plural(missing, 'falta 1 cliente', `faltan ${missing} clientes`)}.`,
      message: `Hola ${person.split(' ')[0]}, vas en ${premierClients} de 10 clientes activos para X-Team. ¿Revisamos hoy cómo apoyar los siguientes contactos?`,
    };
  }

  return {
    ...base,
    stage: 'completed',
    action: `Check-in mensual con ${person}`,
    reason: 'Fast Start completado. Corresponde un check-in periódico para mantener organización y actividad.',
    message: `Hola ${person.split(' ')[0]}, felicidades por completar tu Fast Start. ¿Hacemos nuestro check-in mensual para revisar tu siguiente meta?`,
  };
}

function ProgressBar({ value, max, color = '#004AFE', label }) {
  const percentage = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div
      className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
      role="progressbar"
      aria-label={label}
      aria-valuenow={Math.min(value, max)}
      aria-valuemin={0}
      aria-valuemax={max}
    >
      <div className="h-full rounded-full transition-[width] motion-reduce:transition-none" style={{ width: `${percentage}%`, backgroundColor: color }} />
    </div>
  );
}

function StatusBadge({ status }) {
  const config = {
    completed: { label: 'Completado', Icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-800' },
    active: { label: 'En progreso', Icon: TrendingUp, className: 'bg-blue-50 text-primary' },
    locked: { label: 'Bloqueado', Icon: Lock, className: 'bg-slate-100 text-slate-600' },
  }[status];
  const Icon = config.Icon;
  return (
    <span className={`inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-[15px] font-semibold ${config.className}`}>
      <Icon className="h-4 w-4" aria-hidden="true" />
      {config.label}
    </span>
  );
}

function LegacyNotice() {
  return (
    <p className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-[15px] leading-relaxed text-amber-950">
      Estos son los importes que tenía la versión anterior. Antes de publicarlos confirmaremos que coincidan con el plan oficial vigente.
    </p>
  );
}

function BonusCard({ stageKey, value, status }) {
  const bonus = LEGACY_BONUSES[stageKey];
  const barColor = status === 'completed' ? '#16A34A' : status === 'locked' ? '#94A3B8' : '#004AFE';
  const missing = Math.max(0, bonus.target - value);
  const nextText = status === 'completed'
    ? 'Meta completada con los datos registrados.'
    : status === 'locked'
      ? 'Completa la etapa anterior para continuar.'
      : `${missing} ${stageKey === 'fs1' ? plural(missing, 'partner pendiente', 'partners pendientes') : stageKey === 'fs2' ? 'equipo por duplicar' : plural(missing, 'cliente pendiente', 'clientes pendientes')}.`;

  return (
    <Card className={`p-4 ${status === 'completed' ? 'border-emerald-400' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold text-muted-foreground">{bonus.subtitle}</p>
          <h3 className="mt-0.5 text-[18px] font-bold">{bonus.label}</h3>
        </div>
        <StatusBadge status={status} />
      </div>
      <p className="mt-3 text-2xl font-bold text-primary">{bonus.amount}</p>
      <div className="mt-3 flex items-center justify-between text-[15px] font-semibold">
        <span>Avance</span>
        <span>{Math.min(value, bonus.target)} / {bonus.target}</span>
      </div>
      <div className="mt-2">
        <ProgressBar value={value} max={bonus.target} color={barColor} label={`${bonus.label}: ${Math.min(value, bonus.target)} de ${bonus.target}`} />
      </div>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">{nextText}</p>
    </Card>
  );
}

function FastStartPanel({ partners }) {
  const ownStartDate = useMemo(() => daysAgo(62), []);
  const daysIn = elapsedDays(ownStartDate);
  const daysRemaining = Math.max(0, 120 - daysIn);
  const linkedPartners = partners.filter(partner => partner.partnerUserId && partner.metrics);
  const metrics = {
    premierClients: 6,
    partnersCount: partners.length,
    duplicatedTeams: linkedPartners.filter(partner => partner.metrics.premierClients >= 4).length,
  };
  const stages = stageState(metrics);

  return (
    <div className="space-y-4">
      <Card className="border-0 bg-gradient-to-br from-[#004AFE] to-[#0039CC] p-5 text-white">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">Fast Start (120 días)</h2>
          <span className="rounded-full bg-white/20 px-3 py-1.5 text-[15px] font-semibold">Activo</span>
        </div>
        <div className="mt-5 grid grid-cols-4 gap-2 text-center">
          {[
            ['Día', daysIn],
            ['Restan', daysRemaining],
            ['Clientes', metrics.premierClients],
            ['Partners', metrics.partnersCount],
          ].map(([label, value]) => (
            <div key={label} className="min-w-0 border-l border-white/20 first:border-0">
              <p className="text-[15px] text-blue-100">{label}</p>
              <p className="mt-1 text-2xl font-bold">{value}</p>
            </div>
          ))}
        </div>
      </Card>

      <BonusCard stageKey="qteam" value={stages.values.qteam} status={stages.status.qteam} />
      <BonusCard stageKey="fs1" value={stages.values.fs1} status={stages.status.fs1} />
      <BonusCard stageKey="fs2" value={stages.values.fs2} status={stages.status.fs2} />
      <BonusCard stageKey="xteam" value={stages.values.xteam} status={stages.status.xteam} />
      <LegacyNotice />
    </div>
  );
}

function PartnerCard({ partner, contact, onClick }) {
  const name = contact?.name || contact?.full_name || partner.name;
  const daysIn = elapsedDays(partner.startDate);
  const daysRemaining = Math.max(0, 120 - daysIn);
  const linked = Boolean(partner.partnerUserId && partner.metrics);
  const task = deriveDemoPartnerTask({ ...partner, name });
  const inactive = linked && partner.lastActiveDays > 14;

  return (
    <button type="button" onClick={onClick} className={`w-full rounded-2xl border bg-white p-4 text-left shadow-sm transition-transform active:scale-[0.99] ${inactive ? 'border-red-300' : 'border-border'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[17px] font-bold">{name}</span>
            <span className={`inline-flex min-h-8 items-center gap-1 rounded-full px-2.5 text-[15px] font-semibold ${linked ? inactive ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-primary' : 'bg-slate-100 text-slate-700'}`}>
              {linked && <Smartphone className="h-4 w-4" aria-hidden="true" />}
              {linked ? inactive ? 'Inactivo' : 'En la app' : 'Sin vincular'}
            </span>
          </div>
          <p className="mt-2 text-[15px] text-muted-foreground">Día {daysIn} de Fast Start · {daysRemaining} días restantes</p>
          <p className="mt-1 text-[15px] font-semibold text-primary">{task.action}</p>
        </div>
        <ChevronRight className="mt-2 h-6 w-6 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>
    </button>
  );
}

function PartnerList({ partners, contacts, onSelect }) {
  const contactFor = contactId => contacts.find(contact => String(contact.id) === String(contactId));
  return (
    <div className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[15px] font-semibold text-muted-foreground">TU RED DIRECTA</p>
          <h2 className="text-2xl font-bold">Partners</h2>
        </div>
        <span className="rounded-full bg-white px-3 py-1.5 text-[15px] font-bold text-muted-foreground shadow-sm">{partners.length}</span>
      </div>
      {partners.length ? partners.map(partner => (
        <PartnerCard key={partner.id} partner={partner} contact={contactFor(partner.contactId)} onClick={() => onSelect(partner.id)} />
      )) : (
        <Card className="p-6 text-center">
          <Users className="mx-auto h-12 w-12 text-slate-300" aria-hidden="true" />
          <h2 className="mt-3 text-xl font-bold">Todavía no hay partners</h2>
          <p className="mt-2 text-[16px] text-muted-foreground">Toca el botón + para agregar o vincular el primero.</p>
        </Card>
      )}
    </div>
  );
}

function AddPartnerSheet({ open, onOpenChange, partners, contacts, onAddPartner, onAddLinkedPartner }) {
  const [tab, setTab] = useState('code');
  const [code, setCode] = useState('');
  const [codeState, setCodeState] = useState('idle');
  const [search, setSearch] = useState('');
  const [selectedContactId, setSelectedContactId] = useState(null);
  const existingIds = new Set(partners.map(partner => String(partner.contactId)));
  const availableContacts = contacts.filter(contact => !existingIds.has(String(contact.id)) && (contact.name || contact.full_name || '').toLowerCase().includes(search.toLowerCase()));

  const reset = () => {
    setTab('code');
    setCode('');
    setCodeState('idle');
    setSearch('');
    setSelectedContactId(null);
  };

  const changeCode = value => {
    const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setCode(normalized);
    if (normalized.length < 4) setCodeState('idle');
    else setCodeState(normalized === 'SOFIA24' ? 'found' : 'missing');
  };

  const confirm = () => {
    if (tab === 'code' && codeState === 'found') onAddLinkedPartner(foundDemoUser);
    if (tab === 'contact' && selectedContactId != null) onAddPartner(selectedContactId);
    reset();
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={nextOpen => { if (!nextOpen) reset(); onOpenChange(nextOpen); }}>
      <SheetContent side="bottom" className="mx-auto max-h-[90dvh] max-w-lg overflow-y-auto rounded-t-[30px] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6">
        <SheetHeader className="pr-12 text-left">
          <SheetTitle className="text-2xl">Agregar partner</SheetTitle>
          <SheetDescription className="text-[16px]">Vincula su cuenta o elige un contacto que ya tengas.</SheetDescription>
        </SheetHeader>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setTab('code')} aria-pressed={tab === 'code'} className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl text-[16px] font-bold ${tab === 'code' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
            <Hash className="h-5 w-5" aria-hidden="true" /> Por código
          </button>
          <button type="button" onClick={() => setTab('contact')} aria-pressed={tab === 'contact'} className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl text-[16px] font-bold ${tab === 'contact' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
            <Users className="h-5 w-5" aria-hidden="true" /> Por contacto
          </button>
        </div>

        {tab === 'code' ? (
          <div className="mt-5 space-y-4">
            <label className="block">
              <span className="mb-2 block text-[16px] font-bold">Código de partner</span>
              <input value={code} onChange={event => changeCode(event.target.value)} placeholder="Prueba SOFIA24" autoCapitalize="characters" className="h-14 w-full rounded-2xl border bg-white px-4 text-center text-xl font-bold uppercase tracking-[0.18em] text-primary" />
            </label>
            <p className="text-[15px] text-muted-foreground">Esta demostración local reconoce el código SOFIA24.</p>
            {codeState === 'found' && (
              <div className="flex items-center gap-3 rounded-2xl border border-emerald-300 bg-emerald-50 p-4" role="status">
                <CheckCircle2 className="h-6 w-6 shrink-0 text-emerald-700" aria-hidden="true" />
                <div><p className="text-[17px] font-bold">Sofía Valdés</p><p className="text-[15px] text-emerald-800">Cuenta encontrada · métricas disponibles</p></div>
              </div>
            )}
            {codeState === 'missing' && <p className="rounded-2xl bg-amber-50 p-4 text-[15px] text-amber-950" role="alert">Código no encontrado en la demo. Usa SOFIA24 para probar el flujo.</p>}
          </div>
        ) : (
          <div className="mt-5">
            <label className="relative block">
              <span className="sr-only">Buscar contacto</span>
              <Search className="absolute left-4 top-4 h-6 w-6 text-muted-foreground" aria-hidden="true" />
              <input value={search} onChange={event => setSearch(event.target.value)} placeholder="Buscar contacto" className="h-14 w-full rounded-2xl border bg-white pl-12 pr-4 text-[17px]" />
            </label>
            <div className="mt-3 space-y-1" role="radiogroup" aria-label="Contacto para convertir en partner">
              {availableContacts.length ? availableContacts.map(contact => {
                const name = contact.name || contact.full_name;
                const selected = String(selectedContactId) === String(contact.id);
                return (
                  <button key={contact.id} type="button" role="radio" aria-checked={selected} onClick={() => setSelectedContactId(contact.id)} className="flex min-h-14 w-full items-center justify-between rounded-2xl px-3 text-left text-[17px] hover:bg-muted">
                    {name}
                    <span className={`grid h-7 w-7 place-items-center rounded-full border-2 ${selected ? 'border-primary bg-primary text-white' : 'border-border text-transparent'}`}><CheckCircle2 className="h-4 w-4" aria-hidden="true" /></span>
                  </button>
                );
              }) : <p className="py-8 text-center text-[16px] text-muted-foreground">No hay contactos disponibles.</p>}
            </div>
          </div>
        )}

        <Button type="button" size="lg" className="mt-6 w-full" disabled={tab === 'code' ? codeState !== 'found' : selectedContactId == null} onClick={confirm}>Agregar partner</Button>
        <SheetClose asChild><Button type="button" size="lg" variant="ghost" className="mt-2 w-full">Cancelar</Button></SheetClose>
      </SheetContent>
    </Sheet>
  );
}

function PartnerDetailSheet({ partner, contact, open, onOpenChange, onUpdatePartner }) {
  const [code, setCode] = useState('');
  const [codeState, setCodeState] = useState('idle');
  const [shareState, setShareState] = useState('');
  if (!partner) return null;

  const name = contact?.name || contact?.full_name || partner.name;
  const linked = Boolean(partner.partnerUserId && partner.metrics);
  const daysIn = elapsedDays(partner.startDate);
  const daysRemaining = Math.max(0, 120 - daysIn);
  const stages = stageState(partner.metrics || {});
  const task = deriveDemoPartnerTask({ ...partner, name });

  const changeCode = value => {
    const normalized = value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setCode(normalized);
    if (normalized.length < 4) setCodeState('idle');
    else setCodeState(normalized === 'SOFIA24' ? 'found' : 'missing');
  };

  const linkAccount = () => {
    onUpdatePartner({
      ...partner,
      partnerUserId: foundDemoUser.userId,
      metrics: { ...foundDemoUser.metrics },
      lastActiveDays: 0,
    });
    setCode('');
    setCodeState('idle');
  };

  const invite = async () => {
    const text = `Hola ${name.split(' ')[0]}, descarga Zynergia y compárteme tu código para vincular tu progreso.`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
      setShareState('Invitación preparada.');
    } catch {
      setShareState('No se pudo compartir. Mantén presionado el texto para copiarlo.');
    }
  };

  return (
    <Sheet open={open} onOpenChange={nextOpen => { if (!nextOpen) { setCode(''); setCodeState('idle'); setShareState(''); } onOpenChange(nextOpen); }}>
      <SheetContent side="bottom" className="mx-auto max-h-[94dvh] max-w-lg overflow-y-auto rounded-t-[30px] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6">
        <SheetHeader className="pr-12 text-left">
          <SheetTitle className="text-2xl">{name}</SheetTitle>
          <SheetDescription className="text-[16px]">{linked ? 'Cuenta vinculada · progreso disponible' : 'Partner sin cuenta vinculada'}</SheetDescription>
        </SheetHeader>

        <Card className="mt-5 border-0 bg-gradient-to-br from-[#004AFE] to-[#0039CC] p-5 text-white">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-lg font-bold">Fast Start</h3>
            <span className="rounded-full bg-white/20 px-3 py-1.5 text-[15px] font-semibold">{daysRemaining ? `${daysRemaining} días restantes` : 'Vencido'}</span>
          </div>
          <div className="mt-4"><ProgressBar value={daysIn} max={120} color="#FFFFFF" label={`Día ${daysIn} de 120`} /></div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-center">
            <div><p className="text-[15px] text-blue-100">Día</p><p className="text-2xl font-bold">{daysIn}</p></div>
            <div className="border-l border-white/20"><p className="text-[15px] text-blue-100">Clientes</p><p className="text-2xl font-bold">{linked ? partner.metrics.premierClients : '—'}</p></div>
            <div className="border-l border-white/20"><p className="text-[15px] text-blue-100">Partners</p><p className="text-2xl font-bold">{linked ? partner.metrics.partnersCount : '—'}</p></div>
          </div>
        </Card>

        {linked ? (
          <div className="mt-5 space-y-3">
            <div>
              <p className="text-[15px] font-semibold text-muted-foreground">SIGUIENTE SEGUIMIENTO</p>
              <h3 className="mt-1 text-xl font-bold">{task.action}</h3>
              <p className="mt-1 text-[16px] leading-relaxed text-muted-foreground">{task.reason}</p>
            </div>
            <BonusCard stageKey="qteam" value={stages.values.qteam} status={stages.status.qteam} />
            <BonusCard stageKey="fs1" value={stages.values.fs1} status={stages.status.fs1} />
            <BonusCard stageKey="fs2" value={stages.values.fs2} status={stages.status.fs2} />
            <BonusCard stageKey="xteam" value={stages.values.xteam} status={stages.status.xteam} />
            <LegacyNotice />
          </div>
        ) : (
          <div className="mt-5 space-y-4">
            <Card className="bg-blue-50 p-5 text-center">
              <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-primary text-white"><Smartphone aria-hidden="true" /></span>
              <h3 className="mt-3 text-xl font-bold">Invítalo a Zynergia</h3>
              <p className="mt-2 text-[16px] leading-relaxed text-muted-foreground">Cuando vincule su cuenta podrás consultar métricas reales y generar el seguimiento correcto.</p>
              <Button type="button" size="lg" className="mt-4 w-full" onClick={invite}><Share2 aria-hidden="true" /> Preparar invitación</Button>
              {shareState && <p className="mt-3 text-[15px] font-semibold text-primary" role="status">{shareState}</p>}
            </Card>

            <Card className="p-5">
              <h3 className="text-lg font-bold">¿Ya tiene la app?</h3>
              <p className="mt-1 text-[15px] text-muted-foreground">Ingresa su código. En esta demo usa SOFIA24.</p>
              <label className="mt-4 block">
                <span className="sr-only">Código para vincular</span>
                <input value={code} onChange={event => changeCode(event.target.value)} placeholder="SOFIA24" autoCapitalize="characters" className="h-14 w-full rounded-2xl border bg-white px-4 text-center text-xl font-bold uppercase tracking-[0.18em] text-primary" />
              </label>
              {codeState === 'found' && <p className="mt-3 rounded-2xl bg-emerald-50 p-3 text-[15px] font-semibold text-emerald-800">Cuenta encontrada: Sofía Valdés</p>}
              {codeState === 'missing' && <p className="mt-3 rounded-2xl bg-amber-50 p-3 text-[15px] text-amber-950">Código no encontrado en la demo.</p>}
              <Button type="button" size="lg" className="mt-4 w-full" disabled={codeState !== 'found'} onClick={linkAccount}><Hash aria-hidden="true" /> Vincular cuenta</Button>
            </Card>
          </div>
        )}

        <SheetClose asChild><Button type="button" size="lg" variant="outline" className="mt-5 w-full bg-white">Cerrar</Button></SheetClose>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Pantalla Equipo fiel a la estructura original. Todo vive en memoria y ninguna
 * acción consulta Supabase, envía mensajes ni modifica cuentas reales.
 */
export function DemoTeamOriginal({ partners: controlledPartners, onPartnersChange, contacts: controlledContacts, onContactsChange }) {
  const [localPartners, setLocalPartners] = useState(() => demoInitialPartners.map(partner => ({ ...partner, metrics: partner.metrics ? { ...partner.metrics } : null })));
  const [localContacts, setLocalContacts] = useState([]);
  const partners = controlledPartners ?? localPartners;
  const contacts = controlledContacts ?? localContacts;
  const [activeTab, setActiveTab] = useState('faststart');
  const [addOpen, setAddOpen] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState(null);
  const selectedPartner = partners.find(partner => String(partner.id) === String(selectedPartnerId)) || null;
  const selectedContact = selectedPartner ? contacts.find(contact => String(contact.id) === String(selectedPartner.contactId)) : null;

  const savePartners = next => {
    if (controlledPartners == null) setLocalPartners(next);
    onPartnersChange?.(next);
  };
  const saveContacts = next => {
    if (controlledContacts == null) setLocalContacts(next);
    onContactsChange?.(next);
  };

  const addFromContact = contactId => {
    const contact = contacts.find(item => String(item.id) === String(contactId));
    if (!contact) return;
    const startDate = isoDate(new Date());
    savePartners([...partners, {
      id: `partner-contact-${contact.id}`,
      contactId: contact.id,
      name: contact.name || contact.full_name,
      phone: contact.phone || '',
      partnerUserId: null,
      startDate,
      deadline: addDays(startDate, 120),
      metrics: null,
      lastActiveDays: null,
    }]);
  };

  const addLinked = user => {
    if (partners.some(partner => partner.partnerUserId === user.userId)) return;
    const contactId = `demo-contact-${user.userId}`;
    const nextContact = { id: contactId, name: user.name, phone: user.phone, type: 'socio', nextAction: 'Fast Start vinculado' };
    if (!contacts.some(contact => String(contact.id) === contactId)) saveContacts([nextContact, ...contacts]);
    savePartners([...partners, {
      id: `partner-${user.userId}`,
      contactId,
      name: user.name,
      phone: user.phone,
      partnerUserId: user.userId,
      startDate: user.startDate,
      deadline: addDays(user.startDate, 120),
      metrics: { ...user.metrics },
      lastActiveDays: 0,
    }]);
  };

  const updatePartner = updatedPartner => {
    savePartners(partners.map(partner => partner.id === updatedPartner.id ? updatedPartner : partner));
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setActiveTab('faststart')} aria-pressed={activeTab === 'faststart'} className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl text-[16px] font-bold ${activeTab === 'faststart' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
          <Zap className="h-5 w-5" aria-hidden="true" /> Fast Start
        </button>
        <button type="button" onClick={() => setActiveTab('partners')} aria-pressed={activeTab === 'partners'} className={`flex min-h-14 items-center justify-center gap-2 rounded-2xl text-[16px] font-bold ${activeTab === 'partners' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
          <Network className="h-5 w-5" aria-hidden="true" /> Mi equipo <span className={`rounded-full px-2 py-0.5 text-[15px] ${activeTab === 'partners' ? 'bg-white/20' : 'bg-slate-200'}`}>{partners.length}</span>
        </button>
      </div>

      {activeTab === 'faststart'
        ? <FastStartPanel partners={partners} />
        : <PartnerList partners={partners} contacts={contacts} onSelect={setSelectedPartnerId} />}

      <button type="button" onClick={() => setAddOpen(true)} className="fixed bottom-[calc(6rem+env(safe-area-inset-bottom))] right-5 z-30 flex h-14 items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-[16px] font-semibold text-white shadow-xl transition-transform active:scale-95" aria-label="Agregar partner">
        <Plus className="h-6 w-6" strokeWidth={2.5} aria-hidden="true" />
        Agregar partner
      </button>

      <AddPartnerSheet open={addOpen} onOpenChange={setAddOpen} partners={partners} contacts={contacts} onAddPartner={addFromContact} onAddLinkedPartner={addLinked} />
      <PartnerDetailSheet partner={selectedPartner} contact={selectedContact} open={Boolean(selectedPartner)} onOpenChange={open => { if (!open) setSelectedPartnerId(null); }} onUpdatePartner={updatePartner} />
    </div>
  );
}

export default DemoTeamOriginal;
