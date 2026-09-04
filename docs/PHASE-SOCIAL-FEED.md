# Phase 14 — Social feed (Strava-style)

Status: **design doc, not started.** Written for buy-in before any code, per
[feedback-design-doc-before-big-builds]. Extends the Phase 11 social layer
(`fit_follows`, `fit_kudos`, `fit_comments` — see `supabase/fit_social.sql`)
rather than replacing it.

## What exists today

- A friends feed on Home (`getFriendsFeed` in `src/lib/social/feed.ts`):
  activities from people you follow, native-only, newest first.
- Kudos (like) and threaded-flat comments per activity.
- Follow/unfollow via `FindPeople` on the You page.
- No photos anywhere in the app. No way to post without logging a workout.
- The feed is a section of Home, not its own surface.

## What this phase adds

1. **Photos on activities** — attach IRL pics when logging a run/lift;
   they render in the activity card, in the feed, and in kudos/comment view.
2. **Standalone posts** — text + optional photos, not tied to a workout.
   Strava calls these "club posts"; ours are just posts, visible to your
   followers like an activity card.
3. **A dedicated Feed tab** — pulled out of Home into its own nav slot,
   with infinite scroll instead of a capped `limit=20`.

## 1. Photos

### Storage
New public Supabase Storage bucket `fit-photos`, RLS-gated at the bucket
policy level (not signed URLs — simpler, and photos are already
follower-visible data once posted):
- INSERT: authenticated, path must start with `${auth.uid()}/`
- SELECT: public read (photos are only ever attached to something already
  gated by the existing native+follower policies — the bucket itself being
  public just avoids reissuing signed URLs on every feed render)
- DELETE: authenticated, own path only

Path convention: `fit-photos/{user_id}/{activity_or_post_id}/{uuid}.jpg`.
Client resizes/compresses before upload (max ~1600px long edge, JPEG ~80%)
so we're not storing multi-MB phone originals — this is a small hobby
project's Supabase plan, not Strava's CDN budget.

### Schema
```sql
create table public.fit_photos (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users(id) on delete cascade,
  activity_id  uuid references public.fit_activities(id) on delete cascade,
  post_id      uuid references public.fit_posts(id) on delete cascade,
  storage_path text not null,
  width        integer,
  height       integer,
  created_at   timestamptz not null default now(),
  check (
    (activity_id is not null and post_id is null) or
    (activity_id is null and post_id is not null)
  )
);
```
One photos table shared by activities and posts (via the mutually-exclusive
FK pair above) rather than two near-identical tables — the feed already has
to render "attachment" for both shapes anyway.

RLS mirrors `fit_comments`: read if you own the parent row, or the parent is
`native` + you follow its owner; write only your own; delete only your own.

### UI
- Log flow (`log-client.tsx`): add a photo picker (native `<input
  type="file" accept="image/*" multiple>`, capped at 4 photos) after the
  existing fields, before submit. Upload happens after the activity insert
  succeeds, so we have the `activity_id` to attach to — a failed upload
  never blocks or corrupts the logged workout, it just leaves a photo out.
- `activity-card.tsx` / `friend-activity-card.tsx`: a horizontal photo strip
  (thumbnails, tap to lightbox) under the stats row, only rendered when
  photos exist.

## 2. Standalone posts

### Schema
```sql
create table public.fit_posts (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  body        text not null check (char_length(body) between 1 and 2000),
  created_at  timestamptz not null default now()
);
```
RLS: owner-or-follower read (same shape as `fit_activities_social_read`,
minus the `source = 'native'` clause — posts have no source concept).
Kudos and comments reuse the existing `fit_kudos`/`fit_comments` tables by
adding a nullable `post_id` alongside the existing `activity_id`, with the
same mutually-exclusive-FK pattern as photos — so a post gets likes/comments
for free instead of a parallel `fit_post_kudos` table.

### UI
A "New post" composer at the top of the Feed tab: a text box + the same
photo picker as the log flow, a Post button. Renders in the feed as a card
visually close to an activity card but without the stats row — just author,
timestamp, body, photos, kudos/comment bar.

## 3. Dedicated Feed tab

- Replace the `AnalyticsSection`'s neighboring Home feed block with a real
  tab: nav gets `{ href: "/feed", label: "Feed", icon: FeedIcon }` in
  `app-shell.tsx`. Given 5 mobile tab slots are already full (Home, Training,
  Log, Coach, You), Feed replaces **Home** as the default landing tab, and
  Home's current content (progress cards, this-month stats) moves under
  Training or becomes a "Stats" entry point from You — needs a decision,
  flagged below.
- `getFriendsFeed` moves from `limit=20` one-shot to a real
  `listFriendsFeed(userId, { before: cursor, limit: 20 })`, paginating on
  `occurred_at`/`created_at`, called via `IntersectionObserver` infinite
  scroll (matches the pattern already used for the log history list — reuse
  it, check `log-client.tsx` for that observer first).
- Feed items become a discriminated union (`FeedActivity | FeedPost`)
  merged and sorted by timestamp client-side after fetching each page from
  both tables, since Supabase can't UNION across two tables through the JS
  client in one paginated query.

## Decisions needed before starting

1. **Does Feed replace Home as the landing tab, or does something else give
   up its nav slot?** (This doc assumes Feed replaces Home and Home's
   content folds into Training/You — cheapest to build, but changes the
   app's default first screen.)
2. **Bucket visibility** — public-read bucket (simpler, described above) vs.
   signed URLs re-issued per render (more correct instant-revocation on
   unfollow, more moving parts). Recommend public-read given it's a hobby
   app's private following graph, not adversarial content.
3. **Post editing/deletion** — posts get delete (owner-only, cascades
   photos/kudos/comments) but no edit in v1, matching how activities work
   today (no edit exists there either). Confirm that's fine to carry over.

## Suggested build order

1. `fit_photos` table + bucket + policies, photo upload on the **existing**
   log flow and activity cards only (no posts yet) — smallest slice that's
   independently useful and testable.
2. `fit_posts` table + policies + kudos/comments FK extension, composer UI,
   posts rendering inline in the current Home feed section (still no new
   tab) — proves the discriminated-union feed merge works.
3. Feed tab + pagination + nav changes — the part with the most UX
   decisions (item 1 above), done last once 1–2 are live and boring.
