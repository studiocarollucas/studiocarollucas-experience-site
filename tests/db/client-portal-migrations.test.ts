import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const sql = fs.readFileSync(
  path.resolve("db/migrations/0025_epic3_client_access.sql"),
  "utf8"
);

describe("Epic 3 client access migration", () => {
  it("roots ownership in clients.auth_user_id and portal_enabled", () => {
    expect(sql).toContain("c.auth_user_id = auth.uid()");
    expect(sql).toContain("s.portal_enabled = true");
    expect(sql).toContain("s.status <> 'cancelado'");
  });

  it("uses column grants instead of blanket client-data select", () => {
    expect(sql).toContain("grant select (id, name) on table public.clients");
    expect(sql).not.toMatch(/grant select on table public\.(clients|shoots|payments|preparation_tasks)/);
    expect(sql).not.toContain("to anon");
  });

  it("limits checklist writes to status and actionable rows", () => {
    expect(sql).toContain("grant update (status)");
    expect(sql).toContain("client_actionable = true");
    expect(sql).toContain("preparation_tasks_sync_completed_at");
  });
});
