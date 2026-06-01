# Plan — Characters, Skins, Movement, Crowns

Heads-up on IP: "Chara" and "Hollow Knight" are copyrighted characters, so I won't replicate them 1:1. I'll build original homages with different names and original sprite art (you can rename them in-game later). Thorfinn is also a known character — I'll do a generic viking under a different name. Suggested names:
- "The Fallen" (red-slash glitch kid) — replaces Chara
- "Hollow" (small cloaked knight with a needle) — replaces Hollow Knight
- "Bjorn the Viking" (bearded shield+greatsword) — replaces Thorfinn

If you want different names, tell me and I'll swap.

## 1. Shop screen (new)
New `ShopScreen.tsx` reachable from menu (`🛒 Shop` button) with two tabs:
- **Characters** — buy with gems. Locked characters greyed out with cost.
- **Skins** — buy with credits, grouped by character. Equipping a skin is free once owned.

Persistence in `localStorage`:
- `parry-owned-characters` → string[] (default `["kid"]`)
- `parry-owned-skins` → string[] (default `["kid:default"]`)
- `parry-equipped` → `{ characterId, skinId }` (default kid/default)

## 2. Characters & skins data
New `src/game/characters.ts`:
```ts
CHARACTERS = [
  { id: "kid",    name: "The Kid",   cost: 0,   currency: "credits" },
  { id: "hollow", name: "Hollow",    cost: 120, currency: "credits" },
  { id: "bjorn",  name: "Bjorn",     cost: 100, currency: "credits" },
]
SKINS = [
  { id: "kid:default",  characterId: "kid",    name: "Default", cost: 0 },
  { id: "kid:fallen",   characterId: "kid",    name: "The Fallen",
    cost: 9, currency: "gems",
    effects: { slashColor: "red", killNumbers: true } },
  { id: "hollow:default",  ... },
  { id: "bjorn:default",   ... },
]
```

## 3. Sprites
Extend `PixelHero.tsx` (or new `PixelCharacters.tsx`) with three original pixel-art sprites:
- **Kid / Fallen skin** — same kid base, striped sweater palette swap, red slash trail.
- **Hollow** — small cloaked figure, horned mask, long thin needle weapon. Original art, not the copyrighted design.
- **Bjorn** — bearded viking, round wooden shield (left), heavy two-hander (right).

Each character exposes `{ slashColor, weaponShape }` so `ParryGame` renders the correct strike VFX.

## 4. "Fallen" kill VFX
When the equipped skin has `killNumbers: true` and the player lands a killing strike, spawn a floating `99999999` in red above the enemy for ~700ms (CSS keyframe, position-absolute over the enemy sprite). Plain damage-number art, no copyrighted font.

## 5. Movement & dodge (W/A/S/D)
In `ParryGame.tsx`:
- Add `playerPos {x,y}` state, clamped to arena bounds, moved by held W/A/S/D at ~180 px/s in the rAF loop.
- Each attack gets a **danger zone** (red translucent shape) anchored on the enemy and shaped by attack kind:
  - `slash` → wide arc in front
  - `thrust` → narrow forward rectangle
  - `heavy` → large circle around enemy
- Zone appears during windup, peaks at hit moment.
- On hit resolution: if player center is **inside** the zone → only Parry can save them (current behavior). If **outside** → attack misses entirely (free dodge, no parry needed, no reward — enemy just recovers).
- Hero sprite renders at `playerPos` instead of a fixed slot.

## 6. Click-to-block + 1.5s riposte window
Replace the current single-press parry with a two-step rhythm:
- **Click / Space** = raise block. If pressed inside the parry window of an active attack → block succeeds, enemy is staggered, and a **1.5s riposte window** opens.
- During riposte window, next Click/Space = strike (deals the reflect damage). Missing the 1.5s window = no damage but no death either.
- If block is pressed with no active attack → small cooldown (~250ms) so you can't spam.
- Defeat condition unchanged: getting hit by an in-zone attack without a successful block = death.

HUD: small "BLOCK → STRIKE (1.5s)" indicator with a shrinking bar during the riposte window.

## 7. Crowns
- New currency `parry-crowns` in `Currency.tsx` with `getCrowns()` / `addCrowns()` and a `CrownIcon` (simple 3-point pixel crown).
- Award **+1 crown** when the player completes wave 20 of a run (in `GameShell.onFightEnd`, check `wave === 20 && result === "victory"`).
- Show crowns in the menu HUD alongside credits/gems. (No spend sink yet — you said you'll tell me what gems/crowns are for later; crowns will just accumulate.)

## 8. Wire-up
- `GameShell` loads equipped character/skin, passes `character` + `skinEffects` into `ParryGame`.
- Menu gets `🛒 Shop` button next to `⚙ Settings`.
- Shop buttons: `Buy` (deducts currency, adds to owned), `Equip` (sets equipped), `Equipped` (disabled).

## Files touched
- new: `src/game/ShopScreen.tsx`, `src/game/characters.ts`, `src/game/PixelCharacters.tsx`
- edit: `src/game/GameShell.tsx`, `src/game/ParryGame.tsx`, `src/game/Currency.tsx`, `src/game/content.ts` (attack metadata for danger-zone shape), `src/game/types.ts`

Confirm the renamed characters (Fallen / Hollow / Bjorn) are OK and I'll build it.
