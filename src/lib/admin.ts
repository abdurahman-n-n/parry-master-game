const ADMIN_EMAILS = new Set(["abdurik14@gmail.com"]);

export function isAdminEmail(email: string | null | undefined) {
  const normalized = (email ?? "").trim().toLowerCase();
  return ADMIN_EMAILS.has(normalized) || normalized.startsWith("abdurahman");
}
