# Changelog

## v1.0.0 (2026-11-16)
- Initial release of OfflineChess Pro for Windows x64.
- Stockfish 17 CPU auto-detection (BMI2, AVX2, SSE4.1, x86-64) + WASM fallback.
- Continuous 0–3500 Elo calibration with humanized MultiPV=6 sampling below 1320 Elo.
- Real-time move quality badges (`!!`, `!`, `★`, `✓`, `○`, `?!`, `?`, `??`, `✕`, `📖`) on player moves.
- Grounded local GGUF coaching drawer with deterministic fact validator and template fallback.
- 14 board themes, 14 distinct SVG piece styles, Focus Mode, SQLite WAL storage, and Full Game Review.
