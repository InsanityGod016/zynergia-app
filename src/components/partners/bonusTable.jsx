// Bonus amounts by currency
export const BONUS_TABLE = {
  qteam: {
    label: 'Q-Team',
    subtitle: 'Meta día 30',
    EUR: 100,
    MXN: 1900,
    COP: 450000,
    PEN: 380,
    USD: 110
  },
  fs_nivel1: {
    label: 'Fast Start Nivel 1',
    subtitle: 'Meta día 60',
    EUR: 400,
    MXN: 7600,
    COP: 1800000,
    PEN: 1500,
    USD: 430
  },
  fs_nivel2: {
    label: 'Fast Start Nivel 2',
    subtitle: 'Meta día 90',
    EUR: 1200,
    MXN: 22800,
    COP: 5400000,
    PEN: 4600,
    USD: 1300
  },
  xteam: {
    label: 'X-Team',
    subtitle: 'Meta día 120',
    EUR: 150,
    MXN: 2850,
    COP: 680000,
    PEN: 570,
    USD: 160
  }
};

export const CURRENCY_SYMBOLS = {
  MXN: '$',
  USD: '$',
  EUR: '€',
  COP: '$',
  PEN: 'S/'
};

export function formatBonus(bonusKey, currency) {
  const amount = BONUS_TABLE[bonusKey][currency];
  const symbol = CURRENCY_SYMBOLS[currency];
  return `${symbol}${amount.toLocaleString()} ${currency}`;
}