export const SYMBOLS = [
  { id: 'tiger_gold', icon: '🐅', value: 200, label: 'Tigre de Ouro' },
  { id: 'crown', icon: '👑', value: 100, label: 'Coroa Real' },
  { id: 'gem', icon: '💎', value: 50, label: 'Gema Preciosa' },
  { id: 'gold_bar', icon: '🧈', value: 25, label: 'Barra de Ouro' },
  { id: 'coin_stack', icon: '🪙', value: 10, label: 'Pilha de Moedas' },
  { id: 'lucky_card', icon: '🃏', value: 5, label: 'Carta da Sorte' },
];

export const REEL_COUNT = 3;
export const ROWS_COUNT = 3;

export const PAYLINES = [
  [0, 1, 2], // Top row
  [3, 4, 5], // Middle row
  [6, 7, 8], // Bottom row
  [0, 4, 8], // Diagonal 1
  [2, 4, 6], // Diagonal 2
];

export const INITIAL_BALANCE = 0;
export const MIN_BET = 1;
export const MAX_BET = 1000;
export const MIN_WITHDRAWAL = 500;
