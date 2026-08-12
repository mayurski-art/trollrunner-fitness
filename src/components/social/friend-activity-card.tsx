"use client";

import { useState } from "react";
import { activityIcon, activityStats, activityWhen, EFFORT_EMOJI } from "@/components/activities/activity-card";
import type { FeedActivity } from "@/lib/social/feed";
import { giveKudos, removeKudos, type KudosInfo } from "@/lib/social/kudos";
import { addComment, listComments, type Comment } from "@/lib/social/comments";

export function FriendActivityCard({
  activity,
  kudos,
  currentUserId,
}: {
  activity: FeedActivity;
  kudos: KudosInfo | undefined;
  currentUserId: string;
}) {
  const [given, setGiven] = useState(kudos?.givenByMe ?? false);
  const [count, setCount] = useState(kudos?.count ?? 0);
  const [showComments, setShowComments] = useState(false);
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [newComment, setNewComment] = useState("");
  const [busy, setBusy] = useState(false);

  const stats = activityStats(activity);

  async function toggleKudos() {
    setBusy(true);
    try {
      if (given) {
        await removeKudos(activity.id, currentUserId);
        setGiven(false);
        setCount((c) => Math.max(0, c - 1));
      } else {
        await giveKudos(activity.id, currentUserId);
        setGiven(true);
        setCount((c) => c + 1);
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleComments() {
    const next = !showComments;
    setShowComments(next);
    if (next && comments === null) {
      setComments(await listComments(activity.id));
    }
  }

  async function handleAddComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    await addComment(activity.id, currentUserId, newComment);
    setNewComment("");
    setComments(await listComments(activity.id));
  }

  return (
    <article className="card rounded-2xl p-4">
      <div className="flex gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-raised text-lg">
          {activity.owner.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={activity.owner.avatarUrl} alt="" className="h-full w-full rounded-full object-cover" />
          ) : (
            <span className="font-bold">{activity.owner.username.charAt(0).toUpperCase()}</span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <p className="truncate text-sm">
              <span className="font-semibold">{activity.owner.username}</span>
              <span className="text-muted"> · {activityIcon(activity)} {activity.title}</span>
              {activity.effort && (
                <span className="ml-1.5" title={`Effort ${activity.effort}/10`}>
                  {EFFORT_EMOJI[activity.effort]}
                </span>
              )}
            </p>
            <p className="shrink-0 text-xs text-muted">{activityWhen(activity)}</p>
          </div>
          {stats.length > 0 && (
            <p className="mt-0.5 font-mono text-sm text-muted">{stats.join(" · ")}</p>
          )}
          {activity.notes && <p className="mt-1 text-sm text-muted">{activity.notes}</p>}

          <div className="mt-2 flex items-center gap-4">
            <button
              type="button"
              onClick={() => void toggleKudos()}
              disabled={busy}
              className={`flex items-center gap-1 text-xs font-medium transition-colors ${
                given ? "text-brand" : "text-muted hover:text-foreground"
              }`}
            >
              {given ? "🔥" : "👊"} {count > 0 ? count : "Kudos"}
            </button>
            <button
              type="button"
              onClick={() => void toggleComments()}
              className="text-xs font-medium text-muted transition-colors hover:text-foreground"
            >
              💬 {comments?.length ? `${comments.length} comments` : "Comment"}
            </button>
          </div>

          {showComments && (
            <div className="mt-3 space-y-2 border-t border-line pt-3">
              {comments === null ? (
                <p className="text-xs text-muted">Loading…</p>
              ) : (
                comments.map((c) => (
                  <p key={c.id} className="text-sm">
                    <span className="font-semibold">{c.author.username}</span>{" "}
                    <span className="text-muted">{c.body}</span>
                  </p>
                ))
              )}
              <form onSubmit={(e) => void handleAddComment(e)} className="flex gap-2">
                <input
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment…"
                  className="flex-1 rounded-full border border-line bg-raised px-3 py-1.5 text-sm outline-none focus:border-brand"
                />
                <button
                  type="submit"
                  className="rounded-full bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-strong"
                >
                  Post
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </article>
  );
}
