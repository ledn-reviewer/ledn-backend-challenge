import { EventEmitter } from 'events';

/**
 * Client size categories with BSK ranges
 */
export enum ClientSize {
  SHRIMP = 'SHRIMP',         // 1 BSK
  CRAB = 'CRAB',             // 1-10 BSK
  OCTOPUS = 'OCTOPUS',       // 10-50 BSK
  FISH = 'FISH',             // 50-100 BSK
  DOLPHIN = 'DOLPHIN',       // 100-500 BSK
  SHARK = 'SHARK',           // 500-1000 BSK
  WHALE = 'WHALE',           // 1000-5000 BSK
  HUMPBACK = 'HUMPBACK',     // 5000-10000 BSK
}

/**
 * Client size BSK ranges
 */
export const CLIENT_SIZE_RANGES: Record<ClientSize, { min: number; max: number }> = {
  [ClientSize.SHRIMP]: { min: 1, max: 1 },
  [ClientSize.CRAB]: { min: 1, max: 10 },
  [ClientSize.OCTOPUS]: { min: 10, max: 50 },
  [ClientSize.FISH]: { min: 50, max: 100 },
  [ClientSize.DOLPHIN]: { min: 100, max: 500 },
  [ClientSize.SHARK]: { min: 500, max: 1000 },
  [ClientSize.WHALE]: { min: 1000, max: 5000 },
  [ClientSize.HUMPBACK]: { min: 5000, max: 10000 },
};

/**
 * Client action types
 */
export enum ClientActionType {
  CREATE_LOAN = 'CREATE_LOAN',
  TOP_UP_COLLATERAL = 'TOP_UP_COLLATERAL',
  BIRTH = 'BIRTH',
  DEATH = 'DEATH',
  NO_ACTION = 'NO_ACTION',
}

/**
 * Loan information type
 */
export interface Loan {
  loanId: string;
  borrowerId: string;
  amount: number;
  collateral: number;
  loanTimestamp: Date;
  ltv: number;
}

/**
 * Client state interface
 */
export interface ClientState {
  borrowerId: string;
  size: ClientSize;
  maxLoanAmount: number;
  riskTolerance: number; // Between 0-1
  actionsPerformed: number;
  loans: Map<string, Loan>;
}

/**
 * Client events
 */
export interface ClientEvents extends EventEmitter {
  on(event: 'action', listener: (clientId: string, action: ClientActionType, data?: any) => void): this;
  on(event: 'die', listener: (clientId: string) => void): this;
  emit(event: 'action', clientId: string, action: ClientActionType, data?: any): boolean;
  emit(event: 'die', clientId: string): boolean;
}

/**
 * Asset price update interface
 */
export interface AssetPrice {
  price: number;
  timestamp: Date;
}

/**
 * Price service interface
 */
export interface PriceService {
  getCurrentPrice(): Promise<AssetPrice>;
}
