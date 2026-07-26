import { getClient } from "@/lib/accounts/client";
import { listFollowingIds } from "./follows";
import type { SocialProfile } from "./types";

export type LeaderboardRow = SocialProfile & { mileage: number; isMe: boolean };

function startOfWeek(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay());
  return d;
}

/** This week's running mileage among you and the people you follow. */
export async function weeklyLeaderboard(userId: string): Promise<LeaderboardRow[]> {
  const followingIds = await listFollowingIds(userId);
  const userIds = Array.from(new Set([userId, ...followingIds]));

  const sb = getClient();
  const { data, error } = await sb
    .from("fit_activities")
    .select("user_id, distance_mi")
    .in("user_id", userIds)
    .eq("type", "run")
    .eq("source", "native")
    .gte("occurred_at", startOfWeek().toISOString());
  if (error) throw error;

  const mileageByUser = new Map<string, number>();
  for (const row of data || []) {
    mileageByUser.set(row.user_id, (mileageByUser.get(row.user_id) || 0) + (row.distance_mi || 0));
  }

  const { data: profiles } = await sb
    .from("troll_profiles")
    .select("id, username, avatar_url")
    .in("id", userIds);

  return (profiles || [])
    .map((p) => ({
      id: p.id,
      username: p.username,
      avatarUrl: p.avatar_url,
      mileage: Math.round((mileageByUser.get(p.id) || 0) * 10) / 10,
      isMe: p.id === userId,
    }))
    .sort((a, b) => b.mileage - a.mileage);
}
