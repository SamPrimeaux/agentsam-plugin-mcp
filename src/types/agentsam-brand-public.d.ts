declare module "@inneranimalmedia/agentsam-brand/public" {
  export function inspectBrandEvidence(scan: any, options?: any): any;
  export function listBrandAssetEvidence(scan: any): any[];
  export function inspectBrandAssetEvidence(scan: any, assetId: string): any;
  export function findBrandUsageEvidence(scan: any, query: string): any;
  export function draftBrandContractFromEvidence(scan: any, options?: any): any;
  export function buildBrandPlanFromEvidence(scan: any, options?: any): any;
  export function evaluateBrandConsistency(contract: any, candidate?: any): any;
}
