import { db } from '@/api/db';
import { format, addDays } from 'date-fns';

function dateStr(date) {
  return format(date, 'yyyy-MM-dd');
}

function addDaysToStr(dateString, days) {
  const [y, m, d] = dateString.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return dateStr(date);
}

function todayStr() {
  return dateStr(new Date());
}

// ── Sale tasks (producto) ──────────────────────────────────────────────────────

/**
 * Create all tasks for a new sale.
 * Deletes future pending tasks for (contactId, productId) first.
 */
export async function createSaleTasks({ contactId, productId, purchaseDate, saleType, product, existingTasks }) {
  const today = todayStr();

  // Delete future pending tasks for this contact+product
  const toDelete = existingTasks.filter(
    t => t.contact_id === contactId &&
      t.product_id === productId &&
      t.due_date >= today &&
      !t.completed
  );
  await Promise.all(toDelete.map(t => db.Task.delete(t.id)));

  // purchaseDate may already be a "YYYY-MM-DD" string — use it directly to avoid timezone shifts
  const baseDateStr = typeof purchaseDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(purchaseDate)
    ? purchaseDate
    : dateStr(new Date(purchaseDate));

  // Determine repurchase cycle length by category
  // "Compra Única" → 30 days, "Premier Kits" → 180 days
  const catLower = (product?.category || '').toLowerCase().replace(/\s/g, '_');
  const isCompraUnica = catLower === 'compra_única' || catLower === 'compra_unica' || catLower === 'compra_nica';
  const isPremierKit = catLower === 'premier_kits' || catLower === 'premier_kit';
  const frecuenciaDias = isCompraUnica ? 30 : isPremierKit ? 180 : null;

  const tasks = [];

  if (saleType === 'nueva') {
    // Seguimiento día 3
    tasks.push({
      contact_id: contactId,
      product_id: productId,
      category: 'seguimiento',
      subcategory: 'dia_3',
      template_subcategory: 'producto_dia_3',
      task_name: 'Bienvenida Día 3',
      task_area: 'producto',
      due_date: addDaysToStr(baseDateStr, 3),
      completed: false
    });
  }

  // Recompra tasks — for ALL product categories that have a cycle
  if (frecuenciaDias !== null) {
    const nextRepurchaseDate = addDaysToStr(baseDateStr, frecuenciaDias);

    tasks.push({
      contact_id: contactId,
      product_id: productId,
      category: 'recompra',
      subcategory: '7_dias_antes',
      template_subcategory: 'producto_7_dias_antes',
      task_name: 'Recompra 7 días antes',
      task_area: 'producto',
      due_date: addDaysToStr(nextRepurchaseDate, -7),
      completed: false
    });

    tasks.push({
      contact_id: contactId,
      product_id: productId,
      category: 'recompra',
      subcategory: '3_dias_antes',
      template_subcategory: 'producto_3_dias_antes',
      task_name: 'Recompra 3 días antes',
      task_area: 'producto',
      due_date: addDaysToStr(nextRepurchaseDate, -3),
      completed: false
    });

    tasks.push({
      contact_id: contactId,
      product_id: productId,
      category: 'recompra',
      subcategory: '5_dias_despues',
      template_subcategory: 'producto_5_dias_despues',
      task_name: 'Recompra 5 días después',
      task_area: 'producto',
      due_date: addDaysToStr(nextRepurchaseDate, 5),
      completed: false
    });

    // Reactivación: 30 días después del "5 días después"
    tasks.push({
      contact_id: contactId,
      product_id: productId,
      category: 'reactivacion',
      subcategory: 'reactivacion',
      template_subcategory: 'producto_reactivacion',
      task_name: 'Reactivación',
      task_area: 'producto',
      due_date: addDaysToStr(nextRepurchaseDate, 35),
      completed: false
    });
  }

  await Promise.all(tasks.map(t => db.Task.create(t)));
}

// ── Prospecto Producto ────────────────────────────────────────────────────────

export async function createProspectoProductoTasks({ contactId, existingTasks }) {
  const today = todayStr();

  // Anti-spam: don't create if there's already a future prospecto_producto task
  const hasFuture = existingTasks.some(
    t => t.contact_id === contactId &&
      t.task_area === 'prospecto_producto' &&
      t.due_date >= today &&
      !t.completed
  );
  if (hasFuture) return;

  const sequence = [
    { days: 0,  template_subcategory: 'prospecto_producto_msg_1', task_name: 'Prospecto Producto – Mensaje de contacto' },
    { days: 3,  template_subcategory: 'prospecto_producto_msg_2', task_name: 'Prospecto Producto – Invitación' },
    { days: 7,  template_subcategory: 'prospecto_producto_msg_3', task_name: 'Prospecto Producto – Invitación a explicación' },
    { days: 12, template_subcategory: 'prospecto_producto_msg_4', task_name: 'Prospecto Producto – Follow up' },
    { days: 18, template_subcategory: 'prospecto_producto_msg_5', task_name: 'Prospecto Producto – Segundo follow up' },
    { days: 25, template_subcategory: 'prospecto_producto_msg_6', task_name: 'Prospecto Producto – Último mensaje' }
  ];

  await Promise.all(sequence.map(s => db.Task.create({
    contact_id: contactId,
    category: 'seguimiento',
    subcategory: s.template_subcategory,
    template_subcategory: s.template_subcategory,
    task_name: s.task_name,
    task_area: 'prospecto_producto',
    due_date: addDaysToStr(today, s.days),
    completed: false
  })));
}

// ── Prospecto Partner ─────────────────────────────────────────────────────────

export async function createProspectoPartnerTasks({ contactId, existingTasks }) {
  const today = todayStr();

  const hasFuture = existingTasks.some(
    t => t.contact_id === contactId &&
      t.task_area === 'prospecto_partner' &&
      t.due_date >= today &&
      !t.completed
  );
  if (hasFuture) return;

  const sequence = [
    { days: 0,  template_subcategory: 'prospecto_partner_msg_1', task_name: 'Prospecto Partner – Mensaje de contacto' },
    { days: 3,  template_subcategory: 'prospecto_partner_msg_2', task_name: 'Prospecto Partner – Invitación' },
    { days: 7,  template_subcategory: 'prospecto_partner_msg_3', task_name: 'Prospecto Partner – Invitación a explicación' },
    { days: 12, template_subcategory: 'prospecto_partner_msg_4', task_name: 'Prospecto Partner – Follow up' },
    { days: 18, template_subcategory: 'prospecto_partner_msg_5', task_name: 'Prospecto Partner – Segundo follow up' },
    { days: 25, template_subcategory: 'prospecto_partner_msg_6', task_name: 'Prospecto Partner – Último mensaje' }
  ];

  await Promise.all(sequence.map(s => db.Task.create({
    contact_id: contactId,
    category: 'seguimiento',
    subcategory: s.template_subcategory,
    template_subcategory: s.template_subcategory,
    task_name: s.task_name,
    task_area: 'prospecto_partner',
    due_date: addDaysToStr(today, s.days),
    completed: false
  })));
}

// ── Referido (Cliente / Partner) ──────────────────────────────────────────────

/**
 * Crea una tarea de pedir referido para contactos de tipo cliente_producto o partner.
 * La fecha de vencimiento es 30 días después del registro del contacto (mínimo hoy).
 */
export async function createReferralTask({ contactId, contactCreatedAt, existingTasks }) {
  const today = todayStr();

  // Anti-spam: no crear si ya existe una tarea de referido futura sin completar
  const hasFuture = existingTasks.some(
    t => t.contact_id === contactId &&
      t.task_area === 'referidos' &&
      t.due_date >= today &&
      !t.completed
  );
  if (hasFuture) return;

  // Calcular fecha de vencimiento: 30 días desde registro, mínimo hoy
  let dueDate = addDaysToStr(today, 30);
  if (contactCreatedAt) {
    const createdDateStr = typeof contactCreatedAt === 'string'
      ? contactCreatedAt.split('T')[0]
      : dateStr(new Date(contactCreatedAt));
    const target = addDaysToStr(createdDateStr, 30);
    dueDate = target >= today ? target : today;
  }

  await db.Task.create({
    contact_id: contactId,
    category: 'seguimiento',
    subcategory: 'referido',
    template_subcategory: 'referido',
    task_name: 'Pedir referido',
    task_area: 'referidos',
    due_date: dueDate,
    completed: false
  });
}

// ── Partner Fast Start ────────────────────────────────────────────────────────

export async function createPartnerTasks({ contactId, startDate }) {
  const sequence = [
    { days: 1,   template_subcategory: 'partner_qteam_dia_1',   task_name: 'Fast Start – Q-Team Día 1' },
    { days: 7,   template_subcategory: 'partner_qteam_dia_7',   task_name: 'Fast Start – Q-Team Día 7' },
    { days: 30,  template_subcategory: 'partner_qteam_dia_30',  task_name: 'Fast Start – Q-Team Día 30' },
    { days: 35,  template_subcategory: 'partner_fs_n1_dia_35',  task_name: 'Fast Start – Nivel 1 Día 35' },
    { days: 60,  template_subcategory: 'partner_fs_n1_dia_60',  task_name: 'Fast Start – Nivel 1 Día 60' },
    { days: 75,  template_subcategory: 'partner_fs_n2_dia_75',  task_name: 'Fast Start – Nivel 2 Día 75' },
    { days: 90,  template_subcategory: 'partner_fs_n2_dia_90',  task_name: 'Fast Start – Nivel 2 Día 90' },
    { days: 110, template_subcategory: 'partner_xteam_dia_110', task_name: 'Fast Start – X-Team Día 110' },
    { days: 120, template_subcategory: 'partner_xteam_dia_120', task_name: 'Fast Start – X-Team Día 120' }
  ];

  await Promise.all(sequence.map(s => db.Task.create({
    contact_id: contactId,
    category: 'seguimiento',
    subcategory: s.template_subcategory,
    template_subcategory: s.template_subcategory,
    task_name: s.task_name,
    task_area: 'partner',
    due_date: addDaysToStr(startDate, s.days),
    completed: false
  })));
}

/**
 * Smart partner tasks — only for partners that have the app.
 * Replaces calendar-based sequence with real-progress-based tasks.
 * Called when real FS metrics are available.
 */
export async function refreshSmartPartnerTasks({ contactId, contactName, activePremierClients, partnersCount, existingTasks }) {
  const today = todayStr();

  // Cancel all pending future partner tasks for this contact
  const toDelete = existingTasks.filter(
    t => t.contact_id === contactId &&
      t.task_area === 'partner' &&
      t.due_date >= today &&
      !t.completed
  );
  await Promise.all(toDelete.map(t => db.Task.delete(t.id)));

  const qteamDone = activePremierClients >= 4;
  const fs1Done   = qteamDone && partnersCount >= 2;
  const xteamDone = fs1Done && activePremierClients >= 10;

  const tasks = [];

  if (!qteamDone) {
    const left = 4 - activePremierClients;
    tasks.push({
      task_name: left === 1
        ? `¡${contactName} está a 1 cliente del Q-Team!`
        : `Apoya a ${contactName}: necesita ${left} clientes Premier para Q-Team`,
      template_subcategory: 'partner_smart_qteam',
      due_date: today,
    });
    // Check-in en 7 días
    tasks.push({
      task_name: `Check-in Fast Start con ${contactName}`,
      template_subcategory: 'partner_smart_checkin',
      due_date: addDaysToStr(today, 7),
    });
  } else if (!fs1Done) {
    const left = 2 - partnersCount;
    tasks.push({
      task_name: left === 1
        ? `¡${contactName} necesita 1 partner más para Nivel 1!`
        : `Apoya a ${contactName} a reclutar ${left} partners para FS Nivel 1`,
      template_subcategory: 'partner_smart_fs1',
      due_date: today,
    });
    tasks.push({
      task_name: `Check-in Fast Start con ${contactName}`,
      template_subcategory: 'partner_smart_checkin',
      due_date: addDaysToStr(today, 7),
    });
  } else if (!xteamDone) {
    const left = 10 - activePremierClients;
    tasks.push({
      task_name: `X-Team: ${contactName} necesita ${left} clientes más`,
      template_subcategory: 'partner_smart_xteam',
      due_date: today,
    });
    tasks.push({
      task_name: `Check-in Fast Start con ${contactName}`,
      template_subcategory: 'partner_smart_checkin',
      due_date: addDaysToStr(today, 14),
    });
  } else {
    // All bonuses done — monthly check-in
    tasks.push({
      task_name: `Check-in mensual con ${contactName} (Fast Start completado)`,
      template_subcategory: 'partner_smart_checkin',
      due_date: addDaysToStr(today, 30),
    });
  }

  await Promise.all(tasks.map(t => db.Task.create({
    contact_id: contactId,
    category: 'seguimiento',
    subcategory: t.template_subcategory,
    template_subcategory: t.template_subcategory,
    task_name: t.task_name,
    task_area: 'partner',
    due_date: t.due_date,
    completed: false,
  })));
}

/**
 * Create urgency Q-Team task if partner drops below 4 active AutoOrder clients.
 * Ensures no duplicate active urgency task exists.
 */
export async function createQTeamUrgencyTask({ contactId, existingTasks }) {
  const today = todayStr();
  const hasUrgency = existingTasks.some(
    t => t.contact_id === contactId &&
      t.template_subcategory === 'partner_urgencia_qteam' &&
      t.due_date >= today &&
      !t.completed
  );
  if (hasUrgency) return;

  await db.Task.create({
    contact_id: contactId,
    category: 'seguimiento',
    subcategory: 'partner_urgencia_qteam',
    template_subcategory: 'partner_urgencia_qteam',
    task_name: 'Urgencia: recuperar 4 clientes activos',
    task_area: 'partner',
    due_date: today,
    completed: false
  });
}

// ── Cancel future tasks for a contact/area ────────────────────────────────────

export async function cancelFutureTasksByArea({ contactId, taskArea, existingTasks }) {
  const today = todayStr();
  const toDelete = existingTasks.filter(
    t => t.contact_id === contactId &&
      t.task_area === taskArea &&
      t.due_date >= today &&
      !t.completed
  );
  await Promise.all(toDelete.map(t => db.Task.delete(t.id)));
}