"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { getStepsForRole, getTotalStepsLabel, type WalkthroughStep } from "@/lib/walkthrough";

interface WalkthroughContextValue {
  dismissStep: (key: string) => void;
  completeWalkthrough: () => void;
  isComplete: boolean;
  activeStep: WalkthroughStep | null;
  stepNumber: number;
  totalSteps: number;
  hasApprovedVendor: boolean;
  hasPayments: boolean;
  hasTeamMember: boolean;
  role: string;
}

const WalkthroughContext = createContext<WalkthroughContextValue | null>(null);

export function useWalkthrough() {
  const ctx = useContext(WalkthroughContext);
  if (!ctx) throw new Error("useWalkthrough must be used inside WalkthroughProvider");
  return ctx;
}

interface Props {
  userId: string;
  role: string;
  hasApprovedVendor: boolean;
  hasPayments: boolean;
  hasTeamMember: boolean;
  children: React.ReactNode;
}

export function WalkthroughProvider({ userId, role, hasApprovedVendor, hasPayments, hasTeamMember, children }: Props) {
  const storageKey = `wt_wt_${userId}`;
  const steps = getStepsForRole(role);
  const totalSteps = getTotalStepsLabel(role);
  const pathname = usePathname();

  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [isComplete, setIsComplete] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const { d, c } = JSON.parse(raw);
        setDismissed(new Set(d ?? []));
        setIsComplete(c ?? false);
      }
    } catch {}
    setHydrated(true);
  }, [storageKey]);

  const persist = useCallback((d: Set<string>, c: boolean) => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ d: [...d], c }));
    } catch {}
  }, [storageKey]);

  const dismissStep = useCallback((key: string) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(key);
      persist(next, isComplete);
      return next;
    });
  }, [isComplete, persist]);

  const completeWalkthrough = useCallback(() => {
    setIsComplete(true);
    setDismissed(prev => { persist(prev, true); return prev; });
  }, [persist]);

  const activeStep = hydrated && !isComplete
    ? steps.find(step => {
        if (dismissed.has(step.key)) return false;
        if (!step.paths.includes(pathname)) return false;
        if (step.condition === "after-vendor" && !hasApprovedVendor) return false;
        if (step.condition === "after-payment" && !hasPayments) return false;
        return true;
      }) ?? null
    : null;

  // Step number = 1 + count of dismissed steps
  const stepNumber = Math.min(dismissed.size + 1, totalSteps);

  return (
    <WalkthroughContext.Provider value={{
      dismissStep, completeWalkthrough, isComplete,
      activeStep, stepNumber, totalSteps,
      hasApprovedVendor, hasPayments, hasTeamMember, role,
    }}>
      {children}
    </WalkthroughContext.Provider>
  );
}
