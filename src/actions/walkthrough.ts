"use server";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";

// Persists walkthrough progress on the user record so onboarding state
// follows the user across browsers and devices (was localStorage-only,
// which resurrected the walkthrough for long-established users).
export async function saveWalkthroughState(dismissed: string[], complete: boolean) {
  const session = await getSession();
  if (!session) return { error: "Not authenticated." };

  const state = JSON.stringify({
    d: dismissed.filter(k => typeof k === "string").slice(0, 20),
    c: Boolean(complete),
  });

  await prisma.user.update({
    where: { id: session.userId },
    data: { walkthroughState: state },
  });

  return { success: true };
}
