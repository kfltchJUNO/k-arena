"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSFX, Wrap, Mid, Hdr, TBar, Card, TInput, SBtn, Ptcl, Rslt } from "@/lib/gameShared";

// ── GAME 1: 스피드 퀴즈 ───────────────────────────────────────
const SD = [
  { w: "사과", d: "🍎 빨간색 과일, 백설공주" }, { w: "학교", d: "📚 공부하는 곳" },
  { w: "가방", d: "🎒 책과 필통을 넣어요" }, { w: "강아지", d: "🐶 멍멍 짖어요" },
  { w: "고양이", d: "🐱 야옹 울어요" }, { w: "비행기", d: "✈️ 하늘을 날아요" },
  { w: "김치", d: "🌶️ 한국 대표 음식" }, { w: "겨울", d: "❄️ 추워요, 눈이 와요" },
  { w: "병원", d: "🏥 아프면 가요" }, { w: "버스", d: "🚌 많은 사람이 타는 차" },
];
export default function GameSpeed({ onBack }) {
  const sfx = useSFX();
  const [list] = useState(() => [...SD].sort(() => Math.random() - .5));
  const [idx, setIdx] = useState(0); const [score, setScore] = useState(0); const [combo, setCombo] = useState(0);
  const [time, setTime] = useState(15); const [input, setInput] = useState(""); const [phase, setPhase] = useState("idle");
  const [glow, setGlow] = useState(null); const [shake, setShake] = useState(false); const [pt, setPt] = useState(0);
  const [history, setHistory] = useState([]);
  const iref = useRef(null);

  const nxt = useCallback((ok, i) => {
    const ni = i + 1;
    if (ni >= list.length) { setPhase("end"); ok ? sfx.done() : sfx.over(); }
    else { setIdx(ni); setTime(15); setInput(""); setGlow(null); setPhase("playing"); setTimeout(() => iref.current?.focus(), 50); }
  }, [list.length, sfx]);

  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => setTime(p => {
      if (p <= 2) { sfx.timeout(); setCombo(0); setGlow("wrong"); setShake(true); setTimeout(() => { setShake(false); setGlow(null); }, 420); setTimeout(() => setIdx(i => { nxt(false, i); return i; }), 450); return 15; }
      if (p <= 5) sfx.tick(); return p - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [idx, phase, sfx, nxt]);

  const submit = () => {
    if (phase !== "playing" || !input.trim()) return;
    if (input.trim() === list[idx].w) {
      const nc = combo + 1; setCombo(nc); const pts = 20 + (nc >= 3 ? 10 : 0); setScore(s => s + pts);
      setPt(p => p + 1); setGlow("correct"); sfx.correct();
      setHistory(h => [...h, { word: list[idx].w, ok: true, pts, reason: nc >= 3 ? `${nc}콤보 보너스!` : null }]);
      setTimeout(() => nxt(true, idx), 460);
    } else { setCombo(0); setHistory(h => [...h, { word: list[idx].w, ok: false, pts: 0, reason: input.trim() ? `입력: ${input.trim()}` : '시간 초과' }]); setGlow("wrong"); setShake(true); sfx.wrong(); setTimeout(() => { setShake(false); setGlow(null); setInput(""); setTimeout(() => iref.current?.focus(), 40); }, 450); }
  };

  if (phase === "idle") return (
    <Wrap><Mid>
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 14, animation: "fadein .4s ease-out" }}>
        <div style={{ fontSize: "3rem" }}>⚡</div>
        <div style={{ fontSize: "1.6rem", fontWeight: 900 }}>스피드 퀴즈</div>
        <div style={{ color: "#64748b", fontSize: "0.82rem", lineHeight: 1.7 }}>설명을 읽고 단어를 빠르게 입력하세요<br />콤보로 보너스 점수!</div>
        <button onClick={() => { setPhase("playing"); sfx.start(); setTimeout(() => iref.current?.focus(), 80); }} style={{ padding: "13px 32px", borderRadius: 14, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", border: "none", color: "#fff", fontWeight: 800, cursor: "pointer", fontFamily: "inherit", fontSize: "1rem" }}>시작하기</button>
        <button onClick={() => onBack()} style={{ background: "none", border: "none", color: "#475569", cursor: "pointer", fontFamily: "inherit" }}>← 메인으로</button>
      </div>
    </Mid></Wrap>
  );
  if (phase === "end") return <Rslt score={score} maxScore={list.length * 20} onRetry={() => { setIdx(0); setScore(0); setCombo(0); setTime(15); setInput(""); setGlow(null); setHistory([]); setPhase("playing"); sfx.start(); setTimeout(() => iref.current?.focus(), 80); }} onBack={onBack} extra={[["콤보", combo + "연속"], ["정답", history.filter(h=>h.ok).length + "/" + list.length]]} detail={history} />;

  return (
    <Wrap>
      <Hdr onBack={onBack} score={score} prog={idx} total={list.length} />
      <TBar pct={time / 15} urgent={time <= 5} />
      <Mid>
        <Ptcl trigger={pt} />
        <div style={{ color: "#334155", fontSize: "0.7rem", letterSpacing: ".13em", marginBottom: 12 }}>{idx + 1} / {list.length}</div>
        <Card glow={glow} shake={shake}>
          <div style={{ position: "absolute", top: 14, right: 16, fontSize: "1.5rem", fontWeight: 900, color: time <= 5 ? "#ef4444" : "#2d3748" }}>{time}</div>
          {combo >= 2 && <div style={{ position: "absolute", top: 13, left: 14, background: "#ffd70018", border: "1px solid #ffd70055", color: "#ffd700", fontSize: "0.66rem", fontWeight: 700, padding: "2px 7px", borderRadius: 999 }}>🔥 {combo}연속</div>}
          <div style={{ fontSize: "1.22rem", fontWeight: 600, textAlign: "center", lineHeight: 1.6, marginTop: combo >= 2 ? 10 : 0 }}>{list[idx].d}</div>
          {glow === "correct" && <div style={{ color: "#22c55e", textAlign: "center", fontWeight: 700, marginTop: 8 }}>✓ {list[idx].w}</div>}
          {glow === "wrong" && input && <div style={{ color: "#ef4444", textAlign: "center", marginTop: 8 }}>✗ {input}</div>}
        </Card>
        <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 400, marginTop: 18 }}>
          <TInput value={input} onChange={e => { setInput(e.target.value); sfx.type(); }} onEnter={submit} placeholder="한국어로 입력하세요" glow={glow} />
          <SBtn onClick={submit}>→</SBtn>
        </div>
        <input ref={iref} style={{ position: "fixed", opacity: 0, pointerEvents: "none", width: 1, height: 1 }} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); submit(); } }} onChange={e => setInput(e.target.value)} value={input} />
      </Mid>
    </Wrap>
  );
}