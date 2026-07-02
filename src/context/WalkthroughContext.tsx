"use client";

import { createContext, useContext, useState, useCallback } from "react";
import { usePathname } from "next/navigation";
import { getStepsForRole, getTotalStepsLabel, type WalkthroughStep } from "@/lib/walkthrough";
import { saveWalkthroughState } from "@/actions/walkthrough";

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
  role: string;
  // Server-persisted state (User.walkthroughState), already parsed by the layout.
  initialDismissed: string[];
  initialComplete: boolean;
  hasApprovedVendor: boolean;
  hasPayments: boolean;
  hasTeamMember: boolean;
  children: React.ReactNode;
}

export function WalkthroughProvider({ role, initialDismissed, initialComplete, hasApprovedVendor, hasPayments, hasTeamMember, children }: Props) {
  const steps = getStepsForRole(role);
  const totalSteps = getTotalStepsLabel(role);
  const pathname = usePathname();

  const [dismissed, setDismissed] = useState<Set<string>>(new Set(initialDismissed));
  const [isComplete, setIsComplete] = useState(initialComplete);

  const dismissStep = useCallback((key: string) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(key);
      void saveWalkthroughState([...next], isComplete);
      return next;
    });
  }, [isComplete]);

  const completeWalkthrough = useCallback(() => {
    setIsComplete(true);
    setDismissed(prev => {
      void saveWalkthroughState([...prev], true);
      return prev;
    });
  }, []);

  const activeStep = !isComplete
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
