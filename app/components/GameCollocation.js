"use client";
import { useState, useEffect } from "react";
import { useSFX, Wrap, Mid, Hdr, Card, Ptcl, Rslt } from "@/lib/gameShared";
import { loadQuiz } from "@/lib/quizLoader";

// 짝꿍 단어 기본 데이터 — 명확한 정답/오답 구성
const CD = [
  { q:"꿈을",   a:"꾸다",   o:["꾸다","깨다","쫓다","버리다"] },
  { q:"신발을", a:"신다",   o:["신다","입다","쓰다","끼다"] },
  { q:"모자를", a:"쓰다",   o:["쓰다","신다","입다","끼다"] },
  { q:"반지를", a:"끼다",   o:["끼다","쓰다","신다","입다"] },
  { q:"숨을",   a:"쉬다",   o:["쉬다","참다","들이쉬다","막다"] },
  { q:"눈물을", a:"흘리다", o:["흘리다","닦다","참다","감추다"] },
  { q:"전화를", a:"걸다",   o:["걸다","치다","받다","끊다"] },
  { q:"길을",   a:"묻다",   o:["묻다","찾다","건너다","막다"] },
  { q:"약을",   a:"먹다",   o:["먹다","바르다","넣다","씻다"] },
  { q:"안경을", a:"쓰다",   o:["쓰다","끼다","신다","입다"] },
  { q:"노래를", a:"부르다", o:["부르다","틀다","듣다","치다"] },
  { q:"편지를", a:"쓰다",   o:["쓰다","보내다","읽다","받다"] },
];

// FIX: export default + 함수명 GameCollocation (page.js import와 일치)
export default function GameCollocation({ onBack }) {
  const sfx = useSFX();
  const [list,  setList]  = useState([]);
  const [ready, setReady] = useState(false);
  const [idx,   setIdx]   = useState(0);
  const [score, setScore] = useState(0);
  const [sel,   setSel]   = useState(null);
  const [phase, setPhase] = useState("playing");
  const [pt,    setPt]    = useState(0);
  const [history, setHistory] = useState([]);

  useEffect(() => {
    loadQuiz("quiz_collocation", CD, 20).then(items => {
      // o 필드가 배열이 아니면 fallback에서 가져오기
      const valid = items.filter(i => Array.isArray(i.o) && i.o.length === 4 && i.a && i.q);
      setList(valid.length >= 4 ? valid : CD);
      setReady(true);
    });
  }, []);

  const pick = (opt) => {
    if (sel || !list[idx]) return;
    setSel(opt); sfx.select();
    const correct = opt === list[idx].a;
    if (correct) {
      setScore(s => s + 20); setPt(p => p + 1); sfx.correct();
      setHistory(h => [...h, { word: list[idx].q, ok: true, pts: 20 }]);
    } else {
      sfx.wrong();
      setHistory(h => [...h, { word: list[idx].q, ok: false, pts: 0, answer: list[idx].a, reason: `선택: ${opt}` }]);
    }
    setTimeout(() => {
      if (idx + 1 >= list.length) { setPhase("end"); sfx.done(); }
      else { setIdx(i => i + 1); setSel(null); }
    }, 800);
  };

  if (!ready) return (
    <Wrap><Mid><div style={{color:"#475569",fontSize:"0.85rem"}}>문제 불러오는 중...</div></Mid></Wrap>
  );

  if (phase === "end") return (
    <Rslt
      score={score} maxScore={list.length * 20}
      onRetry={() => { setIdx(0); setScore(0); setSel(null); setHistory([]); setPhase("playing"); sfx.start(); }}
      onBack={onBack}
      extra={[["정답", history.filter(h=>h.ok).length + "/" + list.length]]}
      detail={history}
    />
  );

  const q = list[idx];
  if (!q) return null;

  return (
    <Wrap>
      <Hdr onBack={onBack} score={score} prog={idx} total={list.length} />
      <Mid>
        <Ptcl trigger={pt} color="#ec4899" />
        <div style={{ color:"#334155", fontSize:"0.7rem", letterSpacing:".13em", marginBottom:14 }}>
          {idx + 1} / {list.length}
        </div>
        <Card>
          <div style={{ textAlign:"center", marginBottom:20 }}>
            <div style={{ color:"#64748b", fontSize:"0.72rem", marginBottom:10 }}>이 단어와 어울리는 동사는?</div>
            <div style={{ fontSize:"2.2rem", fontWeight:900, color:"#ec4899" }}>{q.q}</div>
            <div style={{ color:"#475569", fontSize:"0.78rem", marginTop:6 }}>자연스러운 표현을 고르세요</div>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
            {q.o.map(opt => {
              let bg = "rgba(255,255,255,0.05)", bc = "rgba(255,255,255,0.1)", c = "#e2e8f0";
              if (sel) {
                if (opt === q.a)   { bg = "rgba(34,197,94,0.15)";  bc = "#22c55e"; c = "#22c55e"; }
                else if (opt===sel){ bg = "rgba(239,68,68,0.15)";  bc = "#ef4444"; c = "#ef4444"; }
                else               { bg = "rgba(255,255,255,0.02)"; c = "#334155"; }
              }
              return (
                <button key={opt} onClick={() => pick(opt)}
                  style={{ padding:"16px 10px", borderRadius:14, border:`1.5px solid ${bc}`, background:bg, color:c, fontSize:"1.05rem", fontWeight:700, cursor:sel?"default":"pointer", fontFamily:"inherit", transition:"all .2s" }}>
                  {opt}
                  {sel && opt === q.a && <span style={{display:"block",fontSize:"0.65rem",marginTop:3}}>✓ 정답</span>}
                </button>
              );
            })}
          </div>
        </Card>
      </Mid>
    </Wrap>
  );
}