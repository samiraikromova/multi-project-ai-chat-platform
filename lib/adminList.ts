// lib/adminList.ts
export const ADMIN_EMAILS = [
  "samiraikromova2006@gmail.com",
]

export function isAdminEmail(email: string): boolean {
  return ADMIN_EMAILS.includes(email.toLowerCase())
}