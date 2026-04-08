import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Settings, HelpCircle, LogOut, ChevronRight } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

const menuItems = [
  {
    icon: Settings,
    title: 'Configuración',
    page: 'Settings'
  },
  {
    icon: HelpCircle,
    title: 'Ayuda',
    page: 'Help'
  }
];

export default function More() {
  const { logout } = useAuth();
  const handleLogout = () => { logout(); };

  return (
    <div className="px-5 pt-12 pb-6">
      <h1 className="text-[22px] font-bold text-[#0F172A] mb-6">Más</h1>

      <div className="space-y-2">
        {menuItems.map(item => (
          <Link
            key={item.page}
            to={createPageUrl(item.page)}
            className="flex items-center justify-between p-4 bg-white rounded-2xl border border-[#F1F5F9] shadow-sm active:scale-[0.99] transition-transform"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] flex items-center justify-center">
                <item.icon className="w-5 h-5 text-[#004AFE]" />
              </div>
              <span className="font-semibold text-[#0F172A] text-[15px]">{item.title}</span>
            </div>
            <ChevronRight className="w-4 h-4 text-[#CBD5E1]" />
          </Link>
        ))}

        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-between p-4 bg-white rounded-2xl border border-[#F1F5F9] shadow-sm active:scale-[0.99] transition-transform"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
              <LogOut className="w-5 h-5 text-red-500" />
            </div>
            <span className="font-semibold text-red-500 text-[15px]">Cerrar sesión</span>
          </div>
        </button>
      </div>
    </div>
  );
}