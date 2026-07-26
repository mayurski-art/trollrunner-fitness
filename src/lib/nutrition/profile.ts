import { getClient } from "@/lib/accounts/client";

export type BodyProfile = {
  age: number | null;
  sex: string | null;
  heightCm: number | null;
  weightKg: number | null;
};

export async function getBodyProfile(userId: string): Promise<BodyProfile> {
  const sb = getClient();
  const { data } = await sb
    .from("fit_profiles")
    .select("age, sex, height_cm, weight_kg")
    .eq("user_id", userId)
    .maybeSingle();
  return {
    age: data?.age ?? null,
    sex: data?.sex ?? null,
    heightCm: data?.height_cm ?? null,
    weightKg: data?.weight_kg ?? null,
  };
}
