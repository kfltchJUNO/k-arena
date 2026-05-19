"use client";
import { useState, useEffect, useRef } from "react";
import { useSFX, Wrap, Mid, Hdr, TBar, Card, TInput, SBtn, Ptcl, Rslt } from "@/lib/gameShared";
import { loadQuiz } from "@/lib/quizLoader";

// ── GAME 3: 사자성어 ──────────────────────────────────────────
const IDD = [
  { f: "일석", b: "이조", m: "돌 하나로 새 둘을 잡는다" },
  { f: "대기", b: "만성", m: "큰 그릇은 늦게 이루어진다" },
  { f: "이심", b: "전심", m: "마음에서 마음으로 전해짐" },
  { f: "천고", b: "마비", m: "하늘 높고 말 살찌는 가을" },
  { f: "청출", b: "어람", m: "제자가 스승보다 뛰어남" },
  { f: "우공", b: "이산", m: "어리석어 보여도 꾸준히 하면 이룬다" },
];
export default function GameIdiom({ onBack }) {
  const sfx = useSFX();
  const [list, setList] = useState([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    loadQuiz("quiz_idiom", IDD, 20).then(items => { setList(items); setReady(true); });
  }, []);
  const [idx, setIdx] = useState(0); const [score, setScore] = useState(0); const [input, setInput] = useState("");
  const [phase, setPhase] = useState("playing"); const [glow, setGlow] = useState(null); const [shake, setShake] = useState(false);
  const [showM, setShowM] = useState(false); const [pt, setPt] = useState(0);
  const iref = useRef(null);
  useEffect(() => setTimeout(() => iref.current?.focus(), 100), []);

  const submit = () => {
    if (!input.trim() || showM) return;
    if (input.trim().replace(/\s/g, "") === list[idx].b) {
      setScore(s => s + 20); setPt(p => p + 1); setGlow("correct"); setShowM(true); sfx.correct();
    } else { setGlow("wrong"); setShake(true); sfx.wrong(); setTimeout(() => { setShake(false); setGlow(null); setInput(""); setTimeout(() => iref.current?.focus(), 100); }, 440); }
  };
  const next = () => {
    if (idx + 1 >= list.length) { setPhase("end"); sfx.done(); }
    else { setIdx(i => i + 1); setGlow(null); setInput(""); setShowM(false); setTimeout(() => iref.current?.focus(), 100); }
  };

  if (!ready) return <Wrap><Mid><div style={{color:"#475569",fontSize:"0.85rem"}}>문제 불러오는 중...</div></Mid></Wrap>;

  if (phase === "end") return <Rslt score={score} maxScore={list.length * 20} onRetry={() => { setIdx(0); setScore(0); setGlow(null); setInput(""); setShowM(false); setPhase("playing"); setTimeout(() => iref.current?.focus(), 100); }} onBack={onBack} />;
  const q = list[idx];
  return (
    <Wrap>
      <Hdr onBack={onBack} score={score} prog={idx} total={list.length} />
      <Mid>
        <Ptcl trigger={pt} color="#f59e0b" />
        <Card glow={glow} shake={shake}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ color: "#64748b", fontSize: "0.7rem", marginBottom: 8 }}>앞 두 글자</div>
            <div style={{ fontSize: "2.8rem", fontWeight: 900, color: "#f59e0b" }}>{q.f}</div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 14, paddingTop: 14, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <span style={{ fontSize: "1.7rem", fontWeight: 900, color: "#f59e0b" }}>{q.f}</span>
              <span style={{ color: "#475569" }}>+</span>
              <span style={{ fontSize: "1.7rem", fontWeight: 900, color: glow === "correct" ? "#22c55e" : "#334155" }}>{glow === "correct" ? q.b : "???"}</span>
            </div>
          </div>
          {showM && <div style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 9, padding: "9px 13px", textAlign: "center", animation: "fadein .3s" }}>
            <div style={{ color: "#22c55e", fontWeight: 700, fontSize: "0.86rem" }}>{q.f + q.b}</div>
            <div style={{ color: "#94a3b8", fontSize: "0.76rem", marginTop: 3 }}>{q.m}</div>
          </div>}
        </Card>
        {!showM ? (
          <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 400, marginTop: 14 }}>
            <TInput inputRef={iref} value={input} onChange={e => { setInput(e.target.value); sfx.type(); }} onEnter={submit} placeholder="뒤 두 글자를 입력하세요" glow={glow} />
            <SBtn onClick={submit} color="#f59e0b">→</SBtn>
          </div>
        ) : (
          <button onClick={next} style={{ marginTop: 16, padding: "12px 28px", borderRadius: 12, background: "linear-gradient(135deg,#22c55e,#16a34a)", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>다음 →</button>
        )}
        <input ref={iref} style={{ position: "fixed", opacity: 0, pointerEvents: "none", width: 1, height: 1 }} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); submit(); } }} onChange={e => setInput(e.target.value)} value={input} />
      </Mid>
    </Wrap>
  );
}