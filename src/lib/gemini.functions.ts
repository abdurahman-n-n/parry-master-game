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
  intro: "A quiet challenger steps into the grid.",
  taunt: "Read the windup. I will not swing twice the same way.",
  tactic: "Alternates fast thrusts with slower heavy pressure.",
  enemy: {
    id: "knight",
    name: "Mirror Knight",
    title: "AI Duelist",
    maxHp: 7,
    isBoss: true,
    color: "oklch(0.72 0.18 210)",
    shape: "diamond",
    cadenceMs: [650, 1050],
    attacks: [
      { id: "ai-thrust", kind: "thrust", windupMs: 420, parryWindowMs: 100, damage: 1, reflect: 1 },
      { id: "ai-slash", kind: "slash", windupMs: 620, parryWindowMs: 130, damage: 1, reflect: 1 },
      { id: "ai-heavy", kind: "heavy", windupMs: 980, parryWindowMs: 160, damage: 1, reflect: 1 },
    ],
  },
};

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
      damage: 1,
      reflect: 1,
    };
  });

  return {
    source: "gemini",
    intro: cleanText(raw?.intro, FALLBACK_OPPONENT.intro, 130),
    taunt: cleanText(raw?.taunt, FALLBACK_OPPONENT.taunt, 110),
    tactic: cleanText(raw?.tactic, FALLBACK_OPPONENT.tactic, 120),
    enemy: {
      id: "knight",
      name: cleanText(enemyRaw?.name, "Gemini Duelist", 28),
      title: cleanText(enemyRaw?.title, "AI Duelist", 42),
      maxHp: clamp(enemyRaw?.maxHp, 5, 10, 7),
      isBoss: true,
      color: cleanText(enemyRaw?.color, "oklch(0.72 0.18 210)", 32),
      shape: SHAPES.includes(enemyRaw?.shape) ? enemyRaw.shape : "diamond",
      cadenceMs: [
        clamp(enemyRaw?.cadenceMs?.[0], 480, 950, 650),
        clamp(enemyRaw?.cadenceMs?.[1], 760, 1500, 1100),
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
      "Create one opponent for a pixel-art browser game named PARRY.",
      "The player has 1 HP and defeats enemies by blocking telegraphed attacks, then striking.",
      "Return only JSON with keys: intro, taunt, tactic, enemy.",
      "enemy must contain: name, title, maxHp, color, shape, cadenceMs, attacks.",
      "Use shape from pentagon, diamond, circle, triangle, hex, star.",
      "Use color as an oklch(...) CSS color.",
      "Create 2 or 3 attacks. Each attack has kind, windupMs, parryWindowMs.",
      "Attack kind must be slash, thrust, or heavy.",
      "Difficulty should be tense but fair for a 1v1 duel.",
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
