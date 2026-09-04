import { getClient } from "@/lib/accounts/client";
import type { Activity } from "@/lib/activities/types";
import { listFollowingIds } from "./follows";
import type { SocialProfile } from "./types";

export type FeedActivity = Activity & { owner: SocialProfile };

type ActivityRow = {
  id: string;
  user_id: string;
  type: Activity["type"];
  title: string;
  notes: string;
  occurred_at: string;
  distance_mi: number | null;
  duration_sec: number | null;
  elevation_ft: number | null;
  effort: number | null;
  fit_strength_sets: { exercise: string; weight_lb: number | null; reps: number | null }[];
};

export async function getFriendsFeed(userId: string, limit = 20): Promise<FeedActivity[]> {
  const followingIds = await listFollowingIds(userId);
  if (!followingIds.length) return [];

  const sb = getClient();
  const { data, error } = await sb
    .from("fit_activities")
    .select(
      "id, user_id, type, title, notes, occurred_at, distance_mi, duration_sec, elevation_ft, effort, fit_strength_sets(exercise, weight_lb, reps)"
    )
    .in("user_id", followingIds)
    .eq("source", "native")
    .order("occurred_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const rows = (data as unknown as ActivityRow[]) || [];
  if (!rows.length) return [];

  const ownerIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: profiles } = await sb
    .from("troll_profiles")
    .select("id, username, avatar_url")
    .in("id", ownerIds);
  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, { id: p.id, username: p.username, avatarUrl: p.avatar_url }])
  );

  return rows.map((row) => ({
    id: row.id,
    type: row.type,
    title: row.title,
    notes: row.notes,
    occurredAt: row.occurred_at,
    distanceMi: row.distance_mi,
    durationSec: row.duration_sec,
    elevationFt: row.elevation_ft,
    effort: row.effort,
    // Not selected above and always null here on purpose: heart rate is
    // personal training data, not something a friend's feed card shows.
    avgHeartRate: null,
    sets: row.fit_strength_sets || [],
    owner: profileMap.get(row.user_id) || { id: row.user_id, username: "runner", avatarUrl: null },
  }));
}
