import type { HybridProfile, Pattern } from "@/lib/coach/hybrid";

/**
 * Isometric holds — static contractions where the joint angle does not change.
 *
 * Why they earn a place in a hybrid plan specifically:
 * - They build tendon stiffness, which is what returns energy on every stride,
 *   so they support running economy rather than competing with it.
 * - They add very little muscle damage or soreness compared with heavy
 *   eccentrics, so they cost the next run almost nothing.
 * - Long holds are one of the few ways to add hard stimulus to a lift that has
 *   stalled without simply loading the joint more.
 *
 * Educational only, never medical (CLAUDE.md hard rule 4). Nothing here treats
 * an injury; the joint-irritation entries are framed as "train around it".
 */

export type Isometric = {
  name: string;
  pattern: Pattern;
  /** How to perform it, in one line. */
  how: string;
  prescription: string;
  /** Why this one, in this plan. */
  why: string;
};

export const ISOMETRICS: Isometric[] = [
  {
    name: "Wall sit",
    pattern: "squat",
    how: "Back flat to a wall, thighs parallel to the floor, weight through the heels.",
    prescription: "3 x 45-60s, 90s rest",
    why: "Quad endurance without the joint load of another heavy leg press. Carries straight over to late-race form.",
  },
  {
    name: "Split-squat hold",
    pattern: "squat",
    how: "Bottom of a split squat, back knee just off the floor, torso tall.",
    prescription: "3 x 30-40s each side, 60s rest",
    why: "Single-leg stability — the position running actually happens in, and it exposes the left/right imbalance you have noted in your logs.",
  },
  {
    name: "Isometric leg curl hold",
    pattern: "hinge",
    how: "On the leg curl machine, pull to about 90 degrees and hold there against the weight.",
    prescription: "3 x 20-30s at a lighter weight than your working sets",
    why: "Directly targets a stalled prone leg curl: the hold trains the contraction you said you could not sustain, instead of adding reps you cannot control.",
  },
  {
    name: "Single-leg calf raise hold",
    pattern: "calf",
    how: "Top of a calf raise on one foot, heel as high as it will go, hold still.",
    prescription: "3 x 30s each side",
    why: "Achilles and calf stiffness is the single biggest tendon contributor to running economy, and holds load it safely.",
  },
  {
    name: "Isometric mid-thigh pull or rack pull hold",
    pattern: "hinge",
    how: "Bar set at mid-thigh, pull hard into an immovable bar and hold the tension.",
    prescription: "3 x 6-10s at maximal intent, 2 min rest",
    why: "Maximal-intent holds build force production without eccentric damage — the cheapest strength stimulus to recover from before a run day.",
  },
  {
    name: "Plank and side plank",
    pattern: "core",
    how: "Forearms down, ribs pulled toward hips, straight line from head to heels.",
    prescription: "3 x 45s front, 3 x 30s each side",
    why: "Core is barely 2% of your logged volume. Anti-extension and anti-lateral-flexion strength is what keeps posture from collapsing in the back half of a long run.",
  },
  {
    name: "Copenhagen hold",
    pattern: "core",
    how: "Side plank with the top leg on a bench, hips lifted, adductors doing the work.",
    prescription: "2 x 20-30s each side",
    why: "Trains the adductors in a hip-stability role rather than the seated machine you have been stuck on for months.",
  },
  {
    name: "Isometric push-up hold",
    pattern: "push",
    how: "Halfway down in a push-up, elbows tucked, hold without sagging.",
    prescription: "3 x 20-30s",
    why: "Adds pressing volume without the shoulder aggravation you have logged on dips and pulldowns.",
  },
  {
    name: "Bar hang and scap hold",
    pattern: "pull",
    how: "Hang from a bar, then pull the shoulder blades down and back without bending the elbows.",
    prescription: "3 x 20-30s",
    why: "Decompresses the shoulder and builds the scapular control that clicking usually points at, while still adding pull volume.",
  },
  {
    name: "Isometric wrist extension hold",
    pattern: "isolation",
    how: "Wrist extended against a light dumbbell or band, held still.",
    prescription: "2-3 x 30s each side",
    why: "You have logged left wrist pain and forearm popping. Holds build tendon tolerance where repeated curls have been aggravating it.",
  },
];

export type IsometricRecommendation = {
  isometric: Isometric;
  /** Why this one surfaced for this user right now. */
  reason: string;
};

/**
 * Picks the isometrics that match what the log actually shows: gaps in movement
 * patterns first, then stalled lifts, then a default core/tendon base. Returns
 * an empty list when there is not enough history to say anything useful.
 */
export function recommendIsometrics(p: HybridProfile): IsometricRecommendation[] {
  if (!p.hasStrengthBase) return [];

  const out: IsometricRecommendation[] = [];
  const taken = new Set<string>();

  const add = (iso: Isometric | undefined, reason: string) => {
    if (!iso || taken.has(iso.name)) return;
    taken.add(iso.name);
    out.push({ isometric: iso, reason });
  };

  // 1. Under-trained patterns are the clearest gap.
  for (const pattern of p.underTrained) {
    const match = ISOMETRICS.find((i) => i.pattern === pattern && !taken.has(i.name));
    add(match, `Fills a gap — ${pattern} is under-trained in your log.`);
  }

  // 2. Stalled lifts: a hold changes the stimulus without adding load.
  for (const stall of p.stalled) {
    const name = stall.exercise.toLowerCase();
    if (/leg curl|hamstring/.test(name)) {
      add(
        ISOMETRICS.find((i) => i.name === "Isometric leg curl hold"),
        `${stall.exercise} has been flat — a hold changes the stimulus without adding weight.`
      );
    } else if (/squat|leg press|extension/.test(name)) {
      add(
        ISOMETRICS.find((i) => i.name === "Wall sit"),
        `${stall.exercise} has been flat — long holds add difficulty without more load on the joint.`
      );
    } else if (/calf/.test(name)) {
      add(
        ISOMETRICS.find((i) => i.name === "Single-leg calf raise hold"),
        `${stall.exercise} has been flat — single-leg holds raise the stimulus without more plates.`
      );
    }
  }

  // 3. Running-specific tendon work always earns a place in a hybrid build.
  add(
    ISOMETRICS.find((i) => i.name === "Single-leg calf raise hold"),
    "Achilles stiffness is the tendon that most affects running economy."
  );
  add(
    ISOMETRICS.find((i) => i.name === "Plank and side plank"),
    "Baseline core strength holds running posture together late in a run."
  );

  return out.slice(0, 5);
}
