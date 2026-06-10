import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AttackKind, EnemyDef, EnemyShape } from "@/game/types";

type AiDuelOpponent = {
  enemy: EnemyDef;
  intro: string;
  taunt: string;
  tactic: string;
  source: "gemini" | "fallback";
};

const RequestSchema = z.object({
  seed: z.string().max(80).optional(),
});

const FALLBACK_OPPONENT: AiDuelOpponent = {
  source: "fallback",
  intro: "A rival champion steps into the grid.",
  taunt: "You cleared the waves. Now prove you can read a human.",
  tactic: "Punishes panic blocks with fast pressure and delayed heavy swings.",
  enemy: {
    id: "duelist",
    name: "Mira Vale",
    title: "Blade Saint",
    maxHp: 100,
    isBoss: true,
    color: "oklch(0.74 0.18 25)",
    shape: "diamond",
    cadenceMs: [520, 920],
    attacks: [
      { id: "duel-thrust", kind: "thrust", windupMs: 360, parryWindowMs: 90, damage: 5, reflect: 2 },
      { id: "duel-slash", kind: "slash", windupMs: 560, parryWindowMs: 120, damage: 5, reflect: 2 },
      { id: "duel-heavy", kind: "heavy", windupMs: 880, parryWindowMs: 150, damage: 7, reflect: 3 },
    ],
  },
};

const DUEL_BOSS_IDS = ["duelist", "ronin", "champion"] as const;

const ATTACK_KINDS: AttackKind[] = ["slash", "thrust", "heavy"];
const SHAPES: EnemyShape[] = ["pentagon", "diamond", "circle", "triangle", "hex", "star"];

function clamp(n: unknown, min: number, max: number, fallback: number) {
  const value = Number(n);
  if (!Number.isFinite(value)) return fallback;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function cleanText(value: unknown, fallback: string, max = 90) {
  if (typeof value !== "string") return fallback;
  const clean = value.replace(/\s+/g, " ").trim();
  return clean ? clean.slice(0, max) : fallback;
}

function parseJsonObject(text: string) {
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Gemini did not return JSON");
    return JSON.parse(match[0]);
  }
}

function sanitizeOpponent(raw: any): AiDuelOpponent {
  const enemyRaw = raw?.enemy ?? raw ?? {};
  const attacksRaw = Array.isArray(enemyRaw.attacks) ? enemyRaw.attacks : [];
  const attacks = attacksRaw.slice(0, 3).map((attack: any, index: number) => {
    const kind = ATTACK_KINDS.includes(attack?.kind) ? attack.kind : ATTACK_KINDS[index % ATTACK_KINDS.length];
    const windupMs = clamp(attack?.windupMs, 320, 1150, kind === "heavy" ? 950 : 560);
    return {
      id: `ai-${kind}-${index}`,
      kind,
      windupMs,
      parryWindowMs: clamp(attack?.parryWindowMs, 80, 190, Math.round(windupMs * 0.22)),
      damage: kind === "heavy" ? clamp(attack?.damage, 6, 10, 7) : clamp(attack?.damage, 5, 8, 5),
      reflect: kind === "heavy" ? 3 : 2,
    };
  });

  return {
    source: "gemini",
    intro: cleanText(raw?.intro, FALLBACK_OPPONENT.intro, 130),
    taunt: cleanText(raw?.taunt, FALLBACK_OPPONENT.taunt, 110),
    tactic: cleanText(raw?.tactic, FALLBACK_OPPONENT.tactic, 120),
    enemy: {
      id: DUEL_BOSS_IDS[Math.floor(Math.random() * DUEL_BOSS_IDS.length)],
      name: cleanText(enemyRaw?.name, "Rival Champion", 28),
      title: cleanText(enemyRaw?.title, "Duel Boss", 42),
      maxHp: clamp(enemyRaw?.maxHp, 80, 140, 100),
      isBoss: true,
      color: cleanText(enemyRaw?.color, "oklch(0.72 0.18 210)", 32),
      shape: SHAPES.includes(enemyRaw?.shape) ? enemyRaw.shape : "diamond",
      cadenceMs: [
        clamp(enemyRaw?.cadenceMs?.[0], 380, 720, 520),
        clamp(enemyRaw?.cadenceMs?.[1], 650, 1200, 920),
      ],
      attacks: attacks.length ? attacks : FALLBACK_OPPONENT.enemy.attacks,
    },
  };
}

export const getAiDuelOpponent = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => RequestSchema.parse(d ?? {}))
  .handler(async ({ data }): Promise<AiDuelOpponent> => {
    const apiKey = process.env.GEMINI_API_KEY;
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
    if (!apiKey) return FALLBACK_OPPONENT;

    const prompt = [
      "Create one human boss opponent for a pixel-art browser game named PARRY.",
      "The player defeats bosses by blocking telegraphed attacks, then striking.",
      "Return only JSON with keys: intro, taunt, tactic, enemy.",
      "enemy must contain: name, title, maxHp, color, shape, cadenceMs, attacks.",
      "Use shape from pentagon, diamond, circle, triangle, hex, star.",
      "Use color as an oklch(...) CSS color.",
      "Create 2 or 3 attacks. Each attack has kind, windupMs, parryWindowMs.",
      "Attack kind must be slash, thrust, or heavy.",
      "The boss should average 100 HP. Attacks usually deal 5 damage; some heavy attacks can deal more.",
      "Difficulty should be tense, fast, and fair for a late-game 1v1 duel.",
      data.seed ? `Theme seed: ${data.seed}` : "Theme seed: arcade rival.",
    ].join(" ");

    try {
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: {
              responseMimeType: "application/json",
              temperature: 0.85,
              maxOutputTokens: 700,
            },
          }),
        },
      );
      if (!response.ok) return FALLBACK_OPPONENT;
      const json = await response.json();
      const text = json?.candidates?.[0]?.content?.parts
        ?.map((part: any) => part?.text ?? "")
        .join("")
        .trim();
      if (!text) return FALLBACK_OPPONENT;
      return sanitizeOpponent(parseJsonObject(text));
    } catch {
      return FALLBACK_OPPONENT;
    }
  });
