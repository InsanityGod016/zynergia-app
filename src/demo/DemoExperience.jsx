import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  CalendarCheck,
  Check,
  ChevronRight,
  HelpCircle,
  LogOut,
  MessageCircle,
  Network,
  Package,
  QrCode,
  ReceiptText,
  Settings,
  UserRound,
  Users,
  Wrench,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import BrandMark from '@/components/ui/BrandMark';
import { Card } from '@/components/ui/card';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { DemoContacts, demoInitialContacts } from '@/demo/DemoTasksContacts';
import { DemoToday } from '@/demo/DemoToday';
import { DemoSales } from '@/demo/DemoSalesFlow';
import { DemoTeamOriginal, demoInitialPartners } from '@/demo/DemoTeamOriginal';
import { DemoProducts } from '@/demo/DemoProducts';
import DemoQr from '@/demo/DemoQr';
import DemoPurchaseFlow from '@/demo/DemoPurchaseFlow';
import '@/auth.css';

const screensWithBottomNav = new Set(['today', 'contacts', 'sales', 'team']);

const freshDemoPartners = () => demoInitialPartners.map(partner => ({
  ...partner,
  metrics: partner.metrics ? { ...partner.metrics } : null,
}));

function DemoNotice() {
  return (
    <div className="sticky top-0 z-40 bg-amber-100 px-4 pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))] text-center text-[14px] font-bold text-amber-950 shadow-sm">
      DEMOSTRACIÓN · Todos los nombres y datos son ficticios
    </div>
  );
}

/** @param {{ onEnter: () => void }} props */
function DemoEntry({ onEnter }) {
  return (
    <main className="auth-page">
      <section className="auth-card auth-card--center" aria-labelledby="demo-login-title">
        <BrandMark className="mx-auto h-24 w-24 rounded-3xl" />
        <p className="eyebrow">Demostración segura</p>
        <h1 id="demo-login-title">Mira cómo quedó Zynergia</h1>
        <p className="auth-lead">
          Puedes recorrer todas las funciones sin correo ni contraseña. Nada cambia datos reales.
        </p>
        <Button type="button" size="lg" className="w-full" onClick={onEnter}>
          Entrar a la demostración
        </Button>
        <p className="mt-4 text-[15px] leading-relaxed text-slate-600">
          Esta vista usa datos ficticios y no se conecta con ninguna cuenta real.
        </p>
      </section>
    </main>
  );
}

/**
 * @param {{ title: string, isSubscreen: boolean, onBack: () => void, onAccount: () => void, onNotices: () => void }} props
 */
function Header({ title, isSubscreen, onBack, onAccount, onNotices }) {
  return (
    <header className="grid min-h-[72px] grid-cols-[56px_minmax(0,1fr)_56px] items-center gap-2 px-4 py-2">
      {isSubscreen ? (
        <button type="button" onClick={onBack} className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl text-[14px] font-semibold hover:bg-muted" aria-label="Volver">
          <ArrowLeft className="h-6 w-6" aria-hidden="true" />
          <span>Volver</span>
        </button>
      ) : (
        <button type="button" onClick={onAccount} className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl text-[14px] font-semibold hover:bg-muted" aria-label="Abrir cuenta">
          <UserRound className="h-6 w-6" aria-hidden="true" />
          <span>Cuenta</span>
        </button>
      )}
      <h1 className="truncate text-center text-[20px] font-bold text-foreground">{title}</h1>
      <button type="button" onClick={onNotices} className="flex h-14 w-14 flex-col items-center justify-center rounded-2xl text-[14px] font-semibold hover:bg-muted" aria-label="Abrir avisos">
        <span className="relative">
          <Bell className="h-6 w-6" aria-hidden="true" />
          <span className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border-2 border-background bg-destructive" aria-hidden="true" />
        </span>
        <span>Avisos</span>
      </button>
    </header>
  );
}

/** @param {{ screen: string, onNavigate: (screen: string) => void }} props */
function BottomNavigation({ screen, onNavigate }) {
  const items = [
    { key: 'today', icon: CalendarCheck, label: 'Hoy' },
    { key: 'contacts', icon: Users, label: 'Contactos' },
    { key: 'sales', icon: ReceiptText, label: 'Ventas' },
    { key: 'team', icon: Network, label: 'Equipo' },
  ];

  return (
    <nav aria-label="Navegación de demostración" className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-white/95 shadow-nav backdrop-blur-xl">
      <div className="mx-auto grid h-[76px] max-w-lg grid-cols-4 px-1">
        {items.map(({ key, icon: Icon, label }) => {
          const active = screen === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onNavigate(key)}
              aria-current={active ? 'page' : undefined}
              className={`flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-0.5 text-[14px] font-semibold ${active ? 'text-primary' : 'text-muted-foreground'}`}
            >
              <span className={`flex h-8 w-11 items-center justify-center rounded-full ${active ? 'bg-primary/10' : ''}`}>
                <Icon className="h-[22px] w-[22px]" aria-hidden="true" />
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </div>
      <div className="h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}

/** @param {{ open: boolean, onOpenChange: (open: boolean) => void, onOpenTasks: () => void, onOpenTeam: () => void }} props */
function DemoAlerts({ open, onOpenChange, onOpenTasks, onOpenTeam }) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="mx-auto max-h-[85dvh] max-w-lg overflow-y-auto rounded-t-[30px] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-5">
        <div className="mx-auto mb-4 h-1.5 w-14 rounded-full bg-slate-300" aria-hidden="true" />
        <SheetHeader className="pr-12 text-left">
          <SheetTitle className="text-2xl">Avisos</SheetTitle>
          <SheetDescription className="text-[16px]">Te llevan directamente a la persona o tarea relacionada.</SheetDescription>
        </SheetHeader>
        <div className="mt-5 space-y-3">
          <button type="button" onClick={onOpenTasks} className="w-full rounded-3xl border bg-white p-4 text-left shadow-card">
            <p className="text-[15px] font-semibold text-destructive">Tarea atrasada</p>
            <h3 className="mt-1 text-[18px] font-bold">Seguimiento con María López</h3>
            <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">Está pendiente desde ayer.</p>
            <span className="mt-3 flex items-center gap-1 text-[15px] font-bold text-primary">Abrir tarea <ChevronRight aria-hidden="true" /></span>
          </button>
          <button type="button" onClick={onOpenTeam} className="w-full rounded-3xl border bg-white p-4 text-left shadow-card">
            <p className="text-[15px] font-semibold text-primary">Fast Start</p>
            <h3 className="mt-1 text-[18px] font-bold">Ana García necesita apoyo</h3>
            <p className="mt-1 text-[15px] leading-relaxed text-muted-foreground">Está cerca de cerrar su etapa actual.</p>
            <span className="mt-3 flex items-center gap-1 text-[15px] font-bold text-primary">Abrir equipo <ChevronRight aria-hidden="true" /></span>
          </button>
        </div>
        <SheetClose asChild><Button type="button" size="lg" variant="outline" className="mt-5 w-full bg-white">Cerrar avisos</Button></SheetClose>
      </SheetContent>
    </Sheet>
  );
}

/** @param {{ onOpenProducts: () => void, onOpenToday: () => void, onOpenQr: () => void }} props */
function ToolsScreen({ onOpenProducts, onOpenToday, onOpenQr }) {
  const [selected, setSelected] = useState(null);
  const tools = [
    { id: 'messages', icon: MessageCircle, title: 'Mensajes y plantillas', description: 'Prepara seguimientos claros', detail: 'Elige una plantilla, ajusta el nombre y abre WhatsApp sólo cuando el mensaje esté listo.' },
    { id: 'products', icon: Package, title: 'Productos', description: 'Consulta tu catálogo', detail: 'Revisa productos genéricos, notas y precios de referencia desde una lista sencilla.' },
    { id: 'qr', icon: QrCode, title: 'Crear código QR', description: 'Comparte información fácilmente', detail: 'Agrega un enlace, revisa la vista previa y luego comparte o descarga el QR.' },
  ];

  const selectedTool = tools.find(tool => tool.id === selected) || null;
  return (
    <div className="space-y-3">
      <p className="mb-4 text-[16px] leading-relaxed text-muted-foreground">Elige una opción. Cada herramienta abre desde abajo y siempre muestra cómo volver.</p>
      {tools.map(({ id, icon: Icon, title, description }) => (
        <button key={id} type="button" onClick={() => id === 'products' ? onOpenProducts() : id === 'qr' ? onOpenQr() : setSelected(id)} className="flex min-h-24 w-full items-center gap-4 rounded-3xl border bg-white p-5 text-left shadow-card">
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary"><Icon aria-hidden="true" /></span>
          <span className="min-w-0 flex-1"><span className="block text-[18px] font-bold">{title}</span><span className="block text-[16px] text-muted-foreground">{description}</span></span>
          <ChevronRight className="shrink-0 text-muted-foreground" aria-hidden="true" />
        </button>
      ))}
      <Sheet open={Boolean(selectedTool)} onOpenChange={open => { if (!open) setSelected(null); }}>
        <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-[30px] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6">
          {selectedTool && <>
            <SheetHeader className="pr-12 text-left"><SheetTitle className="text-2xl">{selectedTool.title}</SheetTitle><SheetDescription className="text-[16px]">Vista de demostración</SheetDescription></SheetHeader>
            <Card className="mt-5 p-5"><p className="text-[17px] leading-relaxed">{selectedTool.detail}</p></Card>
            <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground">Cada mensaje nace de una tarea para que siempre sepas a quién escribir y por qué.</p>
            <SheetClose asChild><Button type="button" size="lg" className="mt-5 w-full" onClick={onOpenToday}>Ir a Hoy y probar un mensaje</Button></SheetClose>
            <SheetClose asChild><Button type="button" size="lg" variant="outline" className="mt-3 w-full bg-white">Cerrar</Button></SheetClose>
          </>}
        </SheetContent>
      </Sheet>
    </div>
  );
}

/** @param {{ onTools: () => void, onExit: () => void }} props */
function AccountScreen({ onTools, onExit }) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [canceled, setCanceled] = useState(false);
  const [infoPanel, setInfoPanel] = useState(null);
  const menuItems = [
    { icon: Wrench, label: 'Herramientas', action: onTools },
    { icon: Settings, label: 'Perfil y preferencias', action: () => setInfoPanel('profile') },
    { icon: HelpCircle, label: 'Ayuda y soporte', action: () => setInfoPanel('help') },
  ];
  const info = infoPanel === 'profile'
    ? { title: 'Perfil y preferencias', text: 'Aquí podrás cambiar tu nombre, foto, país y moneda con campos grandes y explicaciones claras.' }
    : { title: 'Ayuda y soporte', text: 'Aquí encontrarás respuestas sencillas y una ruta visible para pedir ayuda sin buscar un correo escondido.' };

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <div className="flex items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-xl font-bold text-primary">CE</span>
          <div><h2 className="text-xl font-bold">Cuenta de ejemplo</h2><p className="text-[16px] text-muted-foreground">Datos locales de demostración</p></div>
        </div>
      </Card>
      <Card className="p-5">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-50 text-emerald-700"><Check aria-hidden="true" /></span>
          <div>
            <h2 className="text-lg font-bold">{canceled ? 'Renovación cancelada' : 'Suscripción activa'}</h2>
            <p className="mt-1 text-[16px] leading-relaxed text-muted-foreground">{canceled ? 'Puedes usarla hasta el 13 de septiembre de 2026.' : 'Próxima fecha: 13 de septiembre de 2026.'}</p>
          </div>
        </div>
        <Button type="button" size="lg" variant="outline" className="mt-5 w-full bg-white" disabled={canceled} onClick={() => setCancelOpen(true)}>
          {canceled ? 'Renovación cancelada' : 'Cancelar renovación'}
        </Button>
        <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">Vista de demostración: no realiza ningún cobro ni cambio real.</p>
      </Card>
      {menuItems.map(({ icon: Icon, label, action }) => (
        <button key={label} type="button" onClick={action} className="flex min-h-16 w-full items-center gap-4 rounded-2xl bg-white px-4 text-left shadow-card">
          <Icon className="text-primary" aria-hidden="true" /><span className="flex-1 text-[17px] font-bold">{label}</span><ChevronRight className="text-muted-foreground" aria-hidden="true" />
        </button>
      ))}
      <button type="button" onClick={onExit} className="flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl text-[17px] font-semibold text-destructive"><LogOut aria-hidden="true" /> Salir de la demostración</button>

      <Sheet open={cancelOpen} onOpenChange={setCancelOpen}>
        <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-[30px] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6">
          <SheetHeader className="pr-12 text-left"><SheetTitle className="text-2xl">¿Cancelar la renovación?</SheetTitle><SheetDescription className="text-[16px] leading-relaxed">Seguirías usando Zynergia hasta el 13 de septiembre. No hay reembolso parcial.</SheetDescription></SheetHeader>
          <Button type="button" size="lg" variant="destructive" className="mt-6 w-full" onClick={() => { setCanceled(true); setCancelOpen(false); }}>Sí, cancelar renovación de ejemplo</Button>
          <SheetClose asChild><Button type="button" size="lg" variant="outline" className="mt-3 w-full bg-white">No, conservarla</Button></SheetClose>
        </SheetContent>
      </Sheet>
      <Sheet open={Boolean(infoPanel)} onOpenChange={open => { if (!open) setInfoPanel(null); }}>
        <SheetContent side="bottom" className="mx-auto max-w-lg rounded-t-[30px] px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-6">
          <SheetHeader className="pr-12 text-left"><SheetTitle className="text-2xl">{info.title}</SheetTitle><SheetDescription className="text-[16px]">Vista de demostración</SheetDescription></SheetHeader>
          <Card className="mt-5 p-5"><p className="text-[17px] leading-relaxed">{info.text}</p></Card>
          <SheetClose asChild><Button type="button" size="lg" className="mt-5 w-full">Entendido</Button></SheetClose>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function MobileDemoExperience() {
  const [entered, setEntered] = useState(false);
  const [screen, setScreen] = useState('today');
  const [navigationStack, setNavigationStack] = useState([]);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [saleRequested, setSaleRequested] = useState(false);
  const [demoContacts, setDemoContacts] = useState(demoInitialContacts);
  const [demoPartners, setDemoPartners] = useState(freshDemoPartners);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [screen]);

  if (!entered) return <DemoEntry onEnter={() => setEntered(true)} />;

  /** @param {string} next */
  const openSubscreen = next => {
    setNavigationStack(stack => [...stack, screen]);
    setScreen(next);
  };
  /** @param {string} next */
  const navigate = next => {
    setSaleRequested(false);
    setNavigationStack([]);
    setScreen(next);
  };
  const goBack = () => {
    const previous = navigationStack[navigationStack.length - 1] || 'today';
    setNavigationStack(stack => stack.slice(0, -1));
    setScreen(previous);
  };
  const startSale = () => {
    setSaleRequested(true);
    setNavigationStack([]);
    setScreen('sales');
  };

  const isSubscreen = !screensWithBottomNav.has(screen);
  const titles = { today: 'Hoy', contacts: 'Contactos', sales: 'Ventas', team: 'Equipo', tools: 'Herramientas', products: 'Productos', qr: 'Código QR', account: 'Mi cuenta' };

  return (
    <div className="min-h-dvh bg-background">
      <DemoNotice />
      <div className={`mx-auto min-h-dvh w-full max-w-lg ${screensWithBottomNav.has(screen) ? 'pb-[calc(6.5rem+env(safe-area-inset-bottom))]' : 'pb-8'}`}>
        <Header title={titles[screen]} isSubscreen={isSubscreen} onBack={goBack} onAccount={() => openSubscreen('account')} onNotices={() => setNoticesOpen(true)} />
        <main className="px-4 pb-8 sm:px-5">
          <div hidden={screen !== 'today'}><DemoToday partners={demoPartners} onRegisterSale={startSale} onOpenTools={() => openSubscreen('tools')} /></div>
          <div hidden={screen !== 'contacts'}><DemoContacts contacts={demoContacts} onContactsChange={setDemoContacts} /></div>
          <div hidden={screen !== 'sales'}><DemoSales initiallyOpen={saleRequested} contacts={demoContacts} /></div>
          <div hidden={screen !== 'team'}><DemoTeamOriginal partners={demoPartners} onPartnersChange={setDemoPartners} contacts={demoContacts} onContactsChange={setDemoContacts} /></div>
          {screen === 'tools' && <ToolsScreen onOpenProducts={() => openSubscreen('products')} onOpenToday={() => navigate('today')} onOpenQr={() => openSubscreen('qr')} />}
          {screen === 'products' && <DemoProducts />}
          {screen === 'qr' && <DemoQr />}
          {screen === 'account' && <AccountScreen onTools={() => openSubscreen('tools')} onExit={() => { setEntered(false); setScreen('today'); setNavigationStack([]); setSaleRequested(false); setDemoContacts(demoInitialContacts); setDemoPartners(freshDemoPartners()); }} />}
        </main>
      </div>
      {screensWithBottomNav.has(screen) && <BottomNavigation screen={screen} onNavigate={navigate} />}
      <DemoAlerts
        open={noticesOpen}
        onOpenChange={setNoticesOpen}
        onOpenTasks={() => { setNoticesOpen(false); navigate('today'); }}
        onOpenTeam={() => { setNoticesOpen(false); navigate('team'); }}
      />
    </div>
  );
}

const previewPaths = new Set(['/', '/crear-cuenta', '/verificar-correo', '/cuenta', '/pago/exito', '/app']);

export default function DemoExperience() {
  const [path, setPath] = useState(window.location.protocol === 'capacitor:' ? '/demo' : window.location.pathname);
  const [email, setEmail] = useState('demo@zynergia.pro');

  useEffect(() => {
    const handlePopState = () => setPath(window.location.pathname);
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = nextPath => {
    window.history.pushState({}, '', nextPath);
    setPath(nextPath);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  if (path === '/demo') return <MobileDemoExperience />;

  return (
    <DemoPurchaseFlow
      path={previewPaths.has(path) ? path : '/'}
      email={email}
      onEmail={setEmail}
      onNavigate={navigate}
      onOpenDemo={() => navigate('/demo')}
    />
  );
}
