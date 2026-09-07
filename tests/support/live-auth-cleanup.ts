type AuthUserLookup = {
  data: { user: { id: string } | null };
  error: { name: string; code?: string; status?: number } | null;
};

export function assertAuthUserAbsent(userId: string, result: AuthUserLookup): void {
  if (
    result.data.user === null &&
    result.error?.name === "AuthApiError" &&
    result.error?.code === "user_not_found" &&
    result.error.status === 404
  ) {
    return;
  }

  throw new Error(`Auth user cleanup could not be verified: ${userId}`, {
    cause:
      result.error ??
      new Error(result.data.user ? "Auth user still exists" : "Ambiguous Auth lookup response"),
  });
}
