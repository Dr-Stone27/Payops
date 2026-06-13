import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";

const SECRET = new TextEncoder().encode(
  process.env.SESSION_SECRET || "payops-dev-secret-change-in-production"
);
const COOKIE = "payops_session";
const TTL_HOURS = 8;

export interface SessionPayload {
  sessionId: string;
  userId: string;
  businessId: string;
  role: string;
  email: string;
  fullName: string;
}

export async function createSession(payload: SessionPayload): Promise<string> {
  const expiresAt = new Date(Date.now() + TTL_HOURS * 60 * 60 * 1000);
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(`${TTL_HOURS}h`)
    .setIssuedAt()
    .sign(SECRET);

  await prisma.session.create({
    data: {
      id: payload.sessionId,
      userId: payload.userId,
      token,
      expiresAt,
    },
  });

  return token;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, SECRET);
    const session = await prisma.session.findUnique({
      where: { token },
    });
    if (!session || session.expiresAt < new Date()) return null;
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: TTL_HOURS * 60 * 60,
    path: "/",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE)?.value;
  if (token) {
    await prisma.session.deleteMany({ where: { token } }).catch(() => {});
    cookieStore.delete(COOKIE);
  }
}
