"use client";

import { useState } from "react";

export function InfoTooltip({ content, wide }: { content: string; wide?: boolean }) {
  const [show, setShow] = useState(false);

  return (
    <span
      style={{ position: "relative", display: "inline-flex", alignItems: "center", flexShrink: 0 }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      <span style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        width: 15, height: 15, borderRadius: "50%", background: "#e8eaed",
        color: "#6b7785", fontSize: 9.5, fontWeight: 700, cursor: "help",
        userSelect: "none", lineHeight: 1,
      }}>?</span>

      {show && (
        <span style={{
          position: "absolute", bottom: "calc(100% + 8px)", left: "50%",
          transform: "translateX(-50%)", zIndex: 100,
          background: "#0c1d2e", color: "#d8eae4",
          fontSize: 11.5, lineHeight: 1.55, fontWeight: 400,
          padding: "9px 13px", borderRadius: 9,
          width: wide ? 280 : 220, boxShadow: "0 8px 24px rgba(0,0,0,.22)",
          pointerEvents: "none", whiteSpace: "normal",
        }}>
          {content}
          <span style={{
            position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderTop: "5px solid #0c1d2e",
          }} />
        </span>
      )}
    </span>
  );
}
