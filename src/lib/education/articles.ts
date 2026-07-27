export type Article = {
  slug: string;
  title: string;
  category: string;
  summary: string;
  paragraphs: string[];
};

export const ARTICLES: Article[] = [
  {
    slug: "running-form",
    title: "Running Form Basics",
    category: "Running",
    summary: "The handful of form cues that actually move the needle — and the ones that don't.",
    paragraphs: [
      "Most running-form advice overcorrects. Your body already found an efficient stride through years of walking and running — wholesale rebuilds (forced forefoot striking, exaggerated knee lift) tend to create new problems faster than they fix old ones.",
      "The cues with real evidence behind them: a slightly forward lean from the ankles (not the waist), a cadence in the 170-185 steps/minute range for most runners, and landing with your foot roughly under your center of mass rather than way out in front of you (overstriding). If you're only going to work on one thing, work on cadence — a slightly quicker turnover naturally shortens your stride and reduces braking forces.",
      "Foot strike (heel vs. midfoot vs. forefoot) matters far less than the internet suggests. Elite runners land across the whole spectrum. Chasing a specific foot strike usually isn't worth the injury risk of forcing an unfamiliar pattern.",
      "The best way to improve form without overthinking it: strides (4-6 x 20 seconds at a quick, relaxed pace) once or twice a week. They reinforce good mechanics through speed and relaxation, not conscious micromanagement.",
    ],
  },
  {
    slug: "heart-rate-zones",
    title: "Heart Rate Zones & VO2 Max",
    category: "Training",
    summary: "What the zones actually mean, and why most of your running should feel embarrassingly easy.",
    paragraphs: [
      "Training zones are typically defined as percentages of max heart rate or heart rate reserve: Zone 1-2 (easy/recovery), Zone 3 (moderate/tempo), Zone 4 (threshold), Zone 5 (VO2 max/anaerobic). The exact percentages vary by method, but the practical takeaway is consistent: most of your weekly volume should sit in Zone 1-2.",
      "This surprises people. The 80/20 principle — roughly 80% of training time easy, 20% moderate-to-hard — shows up again and again in research on endurance athletes. Running everything at a moderate effort (the most common mistake) builds fatigue without building much fitness.",
      "VO2 max — the maximum rate your body can use oxygen — is one input into performance, not the whole story. It responds well to short, hard intervals (Zone 5), but running economy, lactate threshold, and durability matter just as much for race results, and those develop through consistent volume, not just hard efforts.",
      "If you don't have a heart rate monitor, effort-based zones work fine: Zone 2 should let you hold a full conversation; threshold pace is 'comfortably hard' — sustainable for about an hour; VO2 max efforts should feel unsustainable past 3-8 minutes.",
    ],
  },
  {
    slug: "marathon-training",
    title: "Marathon Training Basics",
    category: "Racing",
    summary: "How a training block is actually structured, and why the long run isn't the only thing that matters.",
    paragraphs: [
      "A marathon block typically runs 12-20 weeks and moves through phases: base (building aerobic volume), build (adding tempo and threshold work on top of that base), peak (highest combined volume and intensity), and taper (a planned 2-3 week volume cut so you race fresh).",
      "The long run gets outsized attention, but it's one piece. What matters more than any single run is consistent weekly mileage over months — the aerobic system adapts to accumulated stress, not to any one heroic effort. A runner who logs 30 consistent miles/week for 16 weeks will usually out-race someone chasing 20-mile long runs on an inconsistent 20 miles/week base.",
      "Race-pace practice matters specifically for the marathon because the distance is long enough that pacing errors compound brutally. Some long runs should include miles at or near goal marathon pace, not just easy effort — this trains both the legs and the pacing discipline.",
      "The taper is not optional and it is not laziness. Cutting volume 40-60% over the final 2-3 weeks while keeping some intensity lets your body absorb months of training and show up fresh. Runners who skip the taper because they feel undertrained almost always race worse, not better.",
    ],
  },
  {
    slug: "recovery-and-sleep",
    title: "Recovery & Sleep",
    category: "Recovery",
    summary: "Why recovery is where the actual fitness gains happen — and what wrecks it.",
    paragraphs: [
      "Training is the stimulus; recovery is where adaptation happens. Skip recovery and you're just accumulating fatigue without the fitness gain that's supposed to come with it — this is the mechanism behind overtraining and burnout.",
      "Sleep is the single highest-leverage recovery tool available, and it's free. Most adults need 7-9 hours; athletes in heavy training blocks often need the higher end of that range. Sleep debt measurably impairs glycogen replenishment, muscle repair, and reaction time — all things that directly affect training quality the next day.",
      "Rest days aren't wasted days. Easy or complete rest days allow microscopic muscle damage to repair and glycogen stores to refill. Training hard every day without any easy days is one of the most common ways runners plateau or get hurt.",
      "Simple recovery signals worth tracking: resting heart rate trending up, sleep quality dropping, and persistent soreness that doesn't ease with an easy day are all signs to back off before a small dip becomes an injury or illness.",
    ],
  },
  {
    slug: "strength-for-runners",
    title: "Strength Training for Runners",
    category: "Strength",
    summary: "Why lifting makes you a better runner, not just a stronger one.",
    paragraphs: [
      "Strength training improves running economy — how much energy you burn at a given pace — even though it doesn't directly train the aerobic system. Stronger tendons and muscles store and return more elastic energy with each stride, which is part of why efficient strength work translates to faster times without more mileage.",
      "It's also one of the best tools for injury prevention. Many common running injuries (IT band syndrome, patellofemoral pain, Achilles issues) are linked to weakness in the hips, glutes, and calves rather than to running itself. Two strength sessions a week addressing these areas meaningfully lowers injury risk.",
      "You don't need a bodybuilding program. Compound lower-body movements (squats, deadlifts, lunges, calf raises) at moderate-to-heavy loads and low-to-moderate reps (roughly 4-8) build the kind of strength that transfers to running, without adding so much muscle mass that it becomes extra weight to carry.",
      "Timing matters less than consistency. Lifting the day before a hard run isn't ideal, but lifting twice a week on non-key-workout days, year-round, beats an inconsistent 'strength phase' squeezed in once a year.",
    ],
  },
  {
    slug: "injury-prevention",
    title: "Injury Prevention",
    category: "Recovery",
    summary: "The 10% rule, the most common running injuries, and how to actually avoid them.",
    paragraphs: [
      "The most common cause of running injuries isn't bad form or bad shoes — it's doing too much, too soon. The classic guideline is to increase weekly mileage by no more than about 10% per week, though the real principle is broader: any sudden spike in volume or intensity is when injuries happen.",
      "The most frequent running injuries — runner's knee, IT band syndrome, shin splints, plantar fasciitis, Achilles tendinopathy — are almost all overuse injuries tied to a training-load spike, not a single bad step. That's good news: they're largely preventable through smart progression.",
      "Pain that's sharp, one-sided, or gets worse during a run is a stop signal, not a push-through signal. Dull, general soreness that eases as you warm up is usually fine. Learning that distinction early saves months of downtime later.",
      "The best injury-prevention toolkit is unglamorous: gradual mileage progression, 1-2 strength sessions a week, adequate sleep, and taking easy days genuinely easy. None of it is exciting, all of it works.",
    ],
  },
  {
    slug: "race-day-nutrition",
    title: "Race-Day Nutrition",
    category: "Nutrition",
    summary: "What to eat before and during a race, by distance — and why race day is the wrong time to experiment.",
    paragraphs: [
      "The single most important rule of race nutrition: never try anything new on race day. Whatever you eat before and during the race should be something you've already tested on a long training run, because gut tolerance for food and gels under race-pace stress is highly individual.",
      "For races under about 90 minutes (5K, 10K, most half marathons for faster runners), a light, carb-focused meal 2-3 hours before is usually enough — mid-race fueling is optional. For marathons and slower half marathons, plan on 30-60g of carbohydrate per hour once you're past the first 45 minutes, via gels, chews, or sports drink.",
      "Hydration needs vary enormously by sweat rate, temperature, and pace — there's no single number that applies to everyone. A reasonable starting point is drinking to thirst rather than forcing a fixed volume, and adding electrolytes for anything over about 90 minutes or in hot conditions.",
      "Carb-loading — shifting toward more carbohydrate for 1-2 days before a marathon — helps top off glycogen stores, but it means changing the ratio of what you eat, not simply eating more overall. Overeating in the name of carb-loading just leaves you sluggish on race morning.",
    ],
  },
  {
    slug: "mental-performance",
    title: "Mental Performance",
    category: "Racing",
    summary: "Pacing discipline, self-talk, and the mental skills that separate good races from bad ones.",
    paragraphs: [
      "The single biggest mental-performance mistake in racing is going out too fast. Adrenaline and a fresh crowd make the first mile feel deceptively easy — a controlled, even-paced (or slightly negative-split) race almost always beats one that starts fast and fades.",
      "Breaking a race into segments — the next mile, the next aid station, the next landmark — is a well-established way to make a daunting distance feel manageable. Thinking about 26.2 miles as one unbroken effort is a good way to psych yourself out before the start line.",
      "Self-talk has a measurable effect on perceived effort. Athletes who use short, practiced positive or instructional cues ('smooth,' 'relax the shoulders,' 'strong legs') tend to sustain effort better late in a race than those who ruminate on how much it hurts.",
      "Confidence is built in training, not manufactured on race day. The mental toughness that shows up at mile 20 of a marathon is mostly a memory of every hard workout you've already survived — which is one more reason consistent training matters more than any single race-week trick.",
    ],
  },
];

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}
