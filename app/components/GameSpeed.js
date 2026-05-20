"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSFX, Wrap, Mid, Hdr, TBar, Card, TInput, SBtn, Ptcl, Rslt } from "@/lib/gameShared";
import { loadQuiz } from "@/lib/quizLoader";

// level 1=쉬움(이모지), 2=보통(이모지 있어도 됨), 3=어려움(설명만)
const FALLBACK = [
  {word:"사과",     description:"🍎 빨갛고 달콤한 과일",           level:1},
  {word:"학교",     description:"📚 공부하러 가는 곳",             level:1},
  {word:"강아지",   description:"🐶 멍멍 짖는 동물",               level:1},
  {word:"냉장고",   description:"🧊 음식을 차갑게 보관하는 가전",   level:1},
  {word:"우산",     description:"☔ 비 올 때 펼치는 것",           level:1},
  {word:"시계",     description:"⏰ 시간을 알려주는 것",           level:1},
  {word:"자전거",   description:"🚲 페달 밟아 가는 두 바퀴 탈것", level:1},
  {word:"수박",     description:"🍉 여름에 먹는 초록 큰 과일",     level:1},
  {word:"피아노",   description:"🎹 건반을 눌러 연주하는 악기",     level:2},
  {word:"지갑",     description:"💳 돈과 카드를 넣는 작은 가방",   level:2},
  {word:"선풍기",   description:"💨 전기로 바람을 만드는 기계",     level:2},
  {word:"지하철",   description:"🚇 땅 아래 터널을 달리는 기차",   level:2},
  {word:"텔레비전", description:"화면으로 방송을 보는 가전",        level:2},
  {word:"스마트폰", description:"전화·인터넷·카메라 다 되는 기기", level:2, synonyms:["휴대폰","핸드폰","휴대전화","폰"]},
  {word:"에어컨",   description:"여름에 실내를 시원하게 하는 가전", level:2},
  {word:"세탁기",   description:"빨래를 자동으로 세탁하는 기계",    level:2},
  {word:"가습기",   description:"공기 중 습도를 높여주는 기계",     level:3},
  {word:"계단",     description:"층과 층 사이를 오르내리는 구조물", level:3},
  {word:"신호등",   description:"교통 흐름을 색으로 조절하는 장치", level:3},
  {word:"소화기",   description:"불이 났을 때 불을 끄는 장비",      level:3},
  {word:"온도계",   description:"기온이나 체온을 측정하는 도구",    level:3},
  {word:"망원경",   description:"멀리 있는 것을 크게 보는 도구",   level:3},
];

export default function GameSpeed({ onBack }) {
  const sfx = useSFX();
  const [list,    setList]    = useState([]);
  const [ready,   setReady]   = useState(false);
  const [idx,     setIdx]     = useState(0);
  const [score,   setScore]   = useState(0);
  const [combo,   setCombo]   = useState(0);
  const [time,    setTime]    = useState(15);
  const [input,   setInput]   = useState("");
  const [phase,   setPhase]   = useState("idle");
  const [glow,    setGlow]    = useState(null);
  const [shake,   setShake]   = useState(false);
  const [pt,      setPt]      = useState(0);
  const [history, setHistory] = useState([]);
  const [checking,setChecking]= useState(false);
  const iref = useRef(null);

  useEffect(() => {
    loadQuiz("quiz_speed", FALLBACK, 30).then(items => {
      setList(items.map(i => ({
        w: i.word || i.w,
        d: i.description || i.d,
        level: i.level || 2,
        synonyms: i.synonyms || [],
      })));
      setReady(true);
    });
  }, []);

  const nxt = useCallback((ok, i) => {
    const ni = i + 1;
    if (ni >= list.length) { setPhase("end"); ok ? sfx.done() : sfx.over(); }
    else { setIdx(ni); setTime(15); setInput(""); setGlow(null); setChecking(false); setPhase("playing"); setTimeout(() => iref.current?.focus(), 100); }
  }, [list.length, sfx]);

  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => setTime(p => {
      if (p <= 2) {
        sfx.timeout(); setCombo(0); setGlow("wrong"); setShake(true);
        setHistory(h => [...h, { word:list[idx]?.w, ok:false, pts:0, reason:"시간 초과" }]);
        setTimeout(() => { setShake(false); setGlow(null); }, 420);
        setTimeout(() => setIdx(i => { nxt(false, i); return i; }), 450);
        return 15;
      }
      if (p <= 5) sfx.tick();
      return p - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [idx, phase, sfx, nxt, list]);

  const passQ = (val, pts, reason) => {
    setScore(s => s + pts); setPt(p => p + 1); setGlow("correct"); sfx.correct();
    setHistory(h => [...h, { word:list[idx].w, ok:true, pts, reason }]);
    setTimeout(() => nxt(true, idx), 480);
  };

  const failQ = (val) => {
    setCombo(0); setGlow("wrong"); setShake(true); sfx.wrong();
    setHistory(h => [...h, { word:list[idx]?.w, ok:false, pts:0, reason:`입력: ${val}` }]);
    setTimeout(() => { setShake(false); setGlow(null); setInput(""); setTimeout(() => iref.current?.focus(), 100); }, 450);
  };

  const submit = async () => {
    const val = input.trim();
    if (phase !== "playing" || !val || !list[idx] || checking) return;
    const q = list[idx];

    // 1. 완전 일치
    if (val === q.w) {
      const nc = combo + 1; setCombo(nc);
      const pts = 20 + (nc >= 3 ? 10 : 0);
      passQ(val, pts, nc >= 3 ? `${nc}콤보!` : null);
      return;
    }

    // 2. 등록된 유의어 체크
    if (q.synonyms && q.synonyms.includes(val)) {
      const nc = combo + 1; setCombo(nc);
      passQ(val, 15, `'${val}' 유의어 인정 (+15점)`);
      return;
    }

    // 3. Gemini 유의어 판정 (level 2~3 단어만)
    if (q.level >= 2 && val.length >= 2) {
      setChecking(true);
      try {
        const res = await fetch("/api/gemini", {
          method:"POST", headers:{"Content-Type":"application/json"},
          body: JSON.stringify({ prompt: `한국어 단어 판정. 정답:"${q.w}", 입력:"${val}". "${val}"이 "${q.w}"의 유의어·동의어·다른표현이면 true. JSON만: {"ok":true} 또는 {"ok":false}` })
        });
        const d = await res.json();
        const text = (d.text||"{}").replace(/```json|```/g,"").trim();
        if (JSON.parse(text).ok) {
          const nc = combo + 1; setCombo(nc);
          passQ(val, 15, `'${val}' 유의어 인정 (+15점)`);
          return;
        }
      } catch {}
      setChecking(false);
    }

    failQ(val);
  };

  if (!ready) return <Wrap><Mid><div style={{color:"#475569",fontSize:"0.85rem"}}>문제 불러오는 중...</div></Mid></Wrap>;

  if (phase === "idle") return (
    <Wrap><Mid>
      <div style={{ textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:14, animation:"fadein .4s ease-out" }}>
        <div style={{ fontSize:"3rem" }}>⚡</div>
        <div style={{ fontSize:"1.6rem", fontWeight:900 }}>스피드 퀴즈</div>
        <div style={{ color:"#64748b", fontSize:"0.82rem", lineHeight:1.7 }}>
          설명을 읽고 단어를 빠르게 입력하세요<br/>
          유의어도 정답으로 인정돼요 (+15점)
        </div>
        <div style={{ color:"#475569", fontSize:"0.72rem" }}>문제 {list.length}개 준비됨</div>
        <button onClick={() => { setPhase("playing"); sfx.start(); setTimeout(() => iref.current?.focus(), 100); }}
          style={{ padding:"13px 32px", borderRadius:14, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", color:"#fff", fontWeight:800, cursor:"pointer", fontFamily:"inherit", fontSize:"1rem" }}>
          시작하기
        </button>
        <button onClick={() => onBack()} style={{ background:"none", border:"none", color:"#475569", cursor:"pointer", fontFamily:"inherit" }}>← 메인으로</button>
      </div>
    </Mid></Wrap>
  );

  if (phase === "end") return (
    <Rslt score={score} maxScore={list.length * 20}
      onRetry={() => { setIdx(0); setScore(0); setCombo(0); setTime(15); setInput(""); setGlow(null); setHistory([]); setChecking(false); setPhase("playing"); sfx.start(); setTimeout(() => iref.current?.focus(), 100); }}
      onBack={onBack}
      extra={[["콤보", combo+"연속"], ["정답", history.filter(h=>h.ok).length+"/"+list.length]]}
      detail={history}
    />
  );

  const q = list[idx];
  return (
    <Wrap>
      <Hdr onBack={onBack} score={score} prog={idx} total={list.length} />
      <TBar pct={time / 15} urgent={time <= 5} />
      <Mid>
        <Ptcl trigger={pt} />
        <div style={{ color:"#334155", fontSize:"0.7rem", letterSpacing:".13em", marginBottom:12 }}>{idx + 1} / {list.length}</div>
        <Card glow={glow} shake={shake}>
          <div style={{ position:"absolute", top:14, right:16, fontSize:"1.5rem", fontWeight:900, color:time<=5?"#ef4444":"#2d3748" }}>{time}</div>
          {combo >= 2 && <div style={{ position:"absolute", top:13, left:14, background:"#ffd70018", border:"1px solid #ffd70055", color:"#ffd700", fontSize:"0.66rem", fontWeight:700, padding:"2px 7px", borderRadius:999 }}>🔥 {combo}연속</div>}
          <div style={{ fontSize:"1.22rem", fontWeight:600, textAlign:"center", lineHeight:1.6, marginTop:combo>=2?10:0 }}>
            {q?.d}
          </div>
          {glow === "correct" && <div style={{ color:"#22c55e", textAlign:"center", fontWeight:700, marginTop:8 }}>✓ {q?.w}</div>}
          {glow === "wrong" && input && <div style={{ color:"#ef4444", textAlign:"center", marginTop:8 }}>✗ {input}</div>}
          {checking && <div style={{ color:"#f59e0b", textAlign:"center", fontSize:"0.75rem", marginTop:6, animation:"pulse 1s infinite" }}>🤔 판정 중...</div>}
        </Card>
        <div style={{ display:"flex", gap:10, width:"100%", maxWidth:400, marginTop:18 }}>
          <TInput inputRef={iref} value={input} onChange={e=>{setInput(e.target.value);sfx.type();}} onEnter={submit} placeholder="한국어로 입력하세요" glow={glow}/>
          <SBtn onClick={submit} disabled={checking}>{checking?"⏳":"→"}</SBtn>
        </div>
        {q?.synonyms?.length > 0 && (
          <div style={{ color:"#334155", fontSize:"0.68rem", marginTop:8 }}>
            💡 예: {q.synonyms.slice(0,2).join(", ")} 등도 정답
          </div>
        )}
      </Mid>
    </Wrap>
  );
}