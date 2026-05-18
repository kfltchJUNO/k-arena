"use client";
import { useState, useEffect, useRef } from "react";
import { useSFX, Wrap, Mid, Hdr, TBar, Card, TInput, SBtn, Ptcl, Rslt } from "@/lib/gameShared";

// ── GAME 6: 유의어 잇기 ───────────────────────────────────────
const YD = [
  { w: "기쁨", a: "즐거움" }, { w: "슬픔", a: "비통함" }, { w: "빠른", a: "신속한" },
  { w: "크다", a: "거대하다" }, { w: "친구", a: "벗" }, { w: "이야기", a: "얘기" },
  { w: "바라다", a: "원하다" }, { w: "아름다운", a: "예쁜" },
];
export default function GameSynonym({ onBack }) {
  const sfx = useSFX();
  const [list] = useState(() => [...YD].sort(() => Math.random() - .5));
  const [idx, setIdx] = useState(0); const [score, setScore] = useState(0); const [time, setTime] = useState(60);
  const [input, setInput] = useState(""); const [phase, setPhase] = useState("playing");
  const [glow, setGlow] = useState(null); const [shake, setShake] = useState(false);
  const [pt, setPt] = useState(0); const [checking, setChecking] = useState(false); const [accepted, setAccepted] = useState("");
  const [history, setHistory] = useState([]);
  const iref = useRef(null);
  useEffect(() => setTimeout(() => iref.current?.focus(), 80), []);

  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => setTime(p => { if (p <= 1) { setPhase("end"); sfx.over(); return 0; } if (p <= 10) sfx.tick(); return p - 1; }), 1000);
    return () => clearInterval(id);
  }, [phase, sfx]);

  const passQ = v => { setScore(s => s + 20); setPt(p => p + 1); setGlow("correct"); setAccepted(v); setHistory(h => [...h, { word: list[idx].w, ok: true, pts: 20, reason: v !== list[idx].a ? `'${v}' 인정` : null }]); sfx.correct(); setTimeout(() => { if (idx + 1 >= list.length) { setPhase("end"); sfx.done(); } else { setIdx(i => i + 1); setInput(""); setGlow(null); setAccepted(""); setTimeout(() => iref.current?.focus(), 50); } }, 550); };
  const failQ = () => { setHistory(h => [...h, { word: list[idx].w, ok: false, pts: 0, answer: list[idx].a, reason: input.trim() ? `'${input.trim()}' 불인정` : null }]); setGlow("wrong"); setShake(true); sfx.wrong(); setTimeout(() => { setShake(false); setGlow(null); setInput(""); setTimeout(() => iref.current?.focus(), 40); }, 460); };

  const submit = async () => {
    const val = input.trim(); if (!val || checking || phase !== "playing") return;
    if (val === list[idx].a) { passQ(val); return; }
    setChecking(true);
    try {
      const res = await fetch("/api/gemini", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: `한국어 유의어 판정. 기준:"${list[idx].w}", 입력:"${val}". 유의어면 true. JSON만: {"ok":true} 또는 {"ok":false}` }) });
      const d = await res.json(); const text = (d.text || "{}").replace(/```json|```/g, "").trim();
      JSON.parse(text).ok ? passQ(val) : failQ();
    } catch { val.length >= 2 ? passQ(val) : failQ(); }
    finally { setChecking(false); }
  };

  if (phase === "end") return <Rslt score={score} maxScore={list.length * 20} onRetry={() => { setIdx(0); setScore(0); setTime(60); setInput(""); setGlow(null); setHistory([]); setPhase("playing"); sfx.start(); setTimeout(() => iref.current?.focus(), 80); }} onBack={onBack} extra={[["정답", history.filter(h=>h.ok).length+"/"+list.length]]} detail={history} />;
  return (
    <Wrap>
      <Hdr onBack={onBack} score={score} prog={idx} total={list.length} />
      <TBar pct={time / 60} urgent={time <= 10} />
      <Mid>
        <Ptcl trigger={pt} color="#06b6d4" />
        <div style={{ fontSize: "1.3rem", fontWeight: 900, color: time <= 10 ? "#ef4444" : "#475569", marginBottom: 14, animation: time <= 10 ? "pulse 1s infinite" : undefined }}>{time}초</div>
        <Card glow={glow} shake={shake}>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#64748b", fontSize: "0.7rem", marginBottom: 8 }}>유의어는?</div>
            <div style={{ fontSize: "2.2rem", fontWeight: 900, color: "#06b6d4" }}>{list[idx].w}</div>
          </div>
          {glow === "correct" && <div style={{ color: "#22c55e", textAlign: "center", fontWeight: 700, marginTop: 8 }}>✓ {accepted}</div>}
          {checking && <div style={{ color: "#f59e0b", textAlign: "center", fontSize: "0.76rem", marginTop: 8, animation: "pulse 1s infinite" }}>🤔 판정 중...</div>}
        </Card>
        <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 400, marginTop: 14 }}>
          <TInput value={input} onChange={e => { setInput(e.target.value); sfx.type(); }} onEnter={submit} placeholder="유의어를 입력하세요" glow={glow} />
          <SBtn onClick={submit} color="#06b6d4" disabled={checking}>{checking ? "⏳" : "→"}</SBtn>
        </div>
        <input ref={iref} style={{ position: "fixed", opacity: 0, pointerEvents: "none", width: 1, height: 1 }} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); submit(); } }} onChange={e => setInput(e.target.value)} value={input} />
      </Mid>
    </Wrap>
  );
}