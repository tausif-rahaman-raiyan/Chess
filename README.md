# OfflineChess Pro (Windows x64 Desktop App)

**OfflineChess Pro** is a 100% offline, privacy-first Windows chess workstation built with **Electron, React, TypeScript, SQLite (WAL), Stockfish 17 UCI**, and **local GGUF AI coaching (`node-llama-cpp` + `Qwen2.5-1.5B-Instruct`)**.

- **Zero Internet Required at Runtime:** Enforced via Electron `webRequest` firewall + strict CSP (`connect-src 'none'`).
- **0 to 3500 Rating Calibration:** Continuous slider + typed Elo + 10 presets + adaptive Level Test.
- **Spoiler-Free Live Matches:** No best-move arrows or engine evaluations appear during a match until you explicitly click **Hint**.
- **Real-Time Move Quality Badges (Your Moves Only):** Instant `!!`, `!`, `★`, `✓`, `○`, `?!`, `?`, `??`, `✕`, `📖` badges on your moves.
- **Click-to-Explain Coach Drawer:** Click any piece or move to inspect opening statistics, plain-language position explanations, best move + main line, and 3–4 clickable candidate ideas.
- **14 Board Themes & 14 Distinct SVG Piece Styles** + **Focus Mode** + **Full Game Review**.

---

## Automatic Windows EXE Build on GitHub (`tausif-rahaman-raiyan/Chess`)

This repository includes `.github/workflows/build-windows.yml`, which automatically fetches & SHA-256-verifies Stockfish 17 + the Qwen2.5-1.5B GGUF model, runs tests, and compiles both the **Windows NSIS Installer** (allowing installation on any drive/folder) and the **Portable `.exe`**.

### One-Time Upload Commands

```bash
git init
git add .
git commit -m "Initial release: OfflineChess Pro v1.0.0"
git branch -M main
git remote add origin https://github.com/tausif-rahaman-raiyan/Chess.git
git push -u origin main
```

To also publish a **GitHub Release** with downloadable `.exe` assets attached:

```bash
git tag v1.0.0
git push origin v1.0.0
```

Download your compiled Windows `.exe` files from **GitHub → Actions → Windows x64 NSIS + Portable Build → Artifacts** (or **Releases** when tagged).

---

## Local Development on Windows

1. **Install dependencies:**
   ```bash
   npm install
   ```
2. **Download & SHA-256 verify Stockfish 17 + Qwen2.5-1.5B GGUF model:**
   ```bash
   npm run fetch:resources
   ```
3. **Run in development mode:**
   ```bash
   npm run dev
   ```
4. **Build Windows NSIS Installer + Portable EXE locally:**
   ```bash
   npm run dist:win
   ```

---

## Customization & Maintenance

- **Swap or Add GGUF Models:** Open **Settings → Stockfish 17 & Local AI Coach → Import Custom `.gguf` Model** (recommended: Qwen2.5-3B-Instruct Q4_K_M on machines with ≥8 GB RAM).
- **Add Board Themes or Piece Styles:** Add entries to `src/components/board/boardThemes.ts` or `src/components/pieces/pieceSets.tsx`.
- **Regenerate Opening Book:** Run `npm run build:book` to rebuild `resources/book/openings.json`.
- **Windows SmartScreen Note:** Unsigned local builds may show *"Windows protected your PC"*. Click **More info → Run anyway**, or configure `CSC_LINK` and `CSC_KEY_PASSWORD` secrets in GitHub for code signing.
