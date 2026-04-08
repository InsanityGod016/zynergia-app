import { db } from '@/api/db';

const todayStr = () => new Date().toISOString().split('T')[0];

// Supabase RLS scopes Notification.list() to the current user, so no user_id check needed.
function alreadyNotifiedToday(existing, title) {
  const today = todayStr();
  return existing.some(n => n.title === title && n.created_date?.startsWith(today));
}

function notifiedWithinHours(existing, title, hours) {
  const cutoff = new Date(Date.now() - hours * 3600 * 1000).toISOString();
  return existing.some(n => n.title === title && n.created_date >= cutoff);
}

async function createNotif(notif) {
  await db.Notification.create({ is_read: false, ...notif });
}

export async function runNotificationEngine({ userId, tasks, sales, products, partners }) {
  if (!userId) return;

  const existing = await db.Notification.list();
  const today = todayStr();

  // ── Metrics ────────────────────────────────────────────────────────────────
  const premierKitIds = new Set(
    products.filter(p => p.category === 'Premier Kits').map(p => p.id)
  );
  const activePremierClients = new Set(
    sales.filter(s => s.status !== 'cancelled' && premierKitIds.has(s.product_id)).map(s => s.contact_id)
  ).size;
  const partnersCount = partners.length;

  // Global Fast Start deadline (earliest partner start + 120)
  let daysRemaining = null;
  if (partners.length > 0) {
    const sorted = [...partners].sort((a, b) => a.start_date.localeCompare(b.start_date));
    const start = new Date(sorted[0].start_date);
    const deadline = new Date(start);
    deadline.setDate(deadline.getDate() + 120);
    daysRemaining = Math.max(0, Math.floor((deadline - new Date()) / 86400000));
  }

  // ── A) Q-Team en riesgo ────────────────────────────────────────────────────
  if (activePremierClients < 4 && partnersCount > 0) {
    const title = 'Estás en riesgo de perder tu bono';
    if (!alreadyNotifiedToday(existing, title)) {
      await createNotif({
        title,
        body: 'Tienes menos de 4 clientes activos. Debes mantener mínimo 4.',
        type: 'danger',
        related_entity_type: 'dashboard'
      });
    }
  }

  // ── B) Te falta poco ──────────────────────────────────────────────────────
  if (activePremierClients === 3) {
    const title = 'Te falta 1 cliente para cobrar tu bono Q-Team';
    if (!notifiedWithinHours(existing, title, 48)) {
      await createNotif({
        title,
        body: 'Estás a 1 cliente de desbloquear el bono Q-Team.',
        type: 'warning',
        related_entity_type: 'dashboard'
      });
    }
  }
  if (partnersCount === 1) {
    const title = 'Te falta 1 partner para cobrar tu bono Nivel 1';
    if (!notifiedWithinHours(existing, title, 48)) {
      await createNotif({
        title,
        body: 'Agrega 1 partner más para desbloquear el bono FS Nivel 1.',
        type: 'warning',
        related_entity_type: 'dashboard'
      });
    }
  }
  if (activePremierClients === 9) {
    const title = 'Te falta 1 cliente para cobrar tu bono X-Team';
    if (!notifiedWithinHours(existing, title, 48)) {
      await createNotif({
        title,
        body: 'Estás a 1 cliente de desbloquear el bono X-Team.',
        type: 'warning',
        related_entity_type: 'dashboard'
      });
    }
  }

  // ── C) Deadline Fast Start cercano ────────────────────────────────────────
  if (daysRemaining !== null && [7, 3, 1].includes(daysRemaining)) {
    const title = 'Tu Fast Start está por vencer';
    if (!alreadyNotifiedToday(existing, title)) {
      await createNotif({
        title,
        body: `Te quedan ${daysRemaining} día${daysRemaining > 1 ? 's' : ''} para completar tus bonos.`,
        type: 'warning',
        related_entity_type: 'dashboard'
      });
    }
  }

  // ── D) Tareas vencidas (urgente) ─────────────────────────────────────────
  const overdueTasks = tasks.filter(t => !t.completed && t.due_date < today);
  if (overdueTasks.length > 0) {
    const title = `🚨 Tienes ${overdueTasks.length} tarea${overdueTasks.length > 1 ? 's' : ''} atrasada${overdueTasks.length > 1 ? 's' : ''}`;
    if (!alreadyNotifiedToday(existing, title)) {
      await createNotif({
        title,
        body: `No dejes pasar más tiempo. Revisa tus tareas atrasadas y completa la más urgente hoy.`,
        type: 'danger',
        related_entity_type: 'task'
      });
    }
  }

  // ── E) Momentum positivo ─────────────────────────────────────────────────
  const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
  const recentPremierSales = new Set(
    sales.filter(s =>
      s.status !== 'cancelled' &&
      premierKitIds.has(s.product_id) &&
      s.purchase_date >= sevenDaysAgo
    ).map(s => s.contact_id)
  ).size;
  const recentPartners = partners.filter(p => p.start_date >= sevenDaysAgo).length;

  if (recentPremierSales >= 2 || recentPartners >= 1) {
    const title = 'Gran avance esta semana';
    if (!notifiedWithinHours(existing, title, 168)) {
      await createNotif({
        title,
        body: 'Estás acelerando tu Fast Start. ¡Sigue así!',
        type: 'success',
        related_entity_type: 'dashboard'
      });
    }
  }
}