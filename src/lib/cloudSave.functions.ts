import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { createHash, randomBytes, timingSafeEqual } from "crypto";

const NickPass = z.object({
  nickname: z.string().trim().min(1).max(32),
  password: z.string().min(1).max(200),
});

function hashPassword(password: string, salt: string): string {
  return createHash("sha256").update(`${salt}:${password}`).digest("hex");
}
function makeHash(password: string): string {
  const salt = randomBytes(16).toString("hex");
  return `${salt}$${hashPassword(password, salt)}`;
}
function verify(password: string, stored: string): boolean {
  const [salt, hash] = stored.split("$");
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, "hex");
  const b = Buffer.from(hashPassword(password, salt), "hex");
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export const registerAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => NickPass.parse(d))
  .handler(async ({ data }) => {
    const nick = data.nickname.trim();
    const lower = nick.toLowerCase();
    const { data: existing } = await supabaseAdmin
      .from("game_accounts")
      .select("id")
      .eq("nickname_lower", lower)
      .maybeSingle();
    if (existing) throw new Error("Nickname already taken");
    const { data: acct, error } = await supabaseAdmin
      .from("game_accounts")
      .insert({ nickname: nick, nickname_lower: lower, password_hash: makeHash(data.password) })
      .select("id")
      .single();
    if (error || !acct) throw new Error("Could not create account");
    const token = randomBytes(32).toString("hex");
    await supabaseAdmin.from("game_sessions").insert({ token, account_id: acct.id });
    return { token, nickname: nick };
  });

export const loginAccount = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => NickPass.parse(d))
  .handler(async ({ data }) => {
    const nick = data.nickname.trim();
    const lower = nick.toLowerCase();
    const { data: acct } = await supabaseAdmin
      .from("game_accounts")
      .select("id, nickname, password_hash")
      .eq("nickname_lower", lower)
      .maybeSingle();

    let accountId: string;
    let nickname: string;

    if (!acct) {
      // No account exists yet — auto-create on first login (matches the
      // previous local-only flow so players aren't locked out).
      const { data: created, error } = await supabaseAdmin
        .from("game_accounts")
        .insert({ nickname: nick, nickname_lower: lower, password_hash: makeHash(data.password) })
        .select("id, nickname")
        .single();
      if (error || !created) throw new Error("Could not create account");
      accountId = created.id;
      nickname = created.nickname;
    } else {
      if (!verify(data.password, acct.password_hash)) {
        throw new Error("Invalid nickname or password");
      }
      accountId = acct.id;
      nickname = acct.nickname;
    }

    const token = randomBytes(32).toString("hex");
    await supabaseAdmin.from("game_sessions").insert({ token, account_id: accountId });
    return { token, nickname };
  });

async function accountFromToken(token: string): Promise<string> {
  const { data } = await supabaseAdmin
    .from("game_sessions")
    .select("account_id")
    .eq("token", token)
    .maybeSingle();
  if (!data) throw new Error("Session expired, please log in again");
  return data.account_id;
}

export const pullSaves = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ token: z.string().min(1) }).parse(d))
  .handler(async ({ data }) => {
    const accountId = await accountFromToken(data.token);
    const { data: rows } = await supabaseAdmin
      .from("game_saves")
      .select("key, value")
      .eq("account_id", accountId);
    const map: Record<string, string> = {};
    for (const r of rows ?? []) map[r.key] = r.value;
    return { saves: map };
  });

export const pushSave = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z.object({
      token: z.string().min(1),
      key: z.string().min(1).max(120),
      value: z.string().max(200_000).nullable(),
    }).parse(d),
  )
  .handler(async ({ data }) => {
    const accountId = await accountFromToken(data.token);
    if (data.value === null) {
      await supabaseAdmin.from("game_saves").delete().eq("account_id", accountId).eq("key", data.key);
    } else {
      await supabaseAdmin
        .from("game_saves")
        .upsert({ account_id: accountId, key: data.key, value: data.value, updated_at: new Date().toISOString() });
    }
    return { ok: true };
  });

const LEADERBOARD_KEYS = [
  "parry.lifetimeGems",
  "parry.infinite.bestWave",
  "parry.infinite.bestWaveAt",
];

export type GemRow = { nickname: string; gems: number };
export type WaveRow = { nickname: string; bestWave: number; achievedAt: number };

export const getCloudLeaderboards = createServerFn({ method: "GET" }).handler(
  async () => {
    const { data: accounts } = await supabaseAdmin
      .from("game_accounts")
      .select("id, nickname");
    const { data: saves } = await supabaseAdmin
      .from("game_saves")
      .select("account_id, key, value")
      .in("key", LEADERBOARD_KEYS);

    const byAcct = new Map<string, Record<string, string>>();
    for (const r of saves ?? []) {
      const m = byAcct.get(r.account_id) ?? {};
      m[r.key] = r.value;
      byAcct.set(r.account_id, m);
    }

    const gems: GemRow[] = [];
    const waves: WaveRow[] = [];
    for (const a of accounts ?? []) {
      const m = byAcct.get(a.id) ?? {};
      const g = Number(m["parry.lifetimeGems"] ?? 0) || 0;
      if (g > 0) gems.push({ nickname: a.nickname, gems: g });
      const bw = Number(m["parry.infinite.bestWave"] ?? 0) || 0;
      const at = Number(m["parry.infinite.bestWaveAt"] ?? 0) || 0;
      if (bw > 0) waves.push({ nickname: a.nickname, bestWave: bw, achievedAt: at });
    }

    gems.sort((a, b) => b.gems - a.gems);
    waves.sort(
      (a, b) => b.bestWave - a.bestWave || (a.achievedAt || 0) - (b.achievedAt || 0),
    );

    return { gems: gems.slice(0, 100), waves: waves.slice(0, 100) };
  },
);

export const resetSeason = createServerFn({ method: "POST" }).handler(
  async () => {
    await supabaseAdmin
      .from("game_saves")
      .delete()
      .in("key", LEADERBOARD_KEYS);
    return { ok: true };
  },
);
