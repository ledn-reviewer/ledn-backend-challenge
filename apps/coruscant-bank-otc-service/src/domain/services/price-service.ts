import { Amount } from '../value-objects/amount';
import { AssetType } from '../value-objects/asset-type';

export interface PriceService {
  getCurrentPrice(assetType: AssetType): Promise<Amount>;
  subscribeToUpdates(assetType: AssetType, callback: (price: Amount) => void): void;
  unsubscribeFromUpdates(assetType: AssetType): void;
}