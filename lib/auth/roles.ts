/**
 * Role definitions and route-level authorization map.
 *
 * SUPER_ADMIN - full access, can invite ADMIN and STAFF
 * ADMIN       - full access, can only invite STAFF
 * STAFF       - dashboard access only, cannot invite anyone
 */
export type Role = "SUPER_ADMIN" | "ADMIN" | "STAFF";

export const ROLES: Role[] = ["SUPER_ADMIN", "ADMIN", "STAFF"];

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  STAFF: "Staff",
};

/**
 * Route prefixes mapped to the roles allowed to access them. Order matters:
 * more specific (longer) prefixes are matched first.
 */
export const ROUTE_ACCESS: Array<{ prefix: string; roles: Role[] }> = [
  { prefix: "/admin", roles: ["SUPER_ADMIN", "ADMIN"] },
  { prefix: "/", roles: ["SUPER_ADMIN", "ADMIN", "STAFF"] },
];

/** The default landing page for a given role once authenticated. */
export function defaultRouteForRole(role: Role): string {
  void role;
  return "/";
}

/** Returns the roles allowed for a given pathname, or null if unprotected. */
export function rolesForPath(pathname: string): Role[] | null {
  const match = ROUTE_ACCESS.find((entry) => pathname.startsWith(entry.prefix));
  return match ? match.roles : null;
}

export function canAccessPath(role: Role, pathname: string): boolean {
  const allowed = rolesForPath(pathname);
  if (!allowed) return true; // not a protected route
  return allowed.includes(role);
}

/** Roles a given role is allowed to invite via a registration link. */
export function invitableRolesFor(role: Role): Role[] {
  switch (role) {
    case "SUPER_ADMIN":
      return ["ADMIN", "STAFF"];
    case "ADMIN":
      return ["STAFF"];
    default:
      return [];
  }
}
