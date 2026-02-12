import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/helpers";
import { AppShell } from "@/components/layout/app-shell";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await getCurrentUser();

  // If no profile yet, the middleware handles redirect to onboarding.
  // This is a safety fallback for RSC.
  if (!currentUser) {
    redirect("/login");
  }

  return (
    <AppShell
      user={currentUser.profile}
      tenantId={currentUser.profile.tenant_id}
    >
      {children}
    </AppShell>
  );
}
