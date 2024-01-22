export interface FeatureSet {
  equals(that: FeatureSet): boolean;
  broken(that: FeatureSet): string[];
  toData(): any;
}
