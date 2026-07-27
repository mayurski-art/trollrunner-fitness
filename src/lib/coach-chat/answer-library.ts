import type { CoachFacts } from "./context";
import { supplementNotes } from "@/lib/nutrition/education";

export type ConfidenceTier = "established" | "debated" | "speculative";

export type AnswerEntry = {
  id: string;
  /** Groups entries for the multi-topic composition layer — see retrieval.ts. */
  topic: string;
  /** Example phrasings a user might type — embedded and matched against. */
  samples: string[];
  tier: ConfidenceTier;
  sources?: string[];
  render: (facts: CoachFacts) => string;
};

const MEDICAL_DISCLAIMER =
  "This is educational fitness coaching, not medical advice — if that sounds like pain, an injury, or a health condition, see a doctor rather than pushing through it.";

export const ANSWER_LIBRARY: AnswerEntry[] = [
  // ── Your data (personalized) ──────────────────────────────────────────
  {
    id: "training_load_status",
    topic: "training_load",
    tier: "established",
    samples: ["how is my training going", "what's my training status", "am I overtraining", "how's my fitness right now"],
    render: (f) =>
      `Your training status is "${f.loadStatus.label}". ${f.loadStatus.why} Right now: Fitness (CTL) ${f.load.ctl}, Fatigue (ATL) ${f.load.atl}, Form (TSB) ${f.load.tsb}.`,
  },
  {
    id: "training_load_explain",
    topic: "training_load",
    tier: "established",
    samples: ["what do CTL ATL TSB mean", "explain fitness fatigue form", "what is training load"],
    render: (f) =>
      `CTL (Fitness) is your 42-day rolling training load. ATL (Fatigue) is the same idea over 7 days. TSB (Form) is CTL minus ATL: positive means fresh, negative means carrying fatigue. Yours right now: CTL ${f.load.ctl}, ATL ${f.load.atl}, TSB ${f.load.tsb}.`,
  },
  {
    id: "recovery_score",
    topic: "recovery",
    tier: "established",
    samples: ["how's my recovery", "why is my recovery score low", "am I recovered"],
    render: (f) =>
      f.recoveryScore !== null
        ? `Your 7-day recovery average is ${f.recoveryScore}/100 ("${f.recoveryStatus.label}"), built from sleep, soreness, and stress from your daily check-ins.`
        : "You haven't logged a recovery check-in yet — do one on the Home tab and I can tell you how you're trending.",
  },
  {
    id: "plan_this_week",
    topic: "plan",
    tier: "established",
    samples: ["what's this week's plan", "what should I do today", "what's my workout"],
    render: (f) =>
      `This week you're in the "${f.plan.phase}" phase, targeting ${f.plan.targetMileage} mi.${
        f.plan.recoveryNote ? ` ${f.plan.recoveryNote}` : ""
      }${f.todayWorkout ? ` Today: ${f.todayWorkout.type} — ${f.todayWorkout.detail}.` : ""}`,
  },
  {
    id: "plan_phase_explain",
    topic: "plan",
    tier: "established",
    samples: ["why am I in this training phase", "what does base build peak taper mean", "why does the plan look this way"],
    render: (f) => `${f.plan.phaseWhy} That's why this week targets ${f.plan.targetMileage} mi.`,
  },
  {
    id: "race_predictions",
    topic: "race",
    tier: "established",
    samples: ["what's my race time prediction", "how fast could I race right now", "predict my marathon time"],
    render: (f) =>
      f.predictions
        ? `Based on your recent training: ${f.predictions.map((p) => `${p.label} ~${p.pace}`).join(", ")}.`
        : "Log a timed run (distance + duration) and I can predict your race times using the Riegel formula.",
  },
  {
    id: "nutrition_targets",
    topic: "nutrition_personal",
    tier: "established",
    samples: ["what should I eat", "what are my macros", "how many calories should I eat"],
    render: (f) =>
      `Your targets: ${f.nutrition.calories} kcal, ${f.nutrition.proteinG}g protein, ${f.nutrition.carbsG}g carbs, ${f.nutrition.fatG}g fat, and about ${f.nutrition.waterOz} oz of water a day.${
        f.nutrition.hasFullProfile ? "" : " These are weight-based estimates — add your age, sex, height, and weight in onboarding for more precise numbers."
      }`,
  },
  {
    id: "plateau_explain",
    topic: "training_load",
    tier: "established",
    samples: ["why am I plateauing", "why am I not improving", "why does my training feel stuck"],
    render: (f) =>
      `Your Form (TSB) is ${f.load.tsb} and status is "${f.loadStatus.label}". ${f.loadStatus.why} A plateau is usually either not enough stimulus (TSB staying high, load flat) or too much fatigue masking fitness gains (TSB very negative) — check which one matches before changing anything drastic.`,
  },
  {
    id: "mileage_progress",
    topic: "plan",
    tier: "established",
    samples: ["how many miles have I run this week", "what's my weekly mileage"],
    render: (f) => `You're at ${f.weeklyMileage.toFixed(1)} mi this week, targeting ${f.plan.targetMileage} mi.`,
  },
  {
    id: "streak",
    topic: "misc",
    tier: "established",
    samples: ["what's my streak", "how many days have I logged in a row"],
    render: (f) => `You're on a ${f.streak}-day logging streak.`,
  },
  {
    id: "goals",
    topic: "plan",
    tier: "established",
    samples: ["what are my goals", "what am I training for"],
    render: (f) =>
      f.goals.length
        ? `Your current goal(s): ${f.goals.join(", ")}.`
        : "You haven't set a race goal yet — add one in onboarding or your profile to unlock phase-based planning and race predictions.",
  },
  {
    id: "rest_day_question",
    topic: "recovery",
    tier: "established",
    samples: ["should I take a rest day", "should I skip today's workout", "am I too tired to train"],
    render: (f) =>
      `Form (TSB) is ${f.load.tsb} and recovery is "${f.recoveryStatus.label}"${
        f.recoveryScore !== null ? ` (${f.recoveryScore}/100)` : ""
      }. ${
        f.loadStatus.tone === "critical" || f.recoveryStatus.tone === "critical"
          ? "Both signals lean toward taking it easy or resting today."
          : "Nothing here says you need to rest, but listen to how your body actually feels."
      }`,
  },
  {
    id: "hydration",
    topic: "nutrition_general",
    tier: "established",
    samples: ["how much water should I drink day to day"],
    render: (f) => `Target about ${f.nutrition.waterOz} oz/day, scaled up on training days.`,
  },
  {
    id: "how_to_checkin",
    topic: "misc",
    tier: "established",
    samples: ["how do I log a check-in", "where do I log sleep and soreness"],
    render: () => "Log your daily check-in (sleep, soreness, stress) on the Home tab — it takes a few seconds and unlocks your recovery score here.",
  },
  {
    id: "how_to_log_activity",
    topic: "misc",
    tier: "established",
    samples: ["how do I log a run", "where do I log a workout"],
    render: () => "Log activities from the Log tab — distance, duration, and effort for runs, or sets/reps for strength work.",
  },
  {
    id: "greeting",
    topic: "misc",
    tier: "established",
    samples: ["hi", "hello", "what can you help with", "what can you do"],
    render: (f) =>
      `Hey${f.goals.length ? "" : " runner"}! Ask about your training load, recovery, this week's plan, nutrition, race science, or training myths — I'll answer from your data or from sourced research. ${MEDICAL_DISCLAIMER}`,
  },

  // ── Training science (general, sourced) ───────────────────────────────
  {
    id: "polarized_training",
    topic: "training_science",
    tier: "debated",
    sources: ["IJSPP systematic review (journals.humankinetics.com)", "8020endurance.com critique"],
    samples: ["should I do most of my runs easy", "what's the 80/20 rule", "how should I split easy vs hard runs"],
    render: () =>
      "Research on 'polarized' training (~80% easy, ~20% hard) generally shows it works well for endurance gains, and elite distance runners tend toward polarized or pyramidal intensity distributions rather than threshold-heavy ones. That said, at least one study found a different, more focused-endurance approach did just as well or better — so treat 80/20 as a solid default, not a rigid law.",
  },
  {
    id: "strike_pattern",
    topic: "training_science",
    tier: "established",
    sources: ["Biomechanical differences systematic review (sciencedirect.com)"],
    samples: ["should I switch to forefoot striking", "is heel striking bad for me", "what running form is best"],
    render: () =>
      "No strike pattern is universally safer — heel striking shifts load toward the knee, forefoot striking shifts it toward the ankle/Achilles/calf. If you're an uninjured heel striker, there's no proven benefit to switching, and uninformed switches during the adaptation period have been linked to more injuries, not fewer.",
  },
  {
    id: "stretching_myth",
    topic: "training_science",
    tier: "established",
    sources: ["Journal of Science and Medicine in Sport systematic review (tandfonline.com)"],
    samples: ["does stretching before a run prevent injury", "should I stretch before running"],
    render: () =>
      "Static stretching before a run doesn't reduce injury risk in controlled trials, and holding a stretch too long beforehand can temporarily reduce power and speed for up to about an hour. A dynamic warm-up (leg swings, drills) doesn't carry that cost and may help running economy — save static stretching for after.",
  },
  {
    id: "strength_running_economy",
    topic: "training_science",
    tier: "established",
    sources: ["PMC11052887 meta-analysis", "PMC11258194"],
    samples: ["does lifting weights make me a faster runner", "does strength training help running economy"],
    render: () =>
      "Yes — a 2024 meta-analysis found strength training (heavy loads, plyometrics, or both), done 2-3x/week for 8-12 weeks, meaningfully improves running economy in middle- and long-distance runners. Plyometrics helped more at slower speeds; heavy/combined lifting helped across a range of speeds.",
  },
  {
    id: "strength_injury_prevention",
    topic: "training_science",
    tier: "debated",
    sources: ["PMC11127851 systematic review"],
    samples: ["does strength training prevent running injuries", "will lifting keep me from getting hurt"],
    render: () =>
      "This one's less settled than the running-economy benefit. It's plausible that strengthening tendons/bone reduces overuse injury, but a systematic review of injury-prevention conditioning programs didn't find consistent, clear evidence that it lowers running-injury risk directly. Worth doing for the performance benefit; don't count on it as injury insurance.",
  },
  {
    id: "interference_effect",
    topic: "training_science",
    tier: "debated",
    sources: ["Frontiers in Sports and Active Living review (2025)", "Stronger by Science research spotlight"],
    samples: ["will lifting hurt my endurance gains", "does strength training interfere with running gains"],
    render: () =>
      "Less than commonly believed. Recent meta-analyses (covering 40+ studies) find concurrent strength+endurance training doesn't meaningfully hurt strength or hypertrophy gains — the 'interference effect' shows up mainly in explosive/power output, not general strength. If your goals are strength and endurance together, you can train both without much tradeoff.",
  },
  {
    id: "overtraining_signs",
    topic: "training_science",
    tier: "established",
    sources: ["ACSM/ECSS Joint Consensus Statement"],
    samples: ["what are the signs of overtraining", "how do I know if I'm overtraining vs just tired"],
    render: () =>
      "There's no single blood test for overtraining — it's diagnosed by ruling other things out. Watch for a cluster: performance decline despite training, persistent fatigue, elevated resting heart rate, mood changes (irritability, low motivation), disrupted sleep, and getting sick more often. If several show up together over weeks, that's worth backing off for, not pushing through.",
  },
  {
    id: "acwr_explain",
    topic: "training_science",
    tier: "debated",
    sources: ["Sports Medicine 2020 systematic review"],
    samples: ["how much can I safely increase my training", "what's a safe way to ramp up mileage"],
    render: () =>
      "Sudden jumps in training load relative to your recent baseline are linked to higher injury risk — that part is well supported. The specific 'ACWR' ratio numbers (like 1.0-1.5) you'll see quoted online are more folklore than precise science; sports scientists have criticized the math behind them. Safer takeaway: avoid big spikes, not a magic ratio.",
  },
  {
    id: "ten_percent_rule",
    topic: "training_science",
    tier: "debated",
    sources: ["Outside Online / 2008 RCT", "BJSM cohort study on single-run distance spikes"],
    samples: ["is the 10 percent rule real", "how much should I increase my weekly mileage"],
    render: () =>
      "The classic 'never increase weekly mileage more than 10%' rule has no solid evidence behind it — a controlled comparison found no injury-rate difference between runners who followed it and those who didn't. A newer, more specific finding suggests the real risk factor is a big jump in your single longest run, not your weekly total — so be more cautious about sudden long-run jumps than weekly mileage math.",
  },
  {
    id: "red_s",
    topic: "training_science",
    tier: "established",
    sources: ["IOC Consensus Statement 2023 (BJSM)"],
    samples: ["what is RED-S", "am I at risk of energy deficiency", "am I eating enough for how much I train"],
    render: () =>
      "RED-S (Relative Energy Deficiency in Sport) happens when you eat too little relative to how much you train, and it can affect hormones, bone health, immunity, and mood — not just performance. Endurance athletes and anyone restricting food while training heavily are most at risk. If your periods have changed, you're getting sick often, or bone-stress injuries keep happening, that's worth discussing with a doctor.",
  },
  {
    id: "injury_stats",
    topic: "training_science",
    tier: "established",
    sources: ["PMC4473093 meta-analysis"],
    samples: ["how common are running injuries", "is it normal to get injured from running"],
    render: () =>
      "More common than people assume — roughly 4 in 10 runners experience an injury in a given period, and new runners get hurt more than experienced ones. About 80% of running injuries are overuse (gradual load exceeding what tissue can handle) rather than acute trauma, most often at the knee, lower leg, or ankle/foot. Getting hurt doesn't mean you did something uniquely wrong.",
  },
  {
    id: "exercise_mental_health",
    topic: "mental_health",
    tier: "established",
    sources: ["Singh et al. 2023 BJSM umbrella review (97 reviews, 128,119 participants)"],
    samples: ["does running help with anxiety or depression", "does exercise help my mood"],
    render: () =>
      "Strongly, yes — one of the best-supported findings in exercise science. A large umbrella review found exercise produces meaningful reductions in depression, anxiety, and psychological distress, matching or exceeding medication/therapy in some comparisons. Group or supervised exercise tends to help depression most; shorter, lower-intensity sessions tend to help anxiety most.",
  },
  {
    id: "exercise_addiction",
    topic: "mental_health",
    tier: "debated",
    sources: ["PMC8222598", "PMC11215719"],
    samples: ["can you overdo exercise", "is exercise addiction real", "am I addicted to training"],
    render: () =>
      "It's a real, documented phenomenon, more common in competitive/endurance athletes than recreational ones — exact prevalence numbers vary a lot by study. Watch for training that continues despite injury or cost to relationships/work, and distress when you can't train. If that sounds familiar, it's worth talking to someone.",
  },

  // ── Nutrition science (general, sourced) ──────────────────────────────
  {
    id: "carb_loading",
    topic: "nutrition_general",
    tier: "debated",
    sources: ["Gatorade Sports Science Institute review", "ScienceForSport summary"],
    samples: ["should I carb load before a race", "do I need to load carbs before my marathon"],
    render: () =>
      "Worth it for events over about 90 minutes — loading up on carbs (roughly 10-12g/kg bodyweight/day) for 36-48 hours before maximizes glycogen stores. For shorter races the benefit is less clear; one study found extra glycogen from loading didn't actually improve half-marathon performance.",
  },
  {
    id: "protein_timing_myth",
    topic: "nutrition_general",
    tier: "established",
    sources: ["JOSPT review", "PMC3577439 meta-analysis of 65 RCTs"],
    samples: ["do I need to eat protein right after my workout", "is there an anabolic window"],
    render: () =>
      "The strict 30-60 minute 'anabolic window' is a myth in its common form — a meta-analysis of 65 trials found protein timing didn't matter once total daily protein intake was accounted for. The real window is several hours wide, especially if you ate a meal a few hours before training. Hit your daily protein target; don't stress about the clock.",
  },
  {
    id: "hyponatremia",
    topic: "nutrition_general",
    tier: "established",
    sources: ["PMC9699060 — Exercise-Associated Hyponatremia in Marathon Runners"],
    samples: ["how much water should I drink during a long run", "am I drinking too much water on race day"],
    render: () =>
      "Overhydration is the underrated danger on race day, not dehydration — drinking beyond thirst has caused fatal cases of hyponatremia (dangerously diluted blood sodium) in marathoners. Drink to thirst rather than a fixed schedule, and add sodium on runs over ~90 minutes.",
  },
  {
    id: "creatine",
    topic: "nutrition_general",
    tier: "established",
    sources: ["ISSN Position Stand"],
    samples: ["should I take creatine", "does creatine help running"],
    render: () =>
      "Creatine monohydrate is the most well-evidenced supplement for strength/power and is well established as safe for long-term use. For endurance running specifically, its benefit is most plausible for the high-intensity surges in a race (sprint finishes, hills) rather than steady aerobic pace — that endurance-specific benefit is a newer, smaller evidence base than the strength-sport one.",
  },
  {
    id: "bcaa",
    topic: "nutrition_general",
    tier: "established",
    sources: ["King's College London research summary", "PMC9571679"],
    samples: ["should I take BCAAs"],
    render: () =>
      "Not much benefit if your protein intake is already adequate. Complete-protein supplementation produces roughly double the muscle-building response of BCAAs alone, since BCAAs are missing several essential amino acids. There's modest evidence BCAAs reduce soreness, but that's a smaller effect than just getting enough total protein.",
  },
  {
    id: "beet_juice",
    topic: "nutrition_general",
    tier: "debated",
    sources: ["Frontiers in Nutrition meta-analysis", "PMC9287610"],
    samples: ["does beet juice make me run faster", "does nitrate help running performance"],
    render: () =>
      "Mixed evidence depending on the effort type. Beetroot/nitrate helps some high-intensity, short-effort metrics, but for actual race times the picture is inconsistent — one 10K study found a faster first half but no overall time improvement. Worth experimenting with in training, not something to bank on for a PR.",
  },
  {
    id: "supplements_general",
    topic: "nutrition_general",
    tier: "established",
    samples: ["should I take supplements", "what supplements help running"],
    render: () => supplementNotes().join(" "),
  },
  {
    id: "ice_bath",
    topic: "recovery_science",
    tier: "established",
    sources: ["Frontiers network meta-analysis", "PMC9896520"],
    samples: ["do ice baths help recovery", "should I do cold water immersion"],
    render: () =>
      "Cold water immersion reliably reduces muscle soreness and a blood marker of muscle damage compared to just resting, especially after hard or eccentric-heavy sessions. It doesn't do much for strength, and can actually blunt explosive power right afterward — so avoid it right before a power-focused session.",
  },
  {
    id: "foam_rolling",
    topic: "recovery_science",
    tier: "established",
    sources: ["ScienceDirect systematic review", "PMC8998857"],
    samples: ["is foam rolling worth it", "does foam rolling help performance"],
    render: () =>
      "It genuinely reduces soreness, especially 2-3 days after a hard session — that part is well supported. Evidence that it improves actual performance (strength, jump, agility) is much weaker. Treat it as a comfort tool, not a performance enhancer.",
  },
  {
    id: "sleep_matters",
    topic: "recovery_science",
    tier: "established",
    sources: ["PMC9960533 — Sleep and Athletic Performance review"],
    samples: ["does sleep actually matter for training", "how important is sleep for recovery"],
    render: () =>
      "One of the most consistently supported recovery factors there is. Insufficient sleep is linked to worse endurance/strength, slower glycogen replenishment, and higher injury risk, while sleep-extension studies have directly improved athletes' performance metrics. If you're optimizing one thing for recovery, sleep is a strong first choice.",
  },

  {
    id: "injury_pain",
    topic: "medical",
    tier: "established",
    samples: ["my knee hurts", "I have pain when I run", "is this injury serious", "should I run through pain"],
    render: () =>
      `I can't assess pain or injuries — ${MEDICAL_DISCLAIMER} If it's mild soreness rather than pain, logging it in your daily check-in helps the plan adjust.`,
  },

  // ── Sports-medicine screening & ancestry-related health (safe subset) ──
  // Framed as population-level, action-oriented guidance applicable to
  // everyone — never as an assessment of any individual user's risk from
  // their ethnicity. See conversation notes for what was deliberately
  // excluded (contested race-based CVD/fiber-type claims).
  {
    id: "cardiac_screening",
    topic: "medical",
    tier: "established",
    sources: ["AHA/ACC Scientific Statement, Circulation 2015", "2024 AHA/ACC/AMSSM HCM Guideline"],
    samples: [
      "should I get my heart checked before training hard",
      "how do I know if it's safe to train intensely",
      "what cardiac screening should athletes get",
    ],
    render: () =>
      `Before ramping up serious training, it's worth doing the standard pre-participation check the AHA recommends for every athlete: personal cardiac history, a physical exam (blood pressure, resting heart rate, heart murmur check), and a detailed family history — specifically, has anyone in your family died suddenly and unexpectedly before age 50, or been diagnosed with a heart condition young. Any yes there is worth a conversation with a doctor before pushing hard efforts. ${MEDICAL_DISCLAIMER}`,
  },
  {
    id: "sudden_cardiac_death_context",
    topic: "medical",
    tier: "established",
    sources: ["AHA/Circulation — Sudden Deaths in Young Competitive Athletes"],
    samples: ["how risky is sudden cardiac death for athletes", "can intense exercise cause a heart attack"],
    render: () =>
      "In absolute terms it's rare — roughly 1-2 per 100,000 athlete-years in young competitive athletes. It's the leading cause of death during sport in that age group, which is why the family-history and screening questions matter, but it shouldn't be a reason to avoid training for the vast majority of people.",
  },
  {
    id: "sickle_cell_trait",
    topic: "medical",
    tier: "established",
    sources: ["NATA/AMSSM Consensus Statement", "NCAA Sickle Cell Trait guidance"],
    samples: [
      "what is sickle cell trait",
      "does sickle cell trait affect exercise",
      "am I at risk from sickle cell trait",
    ],
    render: () =>
      `Sickle cell trait is more common in people with ancestry from regions with a history of malaria — parts of Africa, the Mediterranean, the Middle East, and South Asia — but it isn't tied to any single ethnicity, and most carriers train normally without issue. Under extreme, sustained exertion (hard conditioning sessions, heat, altitude) it carries a rare but serious risk, so if you know you carry the trait, pace hard efforts, hydrate, and stop immediately at any unusual cramping or weakness. If you don't know your status and want to, that's a conversation for your doctor, not something this app can determine. ${MEDICAL_DISCLAIMER}`,
  },
  {
    id: "vitamin_d",
    topic: "medical",
    tier: "established",
    sources: ["PMC8781604 — Vitamin D and Pigmented Skin"],
    samples: ["should I worry about vitamin D", "do I need a vitamin D supplement"],
    render: () =>
      "Skin with more melanin needs more sun exposure to make the same amount of vitamin D, and training mostly indoors, at higher latitudes, or through winter adds to that. Low vitamin D matters for bone health and possibly muscle function. If any of that sounds like you, ask your doctor about a simple blood test before starting a supplement.",
  },
  {
    id: "lactose_sensitivity",
    topic: "medical",
    tier: "established",
    sources: ["PMC6316196 — Gender, Age, Race and Lactose Intolerance"],
    samples: ["why does dairy bother my stomach after workouts", "should I avoid dairy for recovery nutrition"],
    render: () =>
      "Lactase non-persistence (trouble digesting dairy sugar) is genetically more common in people with East Asian, African, Mediterranean, or Jewish ancestry, and less common in those with Northern European ancestry — though plenty of individual variation exists either way. If dairy-heavy recovery shakes/meals give you GI issues, that's worth trying lactose-free alternatives rather than pushing through it.",
  },
  {
    id: "aha_activity_guidelines",
    topic: "medical",
    tier: "established",
    sources: ["AHA — Recommendations for Physical Activity in Adults"],
    samples: ["how much exercise do I need for heart health", "am I doing enough cardio for my heart"],
    render: () =>
      "The AHA's baseline is 150+ min/week of moderate cardio (or 75+ min/week vigorous, or a mix), plus muscle-strengthening work 2+ days/week — and 300+ min/week of cardio gives additional benefit on top of that. Most runners training for a race clear this easily; it's a good floor to know if you're ever cutting back.",
  },
  {
    id: "aha_warning_signs",
    topic: "medical",
    tier: "established",
    sources: ["AHA — Heart Attack, Stroke and Cardiac Arrest Symptoms"],
    samples: [
      "what symptoms during a workout should worry me",
      "what are heart attack warning signs while exercising",
    ],
    render: () =>
      `The AHA's heart attack warning signs apply just as much mid-workout as at rest: chest discomfort/pressure that lasts more than a few minutes or comes and goes, discomfort in the arms/back/neck/jaw/stomach, shortness of breath, cold sweat, nausea, or lightheadedness. If any of that shows up during a run, stop — don't push through it to finish a workout. ${MEDICAL_DISCLAIMER}`,
  },
  {
    id: "cardiac_rehab",
    topic: "medical",
    tier: "established",
    sources: ["AHA — Cardiac Rehab", "Cochrane review on exercise-based cardiac rehabilitation"],
    samples: ["can I still run after a heart attack", "how do I return to training after a cardiac event"],
    render: () =>
      `Return-to-exercise after a cardiac event should go through a structured cardiac rehab program, not self-directed training — a Cochrane review found exercise-based cardiac rehab cuts cardiovascular mortality by roughly 26% and hospital readmissions by 18%. This is one of the best-evidenced interventions in cardiology; if this applies to you, ask your doctor about a referral. ${MEDICAL_DISCLAIMER}`,
  },
  {
    id: "know_your_numbers",
    topic: "medical",
    tier: "established",
    sources: ["AHA — Coronary Artery Disease", "JAHA — Family History and CVD risk"],
    samples: ["what heart health numbers should I track", "does family history of heart disease matter for me"],
    render: () =>
      "Beyond training data, the numbers worth knowing are blood pressure, LDL/HDL cholesterol, and whether a parent or sibling had heart disease young — family history is an independent risk factor on its own, and risk rises with more affected relatives. The AHA estimates over 80% of cardiovascular disease is preventable by managing these, which is as much about a yearly checkup as it is about training.",
  },
  {
    id: "vo2max_heart_health",
    topic: "medical",
    tier: "established",
    sources: ["AHA Scientific Statement — Cardiorespiratory Fitness as a Clinical Vital Sign"],
    samples: ["does my VO2max matter for long-term health", "is fitness actually linked to living longer"],
    render: () =>
      "Yes, notably so — the AHA has called cardiorespiratory fitness (essentially VO2max) a 'clinical vital sign' because it predicts mortality more strongly than smoking, blood pressure, cholesterol, or diabetes status individually. Improving it over time is one of the best-evidenced things you can do for long-term heart health, separate from any single workout.",
  },

  // ── Elite training & running-media myth-checking ──────────────────────
  {
    id: "elite_training_overview",
    topic: "elite_training",
    tier: "established",
    sources: ["Sports Medicine - Open (2022) — Training Characteristics of World-Class Distance Runners"],
    samples: ["how do elite marathoners train differently", "what does Kipchoge's training look like"],
    render: () =>
      "Elite marathoners typically run 100-140 miles/week across 11-14 sessions, with 80%+ of that volume at easy effort year-round (not constant hard running) — the same polarized principle recreational plans use, just at much higher volume. Many East African elites also live and train at altitude (2,000-2,500m) year-round rather than doing short altitude camps. The exact mileage figures you'll see quoted for specific athletes (e.g. Kipchoge) vary by outlet and aren't published training logs — treat specific numbers as estimates, the overall pattern as solid.",
  },
  {
    id: "zone2_myth",
    topic: "elite_training",
    tier: "debated",
    sources: ["Sci-Sport — Zone 2 myth or reality", "Sports Medicine - Open (2022)"],
    samples: ["is zone 2 training the secret to getting fast", "should I just do all zone 2 training"],
    render: () =>
      "Oversimplified. Elites do spend most of their volume at low intensity, which is where this claim comes from, but the science doesn't show Zone 2 is uniquely special for fat-burning or mitochondrial adaptation over other easy intensities. Its real value is that it lets you accumulate high weekly volume without excess fatigue, which is what makes the smaller dose of hard training on top of it effective — the volume and the hard sessions both matter, not just the zone.",
  },
  {
    id: "high_mileage_myth",
    topic: "elite_training",
    tier: "debated",
    sources: ["RunnersConnect — analysis of 119,452 marathon runners' training data"],
    samples: ["do I need to run 100 miles a week to get fast", "how much mileage do I need to run a fast marathon"],
    render: () =>
      "Only true at the elite level. An analysis of over 119,000 amateur marathoners found the fastest finishers averaged around 62 miles/week, not 100+, and most of what separated fast from slow runners was more easy running, not more hard running. Sub-3-hour marathoner training data shows peak weeks closer to 75 miles on average.",
  },
  {
    id: "altitude_training_myth",
    topic: "elite_training",
    tier: "debated",
    sources: ["Journal of Applied Physiology — individual variation in altitude training response"],
    samples: ["does altitude training guarantee performance gains", "should I train at altitude"],
    render: () =>
      "Not guaranteed — this is a real effect on average, but highly variable individually. Some athletes get a solid VO2max/hemoglobin boost from altitude exposure; others show little to no change, with individual factors like iron status playing a role. It can help, but it's not a reliable shortcut for everyone.",
  },
  {
    id: "elite_injury_myth",
    topic: "elite_training",
    tier: "speculative",
    sources: ["PMC — Incidence and biomechanical risk factors for running-related injuries", "MDPI — Injury Incidence in Elite Trail Runners"],
    samples: ["do elite runners never get injured because of their form", "does good running form make you injury-proof"],
    render: () =>
      "Not supported — elites get injured too, and elite ultra-trail runners in one study actually showed a higher injury rate than typical recreational runners. Certain biomechanical patterns are linked to higher injury odds in research, but no study shows 'good form' makes anyone immune — that's a media narrative, not a finding.",
  },
  {
    id: "supershoes",
    topic: "elite_training",
    tier: "debated",
    sources: ["ScienceDirect — Vaporfly running economy study", "arXiv — Observational Study of Nike Vaporfly on Marathon Performance"],
    samples: ["do carbon plate shoes actually make me faster", "are supershoes worth it", "how much do vaporfly shoes help"],
    render: () =>
      "The shoe effect itself is well measured: carbon-plated 'supershoes' improve running economy by roughly 3-4% at race pace, worth an estimated 1-3% off marathon finish times. What's genuinely unresolved is how much of the last decade's world-record improvements come from shoes versus better pacing, flatter record courses, and a deeper global talent pool — no single study cleanly separates those factors for any specific record.",
  },

  {
    id: "ethnicity_performance_myth",
    topic: "medical",
    tier: "debated",
    sources: ["PMC9119534 — Genetic differentiation in East African ethnicities and endurance running success"],
    samples: [
      "are certain ethnicities better runners",
      "am I not built for running because of my ethnicity",
      "is running performance genetic",
    ],
    render: () =>
      "No reliable genetic test or established science ties your ancestry to an athletic performance ceiling. Popular claims about specific ethnicities being 'built for' sprinting or endurance mostly trace back to opinion pieces, not peer-reviewed research — a 2022 review looking specifically at elite East African runners found 'no compelling explanation' linking genetics to their success despite years of searching. Individual variation within any population dwarfs the average differences between populations. Train based on your own data, not your ancestry.",
  },
];
