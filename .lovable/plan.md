## Replace Color Wheel with RGB-Only Input

In `src/game/SettingsScreen.tsx`, remove the HSV color wheel canvas and the brightness (V) slider. Keep only the three R / G / B numeric inputs (which already exist at lines ~219–233) as the sole way to pick the background color.

### Changes (`src/game/SettingsScreen.tsx`)

1. **Delete unused code**:
   - `hsvToRgb`, `rgbToHsv` helpers
   - `WHEEL_SIZE` constant
   - `canvasRef`, `draggingRef`, `value` state, the wheel-drawing `useEffect`, `pickFromEvent`, and the `hue/sat/cursorX/cursorY` derivations
   - The `<canvas>` element + cursor dot block (lines ~168–197)
   - The brightness slider block (lines ~199–216)
   - Remove `useRef` from imports if no longer used
2. **Keep**:
   - `getSavedAccent`, `applyAccent` (background + contrast logic)
   - The "Background Color" heading
   - The R / G / B numeric inputs — make them a bit larger / clearer since they're now the primary control
   - The hex preview swatch
   - Reset / Save buttons
3. **Reset** simplifies to `setRgb(DEFAULT_RGB)` (no V state to reset).

Result: a compact settings panel with three labeled number fields (0–255 each), a live color swatch, and Save / Reset.