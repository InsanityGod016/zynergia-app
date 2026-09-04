export const BONUS_TABLE = {
  qteam: {
    label: 'Q-Team',
    subtitle: 'Meta día 30',
    goal: '4 clientes Premier activos',
    MXN: 1900,
    USD: 110,
    EUR: 100,
    COP: 450000,
    PEN: 380,
  },
  fs_nivel1: {
    label: 'Fast Start Nivel 1',
    subtitle: 'Meta día 60',
    goal: 'Q-Team y 2 partners directos',
    MXN: 7600,
    USD: 430,
    EUR: 400,
    COP: 1800000,
    PEN: 1500,
  },
  fs_nivel2: {
    label: 'Fast Start Nivel 2',
    subtitle: 'Meta día 90',
    goal: '2 ramas directas completan Q-Team',
    MXN: 22800,
    USD: 1300,
    EUR: 1200,
    COP: 5400000,
    PEN: 4600,
  },
  xteam: {
    label: 'X-Team',
    subtitle: 'Meta día 120',
    goal: '10 clientes Premier activos',
    MXN: 2850,
    USD: 160,
    EUR: 150,
    COP: 680000,
    PEN: 570,
  },
};

export const FAST_START_STAGES = BONUS_TABLE;

const CURRENCY_SYMBOLS = {
  MXN: '$',
  USD: '$',
  EUR: '€',
  COP: '$',
  PEN: 'S/',
};

export function formatBonus(stageKey, requestedCurrency = 'MXN') {
  const stage = BONUS_TABLE[stageKey];
  const currency = CURRENCY_SYMBOLS[requestedCurrency] ? requestedCurrency : 'MXN';
  const amount = stage?.[currency];
  if (!Number.isFinite(amount)) return 'Importe no disponible';
  return `${CURRENCY_SYMBOLS[currency]}${amount.toLocaleString('es-MX')} ${currency}`;
}
