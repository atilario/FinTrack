import { getCurrentUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import { OnboardingForm } from "./OnboardingForm";

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  if (user.hasCompletedOnboarding) {
    redirect("/");
  }

  return <OnboardingForm user={user} />;
}
