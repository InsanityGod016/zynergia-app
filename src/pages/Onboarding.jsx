import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Search, UserRound } from 'lucide-react';
import { db } from '@/api/db';
import BrandMark from '@/components/ui/BrandMark';
import { useAuth } from '@/lib/AuthContext';
import { seedDefaultData } from '@/lib/seedData';
import { supabase } from '@/lib/supabaseClient';
import { normalizePartnerCode, partnerLinkErrorMessage } from '@/lib/partnerLinking';

const CURRENCIES = [
  ['MXN', 'Peso mexicano'],
  ['USD', 'Dólar estadounidense'],
  ['EUR', 'Euro'],
  ['ARS', 'Peso argentino'],
  ['COP', 'Peso colombiano'],
  ['CLP', 'Peso chileno'],
  ['PEN', 'Sol peruano'],
  ['BRL', 'Real brasileño'],
];

export default function Onboarding({ onComplete }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const draftKey = `zynergia_onboarding_draft_${user?.id || 'unknown'}`;
  const initialDraft = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem(draftKey) || '{}');
    } catch {
      return {};
    }
  }, [draftKey]);

  const [step, setStep] = useState(initialDraft.step === 2 ? 2 : 1);
  const [name, setName] = useState(initialDraft.name || user?.user_metadata?.full_name || '');
  const [currency, setCurrency] = useState(initialDraft.currency || 'MXN');
  const [inviteCode, setInviteCode] = useState(initialDraft.inviteCode || '');
  const [inviteUser, setInviteUser] = useState(null);
  const [lookupState, setLookupState] = useState('idle');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const lookupRequest = useRef(0);

  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify({ step, name, currency, inviteCode }));
  }, [currency, draftKey, inviteCode, name, step]);

  useEffect(() => {
    let cancelled = false;
    db.Settings.list().then(settings => {
      const current = settings?.[0];
      if (!cancelled && current) {
        if (current.user_name) setName(current.user_name);
        if (current.default_currency) setCurrency(current.default_currency);
      }
    }).catch(() => {
      if (!cancelled) setError('No pudimos recuperar tu avance. Tus datos siguen aquí; puedes continuar.');
    });
    return () => { cancelled = true; };
  }, []);

  const handleInviteCode = async value => {
    const normalized = normalizePartnerCode(value);
    const requestId = ++lookupRequest.current;
    setInviteCode(normalized);
    setInviteUser(null);
    setError('');

    if (!normalized) {
      setLookupState('idle');
      return;
    }
    if (normalized.length < 4) {
      setLookupState('short');
      return;
    }

    setLookupState('loading');
    const { data, error: lookupError } = await supabase.rpc('lookup_partner_code', { code: normalized });
    if (requestId !== lookupRequest.current) return;
    if (lookupError) {
      setLookupState('error');
      setError(partnerLinkErrorMessage(lookupError));
      return;
    }
    if (!data?.length) {
      setLookupState('missing');
      return;
    }
    setInviteUser({ user_id: data[0].found_user_id, user_name: data[0].found_user_name });
    setLookupState('found');
  };

  const goNext = event => {
    event.preventDefault();
    setError('');
    if (name.trim().length < 2) {
      setError('Escribe tu nombre para continuar.');
      return;
    }
    setStep(2);
  };

  const finish = async event => {
    event.preventDefault();
    if (saving) return;
    if (inviteCode && lookupState !== 'found') {
      setError('Revisa el código o deja el campo vacío para continuar sin líder.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const profile = {
        user_name: name.trim(),
        default_currency: currency,
      };
      const currentSettings = (await db.Settings.list())?.[0];
      if (currentSettings?.id) await db.Settings.update(currentSettings.id, profile);
      else await db.Settings.create({
        ...profile,
        user_phone: '',
        user_photo: '',
        notifications_enabled: false,
      });

      const { error: codeError } = await supabase.rpc('ensure_partner_code');
      if (codeError) throw codeError;

      if (inviteCode) {
        const { error: partnerError } = await supabase.rpc('join_upline_by_code', {
          p_code: inviteCode,
        });
        if (partnerError) throw partnerError;
      }

      const { error: completionError } = await supabase.rpc('complete_onboarding');
      if (completionError) throw completionError;

      const savedSettings = await db.Settings.list();
      if (!savedSettings?.[0]?.onboarding_completed_at) throw new Error('onboarding_not_confirmed');

      localStorage.removeItem(draftKey);
      await queryClient.invalidateQueries({ queryKey: ['settings'] });
      Promise.allSettled([seedDefaultData()]);
      onComplete();
    } catch (saveError) {
      console.error('[Onboarding] Save failed', saveError);
      setError(partnerLinkErrorMessage(saveError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-dvh overflow-y-auto bg-slate-50 px-5 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))] text-slate-950">
      <section className="mx-auto w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-7 flex items-center justify-between">
          <BrandMark className="h-12 w-12 rounded-2xl" />
          <span className="text-[15px] font-semibold text-slate-500">Paso {step} de 2</span>
        </div>

        {step === 1 ? (
          <form onSubmit={goNext}>
            <p className="mb-2 text-[15px] font-bold uppercase tracking-wide text-primary">Tu cuenta</p>
            <h1 className="text-3xl font-bold tracking-tight">Confirma tus datos</h1>
            <p className="mt-3 text-[17px] leading-relaxed text-slate-600">Sólo necesitamos tu nombre y la moneda que usas. Puedes cambiarlo después.</p>

            <div className="mt-8 space-y-5">
              <div>
                <label htmlFor="onboarding-name" className="mb-2 block text-[15px] font-semibold">Nombre</label>
                <div className="relative">
                  <UserRound className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                  <input id="onboarding-name" autoComplete="name" value={name} onChange={event => setName(event.target.value)} className="min-h-14 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-4 text-[17px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div>
                <label htmlFor="onboarding-currency" className="mb-2 block text-[15px] font-semibold">Moneda</label>
                <select id="onboarding-currency" value={currency} onChange={event => setCurrency(event.target.value)} className="min-h-14 w-full rounded-2xl border border-slate-300 bg-white px-4 text-[17px] outline-none focus:border-primary focus:ring-2 focus:ring-primary/20">
                  {CURRENCIES.map(([value, label]) => <option key={value} value={value}>{value} — {label}</option>)}
                </select>
              </div>
            </div>

            {error && <p className="mt-5 rounded-2xl bg-red-50 p-4 text-[15px] font-medium text-red-700" role="alert">{error}</p>}
            <button type="submit" className="mt-7 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-[17px] font-bold text-white outline-none transition-transform duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
              Continuar <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </button>
          </form>
        ) : (
          <form onSubmit={finish}>
            <button type="button" onClick={() => { setStep(1); setError(''); }} className="mb-6 flex min-h-12 items-center gap-2 rounded-xl px-1 text-[16px] font-semibold text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-primary">
              <ArrowLeft className="h-5 w-5" aria-hidden="true" /> Volver
            </button>
            <p className="mb-2 text-[15px] font-bold uppercase tracking-wide text-primary">Tu equipo</p>
            <h1 className="text-3xl font-bold tracking-tight">¿Tienes código de líder?</h1>
            <p className="mt-3 text-[17px] leading-relaxed text-slate-600">Es opcional. Si alguien te invitó, escribe su código. Si no, deja el campo vacío.</p>

            <div className="mt-8">
              <label htmlFor="onboarding-code" className="mb-2 block text-[15px] font-semibold">Código de líder (opcional)</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <input id="onboarding-code" value={inviteCode} onChange={event => handleInviteCode(event.target.value)} autoCapitalize="characters" autoComplete="off" placeholder="Ejemplo: MARIA25" className="min-h-14 w-full rounded-2xl border border-slate-300 bg-white pl-12 pr-4 text-[17px] font-semibold uppercase tracking-wide outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
              </div>
              <div className="mt-3 min-h-7 text-[15px]" aria-live="polite">
                {lookupState === 'loading' && <span className="flex items-center gap-2 text-slate-600"><Loader2 className="h-4 w-4 animate-spin" /> Buscando…</span>}
                {lookupState === 'found' && <span className="flex items-center gap-2 font-semibold text-emerald-700"><CheckCircle2 className="h-5 w-5" /> Líder: {inviteUser?.user_name}</span>}
                {lookupState === 'missing' && <span className="text-red-700">No encontramos ese código.</span>}
                {lookupState === 'short' && <span className="text-slate-500">Escribe al menos 4 caracteres.</span>}
                {lookupState === 'error' && <span className="text-red-700">No pudimos buscarlo. Intenta de nuevo.</span>}
              </div>
            </div>

            {error && <p className="mt-5 rounded-2xl bg-red-50 p-4 text-[15px] font-medium text-red-700" role="alert">{error}</p>}
            <button type="submit" disabled={saving || lookupState === 'loading'} className="mt-7 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-[17px] font-bold text-white outline-none transition-transform duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60">
              {saving && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
              {saving ? 'Guardando…' : 'Entrar a Zynergia'}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
