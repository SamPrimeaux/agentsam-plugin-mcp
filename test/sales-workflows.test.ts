import { describe, expect, it } from "vitest";
import { buildSalesContext, getSalesWorkflow, listSalesWorkflows } from "../packages/agentsam-sales/src/index";

describe("AgentSam Sales workflow pack", () => {
  it("publishes the ten declared workflow guides", () => {
    expect(listSalesWorkflows().map((workflow) => workflow.key)).toHaveLength(10);
    expect(getSalesWorkflow("meeting_preparation")?.steps.length).toBeGreaterThan(0);
  });

  it("does not claim CRM access when no CRM source is connected", () => {
    const context = buildSalesContext([
      { providerKey: "google-drive", connectionKind: "oauth", status: "connected", capabilities: ["files.read"] },
    ]);
    expect(context.crm).toEqual({ status: "not_connected", providers: [] });
    expect(context.writePolicy).toContain("explicit user approval");
  });

  it("reports only the provider and capability projection for connected CRM sources", () => {
    const context = buildSalesContext([
      { providerKey: "hubspot", connectionKind: "oauth", status: "connected", capabilities: ["crm.read"] },
    ]);
    expect(context.crm).toEqual({ status: "connected", providers: ["hubspot"] });
    expect(context.connectedSources[0]).toEqual({
      provider: "hubspot", kind: "oauth", status: "connected", capabilities: ["crm.read"],
    });
  });
});
