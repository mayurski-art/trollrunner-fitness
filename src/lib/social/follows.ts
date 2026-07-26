import { getClient } from "@/lib/accounts/client";
import type { SocialProfile } from "./types";

async function profilesFor(ids: string[]): Promise<SocialProfile[]> {
  if (!ids.length) return [];
  const sb = getClient();
  const { data, error } = await sb
    .from("troll_profiles")
    .select("id, username, avatar_url")
    .in("id", ids);
  if (error) throw error;
  return (data || []).map((p) => ({ id: p.id, username: p.username, avatarUrl: p.avatar_url }));
}

export async function listFollowingIds(userId: string): Promise<string[]> {
  const sb = getClient();
  const { data, error } = await sb
    .from("fit_follows")
    .select("followed_id")
    .eq("follower_id", userId);
  if (error) throw error;
  return (data || []).map((r) => r.followed_id);
}

export async function listFollowing(userId: string): Promise<SocialProfile[]> {
  return profilesFor(await listFollowingIds(userId));
}

export async function listFollowers(userId: string): Promise<SocialProfile[]> {
  const sb = getClient();
  const { data, error } = await sb
    .from("fit_follows")
    .select("follower_id")
    .eq("followed_id", userId);
  if (error) throw error;
  return profilesFor((data || []).map((r) => r.follower_id));
}

export async function isFollowing(followerId: string, followedId: string): Promise<boolean> {
  const sb = getClient();
  const { data } = await sb
    .from("fit_follows")
    .select("follower_id")
    .eq("follower_id", followerId)
    .eq("followed_id", followedId)
    .maybeSingle();
  return Boolean(data);
}

export async function followUser(followerId: string, followedId: string) {
  const sb = getClient();
  const { error } = await sb
    .from("fit_follows")
    .insert({ follower_id: followerId, followed_id: followedId });
  if (error) throw error;
}

export async function unfollowUser(followerId: string, followedId: string) {
  const sb = getClient();
  const { error } = await sb
    .from("fit_follows")
    .delete()
    .eq("follower_id", followerId)
    .eq("followed_id", followedId);
  if (error) throw error;
}

export async function searchUsers(query: string, excludeUserId: string): Promise<SocialProfile[]> {
  const clean = query.trim();
  if (!clean) return [];
  const sb = getClient();
  const { data, error } = await sb
    .from("troll_profiles")
    .select("id, username, avatar_url")
    .ilike("username", `%${clean}%`)
    .neq("id", excludeUserId)
    .limit(10);
  if (error) throw error;
  return (data || []).map((p) => ({ id: p.id, username: p.username, avatarUrl: p.avatar_url }));
}
