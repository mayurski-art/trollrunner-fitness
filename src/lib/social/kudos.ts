import { getClient } from "@/lib/accounts/client";

export type KudosInfo = { count: number; givenByMe: boolean };

export async function getKudosInfo(
  activityIds: string[],
  currentUserId: string
): Promise<Map<string, KudosInfo>> {
  const map = new Map<string, KudosInfo>();
  if (!activityIds.length) return map;
  const sb = getClient();
  const { data, error } = await sb
    .from("fit_kudos")
    .select("activity_id, user_id")
    .in("activity_id", activityIds);
  if (error) throw error;
  for (const row of data || []) {
    const entry = map.get(row.activity_id) || { count: 0, givenByMe: false };
    entry.count += 1;
    if (row.user_id === currentUserId) entry.givenByMe = true;
    map.set(row.activity_id, entry);
  }
  return map;
}

export async function giveKudos(activityId: string, userId: string) {
  const sb = getClient();
  const { error } = await sb.from("fit_kudos").insert({ activity_id: activityId, user_id: userId });
  if (error) throw error;
}

export async function removeKudos(activityId: string, userId: string) {
  const sb = getClient();
  const { error } = await sb
    .from("fit_kudos")
    .delete()
    .eq("activity_id", activityId)
    .eq("user_id", userId);
  if (error) throw error;
}
