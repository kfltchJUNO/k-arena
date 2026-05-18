"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSFX, Wrap, Mid, Hdr, TBar, Card, TInput, SBtn, Ptcl, Rslt } from "@/lib/gameShared";

// ── GAME 2: 초성 퀴즈 ─────────────────────────────────────────
const ID = [
  { ini: "ㄱㅇ", w: "기억", h: ["머릿속에 남은 것", "잊혀지지 않는 것", "추억과 비슷해요"] },
  { ini: "ㅂㄹ", w: "바람", h: ["공기의 움직임", "시원하게 해줘요", "봄 ___ 살랑살랑"] },
  { ini: "ㄴㄹ", w: "노력", h: ["열심히 하는 것", "포기하지 않기", "성공의 비결"] },
  { ini: "ㅅㄱ", w: "사과", h: ["🍎 빨간색", "백설공주 이야기", "달콤새콤해요"] },
  { ini: "ㅎㄱ", w: "한국", h: ["동아시아 나라", "서울이 수도", "K-pop의 고향"] },
  { ini: "ㅁㅈ", w: "마음", h: ["감정이 있는 곳", "눈에 보이지 않아요", "따뜻한 ___"] },
  { ini: "ㅅㄱ", w: "생각", h: ["머리로 하는 것", "아이디어와 비슷", "'깊은 ___에 잠기다'"] },
  { ini: "ㅈㅇ", w: "자유", h: ["원하는 대로 함", "새처럼 날고 싶은 느낌", "구속이 없는 상태"] },
];
export default function GameInitial({ onBack }) {
  const sfx = useSFX();
  const [list] = useState(() => [...ID].sort(() => Math.random() - .5));
  const [idx, setIdx] = useState(0); const [score, setScore] = useState(0); const [hIdx, setHIdx] = useState(0);
  const [input, setInput] = useState(""); const [phase, setPhase] = useState("playing"); const [glow, setGlow] = useState(null); const [shake, setShake] = useState(false); const [pt, setPt] = useState(0);
  const iref = useRef(null);
  useEffect(() => setTimeout(() => iref.current?.focus(), 80), []);

  const submit = () => {
    if (!input.trim()) return;
    if (input.trim() === list[idx].w) {
      setScore(s => s + 20 - hIdx * 5); setPt(p => p + 1); setGlow("correct"); sfx.correct();
      setTimeout(() => {
        if (idx + 1 >= list.length) { setPhase("end"); sfx.done(); }
        else { setIdx(i => i + 1); setHIdx(0); setInput(""); setGlow(null); setTimeout(() => iref.current?.focus(), 50); }
      }, 500);
    } else { setGlow("wrong"); setShake(true); sfx.wrong(); setTimeout(() => { setShake(false); setGlow(null); setInput(""); setTimeout(() => iref.current?.focus(), 40); }, 440); }
  };

  if (phase === "end") return <Rslt score={score} maxScore={list.length * 20} onRetry={() => { setIdx(0); setScore(0); setHIdx(0); setInput(""); setGlow(null); setPhase("playing"); setTimeout(() => iref.current?.focus(), 80); }} onBack={onBack} />;
  const q = list[idx];
  return (
    <Wrap>
      <Hdr onBack={onBack} score={score} prog={idx} total={list.length} />
      <Mid>
        <Ptcl trigger={pt} color="#22c55e" />
        <Card glow={glow} shake={shake}>
          <div style={{ textAlign: "center", marginBottom: 16 }}>
            <div style={{ color: "#64748b", fontSize: "0.7rem", marginBottom: 8 }}>초성</div>
            <div style={{ fontSize: "2.6rem", fontWeight: 900, letterSpacing: "0.2em", color: "#a78bfa" }}>{q.ini}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {q.h.slice(0, hIdx + 1).map((h, i) => (
              <div key={i} style={{ background: "rgba(255,255,255,0.05)", borderRadius: 8, padding: "8px 12px", fontSize: "0.82rem", color: "#cbd5e1", borderLeft: `2px solid ${["#6366f1", "#a78bfa", "#22c55e"][i]}`, animation: "slidein .3s ease-out" }}>💡 {h}</div>
            ))}
          </div>
          {glow === "correct" && <div style={{ color: "#22c55e", textAlign: "center", fontWeight: 700, marginTop: 8 }}>✓ {q.w}</div>}
        </Card>
        <div style={{ display: "flex", gap: 10, width: "100%", maxWidth: 400, marginTop: 14 }}>
          <TInput value={input} onChange={e => { setInput(e.target.value); sfx.type(); }} onEnter={submit} placeholder="단어를 입력하세요" glow={glow} />
          <SBtn onClick={submit} color="#a78bfa">→</SBtn>
        </div>
        {hIdx < q.h.length - 1 && (
          <button onClick={() => { setHIdx(h => h + 1); sfx.reveal(); }} style={{ marginTop: 10, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10, color: "#f59e0b", fontSize: "0.76rem", padding: "7px 15px", cursor: "pointer", fontFamily: "inherit" }}>
            💡 힌트 (-{(hIdx + 1) * 5}점)
          </button>
        )}
        <input ref={iref} style={{ position: "fixed", opacity: 0, pointerEvents: "none", width: 1, height: 1 }} onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); submit(); } }} onChange={e => setInput(e.target.value)} value={input} />
      </Mid>
    </Wrap>
  );
}