import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth/session";
import { AccountSettingsClient } from "@/components/auth/AccountSettingsClient";

export const metadata: Metadata = {
  title: "账号设置",
};

export default async function AccountPage() {
  const user = await getSessionUser();
  if (!user) {
    redirect("/auth/login?next=/account");
  }

  return (
    <AccountSettingsClient
      initialUser={{
        email: user.email,
        displayName: user.displayName,
      }}
    />
  );
}
