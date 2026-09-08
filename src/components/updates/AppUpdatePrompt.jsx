import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { checkForAppUpdate, nextVisibleUpdate, rememberUpdate } from '@/lib/appUpdates';

export const CHECK_APP_UPDATE_EVENT = 'zynergia:check-app-update';

function openStore(url) {
  if (url) window.location.assign(url);
}

export default function AppUpdatePrompt() {
  const [update, setUpdate] = useState(null);

  const check = useCallback(async (force = false) => {
    const result = await checkForAppUpdate({ force });
    setUpdate(current => nextVisibleUpdate(current, result));
    window.dispatchEvent(new CustomEvent('zynergia:app-update-result', { detail: result }));
  }, []);

  useEffect(() => {
    check(false);
    const handleManualCheck = () => check(true);
    window.addEventListener(CHECK_APP_UPDATE_EVENT, handleManualCheck);

    let removeStateListener = () => {};
    import('@capacitor/app').then(({ App }) => (
      App.addListener('appStateChange', ({ isActive }) => { if (isActive) check(false); })
    )).then(handle => { removeStateListener = () => handle.remove(); }).catch(() => {});

    return () => {
      window.removeEventListener(CHECK_APP_UPDATE_EVENT, handleManualCheck);
      removeStateListener();
    };
  }, [check]);

  if (!update) return null;
  const required = update.status === 'required';
  const dismiss = () => {
    if (required) return;
    rememberUpdate(update);
    setUpdate(null);
  };

  return (
    <AlertDialog open onOpenChange={open => { if (!open) dismiss(); }}>
      <AlertDialogContent className="max-w-[calc(100%-2rem)] rounded-3xl sm:max-w-md">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[#004AFE]" aria-hidden="true">
          <Download className="h-7 w-7" />
        </div>
        <AlertDialogHeader className="text-center sm:text-center">
          <AlertDialogTitle className="text-[24px] text-slate-950">{update.title}</AlertDialogTitle>
          <AlertDialogDescription className="text-[17px] leading-relaxed text-slate-600">
            {update.body}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col gap-2 sm:flex-col">
          <button
            type="button"
            className="min-h-14 w-full rounded-2xl bg-[#004AFE] px-5 text-[17px] font-bold text-white"
            onClick={() => { if (!required) rememberUpdate(update); openStore(update.storeUrl); }}
          >
            Actualizar ahora
          </button>
          {!required && (
            <button type="button" className="min-h-12 w-full rounded-xl text-[16px] font-semibold text-slate-700" onClick={dismiss}>
              Más tarde
            </button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
