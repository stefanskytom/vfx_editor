# PixiVFX Weaver

AI-assisted **slot symbol VFX editor** for PixiJS. Upload a casino symbol, analyze its colors and shape, preview particle effects in real time, tune parameters per win state, and export production-ready configs for your game client.

**Repository:** [github.com/stefanskytom/vfx_editor](https://github.com/stefanskytom/vfx_editor)

**Stack:** React 19 · Vite · TypeScript · PixiJS v7 · `@pixi/particle-emitter`

---

## Features

### Symbol Input & AI Analysis
- Upload PNG/JPG slot symbols or use built-in presets (Golden Coin, Fire Wild)
- **Visual Agent** — extracts dominant/secondary/accent colors, shape, brightness, and VFX theme
- Auto-generates emitter presets and procedural particle sprite type

### Win State Composer
Five win states generated per symbol:
| State | Use case |
|-------|----------|
| Idle Loop | Symbol at rest on the reel |
| Win Small | Minor line win |
| Win Big | Large win burst |
| Jackpot | Top win celebration |
| Near Miss | Almost-win tease |

Edit each state independently and export as JSON.

### Live PixiJS Preview
- Real-time particle preview on a 600×500 canvas
- Drag to reposition emitter spawn point
- Performance monitor: FPS, frame time, CPU/GPU estimate, draw calls, particle count
- Loop or burst preview modes

### Emission Mask
Spawn particles from symbol geometry:
- **Point** — classic center emitter
- **Outline** — symbol edges
- **Fill** — inside symbol body
- **Hotspots** — brightest accent regions

Visual mask overlay on the canvas.

### Particle Textures
- **Auto** — procedural sprites (spark, flame, ember, magic dust, gold sparkle, etc.)
- **Library** — 80 bundled PNG textures with search and categories
- **Symbol** — reuse the slot symbol as particle texture
- **Custom** — upload your own sprite

### Timeline & Beat Sync
- Keyframe editor with playhead scrubbing
- BPM grid and snap-to-beat
- Per-keyframe modifiers: spawn rate, particles, scale, intensity

### Review Mode (Parameter Panel)
- 5 effect presets: Sparkle, Explosion, Fire, Orbit, Rain
- Color solid or multi-stop gradient (up to 8 stops)
- Alpha, scale, and color curves with easing
- Motion physics: speed, gravity, wind
- Blend modes: normal, add, multiply, screen
- Custom background image with Photoshop-like transform box (pan + scale)

### Export & Download
- **ZIP Package** — full production bundle: configs, JS boilerplate, particle sprite, symbol image, manifest
- Individual exports: `emitter.json`, `vfx-emitter.js`, `vfx-states.json`, `timeline.json`
- Copy to clipboard or download single files

---

## Getting Started

### Prerequisites
- [Node.js](https://nodejs.org/) 18+ (20+ recommended)
- [Cursor IDE](https://cursor.com/) or any code editor
- Git

### Clone & run

```bash
git clone https://github.com/stefanskytom/vfx_editor.git
cd vfx_editor
npm install
npm run dev
```

Open **http://localhost:5176/** in your browser.

### Open in Cursor
1. Launch Cursor → **File → Open Folder…**
2. Select the cloned `vfx_editor` directory
3. Open the integrated terminal (`Cmd+` ` or `Ctrl+` `)
4. Run `npm install` then `npm run dev`

### Useful scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port **5176** |
| `npm run dev:restart` | Kill port 5176 and restart (fixes stale UI) |
| `npm run build` | Type-check and production build |
| `npm run lint` | Run Oxlint |
| `npm run manual:build` | Regenerate PDF user manual with screenshots |

> **Tip:** If UI changes don't appear after an update, run `npm run dev:restart` and hard-refresh the browser (`Cmd+Shift+R` / `Ctrl+Shift+R`).

---

## User Manual

A full English PDF manual with screenshots is included:

📄 **[docs/PixiVFX_Weaver_User_Manual.pdf](docs/PixiVFX_Weaver_User_Manual.pdf)**

Covers setup in Cursor, every UI option, export formats, ZIP structure, workflow, and troubleshooting.

Regenerate after UI changes (requires dev server running on port 5176):

```bash
npm run manual:build
```

---

## ZIP Package Structure

Downloading **ZIP Package** from the left panel produces:

```
{symbol}-vfx/
├── README.txt
├── manifest.json
├── config/
│   ├── {symbol}-emitter.json
│   ├── {symbol}-params.json
│   ├── {symbol}-vfx-states.json
│   └── {symbol}-timeline.json
├── scripts/
│   └── {symbol}-vfx-emitter.js
└── textures/
    ├── particle.png
    └── symbol.jpg
```

JSON configs use relative texture paths ready for game integration.

---

## Project Structure

```
src/
├── App.tsx                 # Main app state & layout
├── components/
│   ├── VFXCanvas.tsx       # PixiJS preview canvas
│   ├── ControlPanel.tsx    # Review mode parameters
│   ├── WinStateComposer.tsx
│   ├── TimelineEditor.tsx
│   ├── ColorGradientEditor.tsx
│   └── ...
└── utils/
    ├── configGenerator.ts  # Emitter config builder
    ├── zipExporter.ts      # ZIP package export
    ├── winStates.ts        # Win state pack generator
    └── ...
docs/
└── PixiVFX_Weaver_User_Manual.pdf
```

---

## License

Private project — all rights reserved.
