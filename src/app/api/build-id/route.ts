import { NextResponse } from "next/server";

/**
 * A standalone PWA on iOS can stay frozen in the background for days,
 * never re-fetching the HTML document even after a new Vercel deploy —
 * so the client-side StaleBuildReload check polls this route (which is
 * dynamic, so it always reflects the current running server) instead of
 * relying on cache headers on the page itself.
 */
export async function GET() {
  return NextResponse.json({
    buildId: process.env.VERCEL_GIT_COMMIT_SHA ?? "dev",
  });
}

export const dynamic = "force-dynamic";
