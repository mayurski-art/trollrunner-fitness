import { getClient } from "@/lib/accounts/client";

export async function getHumorEnabled(userId: string): Promise<boolean> {
  const sb = getClient();
  const { data } = await sb
    .from("fit_profiles")
    .select("humor_enabled")
    .eq("user_id", userId)
    .maybeSingle();
  return data?.humor_enabled ?? true;
}

export async function setHumorEnabled(userId: string, enabled: boolean) {
  const sb = getClient();
  const { error } = await sb
    .from("fit_profiles")
    .upsert({ user_id: userId, humor_enabled: enabled }, { onConflict: "user_id" });
  if (error) throw error;
}
