import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, Hash, Users, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';

export default function AddPartnerSheet({ isOpen, onClose, contacts, existingPartnerContactIds, onConfirm, onConfirmByCode, isPending }) {
  const [tab, setTab] = useState('code'); // 'code' | 'contact'

  // Code tab state
  const [codeInput, setCodeInput] = useState('');
  const [foundUser, setFoundUser] = useState(null);
  const [codeLoading, setCodeLoading] = useState(false);
  const [codeError, setCodeError] = useState('');

  // Contact tab state
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const available = contacts.filter(c =>
    !existingPartnerContactIds.includes(c.id) &&
    c.full_name.toLowerCase().includes(search.toLowerCase())
  );

  const handleCodeInput = async (val) => {
    const v = val.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    setCodeInput(v);
    setFoundUser(null);
    setCodeError('');
    if (v.length < 4) return;
    setCodeLoading(true);
    try {
      const { data } = await supabase.rpc('lookup_partner_code', { code: v });
      if (data && data.length > 0) {
        setFoundUser({ user_id: data[0].found_user_id, user_name: data[0].found_user_name });
      } else {
        setCodeError('Código no encontrado');
      }
    } catch {
      setCodeError('Error al buscar código');
    }
    setCodeLoading(false);
  };

  const handleConfirmByCode = () => {
    if (!foundUser) return;
    onConfirmByCode(foundUser);
    resetAndClose();
  };

  const handleConfirmByContact = () => {
    if (!selected) return;
    onConfirm(selected);
    resetAndClose();
  };

  const resetAndClose = () => {
    setCodeInput('');
    setFoundUser(null);
    setCodeError('');
    setSearch('');
    setSelected(null);
    setTab('code');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[60]"
            onClick={resetAndClose}
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 bg-white rounded-t-3xl z-[70] max-h-[85vh] flex flex-col pb-[env(safe-area-inset-bottom)]"
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#F1F5F9]">
              <h3 className="text-[18px] font-semibold text-[#0F172A]">Agregar Partner</h3>
            </div>

            {/* Tabs */}
            <div className="flex px-6 pt-4 gap-2">
              <button
                onClick={() => setTab('code')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[14px] font-semibold transition-colors ${
                  tab === 'code' ? 'bg-[#004AFE] text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                }`}
              >
                <Hash className="w-4 h-4" />
                Por código
              </button>
              <button
                onClick={() => setTab('contact')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[14px] font-semibold transition-colors ${
                  tab === 'contact' ? 'bg-[#004AFE] text-white' : 'bg-[#F1F5F9] text-[#64748B]'
                }`}
              >
                <Users className="w-4 h-4" />
                Por contacto
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {tab === 'code' ? (
                <div className="space-y-4">
                  <p className="text-[13px] text-[#94A3B8]">Ingresa el código único de tu partner para conectar sus cuentas.</p>

                  <input
                    type="text"
                    placeholder="Ej: RAFA23"
                    value={codeInput}
                    onChange={e => handleCodeInput(e.target.value)}
                    className="w-full px-4 py-3.5 rounded-xl border border-[#E2E8F0] text-[22px] font-bold text-center tracking-[0.3em] text-[#004AFE] placeholder:text-[#CBD5E1] placeholder:text-[16px] placeholder:tracking-normal placeholder:font-normal focus:outline-none focus:border-[#004AFE]"
                    autoCapitalize="characters"
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
                        <p className="text-[12px] text-[#16A34A]">Usuario encontrado</p>
                      </div>
                    </motion.div>
                  )}

                  {codeError && codeInput.length >= 4 && !codeLoading && (
                    <p className="text-center text-[13px] text-[#EF4444]">{codeError}</p>
                  )}
                </div>
              ) : (
                <div>
                  <div className="flex items-center gap-3 bg-[#F8FAFC] rounded-xl px-4 h-11 mb-4">
                    <Search className="w-4 h-4 text-[#64748B]" />
                    <input
                      type="text"
                      placeholder="Buscar contacto..."
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      className="flex-1 bg-transparent text-[14px] outline-none text-[#0F172A] placeholder:text-[#94A3B8]"
                    />
                  </div>

                  {available.length === 0 ? (
                    <p className="text-center text-[14px] text-[#94A3B8] py-8">Sin contactos disponibles</p>
                  ) : (
                    available.map(contact => (
                      <button
                        key={contact.id}
                        onClick={() => setSelected(contact.id)}
                        className="w-full flex items-center justify-between py-3 border-b border-[#F1F5F9] last:border-0"
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
                </div>
              )}
            </div>

            {/* Confirm button */}
            <div className="px-6 pb-6 pt-2">
              <button
                onClick={tab === 'code' ? handleConfirmByCode : handleConfirmByContact}
                disabled={isPending || (tab === 'code' ? !foundUser : !selected)}
                className="w-full h-12 bg-[#004AFE] rounded-2xl text-white text-[15px] font-semibold disabled:opacity-40 transition-opacity"
              >
                {isPending ? 'Guardando...' : 'Agregar partner'}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
