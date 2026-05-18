"use client";
import { useState, useEffect, useRef } from "react";
import { useSFX, Wrap, Mid, Hdr, TBar, Card, TInput, SBtn, Ptcl, Rslt } from "@/lib/gameShared";

// ── GAME 4: 짝꿍 단어 ─────────────────────────────────────────
const CD = [
  { q: "꿈을", a: "꾸다", o: ["꾸다", "쓰다", "먹다", "하다"] },
  { q: "신발을", a: "신다", o: ["신다", "입다", "쓰다", "차다"] },
  { q: "모자를", a: "쓰다", o: ["입다", "쓰다", "신다", "하다"] },
  { q: "숨을", a: "쉬다", o: ["쉬다", "마시다", "불다", "내다"] },
  { q: "눈물을", a: "흘리다", o: ["흘리다", "닦다", "보다", "웃다"] },
  { q: "전화를", a: "걸다", o: ["걸다", "치다", "하다", "두다"] },
  { q: "길을", a: "묻다", o: ["묻다", "찾다", "걷다", "만들다"] },
  { q: "배를", a: "타다", o: ["타다", "운전하다", "먹다", "잡다"] },
];
function GameColloc({ onBack }) {
  const sfx = useSFX();
  const [list] = useState(() => [...CD].sort(() => Math.random() - .5));
  const [idx, setIdx] = useState(0); const [score, setScore] = useState(0);
  const [sel, setSel] = useState(null); const [phase, setPhase] = useState("playing"); const [pt, setPt] = useState(0);

  const pick = opt => {
    if (sel) return; setSel(opt); sfx.select();
    if (opt === list[idx].a) { setScore(s => s + 20); setPt(p => p + 1); sfx.correct(); }
    else sfx.wrong();
    setTimeout(() => {
      if (idx + 1 >= list.length) { setPhase("end"); sfx.done(); }
      else { setIdx(i => i + 1); setSel(null); }
    }, 750);
  };

  if (phase === "end") return <Rslt score={score} maxScore={list.length * 20} onRetry={() => { setIdx(0); setScore(0); setSel(null); setPhase("playing"); sfx.start(); }} onBack={onBack} />;
  const q = list[idx];
  return (
    <Wrap>
      <Hdr onBack={onBack} score={score} prog={idx} total={list.length} />
      <Mid>
        <Ptcl trigger={pt} color="#ec4899" />
        <Card>
          <div style={{ textAlign: "center", marginBottom: 18 }}>
            <div style={{ color: "#64748b", fontSize: "0.7rem", marginBottom: 8 }}>이 단어와 짝꿍은?</div>
            <div style={{ fontSize: "2rem", fontWeight: 900, color: "#ec4899" }}>{q.q}</div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 9 }}>
            {q.o.map(opt => {
              let bg = "rgba(255,255,255,0.05)", bc = "rgba(255,255,255,0.1)", c = "#e2e8f0";
              if (sel) { if (opt === q.a) { bg = "rgba(34,197,94,0.15)"; bc = "#22c55e"; c = "#22c55e"; } else if (opt === sel) { bg = "rgba(239,68,68,0.15)"; bc = "#ef4444"; c = "#ef4444"; } }
              return <button key={opt} onClick={() => pick(opt)} style={{ padding: "15px 10px", borderRadius: 13, border: `1.5px solid ${bc}`, background: bg, color: c, fontSize: "1.05rem", fontWeight: 700, cursor: "pointer", fontFamily: "inherit", transition: "all .2s" }}>{opt}</button>;
            })}
          </div>
        </Card>
      </Mid>
    </Wrap>
  );
}