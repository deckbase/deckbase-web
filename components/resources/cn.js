/** Join class names; skips null/undefined/false. */
export function cn(...parts) {
  return parts.filter(Boolean).join(" ");
}
