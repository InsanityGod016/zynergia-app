import { Capacitor } from '@capacitor/core';
import { taskDetail, taskReasonLabel } from '@/lib/taskPresentation';

const TASK_ID_BASE = 100_000;
const TASK_ID_RANGE = 800_000_000;
const SUMMARY_IDS = [900_000_001, 900_000_002];
const LEGACY_IDS = [9001, 9002, 9003, 9004, 9005, 9006, 9007, 9100];
let notificationQueue = Promise.resolve();
let identityGeneration = 0;
let currentUserId = null;
let identityInitialized = false;

function serializeNotificationChange(operation) {
  const result = notificationQueue.then(operation, operation);
  notificationQueue = result.catch(() => {});
  return result;
}

function isNative() {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

async function getPlugin() {
  if (!isNative()) return null;
  try {
    const { LocalNotifications } = await import('@capacitor/local-notifications');
    return LocalNotifications;
  } catch {
    return null;
  }
}

export function taskNotificationId(taskId, userId = '') {
  const value = `${userId}:${String(taskId || 'missing')}`;
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return TASK_ID_BASE + ((hash >>> 0) % TASK_ID_RANGE);
}

function localDateAt(value, time = '09:00') {
  const [year, month, day] = String(value || '').split('-').map(Number);
  const [hour, minute] = String(time || '09:00').split(':').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day, Number.isFinite(hour) ? hour : 9, Number.isFinite(minute) ? minute : 0, 0, 0);
  return Number.isFinite(date.getTime()) ? date : null;
}

export function buildTaskNotifications(tasks, contacts, products, now = new Date(), userId = '') {
  const contactById = new Map(contacts.map(contact => [contact.id, contact]));
  const productById = new Map(products.map(product => [product.id, product]));
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 60);

  return tasks
    .filter(task => !task.completed)
    .map(task => ({ task, at: localDateAt(task.due_date, task.due_time) }))
    .filter(({ at }) => at && at > now && at <= horizon)
    .sort((a, b) => a.at.getTime() - b.at.getTime())
    .slice(0, 60)
    .map(({ task, at }) => {
      const contact = contactById.get(task.contact_id);
      const product = productById.get(task.product_id);
      const detail = taskDetail(task, product);
      return {
        id: taskNotificationId(task.id, userId),
        title: contact?.full_name || 'Tarea de Zynergia',
        body: `${taskReasonLabel(task)}${detail ? ` · ${detail}` : ''}`,
        schedule: { at, allowWhileIdle: true },
        smallIcon: 'ic_launcher',
        extra: {
          source: 'zynergia',
          userId,
          entityType: 'task',
          entityId: String(task.id),
          contactId: task.contact_id ? String(task.contact_id) : '',
        },
      };
    });
}

async function hasPermission(LocalNotifications) {
  const permission = await LocalNotifications.checkPermissions();
  return permission.display === 'granted';
}

export async function requestNotificationPermission() {
  const LocalNotifications = await getPlugin();
  if (!LocalNotifications) return { display: 'unavailable' };
  const current = await LocalNotifications.checkPermissions();
  if (current.display === 'granted' || current.display === 'denied') return current;
  return LocalNotifications.requestPermissions();
}

export async function notificationPermissionStatus() {
  const LocalNotifications = await getPlugin();
  if (!LocalNotifications) return { display: 'unavailable' };
  return LocalNotifications.checkPermissions();
}

async function cancelOwned(LocalNotifications, predicate) {
  const pending = await LocalNotifications.getPending();
  const notifications = (pending?.notifications || [])
    .filter(predicate)
    .map(notification => ({ id: notification.id }));
  if (notifications.length) await LocalNotifications.cancel({ notifications });
}

export async function cancelZynergiaNotifications() {
  identityGeneration += 1;
  return serializeNotificationChange(async () => {
    const LocalNotifications = await getPlugin();
    if (!LocalNotifications) return;
    await cancelOwned(LocalNotifications, notification => (
      notification.extra?.source === 'zynergia' || SUMMARY_IDS.includes(notification.id) || LEGACY_IDS.includes(notification.id)
    ));
  });
}

export function switchNotificationIdentity(userId) {
  const nextUserId = userId ? String(userId) : null;
  if (identityInitialized && currentUserId === nextUserId) return Promise.resolve();
  identityInitialized = true;
  currentUserId = nextUserId;
  identityGeneration += 1;
  return serializeNotificationChange(async () => {
    const LocalNotifications = await getPlugin();
    if (!LocalNotifications) return;
    await cancelOwned(LocalNotifications, notification => (
      notification.extra?.source === 'zynergia' || SUMMARY_IDS.includes(notification.id) || LEGACY_IDS.includes(notification.id)
    ));
  });
}

/** @param {{tasks?: any[], contacts?: any[], products?: any[], enabled?: boolean, userId?: string | null}} options */
export function reconcileTaskNotifications({ tasks = [], contacts = [], products = [], enabled = true, userId } = {}) {
  const normalizedUserId = userId ? String(userId) : null;
  const generation = identityGeneration;
  return serializeNotificationChange(async () => {
    if (!normalizedUserId || normalizedUserId !== currentUserId || generation !== identityGeneration) {
      return { scheduled: 0, status: 'stale-identity' };
    }
    const LocalNotifications = await getPlugin();
    if (!LocalNotifications) return { scheduled: 0, status: 'unavailable' };
    if (!(await hasPermission(LocalNotifications))) return { scheduled: 0, status: 'permission-required' };
    if (normalizedUserId !== currentUserId || generation !== identityGeneration) {
      return { scheduled: 0, status: 'stale-identity' };
    }

    await cancelOwned(LocalNotifications, notification => (
      (notification.extra?.source === 'zynergia' && notification.extra?.entityType === 'task') || LEGACY_IDS.includes(notification.id)
    ));
    if (normalizedUserId !== currentUserId || generation !== identityGeneration) {
      return { scheduled: 0, status: 'stale-identity' };
    }
    if (!enabled) return { scheduled: 0, status: 'disabled' };

    const notifications = buildTaskNotifications(tasks, contacts, products, new Date(), normalizedUserId);
    if (notifications.length) await LocalNotifications.schedule({ notifications });
    return { scheduled: notifications.length, status: 'scheduled' };
  });
}

// Compatibilidad temporal con la alerta de riesgo de Equipo. No solicita permiso
// ni cancela notificaciones que pertenezcan a otras aplicaciones/plugins.
/** @param {{riskCount?: number, userId?: string | null}} options */
export function scheduleTaskReminders({ riskCount = 0, userId } = {}) {
  const normalizedUserId = userId ? String(userId) : null;
  const generation = identityGeneration;
  return serializeNotificationChange(async () => {
    if (!normalizedUserId || normalizedUserId !== currentUserId || generation !== identityGeneration) return;
    const LocalNotifications = await getPlugin();
    if (!LocalNotifications || !(await hasPermission(LocalNotifications))) return;
    if (normalizedUserId !== currentUserId || generation !== identityGeneration) return;
    await cancelOwned(LocalNotifications, notification => SUMMARY_IDS.includes(notification.id));
    if (!riskCount || normalizedUserId !== currentUserId || generation !== identityGeneration) return;
    const at = new Date();
    at.setDate(at.getDate() + 1);
    at.setHours(10, 0, 0, 0);
    await LocalNotifications.schedule({ notifications: [{
      id: SUMMARY_IDS[1],
      title: `${riskCount} partner${riskCount === 1 ? '' : 's'} necesita${riskCount === 1 ? '' : 'n'} seguimiento`,
      body: 'Abre Equipo para revisar la siguiente acción.',
      schedule: { at, allowWhileIdle: true },
      smallIcon: 'ic_launcher',
      extra: { source: 'zynergia', userId: normalizedUserId, entityType: 'partner-dashboard' },
    }] });
  });
}

export async function initializeLocalNotificationNavigation(navigate) {
  const LocalNotifications = await getPlugin();
  if (!LocalNotifications) return () => {};
  const handle = await LocalNotifications.addListener('localNotificationActionPerformed', event => {
    const extra = event.notification?.extra || {};
    if (extra.source !== 'zynergia') return;
    if (extra.entityType === 'task' && extra.entityId) {
      navigate(`/Tasks?taskId=${encodeURIComponent(extra.entityId)}`);
      return;
    }
    navigate('/Partners');
  });
  return () => handle.remove();
}
