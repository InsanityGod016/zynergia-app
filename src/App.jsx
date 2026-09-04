import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { QueryClientProvider, useQuery } from '@tanstack/react-query';
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { Loader2, LogOut, RefreshCw, ShieldAlert } from 'lucide-react';
import { Toaster } from 'sonner';
import { queryClientInstance } from '@/lib/query-client';
import NavigationTracker from '@/lib/NavigationTracker';
import PageNotFound from '@/lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import {
  BILLING_CHANGED_EVENT,
  billingAccessEndsAt,
  cancelSubscription,
  hasAppAccess,
  resolveBillingStatus,
} from '@/lib/subscription';
import { db } from '@/api/db';
import { supabaseConfigurationError } from '@/lib/supabaseClient';
import { initializeLocalNotificationNavigation, reconcileTaskNotifications } from '@/lib/localNotifications';
import { isAppWebHost, mobileRouteForAppUrl } from '@/lib/app-links';
import { pagesConfig } from './pages.config';
import './auth.css';

const nativeOnlyBuild = import.meta.env.VITE_NATIVE_BUILD === 'true';
const Landing = nativeOnlyBuild ? null : lazy(() => import('@/pages/Landing'));
const Register = nativeOnlyBuild ? null : lazy(() => import('@/pages/Register'));
const Login = lazy(() => import('@/pages/Login'));
const VerifyEmail = nativeOnlyBuild ? null : lazy(() => import('@/pages/VerifyEmail'));
const SetPassword = nativeOnlyBuild ? null : lazy(() => import('@/pages/SetPassword'));
const Account = nativeOnlyBuild ? null : lazy(() => import('@/pages/Account'));
const PaymentSuccess = nativeOnlyBuild ? null : lazy(() => import('@/pages/PaymentSuccess'));
const DownloadApp = nativeOnlyBuild ? null : lazy(() => import('@/pages/DownloadApp'));
const Support = nativeOnlyBuild ? null : lazy(() => import('@/pages/Support'));
const LegalDocument = nativeOnlyBuild ? null : lazy(() => import('@/pages/LegalDocument'));
const AccountDeletion = nativeOnlyBuild ? null : lazy(() => import('@/pages/AccountDeletion'));
const Onboarding = lazy(() => import('@/pages/Onboarding'));

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = Pages[mainPageKey];
const isNative = Capacitor.isNativePlatform();
const isHostedWebApp = typeof window !== 'undefined' && isAppWebHost(window.location.hostname);
const isLocalReviewBuild = import.meta.env.MODE === 'review' && import.meta.env.VITE_REVIEW_MODE === 'true';

function LoadingScreen({ message = 'Preparando Zynergia…' }) {
  return (
    <main className="app-state" aria-busy="true" aria-live="polite">
      <Loader2 className="app-state__spinner" aria-hidden="true" />
      <p>{message}</p>
    </main>
  );
}

function SignedOutOnly({ children }) {
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const location = useLocation();
  if (isLoadingAuth) return <LoadingScreen message="Revisando tu sesión…" />;
  if (isAuthenticated) {
    const requestedPath = new URLSearchParams(location.search).get('returnTo');
    return <Navigate to={requestedPath === '/eliminar-cuenta' ? requestedPath : '/cuenta'} replace />;
  }
  return children;
}

function WebRoutes() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/crear-cuenta" element={<SignedOutOnly><Register /></SignedOutOnly>} />
        <Route path="/verificar-correo" element={<VerifyEmail />} />
        <Route path="/iniciar-sesion" element={<SignedOutOnly><Login /></SignedOutOnly>} />
        <Route path="/recuperar-contrasena" element={<SignedOutOnly><Login initialMode="reset" /></SignedOutOnly>} />
        <Route path="/set-password" element={<SetPassword />} />
        <Route path="/cuenta" element={<Account />} />
        <Route path="/pago/exito" element={<PaymentSuccess />} />
        <Route path="/app" element={<DownloadApp />} />
        <Route path="/privacidad" element={<LegalDocument type="privacy" />} />
        <Route path="/terminos" element={<LegalDocument type="terms" />} />
        <Route path="/soporte" element={<Support />} />
        <Route path="/eliminar-cuenta" element={<AccountDeletion />} />

        <Route path="/landing" element={<Navigate to="/" replace />} />
        <Route path="/register" element={<Navigate to="/crear-cuenta" replace />} />
        <Route path="/download" element={<Navigate to="/app" replace />} />
        <Route path="/privacy" element={<Navigate to="/privacidad" replace />} />
        <Route path="/privacy-policy.html" element={<Navigate to="/privacidad" replace />} />

        {Object.keys(Pages).map(path => (
          <Route key={path} path={`/${path}`} element={<Navigate to="/cuenta" replace />} />
        ))}
        <Route path="*" element={<PageNotFound homePath="/" />} />
      </Routes>
    </Suspense>
  );
}

function LayoutWrapper({ children, currentPageName }) {
  return Layout
    ? <Layout currentPageName={currentPageName}>{children}</Layout>
    : children;
}

function ReadyMobileApp() {
  return (
    <Suspense fallback={<LoadingScreen />}>
      <TaskNotificationReconciler />
      <NavigationTracker />
      <Routes>
        <Route
          path="/"
          element={<LayoutWrapper currentPageName={mainPageKey}><MainPage /></LayoutWrapper>}
        />
        {Object.entries(Pages).map(([path, Page]) => (
          <Route
            key={path}
            path={`/${path}`}
            element={<LayoutWrapper currentPageName={path}><Page /></LayoutWrapper>}
          />
        ))}
        <Route path="*" element={<PageNotFound homePath="/" />} />
      </Routes>
    </Suspense>
  );
}

function TaskNotificationReconciler() {
  const { user } = useAuth();
  const tasks = useQuery({ queryKey: ['tasks'], queryFn: () => db.Task.list() });
  const contacts = useQuery({ queryKey: ['contacts'], queryFn: () => db.Contact.list() });
  const products = useQuery({ queryKey: ['products'], queryFn: () => db.Product.list() });
  const settings = useQuery({ queryKey: ['settings'], queryFn: () => db.Settings.list() });

  useEffect(() => {
    if ([tasks, contacts, products, settings].some(query => query.isLoading || query.isFetching || query.isError)) return;
    reconcileTaskNotifications({
      tasks: tasks.data || [],
      contacts: contacts.data || [],
      products: products.data || [],
      enabled: settings.data?.[0]?.notifications_enabled === true,
      userId: user?.id,
    }).catch(() => {});
  }, [contacts.data, contacts.isError, contacts.isFetching, contacts.isLoading, products.data, products.isError, products.isFetching, products.isLoading, settings.data, settings.isError, settings.isFetching, settings.isLoading, tasks.data, tasks.isError, tasks.isFetching, tasks.isLoading, user?.id]);

  useEffect(() => {
    if (!isNative) return undefined;
    let removeListener = () => {};
    import('@capacitor/app').then(({ App: CapacitorApp }) => (
      CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (!isActive) return;
        tasks.refetch();
        contacts.refetch();
        products.refetch();
        settings.refetch();
      })
    )).then(handle => { removeListener = () => handle.remove(); }).catch(() => {});
    return () => removeListener();
  }, []);

  return null;
}

function BlockedMobileAccount({ billing, logout, retry }) {
  const [cancelWorking, setCancelWorking] = useState(false);
  const [cancelError, setCancelError] = useState('');
  const accessEnd = billingAccessEndsAt(billing);
  const date = accessEnd
    ? new Intl.DateTimeFormat('es-419', { dateStyle: 'long' }).format(new Date(accessEnd))
    : null;
  const cancelRenewal = async () => {
    if (!window.confirm('Tu pago del nuevo periodo no se completó. Al cancelar detendremos los siguientes intentos de cobro y el acceso terminará. No se hará ningún cargo nuevo. ¿Quieres cancelar?')) return;
    setCancelWorking(true);
    setCancelError('');
    try {
      await cancelSubscription();
      retry();
    } catch (error) {
      setCancelError(error?.message || 'No pudimos cancelar. Intenta de nuevo.');
    } finally {
      setCancelWorking(false);
    }
  };

  return (
    <main className="app-state app-state--card">
      <ShieldAlert className="app-state__icon" aria-hidden="true" />
      <h1>Revisa el acceso de tu cuenta</h1>
      <p>
        {billing?.state === 'pending'
          ? 'Estamos confirmando tu acceso. Intenta de nuevo en unos segundos.'
          : 'Esta cuenta no tiene acceso activo a la aplicación.'}
      </p>
      {date && <p className="app-state__detail">Periodo registrado hasta {date}.</p>}
      {['grace', 'past_due', 'unpaid'].includes(billing?.state) && (
        <p className="app-state__detail">Hubo un problema con la renovación. Tus datos siguen guardados; revisa el correo de facturación o pide ayuda.</p>
      )}
      {billing?.canCancelSubscription && (
        <button type="button" className="secondary-action" onClick={cancelRenewal} disabled={cancelWorking}>
          {cancelWorking ? 'Cancelando…' : 'Cancelar mi suscripción'}
        </button>
      )}
      {cancelError && <p className="form-error" role="alert">{cancelError}</p>}
      <button type="button" className="primary-action" onClick={retry}>
        <RefreshCw aria-hidden="true" /> Revisar de nuevo
      </button>
      <a className="secondary-action" href="https://zynergia.pro/soporte">Ayuda y soporte</a>
      <a className="text-action" href="https://zynergia.pro/eliminar-cuenta">Eliminar mi cuenta</a>
      <button type="button" className="text-action" onClick={logout}>
        <LogOut aria-hidden="true" /> Cerrar sesión
      </button>
    </main>
  );
}

function MobileFatalError({ retry, logout, error }) {
  const serviceUnavailable = ['INVALID_API_RESPONSE', 'NETWORK_UNAVAILABLE'].includes(error?.code);

  return (
    <main className="app-state app-state--card" role="alert">
      <ShieldAlert className="app-state__icon app-state__icon--danger" aria-hidden="true" />
      <h1>No pudimos abrir Zynergia</h1>
      <p>
        {serviceUnavailable
          ? 'Tu sesión puede estar bien, pero el servicio que revisa el acceso no está disponible. Intenta de nuevo más tarde.'
          : 'No pudimos confirmar tu acceso. Tus datos siguen seguros. Revisa tu conexión e intenta de nuevo.'}
      </p>
      <button type="button" className="primary-action" onClick={retry}>
        <RefreshCw aria-hidden="true" /> Intentar de nuevo
      </button>
      <button type="button" className="text-action" onClick={logout}>Cerrar sesión</button>
    </main>
  );
}

function MobileAppGate() {
  const { isLoadingAuth, isAuthenticated, user, logout } = useAuth();
  const userId = user?.id;
  const [rootState, setRootState] = useState('boot');
  const [billing, setBilling] = useState(null);
  const [rootError, setRootError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey(value => value + 1), []);

  useEffect(() => {
    const handleBillingChanged = (event) => {
      if (event.detail) {
        setBilling(event.detail);
        if (!hasAppAccess(event.detail)) setRootState('accessBlocked');
      }
      reload();
    };
    window.addEventListener(BILLING_CHANGED_EVENT, handleBillingChanged);
    return () => window.removeEventListener(BILLING_CHANGED_EVENT, handleBillingChanged);
  }, [reload]);

  useEffect(() => {
    const accessEnd = billingAccessEndsAt(billing);
    if (!accessEnd || !hasAppAccess(billing)) return undefined;
    const remaining = new Date(accessEnd).getTime() - Date.now();
    const delay = Math.max(250, Math.min(remaining + 1000, 24 * 60 * 60 * 1000));
    const timeout = window.setTimeout(reload, delay);
    return () => window.clearTimeout(timeout);
  }, [billing, reload]);

  useEffect(() => {
    if (!isNative || !isAuthenticated) return undefined;
    let disposed = false;
    let listener;

    import('@capacitor/app').then(({ App: CapacitorApp }) => (
      CapacitorApp.addListener('appStateChange', ({ isActive }) => {
        if (isActive) reload();
      })
    )).then(handle => {
      if (disposed) handle.remove();
      else listener = handle;
    }).catch(() => {});

    return () => {
      disposed = true;
      listener?.remove();
    };
  }, [isAuthenticated, reload]);

  useEffect(() => {
    let cancelled = false;

    if (isLoadingAuth) {
      setRootState('boot');
      return () => { cancelled = true; };
    }
    if (!isAuthenticated || !userId) {
      setBilling(null);
      setRootState('signedOut');
      return () => { cancelled = true; };
    }

    const load = async () => {
      setRootState('accessPending');
      setRootError(null);
      try {
        if (!isLocalReviewBuild) {
          const nextBilling = await resolveBillingStatus();
          if (cancelled) return;
          setBilling(nextBilling);

          if (!hasAppAccess(nextBilling)) {
            setRootState('accessBlocked');
            return;
          }
        }

        const settings = await db.Settings.list();
        if (cancelled) return;
        const profile = settings?.[0];
        setRootState(profile?.onboarding_completed_at || profile?.user_name ? 'ready' : 'onboarding');
      } catch (error) {
        if (!cancelled) {
          const safeError = {
            status: error?.status ?? null,
            code: error?.code ?? null,
            message: error?.message || 'Unknown error',
          };
          console.error('[App] Root state failed', safeError);
          setRootError(safeError);
          setRootState('fatalError');
        }
      }
    };

    load();
    return () => { cancelled = true; };
  }, [isAuthenticated, isLoadingAuth, reloadKey, userId]);

  if (rootState === 'boot') return <LoadingScreen />;
  if (rootState === 'signedOut') {
    return <Suspense fallback={<LoadingScreen />}><Login showRegistration={!isNative} registrationUrl="https://zynergia.pro/crear-cuenta" /></Suspense>;
  }
  if (rootState === 'accessPending') return <LoadingScreen message="Revisando tu acceso…" />;
  if (rootState === 'accessBlocked') return <BlockedMobileAccount billing={billing} logout={logout} retry={reload} />;
  if (rootState === 'fatalError') return <MobileFatalError error={rootError} logout={logout} retry={reload} />;
  if (rootState === 'onboarding') {
    return <Suspense fallback={<LoadingScreen />}><Onboarding onComplete={reload} /></Suspense>;
  }
  return <ReadyMobileApp />;
}

function NativePlatformSetup() {
  const navigate = useNavigate();
  useEffect(() => {
    if (!isNative) return undefined;

    let editIsDirty = false;
    const handleDirtyState = event => { editIsDirty = Boolean(event.detail?.dirty); };
    window.addEventListener('zynergia:dirty-state', handleDirtyState);

    import('@capacitor/status-bar').then(({ StatusBar, Style }) => {
      StatusBar.setStyle({ style: Style.Default }).catch(() => {});
      StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {});
    }).catch(() => {});

    let removeBackListener = () => {};
    let removeUrlListener = () => {};
    let removeNotificationListener = () => {};
    initializeLocalNotificationNavigation(navigate)
      .then(remove => { removeNotificationListener = remove; })
      .catch(() => {});
    import('@capacitor/app').then(({ App: CapacitorApp }) => {
      CapacitorApp.addListener('backButton', () => {
        if (editIsDirty) {
          window.dispatchEvent(new Event('zynergia:request-back'));
          return;
        }
        const dialog = document.querySelector('[role="dialog"][data-state="open"]');
        if (dialog) {
          document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
          return;
        }
        const active = document.activeElement;
        if (active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement || active instanceof HTMLSelectElement) {
          active.blur();
          return;
        }
        if ((window.history.state?.idx ?? 0) > 0) window.history.back();
        else CapacitorApp.exitApp();
      }).then(handle => { removeBackListener = () => handle.remove(); });

      CapacitorApp.addListener('appUrlOpen', ({ url }) => {
        const route = mobileRouteForAppUrl(url);
        if (route) navigate(route, { replace: true });
      }).then(handle => { removeUrlListener = () => handle.remove(); });
    }).catch(() => {});

    return () => {
      window.removeEventListener('zynergia:dirty-state', handleDirtyState);
      removeBackListener();
      removeUrlListener();
      removeNotificationListener();
    };
  }, [navigate]);
  return null;
}

export default function App() {
  if (supabaseConfigurationError) {
    return (
      <main className="app-state app-state--card" role="alert">
        <ShieldAlert className="app-state__icon app-state__icon--danger" aria-hidden="true" />
        <h1>Zynergia necesita configuración</h1>
        <p>Esta instalación no tiene conectada la cuenta de datos. Tus datos no se modificaron.</p>
        <p className="app-state__detail">Configura Supabase y vuelve a instalar esta versión.</p>
      </main>
    );
  }

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <BrowserRouter>
          <NativePlatformSetup />
          {nativeOnlyBuild || isNative || isHostedWebApp ? <MobileAppGate /> : <WebRoutes />}
          <Toaster position="top-center" duration={4000} closeButton richColors />
        </BrowserRouter>
      </QueryClientProvider>
    </AuthProvider>
  );
}
