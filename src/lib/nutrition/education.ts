export function preWorkoutTips(): string[] {
  return [
    "Eat a carb-focused meal 2-3 hours before training, or a small snack 30-60 min before if that's all the time you have.",
    "Keep pre-workout food low in fat and fiber to avoid GI issues, especially before running.",
    "Sip water in the hours leading up to training rather than chugging right before.",
  ];
}

export function postWorkoutTips(workoutType: string | null): string[] {
  const common = [
    "Aim for protein + carbs within about 2 hours after training — the exact minute doesn't matter as much as getting there.",
    "Rehydrate with water; add electrolytes if the session was long or sweaty.",
  ];
  if (workoutType === "Long run" || workoutType === "Race / long run") {
    return [
      "Long runs deplete glycogen the most — prioritize carbs in the next meal, not just protein.",
      ...common,
    ];
  }
  if (workoutType && /rest/i.test(workoutType)) {
    return [
      "Rest day — eat at your target calories and lean slightly more on protein to support recovery.",
    ];
  }
  return common;
}

export function raceFuelingTips(raceDistanceMi: number | null): string[] {
  if (raceDistanceMi === null) {
    return [
      "Set a race goal with a target distance (from onboarding or the Coach tab) to get distance-specific fueling guidance here.",
    ];
  }
  if (raceDistanceMi <= 3.2) {
    return [
      "5K-distance efforts don't need mid-race fueling — a light pre-race snack 1-2 hours out is plenty.",
      "Don't experiment with anything new on race morning.",
    ];
  }
  if (raceDistanceMi <= 6.3) {
    return [
      "10K is still short enough that fueling during the race is optional for most runners.",
      "A carb-focused dinner the night before helps top off glycogen.",
    ];
  }
  if (raceDistanceMi <= 13.2) {
    return [
      "Consider one gel or carb source around 45-60 minutes in for a half marathon.",
      "Practice your exact race-morning breakfast on a long training run first.",
    ];
  }
  return [
    "Marathon+ distances: plan 30-60g of carbs per hour once you're past the first 45 minutes.",
    "Carb-load for 1-2 days before the race by shifting toward more carbs, not necessarily more calories.",
    "Rehearse your full fueling plan (gels/chews/drink) on at least one long run — race day is not the place to test it.",
  ];
}

export function supplementNotes(): string[] {
  return [
    "Creatine monohydrate (3-5g/day) has the strongest evidence base for strength/power support — consistent daily use matters more than timing.",
    "A protein supplement is just a convenient way to hit your protein target, not a requirement — whole food works the same if you prefer it.",
    "Electrolytes matter most for sessions over ~90 minutes or in heat — plain water is fine for shorter, easier efforts.",
    "This is general education, not a prescription — check with a doctor before starting any supplement, especially with existing medical conditions.",
  ];
}
