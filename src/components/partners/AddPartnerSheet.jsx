import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Hash, Users, CheckCircle2, Loader2, X } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

function todayString() {
  const now = new Date();
  return [now.getFullYear(), String(now.getMonth() + 1).padStart(2, '0'), String(now.getDate()).padStart(2, '0')].join('-');
}

export default function AddPartnerSheet({ isOpen, onClose, contacts, existingPartnerContactIds, onConfirm, onConfirmByCode, isPending }) {
  const [tab, setTab] = useState('code'); // 'code' | 'contact'

  // Code tab state
  const [codeInput, setCodeInput] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const lookupRequest = useRef(0);

  // Contact tab state
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);
  const [startDate, setStartDate] = useState(todayString);

  const available = contacts.filter(c =>
    !existingPartnerContactIds.includes(c.id) &&
    c.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCodeInput = (val) => {
    const v = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setCodeInput(v);
    setFoundUser(null);
    setCodeError('');
    setSubmitError('');
  };

  useEffect(() => {
    const requestId = ++lookupRequest.current;
    if (!isOpen || tab !== 'code' || codeInput.length < 4) {
      setCodeLoading(false);
      return undefined;
    }

    setCodeLoading(true);
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc('lookup_partner_code', { code: codeInput });
        if (requestId !== lookupRequest.current) return;
        if (error) throw error;
        if (data?.length) {
          setFoundUser({
            user_id: data[0].found_user_id,
            user_name: data[0].found_user_name,
            partner_code: codeInput,
          });
        } else {
          setCodeError('Código no encontrado');
        }
      } catch {
        if (requestId === lookupRequest.current) setCodeError('No pudimos buscar el código. Intenta de nuevo.');
      } finally {
        if (requestId === lookupRequest.current) setCodeLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [codeInput, isOpen, tab]);

  useEffect(() => {
    if (isOpen) return;
    lookupRequest.current += 1;
    setCodeInput('');
    setFoundUser(null);
    setCodeError('');
    setCodeLoading(false);
    setSubmitting(false);
    setSubmitError('');
    setSearch('');
    setSelected(null);
    setStartDate(todayString());
    setTab('code');
  }, [isOpen]);

  const handleConfirmByCode = async () => {
    if (!foundUser) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await onConfirmByCode(foundUser);
    } catch {
      setSubmitError('No pudimos agregar al partner. Tus datos siguen aquí; intenta de nuevo.');
      setSubmitting(false);
    }
  };

  const handleConfirmByContact = async () => {
    if (!selected) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await onConfirm(selected, startDate);
    } catch {
      setSubmitError('No pudimos agregar al partner. Tu selección sigue aquí; intenta de nuevo.');
      setSubmitting(false);
    }
  };

  const resetAndClose = () => {
    lookupRequest.current += 1;
    setCodeInput('');
    setFoundUser(null);
    setCodeError('');
    setSubmitError('');
    setSearch('');
    setSelected(null);
    setStartDate(todayString());
    setTab('code');
    onClose();
  };

  const busy = isPending || submitting;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[60]"
            onClick={() => { if (!busy) resetAndClose(); }}
            aria-hidden="true"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[70] max-h-[85vh] flex flex-col pb-[env(safe-area-inset-bottom)]"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-partner-title"
          >
            {/* Header */}
            <div className="px-6 py-3 border-b border-[#F1F5F9] flex items-center justify-between">
              <h3 id="add-partner-title" className="text-[18px] font-semibold text-[#0F172A]">Agregar partner</h3>
              <button
                onClick={resetAndClose}
                disabled={busy}
                className="w-12 h-12 flex items-center justify-center rounded-2xl bg-[#F1F5F9] active:scale-95 transition-transform"
                aria-label="Cerrar"
              >
                <X className="w-5 h-5 text-[#475569]" aria-hidden="true" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex px-6 pt-4 gap-2">
              <button
                onClick={() => setTab('code')}
                className={`flex-1 min-h-12 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[15px] font-semibold transition-colors ${
                  tab === 'code' ? 'bg-[#004AFE] text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                }`}
                aria-pressed={tab === 'code'}
              >
                <Hash className="w-4 h-4" />
                Por código
              </button>
              <button
                onClick={() => setTab('contact')}
                className={`flex-1 min-h-12 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[15px] font-semibold transition-colors ${
                  tab === 'contact' ? 'bg-[#004AFE] text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                }`}
                aria-pressed={tab === 'contact'}
              >
                <Users className="w-4 h-4" />
                Por contacto
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {tab === 'code' ? (
                <div className="space-y-4">
                  <p className="text-[15px] text-[#64748B]">Ingresa el código único de tu partner para conectar sus cuentas.</p>

                  <input
                    type="text"
                    placeholder="Ej: RAFA23"
                    value={codeInput}
                    onChange={e => handleCodeInput(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border border-[#E2E8F0] text-[22px] font-bold text-center tracking-[0.3em] text-[#004AFE] placeholder:text-[#CBD5E1] placeholder:text-[16px] placeholder:tracking-normal placeholder:font-normal focus:outline-none focus:border-[#004AFE]"
                    autoCapitalize="characters"
                    aria-label="Código de partner"
                  />

                  {codeLoading && (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="w-5 h-5 text-[#004AFE] animate-spin" />
                    </div>
                  )}

                  {foundUser && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-3 p-4 bg-[#F0FDF4] rounded-2xl border border-[#86EFAC]"
                    >
                      <CheckCircle2 className="w-5 h-5 text-[#16A34A] shrink-0" />
                      <div>
                        <p className="text-[15px] font-semibold text-[#0F172A]">{foundUser.user_name}</p>
                        <p className="text-[15px] text-[#15803D]">Usuario encontrado</p>
                      </div>
                    </motion.div>
                  )}

                  {codeError && codeInput.length >= 4 && !codeLoading && (
                    <p className="text-center text-[15px] text-[#DC2626]" role="alert">{codeError}</p>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3 bg-[#F1F5F9] rounded-xl px-4 min-h-12 mb-4">
                    <Search className="w-4 h-4 text-[#64748B]" />
                    <input
                      type="text"
                      placeholder="Buscar contacto..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="flex-1 bg-transparent text-[16px] outline-none text-[#0F172A] placeholder:text-[#64748B]"
                      aria-label="Buscar contacto"
                    />
                  </div>

                  {available.length === 0 ? (
                    <p className="text-center text-[15px] text-[#64748B] py-8">Sin contactos disponibles</p>
                  ) : (
                    available.map(contact => (
                      <button
                        key={contact.id}
                        onClick={() => setSelected(contact.id)}
                        className="w-full min-h-14 flex items-center justify-between py-3 border-b border-[#F1F5F9] last:border-0"
                        aria-pressed={selected === contact.id}
                      >
                        <span className="text-[15px] text-[#0F172A]">{contact.full_name}</span>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          selected === contact.id ? 'border-[#004AFE] bg-[#004AFE]' : 'border-[#CBD5E1]'
                        }`}>
                          {selected === contact.id && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                      </button>
                    ))
                  )}

                  {selected && (
                    <div className="mt-5 rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-4">
                      <label htmlFor="partner-start-date" className="block text-[15px] font-bold text-[#0F172A]">¿Cuándo comenzó su negocio?</label>
                      <p className="mt-1 text-[15px] leading-relaxed text-[#475569]">Es una fecha provisional. Cuando vincule su cuenta, usaremos la fecha que configure esa persona.</p>
                      <input
                        id="partner-start-date"
                        type="date"
                        value={startDate}
                        max={todayString()}
                        onChange={event => setStartDate(event.target.value)}
                        className="mt-3 min-h-14 w-full rounded-xl border border-[#CBD5E1] bg-white px-4 text-[17px] text-[#0F172A] outline-none focus:border-[#004AFE] focus:ring-2 focus:ring-[#004AFE]/20"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Confirm button */}
            <div className="px-6 pb-6 pt-2">
              {submitError && <p className="mb-3 rounded-2xl bg-red-50 p-3 text-[15px] text-red-800" role="alert">{submitError}</p>}
              <button
                onClick={tab === 'code' ? handleConfirmByCode : handleConfirmByContact}
                disabled={busy || (tab === 'code' ? !foundUser : !selected || !startDate)}
                className="w-full h-12 bg-[#004AFE] rounded-2xl text-white text-[15px] font-semibold disabled:opacity-40 transition-opacity"
              >
                {busy ? 'Guardando...' : 'Agregar partner'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
