const AVATAR_PALETTE = [
  { bg: "#ecf6f1", fg: "#0e7a5a" },
  { bg: "#e6edf5", fg: "#1d3d5c" },
  { bg: "#f0edfb", fg: "#6b4fc8" },
  { bg: "#fef3ea", fg: "#c35c16" },
  { bg: "#e6f0fd", fg: "#1d5da4" },
  { bg: "#fdeef0", fg: "#b3261e" },
];

export function avatarColor(name: string) {
  const hash = [...name].reduce((a, c) => a + c.charCodeAt(0), 0);
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

export function getInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

export const STATUS_BADGE: Record<string, { bg: string; fg: string; dot: string; label: string }> = {
  pending_approval:  { bg: "#fcf7e6", fg: "#8a6510", dot: "#d4a41a", label: "Pending" },
  compliance_review: { bg: "#fdeee2", fg: "#9a4513", dot: "#e07235", label: "Compliance" },
  processing:        { bg: "#e6f0fd", fg: "#1d5da4", dot: "#3b82f6", label: "Processing" },
  settled:           { bg: "#e6faf4", fg: "#1a6b52", dot: "#10b981", label: "Settled" },
  reconciled:        { bg: "#e6faf4", fg: "#1a6b52", dot: "#0e7a5a", label: "Reconciled" },
  exception_queue:   { bg: "#fdeceb", fg: "#a32820", dot: "#dc4338", label: "Exception" },
  cancelled:         { bg: "#f5f6f8", fg: "#6b7785", dot: "#9aa6b2", label: "Cancelled" },
};

export const KYB_BADGE: Record<string, { bg: string; fg: string; dot: string; label: string }> = {
  approved:             { bg: "#e6faf4", fg: "#1a6b52", dot: "#0e7a5a", label: "Approved" },
  needs_review:         { bg: "#fcf7e6", fg: "#8a6510", dot: "#d4a41a", label: "Needs Review" },
  verification_pending: { bg: "#f5f6f8", fg: "#6b7785", dot: "#9aa6b2", label: "Pending" },
};

export function kybColor(score: number | null): string {
  if (score == null) return "#9aa6b2";
  if (score >= 0.85) return "#0e7a5a";
  if (score >= 0.70) return "#d4a41a";
  return "#dc4338";
}

export function roleLabel(role: string): string {
  if (role === "owner") return "Owner · Checker";
  if (role === "admin") return "Admin · Checker";
  if (role === "maker") return "Maker";
  return role;
}

export function roleFg(role: string): string {
  if (role === "owner" || role === "admin") return "#0e7a5a";
  if (role === "maker") return "#1d5da4";
  return "#6b7785";
}
