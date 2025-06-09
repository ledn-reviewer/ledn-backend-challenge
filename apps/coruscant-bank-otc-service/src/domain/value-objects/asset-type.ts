export enum AssetTypeEnum {
  BSK = 'BSK'
}

export class AssetType {
  private readonly value: AssetTypeEnum;

  constructor(value: string) {
    if (!Object.values(AssetTypeEnum).includes(value as AssetTypeEnum)) {
      throw new Error(`Invalid asset type: ${value}. Supported types: ${Object.values(AssetTypeEnum).join(', ')}`);
    }
    
    this.value = value as AssetTypeEnum;
  }

  public getValue(): AssetTypeEnum {
    return this.value;
  }

  public equals(other: AssetType): boolean {
    return this.value === other.value;
  }

  public toString(): string {
    return this.value;
  }

  public static BSK(): AssetType {
    return new AssetType(AssetTypeEnum.BSK);
  }
}