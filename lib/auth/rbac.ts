import type { CurrentUser, Role } from "@/lib/auth/session";

const ROLE_RANK: Record<Role, number> = {
  client: 0,
  staff: 1,
  admin: 2,
};

export function hasMinimumRole(role: Role, minimum: Role): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimum];
}

export function requireRole(user: CurrentUser | null, minimum: Role): CurrentUser {
  if (!user || !hasMinimumRole(user.role, minimum)) {
    throw new Error(`Forbidden: requires role >= ${minimum}`);
  }
  return user;
}
