import { describe, expect, it } from "vitest";
import { dispatchBrandTool } from "../src/plugins/brand/handlers";
import { BRAND_TOOL_INPUT_SCHEMAS } from "../src/plugins/brand/schemas";

const principal:any={
  userId:"u1",profileId:"profile1",subject:"u1",issuer:"https://plugins.example.org",
  workspaceId:"workspace_one",scopes:new Set(["brand:contract:write"])
};
function fixture() {
  const writes:Array<{sql:string;args:unknown[]}>=[];let params:unknown[]=[];
  const env:any={DB:{prepare(sql:string){return {bind(...args:unknown[]){params=args;return this},
    run(){writes.push({sql,args:params});return Promise.resolve({meta:{changes:1}})}}}}};
  return {env,writes};
}
describe("BrandContract approved write",()=>{
  it("requires explicit approval and a real workspace",async()=>{
    const {env,writes}=fixture();
    expect(BRAND_TOOL_INPUT_SCHEMAS["brand.contract.save"].safeParse({
      contract:{name:"Example"},approved:false
    }).success).toBe(false);
    await expect(dispatchBrandTool("brand.contract.save",{contract:{name:"Example"},approved:false},env,principal))
      .rejects.toThrow("brand_contract_approval_required");
    await expect(dispatchBrandTool("brand.contract.save",{contract:{name:"Example"},approved:true},env,{
      ...principal,workspaceId:undefined
    })).rejects.toThrow("workspace_required");
    expect(writes).toHaveLength(0);
  });
  it("inserts a new approved workspace version without modifying published assets",async()=>{
    const {env,writes}=fixture();
    const args={contract:{name:"Example",palette:["#112233"]},evidence:[{source:"brand scan"}],
      approved:true,schemaVersion:"v1"};
    const parsed=BRAND_TOOL_INPUT_SCHEMAS["brand.contract.save"].parse(args);
    const result:any=await dispatchBrandTool("brand.contract.save",parsed,env,principal);
    expect(result.saved).toBe(true);
    expect(result.workspaceId).toBe("workspace_one");
    expect(result.status).toBe("approved");
    expect(writes).toHaveLength(1);
    expect(writes[0].sql).toContain("INSERT INTO public_brand_contracts");
    expect(writes[0].args[1]).toBe("workspace_one");
    expect(writes[0].sql).not.toMatch(/ON CONFLICT|UPDATE |DELETE |publish/i);
  });
});
