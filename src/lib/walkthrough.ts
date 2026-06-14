export interface WalkthroughStep {
  key: string;
  paths: string[];
  title: string;
  body: string;
  cta?: string;
  ctaHref?: string;
  skipLabel?: string;
  type?: "banner" | "modal";
  condition?: "after-vendor" | "after-payment";
}

export const OWNER_STEPS: WalkthroughStep[] = [
  {
    key: "owner-w1",
    paths: ["/dashboard"],
    title: "Welcome to Watchtower",
    body: "Everything your finance team does — verifying vendors, approving payments, tracking settlements — happens here. You'll always know what's been paid, who approved it, and whether it arrived. Let's get you set up. It takes about 5 minutes.",
    cta: "Let's go →",
    skipLabel: "Skip intro",
    type: "banner",
  },
  {
    key: "owner-w2",
    paths: ["/team", "/team/new"],
    title: "Add your approver",
    body: "Watchtower requires two people for every payment — one to create it, one to approve it. You cannot approve payments you created yourself. This is maker-checker control, and it protects your business from single-person payment errors. Invite the person who will approve payments.",
    cta: "Invite a teammate →",
    ctaHref: "/team/new",
    skipLabel: "Do this later",
    type: "banner",
  },
  {
    key: "owner-w3",
    paths: ["/vendors", "/vendors/new"],
    title: "Add your first vendor",
    body: "Before you can pay anyone, Watchtower checks that their registered business name matches their bank account name. This stops payments going to the wrong account — one of the most common causes of vendor fraud. You'll need the vendor's CAC number and their 10-digit bank account number.",
    cta: "Add your first vendor →",
    ctaHref: "/vendors/new",
    skipLabel: "Do this later",
    type: "banner",
  },
  {
    key: "owner-w4",
    paths: ["/payments", "/payments/new"],
    title: "Create a payment request",
    body: "A payment request is how a payment starts in Watchtower. You attach the invoice, enter the amount, and send it to your approver. Nothing moves until they confirm with their PIN.",
    cta: "Create your first request →",
    ctaHref: "/payments/new",
    skipLabel: "Do this later",
    type: "banner",
    condition: "after-vendor",
  },
  {
    key: "owner-w5",
    paths: ["/dashboard"],
    title: "You're set up.",
    body: "Your first payment request is with your approver. Once they review it and enter their PIN, the payment will be sent — and you'll see the status update here automatically. You can find a record of every action — every approval, every flag, every settlement — in the Audit Log. It's permanent and can't be edited.",
    cta: "Go to dashboard",
    type: "modal",
    condition: "after-payment",
  },
];

export const ADMIN_STEPS: WalkthroughStep[] = [
  {
    key: "admin-wa2",
    paths: ["/payments"],
    title: "This is where payments come to you",
    body: "When a Finance Maker creates a payment request, it lands here. You'll see the vendor, the amount, and the invoice. Your job is to check that everything matches before you approve. You cannot approve payments you created yourself, and if you reviewed a payment's compliance flag, a different approver must complete the approval.",
    cta: "See the approval queue →",
    ctaHref: "/payments?status=pending_approval",
    skipLabel: "Got it",
    type: "banner",
  },
  {
    key: "admin-wa3",
    paths: ["/payments"],
    title: "Ready to approve payments",
    body: "When a request comes in, review the vendor, the invoice, and the amount side by side. Enter your PIN to approve. Your PIN is your authorisation — it goes into the audit log with your name and the time.",
    skipLabel: "Dismiss",
    type: "banner",
  },
];

export const MAKER_STEPS: WalkthroughStep[] = [
  {
    key: "maker-wm2",
    paths: ["/vendors", "/vendors/new"],
    title: "Vendors come first",
    body: "Before you can create a payment, the vendor needs to be verified. Watchtower checks every vendor's CAC registration against their bank account name. Only verified vendors appear in your payment requests. If you need to pay someone new, add them here first.",
    cta: "Add a vendor →",
    ctaHref: "/vendors/new",
    skipLabel: "Got it",
    type: "banner",
  },
  {
    key: "maker-wm3",
    paths: ["/payments", "/payments/new"],
    title: "Ready to create payment requests",
    body: "Once a vendor is verified, select them, attach the invoice, enter the amount, and submit. Your approver takes it from there. Nothing moves until they confirm with their PIN.",
    skipLabel: "Dismiss",
    type: "banner",
  },
];

export function getStepsForRole(role: string): WalkthroughStep[] {
  if (role === "owner") return OWNER_STEPS;
  if (role === "admin") return ADMIN_STEPS;
  if (role === "maker") return MAKER_STEPS;
  return [];
}

export function getTotalStepsLabel(role: string): number {
  if (role === "owner") return 5;
  return 3;
}

export const COMMON_PINS = new Set([
  "0000","1111","2222","3333","4444","5555","6666","7777","8888","9999",
  "1234","4321","2580","0852","1212","2121","0101","1010","1122","1313",
]);
