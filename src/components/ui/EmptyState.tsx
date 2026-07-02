import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface Props {
  icon: LucideIcon;
  title: string;
  body: string;
  ctaLabel?: string;
  ctaHref?: string;
  tone?: "neutral" | "positive";
}

// Standard empty state: icon in a soft disc, title, one-line guidance,
// optional single CTA. Positive tone = "queue is clear" (good news).
export function EmptyState({ icon: Icon, title, body, ctaLabel, ctaHref, tone = "neutral" }: Props) {
  const disc = tone === "positive" ? { bg: "#e6faf4", fg: "#0e7a5a" } : { bg: "#f1f3f5", fg: "#8a97a6" };
  return (
    <div style={{ padding: "56px 24px", textAlign: "center" }}>
      <div style={{ width: 44, height: 44, borderRadius: "50%", background: disc.bg, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
        <Icon size={19} color={disc.fg} strokeWidth={2} />
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, color: "#3f4d5a" }}>{title}</div>
      <div style={{ fontSize: 12.5, color: "#98a3b0", margin: "6px auto 0", maxWidth: 400, lineHeight: 1.55 }}>{body}</div>
      {ctaLabel && ctaHref && (
        <Link href={ctaHref} className="wt-btn"
          style={{ fontSize: 12.5, fontWeight: 600, color: "#fff", background: "#0e7a5a", borderRadius: 9, padding: "9px 16px", textDecoration: "none", display: "inline-block", marginTop: 16 }}>
          {ctaLabel}
        </Link>
      )}
    </div>
  );
}
