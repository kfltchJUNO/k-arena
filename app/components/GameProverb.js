"use client";
import { useState, useEffect, useRef } from "react";
import { useSFX, Wrap, Mid, Hdr, TBar, Card, TInput, SBtn, Ptcl, Rslt } from "@/lib/gameShared";
import { loadQuiz } from "@/lib/quizLoader";

// ── GAME 7: 속담 이어달리기 ───────────────────────────────────
const PD = [
  { q: "가는 말이 고와야", a: "오는 말이 곱다" },
  { q: "티끌 모아", a: "태산" },
  { q: "고생 끝에", a: "낙이 온다" },
  { q: "세 살 버릇", a: "여든까지 간다" },
  { q: "백지장도", a: "맞들면 낫다" },
  { q: "원숭이도 나무에서", a: "떨어진다" },
];
export default function GameProverb({ onBack }) {
  const sfx = useSFX();
  const [list, setList] = useState([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    loadQuiz("quiz_proverb", PD, 20).then(items => { setList(items); setReady(true); });
  }, []);
  const [idx, setIdx] = useState(0); const [score, setScore] = useState(0);
  const [input, setInput] = useState(""); const [phase, setPhase] = useState("playing");
  const [glow, setGlow] = useState(null); const [shake, setShake] = useState(false);
  const [pt, setPt] = useState(0); const [checking, setChecking] = useState(false);
  const [history, setHistory] = useState([]);
  const iref = useRef(null);
  useEffect(() => setTimeout(() => iref.current?.focus(), 100), []);

  const passQ = v => { setScore(s => s + 20); setPt(p => p + 1); setGlow("correct"); setHistory(h => [...h, { word: list[idx].q, ok: true, pts: 20, reason: v !== list[idx].a ? `'${v}' 인정` : null }]); sfx.correct(); setTimeout(() => { if (idx + 1 >= list.length) { setPhase("end"); sfx.done(); } else { setIdx(i => i + 1); setInput(""); setGlow(null); setTimeout(() => iref.current?.focus(), 100); } }, 550); };
  const failQ = () => { setHistory(h => [...h, { word: list[idx].q, ok: false, pts: 0, answer: list[idx].a }]); setGlow("wrong"); setShake(true); sfx.wrong(); setTimeout(() => { setShake(false); setGlow(null); setInput(""); setTimeout(() => iref.current?.focus(), 100); }, 460); };

  const submit = async () => {
    const val = input.trim(); if (!val || checking) return;
    if (val.replace(/\s/g, "") === list[idx].a.replace(/\s/g, "")) { passQ(val); return; }
    setChecking(true);
    try {
      const res = await fetch("/api/gemini", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt: `속담 정답 판정. "${list[idx].q} ___". 정답:"${list[idx].a}". 입력:"${val}". 의미상 맞으면 true. JSON만: {"ok":true} 또는 {"ok":false}` }) });
      const d = await res.json(); const text = (d.text || "{}").replace(/```json|```/g, "").trim();
      JSON.parse(text).ok ? passQ(val) : failQ();
    } catch { passQ(val); }
    finally { setChecking(false); }
  };

  if (!ready) return <Wrap><Mid><div style={{color:"#475569",fontSize:"0.85rem"}}>문제 불러오는 중...</div></Mid></Wrap>;

  if (phase === "end") return <Rslt score={score} maxScore={list.length * 20} onRetry={() => { setIdx(0); setScore(0); setInput(""); setGlow(null); setHistory([]); setPhase("playing"); setTimeout(() => iref.current?.focus(), 100); }} onBack={onBack} extra={[["정답", history.filter(h=>h.ok).length+"/"+list.length]]} detail={history} />;
  const q = list[idx];
  return (
    <Wrap>
      <Hdr onBack={onBack} score={score} prog={idx} total={list.length} />
      <Mid>
        <Ptcl trigger={pt} color="#10b981" />
        <Card glow={glow} shake={shake}>
          <div style={{ textAlign: "center" }}>
            <div style={{ color: "#64748b", fontSize: "0.7rem", marginBottom: 10 }}>⚡ 속담을 완성하세요</div>
            <div style={{ fontSize: "1.35rem", fontWeight: 800, color: "#e2e8f0", lineHeight: 1.5 }}>{q.q}</div>
            <div style={{ color: "#475569", marginTop: 6 }}>... 🤔</div>
            {glow === "correct" && <div style={{ color: "#22c55e", fontWeight: 700, marginTop: 8, animation: "popin .25s" }}>✓ {q.a}</div>}
            {checking && <div style={{ color: "#f59e0b", fontSize: "0.76rem", marginTop: 8, animation: "pulse 1s infinite" }}>🤔 확인 중...</div>}
          </div>
        </Card>
        <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 400, marginTop: 14 }}>
          <TInput inputRef={iref} value={input} onChange={e => { setInput(e.target.value); sfx.type(); }} onEnter={submit} placeholder="뒷부분을 입력하세요" glow={glow} />
          <SBtn onClick={submit} color="#10b981" disabled={checking}>{checking ? "⏳" : "→"}</SBtn>
        </div>
        <input ref={iref} style={{ position: "fixed", opacity: 0, pointerEvents: "none", width: 1, height: 1 }} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); submit(); } }} onChange={e => setInput(e.target.value)} value={input} />
      </Mid>
    </Wrap>
  );
}