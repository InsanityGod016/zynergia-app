import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { createPageUrl } from '@/utils';
import { db } from '@/api/db';
import { useAuth } from '@/lib/AuthContext';
import { X, Settings, HelpCircle, LogOut, Copy } from 'lucide-react';
import { toast } from 'sonner';

const menuItems = [
  { icon: Settings, label: 'Configuración', page: 'Settings' },
  { icon: HelpCircle, label: 'Ayuda', page: 'Help' },
];

export default function SideDrawer({ isOpen, onClose }) {
  const navigate = useNavigate();
  const { logout } = useAuth();

  const { data: settingsList = [] } = useQuery({
    queryKey: ['settings'],
    queryFn: () => db.Settings.list(),
    enabled: isOpen,
  });

  const profile = settingsList[0] || {};
  const userName = profile.user_name || 'Mi perfil';
  const userPhoto = profile.user_photo || '';
  const initials = userName
    .split(' ')
    .map(n => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const handleNav = (page) => {
    onClose();
    navigate(createPageUrl(page));
  };

  const handleLogout = () => { logout(); };

  const partnerCode = profile.partner_code || null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(partnerCode);
    toast.success('Código copiado');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-[80]"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 left-0 bottom-0 w-72 bg-white z-[90] flex flex-col shadow-xl"
          >
            {/* Header with profile */}
            <div className="px-6 pt-14 pb-5 border-b border-[#F1F5F9]">
              <div className="flex items-center justify-between mb-4">
                <span className="text-[18px] font-bold text-[#0F172A]">Zynergia</span>
                <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-full bg-[#F1F5F9]">
                  <X className="w-5 h-5 text-[#64748B]" />
                </button>
              </div>
              <button
                onClick={() => handleNav('Settings')}
                className="flex items-center gap-3 w-full text-left active:opacity-70 transition-opacity"
              >
                <div className="w-12 h-12 rounded-full bg-[#EEF2FF] flex items-center justify-center overflow-hidden shrink-0">
                  {userPhoto ? (
                    <img src={userPhoto} alt={userName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-[18px] font-bold text-[#004AFE]">{initials}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-[#0F172A] truncate">{userName}</p>
                  <p className="text-[12px] text-[#94A3B8]">Ver perfil</p>
                </div>
              </button>
            </div>

            {/* Código de partner */}
            {partnerCode && (
              <div className="px-6 py-4 border-b border-[#F1F5F9]">
                <p className="text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wide mb-2">Tu código de partner</p>
                <div className="flex items-center justify-between bg-[#EEF2FF] rounded-xl px-4 py-2.5">
                  <span className="text-[22px] font-bold text-[#004AFE] tracking-[0.2em]">{partnerCode}</span>
                  <button onClick={handleCopyCode} className="p-1.5 rounded-lg bg-white/70 active:scale-90 transition-transform">
                    <Copy className="w-4 h-4 text-[#004AFE]" />
                  </button>
                </div>
              </div>
            )}

            {/* Items */}
            <div className="flex-1 px-4 py-4 space-y-1">
              {menuItems.map(({ icon: Icon, label, page }) => (
                <button
                  key={page}
                  onClick={() => handleNav(page)}
                  className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[15px] font-medium text-[#0F172A] hover:bg-[#F8FAFC] transition-colors text-left"
                >
                  <Icon className="w-5 h-5 text-[#64748B]" strokeWidth={2} />
                  {label}
                </button>
              ))}
            </div>

            {/* Logout */}
            <div className="px-4 pb-10 border-t border-[#F1F5F9] pt-4">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[15px] font-medium text-[#EF4444] hover:bg-[#FEF2F2] transition-colors"
              >
                <LogOut className="w-5 h-5 text-[#EF4444]" strokeWidth={2} />
                Cerrar sesión
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}