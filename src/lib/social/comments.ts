import { getClient } from "@/lib/accounts/client";
import type { SocialProfile } from "./types";

export type Comment = {
  id: string;
  body: string;
  createdAt: string;
  author: SocialProfile;
};

export async function listComments(activityId: string): Promise<Comment[]> {
  const sb = getClient();
  const { data, error } = await sb
    .from("fit_comments")
    .select("id, body, created_at, user_id")
    .eq("activity_id", activityId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  const rows = data || [];
  if (!rows.length) return [];

  const authorIds = Array.from(new Set(rows.map((r) => r.user_id)));
  const { data: profiles } = await sb
    .from("troll_profiles")
    .select("id, username, avatar_url")
    .in("id", authorIds);
  const profileMap = new Map(
    (profiles || []).map((p) => [p.id, { id: p.id, username: p.username, avatarUrl: p.avatar_url }])
  );

  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    createdAt: r.created_at,
    author: profileMap.get(r.user_id) || { id: r.user_id, username: "runner", avatarUrl: null },
  }));
}

export async function addComment(activityId: string, userId: string, body: string) {
  const trimmed = body.trim();
  if (!trimmed) return;
  const sb = getClient();
  const { error } = await sb
    .from("fit_comments")
    .insert({ activity_id: activityId, user_id: userId, body: trimmed.slice(0, 500) });
  if (error) throw error;
}
