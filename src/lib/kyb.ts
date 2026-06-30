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

// Simulates CAC + NUBAN lookup for demo. fixedScore bypasses Jaro-Winkler for
// seeded NUBANs — avoids normalization stripping suffixes and changing the outcome.
export function simulateKybLookup(
  legalName: string,
  nuban: string
): { cacName: string; nubanName: string; fixedScore?: number } {
  const seed = nuban.slice(-4);
  const scenarios: Record<string, { cacName: string; nubanName: string; fixedScore?: number }> = {
    "1234": { cacName: legalName, nubanName: legalName, fixedScore: 1.0 },
    "5678": { cacName: legalName, nubanName: legalName + " GLOBAL ASSOCIATES", fixedScore: 0.78 },
    "9999": { cacName: legalName, nubanName: "DIFFERENT COMPANY NAME LTD", fixedScore: 0.42 },
    "0000": { cacName: legalName, nubanName: legalName, fixedScore: 1.0 },
  };
  return scenarios[seed] ?? { cacName: legalName, nubanName: legalName };
}
