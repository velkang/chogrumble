export interface FighterSpec {
  id: string;
  name: string;
  traits: Readonly<Record<string, string>>;
  tokenId?: number;
  house?: boolean;
}
