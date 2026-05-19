"use client";
import { useState, useEffect, useRef } from "react";
import { useSFX, Wrap, TBar, TInput, SBtn, Rslt } from "@/lib/gameShared";

// 기본 단어 풀 — 60개로 확대
const BASE_WORDS = [
  "사과","하늘","바다","학교","자동차","컴퓨터","음악","강아지","도서관","여행",
  "고양이","버스","커피","영화","친구","나무","바람","꽃","별","김치",
  "비행기","축구","겨울","여름","봄","가을","눈","비","달","해",
  "냉장고","세탁기","텔레비전","에어컨","선풍기","라디오","피아노","기타","드럼","바이올린",
  "사자","호랑이","코끼리","기린","펭귄","독수리","상어","고래","나비","개구리",
  "딸기","포도","수박","복숭아","레몬","오렌지","체리","망고","키위","파인애플",
];

// 풀 재생성 (소진 시 섞어서 재활용)
function makePool() {
  return [...BASE_WORDS].sort(() => Math.random() - .5);
}

const KF = `
@keyframes dropin{0%{opacity:0;transform:translateY(-28px)}100%{opacity:1;transform:translateY(0)}}
@keyframes fadein{from{opacity:0}to{opacity:1}}
*{box-sizing:border-box}
`;

export default function GameRain({ onBack }) {
  const sfx = useSFX();
  const [pool,   setPool]   = useState(() => makePool());
  const [active, setActive] = useState([]);
  const [input,  setInput]  = useState("");
  const [score,  setScore]  = useState(0);
  const [life,   setLife]   = useState(5);
  const [level,  setLevel]  = useState(1);
  const [phase,  setPhase]  = useState("playing");

  const lastSpawn = useRef(0);
  const iref      = useRef(null);
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => { sfx.start(); setTimeout(() => iref.current?.focus(), 100); }, []);

  useEffect(() => {
    if (phase !== "playing") return;

    const id = setInterval(() => {
      const now = Date.now();

      // 단어 이동 + 낙하 감지
      setActive(prev => {
        const moved  = prev.map(w => ({ ...w, y: w.y + (0.28 + level * 0.04) }));
        const missed = moved.filter(w => w.y > 92);
        if (missed.length > 0) {
          sfx.miss();
          setLife(l => {
            const nl = l - missed.length;
            if (nl <= 0) { setPhase("over"); sfx.over(); }
            return Math.max(0, nl);
          });
        }
        return moved.filter(w => w.y <= 92);
      });

      // 스폰 조건
      const canSpawn = activeRef.current.length < 6
        && now - lastSpawn.current > Math.max(600, 1100 - level * 60)
        && Math.random() < 0.15;

      if (canSpawn) {
        setPool(p => {
          // FIX: pool 소진 시 재생성
          const src = p.length > 0 ? p : makePool();
          const [w, ...rest] = src;
          setActive(a => [...a, { id: Date.now(), text: w, x: 8 + Math.random() * 78, y: -8 }]);
          lastSpawn.current = now;
          return rest;
        });
      }
    }, 50);

    return () => clearInterval(id);
  }, [phase, level]);

  const submit = () => {
    const val = input.trim();
    if (!val) return;
    const target = [...active].sort((a, b) => b.y - a.y).find(w => w.text === val);
    if (target) {
      setActive(p => p.filter(w => w.id !== target.id));
      setScore(s => {
        const ns = s + 10;
        if (ns % 80 === 0) { setLevel(l => l + 1); sfx.levelup(); }
        return ns;
      });
      sfx.correct();
    }
    setInput("");
    setTimeout(() => iref.current?.focus(), 20);
  };

  const retry = () => {
    setActive([]); setScore(0); setLife(5); setLevel(1);
    setPool(makePool()); setPhase("playing");
    setTimeout(() => iref.current?.focus(), 100);
  };

  if (phase === "over") return (
    <Rslt
      score={score} maxScore={score + 20}
      onRetry={retry}
      onBack={onBack}
      extra={[["레벨", "Lv." + level]]}
    />
  );

  return (
    <div style={{ minHeight:"100dvh", background:"linear-gradient(160deg,#06090f,#0f172a)", display:"flex", flexDirection:"column", fontFamily:"system-ui,sans-serif", color:"#e2e8f0" }}>
      <style>{KF}</style>

      {/* 헤더 */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 17px", flexShrink:0, background:"rgba(255,255,255,.03)", borderBottom:"1px solid rgba(255,255,255,.07)" }}>
        <button onClick={() => onBack()} style={{ width:33, height:33, borderRadius:"50%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", color:"#64748b", cursor:"pointer", fontSize:"0.82rem", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        <div style={{ display:"flex", gap:16, alignItems:"center" }}>
          <span style={{ color:"#ef4444", fontSize:"0.88rem" }}>{"❤️".repeat(Math.max(0, life))}</span>
          <span style={{ color:"#f59e0b", fontWeight:700, fontSize:"0.82rem" }}>Lv.{level}</span>
          <span style={{ color:"#fff", fontWeight:900 }}>{score}</span>
        </div>
      </div>
      <TBar pct={1} urgent={life <= 2} />

      {/* 게임 영역 */}
      <div style={{ flex:1, position:"relative", overflow:"hidden", background:"linear-gradient(180deg,#060b18 0%,#0a1628 100%)" }}>
        {active.map(w => (
          <div key={w.id} style={{ position:"absolute", left:`${w.x}%`, top:`${w.y}%`, background:"rgba(99,102,241,0.15)", border:"1.5px solid rgba(99,102,241,0.4)", borderRadius:10, padding:"6px 13px", color:"#a78bfa", fontWeight:700, fontSize:"0.95rem", whiteSpace:"nowrap", backdropFilter:"blur(8px)", transition:"top 0.05s linear", animation:"dropin .3s ease-out" }}>
            {w.text}
          </div>
        ))}
        {active.length === 0 && (
          <div style={{ position:"absolute", top:"40%", left:"50%", transform:"translate(-50%,-50%)", color:"#1e293b", fontSize:"0.8rem" }}>단어 대기 중...</div>
        )}
      </div>

      {/* 입력 */}
      <div style={{ padding:"11px 16px", display:"flex", gap:10, borderTop:"1px solid rgba(255,255,255,0.06)", flexShrink:0 }}>
        <input
          ref={iref}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); submit(); } }}
          onFocus={e => setTimeout(() => e.target.scrollIntoView({ behavior:"smooth", block:"nearest" }), 300)}
          placeholder="단어를 입력해서 막으세요!"
          autoComplete="off" autoCorrect="off" autoCapitalize="none"
          inputMode="text" enterKeyHint="done"
          style={{ flex:1, padding:"13px 16px", borderRadius:13, border:"1.5px solid rgba(255,255,255,0.11)", background:"rgba(255,255,255,0.05)", color:"#e2e8f0", fontSize:"1rem", fontFamily:"inherit", outline:"none" }}
        />
        <SBtn onClick={submit} color="#0ea5e9">⚡</SBtn>
      </div>
    </div>
  );
}