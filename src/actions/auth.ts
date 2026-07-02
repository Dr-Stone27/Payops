"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { createSession, setSessionCookie, clearSession } from "@/lib/session";
import { log } from "@/lib/audit";

function cuid() {
  return crypto.randomUUID();
}

export async function register(formData: FormData) {
  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const businessName = String(formData.get("businessName") ?? "").trim();
  const cacNumber = String(formData.get("cacNumber") ?? "").trim();

  if (!fullName || !email || !password || !businessName || !cacNumber) {
    return { error: "All fields are required." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with this email already exists." };

  const existingBusiness = await prisma.business.findUnique({ where: { cacNumber } });
  if (existingBusiness) return { error: "A business with this CAC number is already registered." };

  const passwordHash = await bcrypt.hash(password, 10);
  const businessId = cuid();
  const userId = cuid();

  const business = await prisma.business.create({
    data: {
      id: businessId,
      name: businessName,
      cacNumber,
      status: "active",
    },
  });

  const user = await prisma.user.create({
    data: {
      id: userId,
      businessId: business.id,
      fullName,
      email,
      passwordHash,
      role: "owner",
    },
  });

  const sessionId = cuid();
  const token = await createSession({
    sessionId,
    userId: user.id,
    businessId: business.id,
    role: user.role,
    email: user.email,
    fullName: user.fullName,
  });

  await setSessionCookie(token);
  await log({
    businessId: business.id,
    userId: user.id,
    action: "REGISTER",
    outcome: "success",
  });

  redirect("/setup-pin");
}

export async function login(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  let user;
  try {
    user = await prisma.user.findUnique({ where: { email } });
  } catch (e) {
    console.error("[login] DB lookup error:", e);
    return { error: "Database error — please try again in a moment." };
  }

  if (!user) return { error: "Invalid email or password." };

  let passwordMatch = false;
  try {
    passwordMatch = await bcrypt.compare(password, user.passwordHash);
  } catch (e) {
    console.error("[login] bcrypt error:", e);
    return { error: "Authentication error — please try again." };
  }
  if (!passwordMatch) return { error: "Invalid email or password." };

  try {
    const sessionId = cuid();
    const token = await createSession({
      sessionId,
      userId: user.id,
      businessId: user.businessId,
      role: user.role,
      email: user.email,
      fullName: user.fullName,
    });
    await setSessionCookie(token);
  } catch (e) {
    console.error("[login] Session creation error:", e);
    return { error: "Failed to create session — please try again." };
  }

  // Non-fatal: don't let audit log failure block login
  try {
    await log({ businessId: user.businessId, userId: user.id, action: "LOGIN", outcome: "success" });
  } catch (e) {
    console.error("[login] Audit log error:", e);
  }

  const needsPin = (user.role === "owner" || user.role === "admin") && !user.pinHash;
  return { success: true, needsPin };
}

export async function logout() {
  await clearSession();
  redirect("/login");
}

export async function inviteTeamMember(formData: FormData) {
  const { getSession } = await import("@/lib/session");
  const session = await getSession();
  if (!session) return { error: "Not authenticated." };
  if (!["owner", "admin"].includes(session.role)) {
    return { error: "Only Owners and Admins can invite team members." };
  }

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const role = String(formData.get("role") ?? "");

  if (!fullName || !email || !password || !role) {
    return { error: "All fields are required." };
  }
  if (!["admin", "maker"].includes(role)) {
    return { error: "Invalid role. Choose Admin (Checker) or Maker." };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "An account with this email already exists." };

  const passwordHash = await bcrypt.hash(password, 10);
  const userId = cuid();

  const user = await prisma.user.create({
    data: {
      id: userId,
      businessId: session.businessId,
      fullName,
      email,
      passwordHash,
      role,
    },
  });

  await log({
    businessId: session.businessId,
    userId: session.userId,
    action: "TEAM_MEMBER_INVITED",
    detail: `${fullName} (${email}) added as ${role}`,
    outcome: "success",
  });

  redirect("/team");
}

export async function setupPin(formData: FormData) {
  const { getSession } = await import("@/lib/session");
  const session = await getSession();
  if (!session) return { error: "Not authenticated." };

  const pin = String(formData.get("pin") ?? "");
  const confirmPin = String(formData.get("confirmPin") ?? "");

  if (!/^\d{4}$/.test(pin)) return { error: "PIN must be exactly 4 digits." };
  if (pin !== confirmPin) return { error: "Those PINs don't match. Try again." };
  const { COMMON_PINS } = await import("@/lib/walkthrough");
  if (COMMON_PINS.has(pin)) return { error: "That PIN is too easy to guess. Choose something less predictable." };

  const pinHash = await bcrypt.hash(pin, 10);
  await prisma.user.update({
    where: { id: session.userId },
    data: { pinHash },
  });

  await log({
    businessId: session.businessId,
    userId: session.userId,
    action: "PIN_SETUP",
    outcome: "success",
  });

  redirect("/dashboard");
}
