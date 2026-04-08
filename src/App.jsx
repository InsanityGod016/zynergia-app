import { useState, useEffect } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from './pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Onboarding from '@/pages/Onboarding';
import Paywall from '@/pages/Paywall';
import Login from '@/pages/Login';
import Landing from '@/pages/Landing';
import { hasActiveSubscription } from '@/lib/subscription';
import { StatusBar, Style } from '@capacitor/status-bar';
import { App as CapApp } from '@capacitor/app';
import SplashScreen from '@/components/ui/SplashScreen';

const { Pages, Layout, mainPage } = pagesConfig;
const mainPageKey = mainPage ?? Object.keys(Pages)[0];
const MainPage = mainPageKey ? Pages[mainPageKey] : <></>;

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated, user } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState(false);

  useEffect(() => {
    if (user) {
      setOnboardingDone(!!localStorage.getItem(`zynergia_onboarding_done_${user.id}`));
    }
  }, [user]);
  const [subscribed, setSubscribed] = useState(null);

  useEffect(() => {
    if (isAuthenticated && onboardingDone) {
      hasActiveSubscription().then(setSubscribed);
    }
  }, [isAuthenticated, onboardingDone]);

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  if (!onboardingDone) {
    return <Onboarding onComplete={() => setOnboardingDone(true)} />;
  }

  if (subscribed === null) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-[#004AFE] rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!subscribed) {
    return <Paywall onSubscribed={() => setSubscribed(true)} />;
  }

  return (
    <Routes>
      <Route path="/" element={
        <LayoutWrapper currentPageName={mainPageKey}>
          <MainPage />
        </LayoutWrapper>
      } />
      {Object.entries(Pages).map(([path, Page]) => (
        <Route
          key={path}
          path={`/${path}`}
          element={
            <LayoutWrapper currentPageName={path}>
              <Page />
            </LayoutWrapper>
          }
        />
      ))}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {
  const [splashDone, setSplashDone] = useState(false);

  useEffect(() => {
    StatusBar.setStyle({ style: Style.Default }).catch(() => {});
    StatusBar.setBackgroundColor({ color: '#ffffff' }).catch(() => {});

    const handlerPromise = CapApp.addListener('backButton', () => {
      if (window.history.length > 1) {
        window.history.back();
      } else {
        CapApp.exitApp();
      }
    });
    return () => { handlerPromise.then(h => h.remove()); };
  }, []);

  // Ruta pública: /landing (no requiere auth ni splash)
  if (window.location.pathname === '/landing') {
    return (
      <Router>
        <Routes>
          <Route path="/landing" element={<Landing />} />
        </Routes>
      </Router>
    );
  }

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        {!splashDone ? (
          <SplashScreen onComplete={() => setSplashDone(true)} />
        ) : (
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
        )}
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
