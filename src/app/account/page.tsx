import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth/session";
import { AccountSettingsClient } from "@/components/auth/AccountSettingsClient";
import { getUserContentStats } from "@/lib/user-data/stats-server";

export const metadata: Metadata = {
  title: "账号设置",
};

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/auth/login?next=/account");
  }

  const contentStats = await getUserContentStats(user.id);

  return (
    <AccountSettingsClient
      initialUser={{
        email: user.email,
        displayName: user.displayName,
      }}
      contentStats={contentStats}
    />
  );
}
