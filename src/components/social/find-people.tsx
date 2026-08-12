"use client";

import { useEffect, useState } from "react";
import {
  followUser,
  listFollowers,
  listFollowing,
  searchUsers,
  unfollowUser,
} from "@/lib/social/follows";
import type { SocialProfile } from "@/lib/social/types";

export function FindPeople({ userId }: { userId: string }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SocialProfile[]>([]);
  const [following, setFollowing] = useState<SocialProfile[]>([]);
  const [followers, setFollowers] = useState<SocialProfile[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [busyId, setBusyId] = useState<string | null>(null);

  const [relationsVersion, setRelationsVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [followingList, followerList] = await Promise.all([
        listFollowing(userId),
        listFollowers(userId),
      ]);
      if (cancelled) return;
      setFollowing(followingList);
      setFollowers(followerList);
      setFollowingIds(new Set(followingList.map((p) => p.id)));
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, relationsVersion]);

  useEffect(() => {
    if (!query.trim()) return;
    let cancelled = false;
    const timeout = setTimeout(() => {
      void searchUsers(query, userId).then((r) => {
        if (!cancelled) setResults(r);
      });
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [query, userId]);

  const visibleResults = query.trim() ? results : [];

  async function toggleFollow(target: SocialProfile) {
    setBusyId(target.id);
    try {
      if (followingIds.has(target.id)) {
        await unfollowUser(userId, target.id);
      } else {
        await followUser(userId, target.id);
      }
      setRelationsVersion((v) => v + 1);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="card rounded-2xl p-4">
        <p className="text-xs font-medium text-muted">Find people</p>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by username…"
          className="mt-1.5 w-full rounded-xl border border-line bg-raised px-3.5 py-2.5 text-sm outline-none focus:border-brand"
        />
        {visibleResults.length > 0 && (
          <div className="mt-3 space-y-2">
            {visibleResults.map((p) => (
              <PersonRow
                key={p.id}
                person={p}
                isFollowing={followingIds.has(p.id)}
                busy={busyId === p.id}
                onToggle={() => void toggleFollow(p)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="card rounded-2xl p-4">
          <p className="text-xs font-medium text-muted">Following ({following.length})</p>
          <div className="mt-2 space-y-2">
            {following.length === 0 ? (
              <p className="text-sm text-muted">Not following anyone yet.</p>
            ) : (
              following.map((p) => (
                <PersonRow
                  key={p.id}
                  person={p}
                  isFollowing
                  busy={busyId === p.id}
                  onToggle={() => void toggleFollow(p)}
                />
              ))
            )}
          </div>
        </div>
        <div className="card rounded-2xl p-4">
          <p className="text-xs font-medium text-muted">Followers ({followers.length})</p>
          <div className="mt-2 space-y-2">
            {followers.length === 0 ? (
              <p className="text-sm text-muted">No followers yet.</p>
            ) : (
              followers.map((p) => (
                <PersonRow
                  key={p.id}
                  person={p}
                  isFollowing={followingIds.has(p.id)}
                  busy={busyId === p.id}
                  onToggle={() => void toggleFollow(p)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function PersonRow({
  person,
  isFollowing,
  busy,
  onToggle,
}: {
  person: SocialProfile;
  isFollowing: boolean;
  busy: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-sm">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-raised text-sm font-bold">
          {person.username.charAt(0).toUpperCase()}
        </span>
        {person.username}
      </span>
      <button
        type="button"
        onClick={onToggle}
        disabled={busy}
        className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
          isFollowing
            ? "border border-line text-muted hover:text-foreground"
            : "bg-brand text-white hover:bg-brand-strong"
        }`}
      >
        {isFollowing ? "Unfollow" : "Follow"}
      </button>
    </div>
  );
}
