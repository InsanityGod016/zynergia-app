import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '@/api/db';
import { Pencil, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

// ── Tabs ─────────────────────────────────────────────────────────────────────
const TABS = [
  { value: 'all',        label: 'Todas' },
  { value: 'producto',   label: 'Producto' },
  { value: 'prospectos', label: 'Prospectos' },
  { value: 'faststart',  label: 'Fast Start' },
  { value: 'smart',      label: 'Smart Partner' },
  { value: 'referidos',  label: 'Referidos' },
];

// ── Sections — define order and which tab each belongs to ─────────────────────
// match(subcategory) → true if the template belongs to this section
const SECTIONS = [
  {
    id: 'seguimiento_producto',
    label: 'Seguimiento Producto',
    description: 'Bienvenida día 3 tras la primera compra',
    tab: 'producto',
    match: s => s === 'producto_dia_3',
  },
  {
    id: 'recompra',
    label: 'Recompra',
    description: 'Recordatorios antes y después de la fecha de recompra',
    tab: 'producto',
    match: s => ['producto_7_dias_antes', 'producto_3_dias_antes', 'producto_5_dias_despues'].includes(s),
  },
  {
    id: 'reactivacion',
    label: 'Reactivación Producto',
    description: 'Contacto cuando un cliente lleva tiempo sin comprar',
    tab: 'producto',
    match: s => s === 'producto_reactivacion',
  },
  {
    id: 'prospecto_producto',
    label: 'Prospecto Producto',
    description: 'Secuencia de 6 mensajes para convertir un prospecto en cliente',
    tab: 'prospectos',
    match: s => s.startsWith('prospecto_producto_msg_'),
  },
  {
    id: 'prospecto_partner',
    label: 'Prospecto Partner',
    description: 'Secuencia de 6 mensajes para invitar a alguien al negocio',
    tab: 'prospectos',
    match: s => s.startsWith('prospecto_partner_msg_'),
  },
  {
    id: 'fast_start_qteam',
    label: 'Fast Start — Q-Team (días 1–30)',
    description: 'Acompañamiento para llegar a 4 clientes Premier activos',
    tab: 'faststart',
    match: s => s.startsWith('partner_qteam_dia_'),
  },
  {
    id: 'fast_start_niveles',
    label: 'Fast Start — Niveles 1 y 2 (días 35–90)',
    description: 'Acompañamiento para reclutar partners y construir equipo',
    tab: 'faststart',
    match: s => s.startsWith('partner_fs_n'),
  },
  {
    id: 'fast_start_xteam',
    label: 'Fast Start — X-Team (días 110–120)',
    description: 'Recta final hacia los 10 clientes Premier activos',
    tab: 'faststart',
    match: s => s.startsWith('partner_xteam_dia_'),
  },
  {
    id: 'partner_smart',
    label: 'Smart Partner — Tareas dinámicas',
    description: 'Mensajes adaptados al progreso real del partner (requiere app)',
    tab: 'smart',
    match: s => s.startsWith('partner_smart_'),
  },
  {
    id: 'urgencia_qteam',
    label: 'Urgencia Q-Team',
    description: 'Alerta cuando el partner pierde clientes activos',
    tab: 'smart',
    match: s => s === 'partner_urgencia_qteam',
  },
  {
    id: 'referidos',
    label: 'Referidos',
    description: 'Solicitar referidos a clientes y partners actuales',
    tab: 'referidos',
    match: s => s === 'referido',
  },
];

const TONE_BADGE = {
  general:  { label: 'General',  bg: 'bg-[#F1F5F9]', text: 'text-[#475569]' },
  amigable: { label: 'Amigable', bg: 'bg-[#FFF7ED]', text: 'text-[#C2410C]' },
  directo:  { label: 'Directo',  bg: 'bg-[#EEF2FF]', text: 'text-[#4338CA]' },
};

function getSection(subcategory) {
  return SECTIONS.find(s => s.match(subcategory));
}

export default function Templates() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all');

  const { data: templates = [] } = useQuery({
    queryKey: ['templates'],
    queryFn: () => db.Template.list(),
  });

  const handleEdit = (template) => {
    navigate(createPageUrl('EditTemplate') + '?id=' + template.id);
  };

  // Build ordered sections list for the active tab
  const visibleSections = SECTIONS.filter(
    sec => activeTab === 'all' || sec.tab === activeTab
  );

  // Group templates by section
  const bySection = {};
  templates.forEach(t => {
    const sec = getSection(t.subcategory);
    if (!sec) return;
    if (!bySection[sec.id]) bySection[sec.id] = [];
    bySection[sec.id].push(t);
  });

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Header */}
      <div className="px-5 pt-14 pb-4 bg-white flex items-center justify-between border-b border-[#F1F5F9]">
        <button
          onClick={() => navigate(createPageUrl('Marketing'))}
          className="w-10 h-10 flex items-center justify-center -ml-2"
        >
          <ArrowLeft className="w-6 h-6 text-[#27251f]" />
        </button>
        <h1 className="text-lg font-semibold text-[#27251f]">Plantillas de mensajes</h1>
        <div className="w-10" />
      </div>

      {/* Tabs */}
      <div className="bg-white px-5 pb-3 border-b border-[#F1F5F9]">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pt-1 pb-0.5">
          {TABS.map(tab => (
            <button
              key={tab.value}
              onClick={() => setActiveTab(tab.value)}
              className={`px-4 py-2 rounded-full text-[13px] font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.value
                  ? 'bg-[#004AFE] text-white'
                  : 'bg-[#F1F5F9] text-[#64748B]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div className="px-5 py-5 space-y-6">
        {visibleSections.map(sec => {
          const sectionTemplates = bySection[sec.id] || [];
          if (sectionTemplates.length === 0) return null;

          return (
            <div key={sec.id}>
              {/* Section header */}
              <div className="mb-3">
                <h2 className="text-[15px] font-bold text-[#0F172A]">{sec.label}</h2>
                <p className="text-[12px] text-[#94A3B8] mt-0.5">{sec.description}</p>
              </div>

              {/* Template cards */}
              <div className="space-y-2.5">
                {sectionTemplates.map(template => {
                  const tone = TONE_BADGE[template.tone] || TONE_BADGE.general;
                  return (
                    <div
                      key={template.id}
                      className="bg-white rounded-2xl p-4 border border-[#E2E8F0]"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${tone.bg} ${tone.text}`}
                          >
                            {tone.label}
                          </span>
                          <h3 className="text-[14px] font-semibold text-[#0F172A]">
                            {template.name}
                          </h3>
                        </div>
                        <button
                          onClick={() => handleEdit(template)}
                          className="w-8 h-8 flex items-center justify-center shrink-0 rounded-full bg-[#F8FAFC] active:scale-95 transition-transform"
                        >
                          <Pencil className="w-4 h-4 text-[#64748B]" />
                        </button>
                      </div>
                      <p className="text-[13px] text-[#64748B] line-clamp-2 leading-relaxed">
                        {template.content}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {visibleSections.every(sec => !bySection[sec.id]?.length) && (
          <div className="text-center py-12">
            <p className="text-[#94A3B8] text-sm">No hay plantillas en esta sección</p>
          </div>
        )}
      </div>
    </div>
  );
}
