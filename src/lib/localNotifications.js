/**
 * localNotifications.js — recordatorios en el dispositivo (sin servidor).
 *
 * Usa @capacitor/local-notifications. Cada vez que el usuario abre la app:
 *  1. Pide permiso (solo la primera vez, iOS/Android muestran su diálogo).
 *  2. Reprograma los recordatorios de los próximos 7 días a las 9:00 am:
 *     - Hoy (si aún no son las 9): "Tienes X tareas hoy".
 *     - Días siguientes: recordatorio genérico de abrir la app.
 *  3. Si hay partners en riesgo, agenda una alerta para mañana 10:00 am.
 *
 * Como se reprograman en cada apertura, los textos se mantienen frescos.
 * Push real (servidor) puede agregarse después sin tocar esto.
 */

const REMINDER_IDS = [9001, 9002, 9003, 9004, 9005, 9006, 9007];
const PARTNER_RISK_ID = 9100;

function isNative() {
  try {
    return typeof window !== 'undefined' &&
      window.Capacitor?.isNativePlatform?.() === true;
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

function at(daysFromNow, hour, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d;
}

// Distintas pantallas aportan distintos datos (Tasks → tareas, Partners → riesgo).
// Se mezclan aquí para que una llamada no borre lo que aportó la otra.
let lastValues = { todayPending: 0, riskCount: 0 };

/**
 * Reprograma todos los recordatorios. Llamar al abrir la app con datos frescos.
 * @param {number} [todayPending]  tareas pendientes de hoy
 * @param {number} [riskCount]     partners en riesgo
 */
export async function scheduleTaskReminders(values = {}) {
  lastValues = { ...lastValues, ...values };
  const { todayPending, riskCount } = lastValues;
  const LocalNotifications = await getPlugin();
  if (!LocalNotifications) return;

  try {
    const perm = await LocalNotifications.requestPermissions();
    if (perm.display !== 'granted') return;

    // Limpiar agenda anterior para no duplicar
    const pending = await LocalNotifications.getPending();
    if (pending?.notifications?.length) {
      await LocalNotifications.cancel({
        notifications: pending.notifications.map(n => ({ id: n.id })),
      });
    }

    const toSchedule = [];
    const now = new Date();

    for (let day = 0; day < 7; day++) {
      const when = at(day, 9, 0);
      if (when <= now) continue; // hoy ya pasaron las 9 → empezar mañana

      const isToday = day === 0;
      toSchedule.push({
        id: REMINDER_IDS[day],
        title: isToday && todayPending > 0
          ? `Tienes ${todayPending} tarea${todayPending === 1 ? '' : 's'} hoy 📋`
          : 'Tus seguimientos de hoy te esperan 📋',
        body: isToday && todayPending > 0
          ? 'No dejes enfriar a tus contactos. Entra y da seguimiento.'
          : 'Abre Zynergia para ver a quién darle seguimiento hoy.',
        schedule: { at: when, allowWhileIdle: true },
        sound: undefined,
        smallIcon: 'ic_launcher',
      });
    }

    if (riskCount > 0) {
      toSchedule.push({
        id: PARTNER_RISK_ID,
        title: `⚠️ ${riskCount} partner${riskCount === 1 ? '' : 's'} en riesgo`,
        body: 'Actúa hoy para que no pierdan su nivel del Fast Start.',
        schedule: { at: at(1, 10, 0), allowWhileIdle: true },
        sound: undefined,
        smallIcon: 'ic_launcher',
      });
    }

    if (toSchedule.length) {
      await LocalNotifications.schedule({ notifications: toSchedule });
    }
  } catch (err) {
    console.error('[localNotifications]', err);
  }
}
