/**
 * notifications.js — OneSignal push notification helper
 *
 * Setup required:
 * 1. npm install onesignal-capacitor
 * 2. Create account at onesignal.com
 * 3. Create an App in OneSignal and configure iOS (APNs) and Android (FCM)
 * 4. Replace ONESIGNAL_APP_ID below with your OneSignal App ID
 * 5. Add the OneSignal plugin to capacitor.config.ts plugins section
 */

// TODO: Replace with your OneSignal App ID from onesignal.com
const ONESIGNAL_APP_ID = 'XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX';

let initialized = false;

function isNative() {
  try {
    return typeof window !== 'undefined' &&
      window.Capacitor?.isNativePlatform?.() === true;
  } catch {
    return false;
  }
}

async function getOneSignal() {
  if (!isNative()) return null;
  try {
    const { OneSignal } = await import(/* @vite-ignore */ 'onesignal-capacitor');
    return OneSignal;
  } catch {
    console.warn('[Notifications] OneSignal not installed. Run: npm install onesignal-capacitor');
    return null;
  }
}

/**
 * Initialize OneSignal and request permission.
 * Call this after the user completes onboarding.
 */
export async function initNotifications(userId) {
  if (initialized || !isNative()) return;
  const OneSignal = await getOneSignal();
  if (!OneSignal) return;

  try {
    await OneSignal.initialize(ONESIGNAL_APP_ID);
    // Request permission from user
    const { accepted } = await OneSignal.Notifications.requestPermission(true);
    if (accepted && userId) {
      await OneSignal.login(userId);
    }
    initialized = true;
  } catch (err) {
    console.error('[Notifications] Init error:', err);
  }
}

/**
 * Schedule a local notification for task reminders.
 * Uses Capacitor LocalNotifications plugin if available.
 *
 * @param {object[]} tasks - Array of tasks with due_date and task_name
 */
export async function scheduleTaskReminders(tasks) {
  if (!isNative()) return;

  let LocalNotifications;
  try {
    const cap = await import('@capacitor/local-notifications');
    LocalNotifications = cap.LocalNotifications;
  } catch {
    console.warn('[Notifications] @capacitor/local-notifications not installed');
    return;
  }

  try {
    // Cancel existing scheduled notifications before rescheduling
    const { notifications: pending } = await LocalNotifications.getPending();
    if (pending.length > 0) {
      await LocalNotifications.cancel({ notifications: pending });
    }

    const today = new Date().toISOString().split('T')[0];
    const overdueTasks = tasks.filter(t => !t.completed && t.due_date <= today);
    const todayTasks = tasks.filter(t => !t.completed && t.due_date === today);

    const notifications = [];

    // Daily morning reminder at 9am
    if (overdueTasks.length > 0 || todayTasks.length > 0) {
      const count = overdueTasks.length + todayTasks.length;
      const scheduledAt = new Date();
      scheduledAt.setHours(9, 0, 0, 0);
      // If 9am already passed, schedule for tomorrow
      if (scheduledAt <= new Date()) {
        scheduledAt.setDate(scheduledAt.getDate() + 1);
      }

      notifications.push({
        id: 1001,
        title: 'Zynergia — Tareas pendientes',
        body: count === 1
          ? 'Tienes 1 tarea pendiente hoy'
          : `Tienes ${count} tareas pendientes hoy`,
        schedule: { at: scheduledAt },
        sound: 'default',
        smallIcon: 'ic_stat_zynergia',
        iconColor: '#004AFE',
      });
    }

    if (notifications.length > 0) {
      await LocalNotifications.schedule({ notifications });
    }
  } catch (err) {
    console.error('[Notifications] Schedule error:', err);
  }
}

/**
 * Schedule a partner Fast Start reminder.
 * @param {object[]} partners - Array of partners with fast_start_status and fast_start_deadline
 */
export async function schedulePartnerReminders(partners) {
  if (!isNative()) return;

  let LocalNotifications;
  try {
    const cap = await import('@capacitor/local-notifications');
    LocalNotifications = cap.LocalNotifications;
  } catch {
    return;
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const activePartners = partners.filter(p => p.fast_start_status === 'activo');
    const nearDeadline = activePartners.filter(p => {
      if (!p.fast_start_deadline) return false;
      const daysLeft = Math.ceil(
        (new Date(p.fast_start_deadline) - new Date()) / (1000 * 60 * 60 * 24)
      );
      return daysLeft <= 7 && daysLeft > 0;
    });

    if (nearDeadline.length > 0) {
      const scheduledAt = new Date();
      scheduledAt.setHours(10, 0, 0, 0);
      if (scheduledAt <= new Date()) {
        scheduledAt.setDate(scheduledAt.getDate() + 1);
      }

      await LocalNotifications.schedule({
        notifications: [{
          id: 1002,
          title: 'Zynergia — Fast Start',
          body: nearDeadline.length === 1
            ? `${nearDeadline[0].contact_name || 'Un socio'} tiene poco tiempo en Fast Start`
            : `${nearDeadline.length} socios están por vencer su Fast Start`,
          schedule: { at: scheduledAt },
          sound: 'default',
          smallIcon: 'ic_stat_zynergia',
          iconColor: '#004AFE',
        }]
      });
    }
  } catch (err) {
    console.error('[Notifications] Partner reminder error:', err);
  }
}
