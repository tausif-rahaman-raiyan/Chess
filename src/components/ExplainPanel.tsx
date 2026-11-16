import React from 'react';
import { BookOpen, Cpu, Lightbulb, Sparkles, Target, X } from 'lucide-react';
import { ExplanationLevel } from '../shared/types';
import { lookupOpeningByFen } from '../core/openingBook';
import { useAppStore } from '../store/useAppStore';
import { useGameStore } from '../store/useGameStore';

export const ExplainPanel: React.FC = () => {
  const { settings, updateSettings } = useAppStore();
  const {
    fen,
    initialFen,
    moves,
    viewPly,
    explainOpen,
    explainLoading,
    explainResult,
    currentEval,
    setPreviewMoveUci,
    closeExplain,
    openExplainForSquare,
    explainTargetSquare,
  } = useGameStore();

  if (!explainOpen) return null;

  const histFens = [initialFen, ...moves.slice(0, viewPly).map((m) => m.fenAfter)];
  const opening = lookupOpeningByFen(fen, histFens);

  const handleLevelSwitch = (lvl: ExplanationLevel) => {
    void updateSettings({ explanationLevel: lvl });
    if (explainTargetSquare) {
      void openExplainForSquare(explainTargetSquare);
    }
  };

  return (
    <aside
      className="card anim-drawer-slide"
      style={{
        width: 370,
        maxHeight: '100%',
        overflowY: 'auto',
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
        borderLeft: '2px solid var(--accent)',
      }}
    >
      {/* Header + Level Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={17} color="var(--accent)" />
          <span style={{ fontWeight: 800, fontSize: 14 }}>Coach Explanation</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {(['beginner', 'intermediate', 'advanced'] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              onClick={() => handleLevelSwitch(lvl)}
              style={{
                padding: '3px 7px',
                fontSize: 10.5,
                fontWeight: 700,
                borderRadius: 6,
                border: '1px solid var(--border-subtle)',
                background: settings.explanationLevel === lvl ? 'var(--accent)' : 'var(--bg-app)',
                color: settings.explanationLevel === lvl ? '#06131f' : 'var(--text-secondary)',
                cursor: 'pointer',
                textTransform: 'capitalize',
              }}
            >
              {lvl.slice(0, 3)}
            </button>
          ))}
          <button
            type="button"
            onClick={closeExplain}
            title="Close Panel"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Verification Source Pill */}
      {explainResult && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '2px 8px',
              borderRadius: 999,
              fontWeight: 700,
              background:
                explainResult.source === 'ai-worded'
                  ? 'rgba(56, 189, 248, 0.16)'
                  : 'rgba(130, 182, 76, 0.18)',
              color: explainResult.source === 'ai-worded' ? '#38bdf8' : '#a3e635',
            }}
          >
            <Cpu size={12} />
            {explainResult.source === 'ai-worded' ? 'AI-worded (Verified)' : 'Engine-verified'}
          </span>
          <span style={{ color: 'var(--text-muted)' }}>{explainResult.modelName}</span>
        </div>
      )}

      {/* SECTION A: OPENING BOOK */}
      <section style={sectionBoxStyle}>
        <div style={sectionHeaderStyle}>
          <BookOpen size={14} color="#f59e0b" />
          <span>A) Opening Book</span>
          <span style={{ marginLeft: 'auto', fontSize: 11, color: '#fbbf24', fontWeight: 700 }}>
            {opening.eco}
          </span>
        </div>
        <div style={{ fontWeight: 700, fontSize: 13 }}>{opening.name}</div>
        {!opening.inBook && opening.outOfBookMoveNumber && (
          <div style={{ fontSize: 11.5, color: '#f59e0b' }}>
            Out of book at move {opening.outOfBookMoveNumber}
          </div>
        )}
        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.45 }}>
          {opening.mainPlan}
        </p>
        {opening.bookMoves.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, marginTop: 4 }}>
            {opening.bookMoves.slice(0, 4).map((bm) => (
              <div
                key={bm.uci}
                onMouseEnter={() => setPreviewMoveUci(bm.uci)}
                onMouseLeave={() => setPreviewMoveUci(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  fontSize: 11.5,
                  padding: '4px 8px',
                  borderRadius: 6,
                  background: 'var(--bg-app)',
                  cursor: 'pointer',
                }}
              >
                <span style={{ fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{bm.san}</span>
                <span style={{ color: 'var(--text-muted)' }}>{bm.games.toLocaleString()} games</span>
                <span style={{ color: '#86efac', fontWeight: 600 }}>
                  W {bm.whitePct}% / D {bm.drawPct}% / B {bm.blackPct}%
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {explainLoading ? (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
          Stockfish 17 & Local Coach analyzing position...
        </div>
      ) : (
        explainResult && (
          <>
            {/* SECTION B: FULL EXPLANATION */}
            <section style={sectionBoxStyle}>
              <div style={sectionHeaderStyle}>
                <Sparkles size={14} color="var(--accent)" />
                <span>B) Full Position Explanation</span>
              </div>
              <p style={{ fontSize: 12.5, lineHeight: 1.5 }}>{explainResult.summary}</p>
              {explainResult.pieceOrMoveDetail && (
                <p
                  style={{
                    fontSize: 12,
                    lineHeight: 1.45,
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-app)',
                    padding: '7px 9px',
                    borderRadius: 6,
                  }}
                >
                  {explainResult.pieceOrMoveDetail}
                </p>
              )}
            </section>

            {/* SECTION C: WHAT SHOULD I MOVE */}
            <section style={sectionBoxStyle}>
              <div style={sectionHeaderStyle}>
                <Target size={14} color="#81b64c" />
                <span>C) What Should I Move</span>
                {currentEval?.bestMoveSan && (
                  <span
                    style={{
                      marginLeft: 'auto',
                      background: '#81b64c',
                      color: '#fff',
                      padding: '2px 8px',
                      borderRadius: 6,
                      fontFamily: 'var(--font-mono)',
                      fontWeight: 800,
                      fontSize: 12,
                    }}
                  >
                    {currentEval.bestMoveSan}
                  </span>
                )}
              </div>
              <p style={{ fontSize: 12.5, lineHeight: 1.5 }}>{explainResult.whyBest}</p>
              {currentEval?.lines[0] && (
                <div
                  style={{
                    fontSize: 11.5,
                    fontFamily: 'var(--font-mono)',
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-app)',
                    padding: '5px 8px',
                    borderRadius: 6,
                  }}
                >
                  Main line: {currentEval.lines[0].pvSan.slice(0, 6).join(' ')}
                </div>
              )}
            </section>

            {/* SECTION D: NEXT 3-4 IDEAS */}
            <section style={sectionBoxStyle}>
              <div style={sectionHeaderStyle}>
                <Lightbulb size={14} color="#38bdf8" />
                <span>D) Next 3–4 Candidate Ideas</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {explainResult.ideas.slice(0, 4).map((idea, idx) => (
                  <button
                    key={`${idea.san}-${idx}`}
                    type="button"
                    onMouseEnter={() => idea.uci && setPreviewMoveUci(idea.uci)}
                    onMouseLeave={() => setPreviewMoveUci(null)}
                    onClick={() => idea.uci && setPreviewMoveUci(idea.uci)}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 3,
                      padding: '7px 9px',
                      borderRadius: 8,
                      border: '1px solid var(--border-subtle)',
                      background: 'var(--bg-app)',
                      textAlign: 'left',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: 12.5 }}>
                        {idx + 1}. {idea.san}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {idea.evalText}
                      </span>
                    </div>
                    <span style={{ fontSize: 11.5, color: 'var(--text-secondary)', lineHeight: 1.35 }}>
                      {idea.reason}
                    </span>
                  </button>
                ))}
              </div>
            </section>
          </>
        )
      )}
    </aside>
  );
};

const sectionBoxStyle: React.CSSProperties = {
  background: 'var(--bg-surface-elevated)',
  border: '1px solid var(--border-subtle)',
  borderRadius: 10,
  padding: 10,
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
};

const sectionHeaderStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 11.5,
  fontWeight: 800,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  color: 'var(--text-secondary)',
};
