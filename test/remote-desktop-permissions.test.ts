import { describe, expect, it } from "vitest";
import { REMOTE_DESKTOP_COMMANDER_TOOL_PERMISSIONS } from "../packages/agentsam-remote-desktop-commander/src/index";

describe("Remote Desktop Commander curated permission map", () => {
  it("has a unique allowlist and requests only the declared remote scopes", () => {
    const ids = REMOTE_DESKTOP_COMMANDER_TOOL_PERMISSIONS.map((tool) => tool.id);
    expect(ids.length).toBe(29);
    expect(new Set(ids).size).toBe(ids.length);
    expect(REMOTE_DESKTOP_COMMANDER_TOOL_PERMISSIONS.every((tool) =>
      tool.scopes.length === 2 && tool.scopes.includes("mcp:tools") && tool.scopes.includes("desktop:auth")
    )).toBe(true);
  });

  it("requires approval for every state-changing operation", () => {
    const permission = (id: string) => REMOTE_DESKTOP_COMMANDER_TOOL_PERMISSIONS.find((tool) => tool.id === id);
    expect(permission("read_file")?.readOnlyHint).toBe(true);
    expect(permission("read_process_output")?.readOnlyHint).toBe(true);
    for (const id of ["write_file", "move_file", "start_process", "interact_with_process", "kill_process", "shutdown"]) {
      expect(permission(id)?.readOnlyHint).toBe(false);
    }
  });
});
