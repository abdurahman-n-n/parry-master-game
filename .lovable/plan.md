## Goal
Recolor the GUI around the deep indigo `rgb(50, 33, 137)` (≈ `#322189`) while keeping the Undertale-style pixel look.

## Where it changes
All color updates happen in `src/styles.css` via design tokens — no component edits needed.

- `--background`: deep indigo (`rgb(50,33,137)`) instead of pure black
- `--foreground`: keep near-white for readable pixel text on indigo
- `--primary`: white (used as the "strike" / button fill)
- `--accent`: a lighter indigo/violet derived from the base, used for the parry window and highlights
- `--danger`: keep the red telegraph (clear contrast on indigo)
- `--muted` / `--muted-foreground`: darker indigo + soft lavender for secondary UI
- `--border`: light indigo-tinted border so panels read against the new background

## Result
- Title screen, arena frame, HP bars, buttons, and log panel all sit on the indigo background.
- Parry window glows in a lighter violet; incoming attack stays red so timing reads clearly.
- No layout or gameplay changes — purely a palette swap through tokens.

## Technical notes
Values defined in `oklch()` (project convention). Approximate mapping:

```text
--background        oklch(0.28 0.16 280)   /* rgb(50,33,137) */
--foreground        oklch(0.97 0.01 280)   /* near white, faint indigo tint */
--primary           oklch(1 0 0)
--accent            oklch(0.70 0.18 285)   /* lighter violet */
--danger            oklch(0.65 0.25 25)    /* unchanged */
--muted             oklch(0.22 0.14 280)
--muted-foreground  oklch(0.80 0.06 285)
--border            oklch(0.75 0.10 285)
```

One file touched: `src/styles.css`.
