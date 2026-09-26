import { normalizePlan, type PlanId } from "@/shared/billing/plans";

export type SocialAuthFlow = "login" | "register";

export function getGoogleAuthRedirects(flow: SocialAuthFlow, selectedPlan?: PlanId) {
  const plan = normalizePlan(selectedPlan);
  const registerPath = `/register?plan=${plan}`;

  return {
    callbackURL: "/auth/continue",
    newUserCallbackURL: `/onboarding?plan=${flow === "register" ? plan : "tumbuh"}`,
    errorCallbackURL: flow === "register" ? `${registerPath}&oauth=error` : "/login?oauth=error",
  };
}
