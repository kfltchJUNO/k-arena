"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSFX, Wrap, Mid, Hdr, TBar, Card, TInput, SBtn, Ptcl, Rslt } from "@/lib/gameShared";

// ── GAME 5: 문장 조각 ─────────────────────────────────────────
const SND = [
  { s: "나는 학교에 간다", p: ["나는", "학교에", "간다"] },
  { s: "오늘 날씨가 매우 좋아요", p: ["오늘", "날씨가", "매우", "좋아요"] },
  { s: "저는 한국어를 배워요", p: ["저는", "한국어를", "배워요"] },
  { s: "친구와 함께 밥을 먹었어요", p: ["친구와", "함께", "밥을", "먹었어요"] },
  { s: "도서관에서 책을 읽고 있어요", p: ["도서관에서", "책을", "읽고", "있어요"] },
];
export default function GameSentence({ onBack }) {
  const sfx = useSFX();
  const [list] = useState(() => [...SND].sort(() => Math.random() - .5));
  const [idx, setIdx] = useState(0); const [score, setScore] = useState(0);
  const [order, setOrder] = useState([]); const [rem, setRem] = useState([]);
  const [phase, setPhase] = useState("playing"); const [glow, setGlow] = useState(null); const [pt, setPt] = useState(0);

  const initQ = useCallback(i => { setRem([...list[i].p].sort(() => Math.random() - .5)); setOrder([]); setGlow(null); }, [list]);
  useEffect(() => { if (phase === "playing") initQ(idx); }, [idx, phase]);

  const add = (w, ri) => { sfx.select(); setOrder(o => [...o, w]); setRem(r => r.filter((_, i) => i !== ri)); };
  const remove = (w, oi) => { sfx.desel(); setOrder(o => o.filter((_, i) => i !== oi)); setRem(r => [...r, w]); };
  const check = () => {
    if (order.join("").replace(/\s/g, "") === list[idx].s.replace(/\s/g, "")) {
      setScore(s => s + 20); setPt(p => p + 1); setGlow("correct"); sfx.correct();
      setTimeout(() => { if (idx + 1 >= list.length) { setPhase("end"); sfx.done(); } else setIdx(i => i + 1); }, 550);
    } else { setGlow("wrong"); sfx.wrong(); setTimeout(() => initQ(idx), 480); }
  };

  if (phase === "end") return <Rslt score={score} maxScore={list.length * 20} onRetry={() => { setIdx(0); setScore(0); setGlow(null); setPhase("playing"); sfx.start(); }} onBack={onBack} />;
  return (
    <Wrap>
      <Hdr onBack={onBack} score={score} prog={idx} total={list.length} />
      <Mid>
        <Ptcl trigger={pt} color="#10b981" />
        <div style={{ width: "100%", maxWidth: 400, minHeight: 56, border: `2px dashed ${glow === "correct" ? "#22c55e" : glow === "wrong" ? "#ef4444" : "rgba(255,255,255,0.12)"}`, borderRadius: 15, padding: "12px", display: "flex", flexWrap: "wrap", gap: 7, alignItems: "center", marginBottom: 14, transition: "border-color .25s", animation: glow === "wrong" ? "shake .35s ease-out" : undefined }}>
          {order.length === 0 && <span style={{ color: "#334155", fontSize: "0.78rem" }}>여기에 조각을 배열하세요</span>}
          {order.map((w, i) => <button key={i + w} onClick={() => remove(w, i)} style={{ background: "rgba(99,102,241,0.2)", border: "1px solid rgba(99,102,241,0.4)", borderRadius: 8, color: "#a78bfa", fontWeight: 700, padding: "6px 12px", cursor: "pointer", fontFamily: "inherit", fontSize: "0.88rem", animation: "popin .2s ease-out" }}>{w}</button>)}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9, justifyContent: "center", maxWidth: 400, marginBottom: 18 }}>
          {rem.map((w, i) => <button key={i + w} onClick={() => add(w, i)} style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.14)", borderRadius: 10, color: "#e2e8f0", fontWeight: 600, padding: "9px 15px", cursor: "pointer", fontFamily: "inherit", fontSize: "0.9rem" }}>{w}</button>)}
        </div>
        <button onClick={check} disabled={order.length < list[idx].p.length} style={{ padding: "12px 28px", borderRadius: 12, background: order.length < list[idx].p.length ? "#1e293b" : "linear-gradient(135deg,#10b981,#059669)", border: "none", color: "#fff", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", opacity: order.length < list[idx].p.length ? .5 : 1 }}>확인하기</button>
      </Mid>
    </Wrap>
  );
}