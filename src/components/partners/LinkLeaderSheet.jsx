import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabaseClient';
import { normalizePartnerCode, partnerLinkErrorMessage } from '@/lib/partnerLinking';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';

export default function LinkLeaderSheet({ open, onOpenChange }) {
  const queryClient = useQueryClient();
  const requestId = useRef(0);
  const [code, setCode] = useState('');
  const [leader, setLeader] = useState(null);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) return;
    requestId.current += 1;
    setCode('');
    setLeader(null);
    setStatus('idle');
    setError('');
    setSaving(false);
  }, [open]);

  useEffect(() => {
    if (code.length < 4) {
      setStatus(code ? 'short' : 'idle');
      return undefined;
    }

    const currentRequest = ++requestId.current;
    setStatus('loading');
    const timer = window.setTimeout(async () => {
      const { data, error: lookupError } = await supabase.rpc('lookup_partner_code', { code });
      if (currentRequest !== requestId.current) return;
      if (lookupError) {
        setLeader(null);
        setStatus('error');
        setError(partnerLinkErrorMessage(lookupError));
        return;
      }
      if (!data?.length) {
        setLeader(null);
        setStatus('missing');
        return;
      }
      setLeader({ name: data[0].found_user_name });
      setStatus('found');
    }, 250);

    return () => window.clearTimeout(timer);
  }, [code]);

  const changeCode = value => {
    setCode(normalizePartnerCode(value));
    setLeader(null);
    setError('');
  };

  const linkLeader = async event => {
    event.preventDefault();
    if (saving || status !== 'found') return;
    setSaving(true);
    setError('');
    try {
      const { error: linkError } = await supabase.rpc('join_upline_by_code', { p_code: code });
      if (linkError) throw linkError;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['settings'] }),
        queryClient.invalidateQueries({ queryKey: ['partners'] }),
      ]);
      toast.success(`Ya apareces como partner de ${leader?.name || 'tu líder'}`);
      onOpenChange(false);
    } catch (linkError) {
      setError(partnerLinkErrorMessage(linkError));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-3xl px-5 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-8 sm:mx-auto sm:max-w-md">
        <SheetHeader className="pr-12 text-left">
          <SheetTitle className="text-xl">Agregar código de líder</SheetTitle>
          <SheetDescription className="text-[15px] leading-relaxed">
            Si alguien te invitó a Zynergia, escribe su código. Esa persona verá únicamente tu avance general de Fast Start.
          </SheetDescription>
        </SheetHeader>

        <form className="mt-6" onSubmit={linkLeader}>
          <label htmlFor="leader-code" className="mb-2 block text-[15px] font-semibold text-foreground">Código de líder</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <input
              id="leader-code"
              value={code}
              onChange={event => changeCode(event.target.value)}
              autoCapitalize="characters"
              autoComplete="off"
              placeholder="Ejemplo: DAVI38"
              className="min-h-14 w-full rounded-2xl border border-border bg-background pl-12 pr-4 text-[17px] font-semibold uppercase tracking-wide outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="mt-3 min-h-7 text-[15px]" aria-live="polite">
            {status === 'loading' && <span className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Buscando…</span>}
            {status === 'found' && <span className="flex items-center gap-2 font-semibold text-emerald-700"><CheckCircle2 className="h-5 w-5" /> Líder: {leader?.name}</span>}
            {status === 'short' && <span className="text-muted-foreground">Escribe al menos 4 caracteres.</span>}
            {status === 'missing' && <span className="text-destructive">No encontramos ese código. Revísalo e intenta de nuevo.</span>}
          </div>

          {error && <p className="mt-4 rounded-2xl bg-red-50 p-4 text-[15px] font-medium text-red-700" role="alert">{error}</p>}

          <button type="submit" disabled={saving || status !== 'found'} className="mt-6 flex min-h-14 w-full items-center justify-center gap-2 rounded-2xl bg-primary px-5 text-[17px] font-bold text-primary-foreground outline-none transition-transform duration-150 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:opacity-60">
            {saving && <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />}
            {saving ? 'Guardando…' : 'Vincularme con este líder'}
          </button>
        </form>
      </SheetContent>
    </Sheet>
  );
}
