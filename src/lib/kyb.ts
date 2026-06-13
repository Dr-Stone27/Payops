import { jaroWinkler } from "@skyra/jaro-winkler";
import * as crypto from "crypto";

const LEGAL_SUFFIXES = [" LTD", " LIMITED", " CO", " NIG", " NIGERIA", " INT'L", " INTERNATIONAL", " PLC", " INC"];

function normalizeName(name: string): string {
  let n = name.toUpperCase().trim();
  for (const suffix of LEGAL_SUFFIXES) {
    if (n.endsWith(suffix)) {
      n = n.slice(0, -suffix.length).trim();
      break;
    }
  }
  return n.replace(/\s+/g, " ");
}

export function computeJaroWinkler(nameA: string, nameB: string): number {
  return jaroWinkler(normalizeName(nameA), normalizeName(nameB));
}

export type KybDecision = "approved" | "needs_review";
export type AmbiguousFlag = "AMBIGUOUS_MATCH" | null;

export function getKybDecision(score: number): { status: KybDecision; ambiguous: AmbiguousFlag } {
  if (score >= 0.85) return { status: "approved", ambiguous: null };
  if (score >= 0.7) return { status: "needs_review", ambiguous: "AMBIGUOUS_MATCH" };
  return { status: "needs_review", ambiguous: null };
}

export function hashNuban(nuban: string): string {
  return crypto
    .createHmac("sha256", process.env.NUBAN_SECRET || "nuban-dev-secret")
    .update(nuban)
    .digest("hex");
}

export function encryptNuban(nuban: string): string {
  const key = crypto.scryptSync(process.env.NUBAN_SECRET || "nuban-dev-secret", "salt", 32);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(nuban, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;
}

// Simulates CAC + NUBAN lookup for demo — returns plausible names
export function simulateKybLookup(
  legalName: string,
  nuban: string
): { cacName: string; nubanName: string } {
  const seed = nuban.slice(-4);
  // Deterministic simulation: same last 4 digits always returns same result
  const scenarios: Record<string, { cacName: string; nubanName: string }> = {
    "1234": { cacName: legalName, nubanName: legalName },
    "5678": { cacName: legalName, nubanName: legalName.toUpperCase() + " LIMITED" },
    "9999": { cacName: legalName, nubanName: "DIFFERENT COMPANY NAME LTD" },
    "0000": { cacName: legalName, nubanName: legalName },
  };
  return scenarios[seed] ?? { cacName: legalName, nubanName: legalName };
}
