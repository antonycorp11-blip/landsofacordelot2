/**
 * Configurações de balanceamento centralizadas. Tudo que afeta ritmo,
 * custos e progressão mora aqui para ajuste sem tocar na lógica.
 */
export const BALANCE = {
  /** Tamanho da célula de simulação dos campos, em metros. */
  cellSize: 1,
  /** Minutos de jogo por segundo real na velocidade 1x. */
  gameMinutesPerSecond: 1,
  /** Opções de aceleração do relógio (vegetação, clima, preços). Máquinas andam sempre em tempo real. */
  timeScales: [1, 4, 15, 45],
  daysPerSeason: 6,
  startMoney: 32000,
  startHour: 7,
  /** Uma "hora de trabalho" (salário/combustível) corresponde a este número de segundos reais de operação. */
  workHourRealSeconds: 60,
  /** Segundos reais de operação equivalentes a uma hora de consumo de diesel. */
  fuelHourRealSeconds: 150,
  dieselPrice: 6.2,
  farmDieselMarkup: 1.12,
  fertilizerPricePerL: 3.1,
  fertilizerLPerHa: 180,
  loanDailyRate: 0.004,
  loanMax: 150000,
  loanStep: 10000,
  repairFactor: 0.12,
  resaleFactor: 0.62,
  financingDownPayment: 0.25,
  leaseDailyPerHa: 160,
  siloCapacityKg: 60000,
  deliveryFee: 450,
  /** Taxa fixa de retirada de máquina alugada. */
  rentalFee: 600,
  autosaveSeconds: 45,
  candidatesPerDay: 3,
  /** Penalidade de produtividade por dia após maturação. */
  overripeLossPerDay: 0.12,
  /** Crescimento relativo em que a cultura passa do ponto e se perde. */
  witherGrowth: 2.4,
  weedGrowthPerDay: 9,
  evaporationPerDay: 34,
  rainMoisturePerHour: 9,
  wetMoisture: 190,
};

export type TimeScaleIndex = 0 | 1 | 2 | 3;
