const recoveryTokenKey = 'zynergia_password_recovery_token';

export function matchesPasswordRecoveryToken(recoveryToken, session) {
  return Boolean(recoveryToken && session?.access_token && recoveryToken === session.access_token);
}

export function rememberPasswordRecoverySession(session) {
  if (typeof sessionStorage === 'undefined' || !session?.access_token) return;
  sessionStorage.setItem(recoveryTokenKey, session.access_token);
}

export function isRememberedPasswordRecovery(session) {
  if (typeof sessionStorage === 'undefined') return false;
  return matchesPasswordRecoveryToken(sessionStorage.getItem(recoveryTokenKey), session);
}

export function clearRememberedPasswordRecovery() {
  if (typeof sessionStorage !== 'undefined') sessionStorage.removeItem(recoveryTokenKey);
}
