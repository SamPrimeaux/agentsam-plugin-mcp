declare module "@inneranimalmedia/agentsam-campaign" {
  export function normalizeCampaignContext(input?: any): any;
  export function buildCampaignBrief(input?: any): any;
  export function evaluateCampaignConcept(concept?: any, context?: any): any;
  export function rankCampaignConcepts(concepts?: any[], context?: any): any;
  export function buildCampaignPlan(input?: {
    brief?: any;
    concept?: any;
    context?: any;
  }): any;
}
