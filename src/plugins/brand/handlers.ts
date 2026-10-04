/**
 * Adapter boundary to @inneranimalmedia/agentsam-brand.
 * Do not duplicate Brand logic in this repository.
 *
 * Next:
 * - brandScan
 * - brandResolve
 * - brandPlan
 * - buildBrandContractDraft
 * - stable public result schemas
 */
export class BrandHandlersNotWiredError extends Error {
  constructor() {
    super("brand_handlers_not_wired");
  }
}
