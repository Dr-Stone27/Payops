"use client";

import { useRouter } from "next/navigation";

// Makes an entire table row navigate on click (server-rendered cells are
// passed through as children). Inner links still work — they navigate to
// the same target before the row handler fires.
export function ClickableRow({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <tr
      className="wt-row-click"
      onClick={() => router.push(href)}
      style={{ borderTop: "1px solid #f1f3f5", cursor: "pointer" }}
    >
      {children}
    </tr>
  );
}
