import { createServerFn } from "@tanstack/react-start";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { isAdminEmail } from "@/lib/admin";

const SaveKey = z.object({
  key: z.string().min(1).max(120),
  value: z.string().max(200_000).nullable(),
});

const LEADERBOARD_KEYS = [
  "parry.lifetimeGems",
  "parry.infinite.bestWave",
  "parry.infinite.bestWaveAt",
  "parry-gems",
];

type AuthedContext = {
  supabase: SupabaseClient<Database>;
  userId: string;
  claims?: { email?: string };
};

function authed(context: unknown): AuthedContext {
  return context as AuthedContext;
}

function createPublicSupabaseClient() {
  const SUPABASE_URL = process.env.SUPABASE_URL;
  const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) {
    const missing = [
      ...(!SUPABASE_URL ? ["SUPABASE_URL"] : []),
      ...(!SUPABASE_PUBLISHABLE_KEY ? ["SUPABASE_PUBLISHABLE_KEY"] : []),
    ];
    throw new Error(`Missing Supabase environment variable(s): ${missing.join(", ")}`);
  }

  return createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: undefined,
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function upsertProfile(context: AuthedContext) {
  const email = context.claims?.email;
  if (!email) return;
  const { error } = await context.supabase
    .from("game_profiles")
    .upsert({ user_id: context.userId, email, updated_at: new Date().toISOString() });
  if (error && error.code !== "42P01" && error.code !== "PGRST205") {
    throw new Error(error.message);
  }
}

export const pullSaves = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({}).parse(d ?? {}))
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const auth = authed(context);
    await upsertProfile(auth);
    const { data: rows, error } = await auth.supabase
      .from("game_saves")
      .select("key, value")
      .eq("user_id", auth.userId);
    if (error) throw new Error(error.message);
    const map: Record<string, string> = {};
    for (const r of rows ?? []) map[r.key] = r.value;
    return { saves: map };
  });

export const pushSave = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => SaveKey.parse(d))
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    const auth = authed(context);
    await upsertProfile(auth);
    if (data.value === null) {
      const { error } = await auth.supabase
        .from("game_saves")
        .delete()
        .eq("user_id", auth.userId)
        .eq("key", data.key);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await auth.supabase
        .from("game_saves")
        .upsert({
          user_id: auth.userId,
          key: data.key,
          value: data.value,
          updated_at: new Date().toISOString(),
        });
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export type GemRow = { nickname: string; gems: number };
export type WaveRow = { nickname: string; bestWave: number; achievedAt: number };

export const getCloudLeaderboards = createServerFn({ method: "GET" }).handler(
  async () => {
    const supabase = createPublicSupabaseClient();
    let profiles: { user_id: string; email: string; nickname?: string | null }[] = [];
    const profilesWithNicknames = await supabase
      .from("game_profiles")
      .select("user_id, email, nickname");
    if (profilesWithNicknames.error) {
      const profilesWithoutNicknames = await supabase
        .from("game_profiles")
        .select("user_id, email");
      if (
        profilesWithoutNicknames.error &&
        profilesWithoutNicknames.error.code !== "42P01" &&
        profilesWithoutNicknames.error.code !== "PGRST205"
      ) {
        throw new Error(profilesWithoutNicknames.error.message);
      }
      profiles = profilesWithoutNicknames.data ?? [];
    } else {
      profiles = profilesWithNicknames.data ?? [];
    }

    const { data: saves, error: savesError } = await supabase
      .from("game_saves")
      .select("user_id, key, value")
      .in("key", LEADERBOARD_KEYS);
    if (savesError) throw new Error(savesError.message);

    const nameByUser = new Map(
      (profiles ?? []).map((p) => [p.user_id, p.nickname?.trim() || p.email]),
    );
    const byUser = new Map<string, Record<string, string>>();
    for (const r of saves ?? []) {
      const m = byUser.get(r.user_id) ?? {};
      m[r.key] = r.value;
      byUser.set(r.user_id, m);
    }

    const gems: GemRow[] = [];
    const waves: WaveRow[] = [];
    for (const [userId, m] of byUser) {
      const nickname = nameByUser.get(userId) ?? userId.slice(0, 8);
      const lifetime = Number(m["parry.lifetimeGems"] ?? 0) || 0;
      const current = Number(m["parry-gems"] ?? 0) || 0;
      const g = Math.max(lifetime, current);
      if (g > 0) gems.push({ nickname, gems: g });
      const bw = Number(m["parry.infinite.bestWave"] ?? 0) || 0;
      const at = Number(m["parry.infinite.bestWaveAt"] ?? 0) || 0;
      if (bw > 0) waves.push({ nickname, bestWave: bw, achievedAt: at });
    }

    gems.sort((a, b) => b.gems - a.gems);
    waves.sort((a, b) => b.bestWave - a.bestWave || (a.achievedAt || 0) - (b.achievedAt || 0));

    return { gems: gems.slice(0, 100), waves: waves.slice(0, 100) };
  },
);

export const resetSeason = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const auth = authed(context);
    const email = auth.claims?.email ?? "";
    if (!isAdminEmail(email)) {
      throw new Error("Unauthorized");
    }
    const { error } = await auth.supabase
      .from("game_saves")
      .delete()
      .in("key", LEADERBOARD_KEYS);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
