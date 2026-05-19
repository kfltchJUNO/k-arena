"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { useSFX, Wrap, Mid, Hdr, TBar, Card, TInput, SBtn, Ptcl, Rslt } from "@/lib/gameShared";
import { loadQuiz } from "@/lib/quizLoader";

const FALLBACK = [
  {word:"사과",    description:"🍎 빨갛고 달콤한 과일"},
  {word:"학교",    description:"📚 공부하러 가는 곳"},
  {word:"가방",    description:"🎒 책과 필통을 넣어요"},
  {word:"강아지",  description:"🐶 멍멍 짖는 동물"},
  {word:"고양이",  description:"🐱 야옹 우는 동물"},
  {word:"비행기",  description:"✈️ 하늘을 나는 탈것"},
  {word:"김치",    description:"🌶️ 매콤한 한국 음식"},
  {word:"겨울",    description:"❄️ 눈이 오는 추운 계절"},
  {word:"병원",    description:"🏥 아프면 가는 곳"},
  {word:"버스",    description:"🚌 많은 사람이 타는 차"},
  {word:"냉장고",  description:"🧊 음식을 차갑게 보관해요"},
  {word:"지하철",  description:"🚇 땅 아래로 달리는 기차"},
  {word:"우산",    description:"☔ 비 올 때 쓰는 것"},
  {word:"시계",    description:"⏰ 몇 시인지 알려줘요"},
  {word:"안경",    description:"👓 눈이 나쁘면 써요"},
  {word:"지갑",    description:"💳 돈과 카드를 넣는 것"},
  {word:"선풍기",  description:"💨 더울 때 바람 만드는 것"},
  {word:"칫솔",    description:"🪥 이를 닦는 도구"},
  {word:"거울",    description:"🪞 내 얼굴을 볼 수 있어요"},
  {word:"신발",    description:"👟 발에 신는 것"},
  {word:"책상",    description:"📖 공부할 때 쓰는 가구"},
  {word:"의자",    description:"🪑 앉는 가구"},
  {word:"컴퓨터",  description:"💻 인터넷하고 일하는 기계"},
  {word:"스마트폰", description:"📱 전화하고 인터넷도 해요"},
  {word:"텔레비전", description:"📺 방송을 보는 화면"},
  {word:"피아노",  description:"🎹 건반을 누르는 악기"},
  {word:"자전거",  description:"🚲 페달을 밟아 가는 탈것"},
  {word:"기차",    description:"🚂 레일 위를 달리는 탈것"},
  {word:"수박",    description:"🍉 여름에 먹는 초록 큰 과일"},
  {word:"바나나",  description:"🍌 노랗고 길쭉한 과일"},
];

export default function GameSpeed({ onBack }) {
  const sfx = useSFX();
  const [list,  setList]  = useState([]);
  const [ready, setReady] = useState(false);
  const [idx,   setIdx]   = useState(0);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [time,  setTime]  = useState(15);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("idle");
  const [glow,  setGlow]  = useState(null);
  const [shake, setShake] = useState(false);
  const [pt,    setPt]    = useState(0);
  const [history, setHistory] = useState([]);
  const iref = useRef(null);

  // Firestore + fallback 로딩
  useEffect(() => {
    loadQuiz("quiz_speed", FALLBACK, 30).then(items => {
      // word 필드 정규화 (Firestore: word, fallback: word)
      setList(items.map(i => ({ w: i.word || i.w, d: i.description || i.d })));
      setReady(true);
    });
  }, []);

  const nxt = useCallback((ok, i) => {
    const ni = i + 1;
    if (ni >= list.length) { setPhase("end"); ok ? sfx.done() : sfx.over(); }
    else { setIdx(ni); setTime(15); setInput(""); setGlow(null); setPhase("playing"); setTimeout(() => iref.current?.focus(), 100); }
  }, [list.length, sfx]);

  useEffect(() => {
    if (phase !== "playing") return;
    const id = setInterval(() => setTime(p => {
      if (p <= 2) {
        sfx.timeout(); setCombo(0); setGlow("wrong"); setShake(true);
        setHistory(h => [...h, { word: list[idx]?.w, ok: false, pts: 0, reason: "시간 초과" }]);
        setTimeout(() => { setShake(false); setGlow(null); }, 420);
        setTimeout(() => setIdx(i => { nxt(false, i); return i; }), 450);
        return 15;
      }
      if (p <= 5) sfx.tick();
      return p - 1;
    }), 1000);
    return () => clearInterval(id);
  }, [idx, phase, sfx, nxt, list]);

  const submit = () => {
    if (phase !== "playing" || !input.trim() || !list[idx]) return;
    if (input.trim() === list[idx].w) {
      const nc = combo + 1; setCombo(nc);
      const pts = 20 + (nc >= 3 ? 10 : 0); setScore(s => s + pts);
      setPt(p => p + 1); setGlow("correct"); sfx.correct();
      setHistory(h => [...h, { word: list[idx].w, ok: true, pts, reason: nc >= 3 ? `${nc}콤보!` : null }]);
      setTimeout(() => nxt(true, idx), 460);
    } else {
      setCombo(0);
      setHistory(h => [...h, { word: list[idx]?.w, ok: false, pts: 0, reason: `입력: ${input.trim()}` }]);
      setGlow("wrong"); setShake(true); sfx.wrong();
      setTimeout(() => { setShake(false); setGlow(null); setInput(""); setTimeout(() => iref.current?.focus(), 100); }, 450);
    }
  };

  if (!ready) return <Wrap><Mid><div style={{color:"#475569",fontSize:"0.85rem"}}>문제 불러오는 중...</div></Mid></Wrap>;

  if (phase === "idle") return (
    <Wrap><Mid>
      <div style={{ textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap:14, animation:"fadein .4s ease-out" }}>
        <div style={{ fontSize:"3rem" }}>⚡</div>
        <div style={{ fontSize:"1.6rem", fontWeight:900 }}>스피드 퀴즈</div>
        <div style={{ color:"#64748b", fontSize:"0.82rem", lineHeight:1.7 }}>설명을 읽고 단어를 빠르게 입력하세요<br/>콤보로 보너스 점수!</div>
        <div style={{ color:"#475569", fontSize:"0.72rem" }}>문제 {list.length}개 준비됨</div>
        <button onClick={() => { setPhase("playing"); sfx.start(); setTimeout(() => iref.current?.focus(), 100); }} style={{ padding:"13px 32px", borderRadius:14, background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", color:"#fff", fontWeight:800, cursor:"pointer", fontFamily:"inherit", fontSize:"1rem" }}>시작하기</button>
        <button onClick={() => onBack()} style={{ background:"none", border:"none", color:"#475569", cursor:"pointer", fontFamily:"inherit" }}>← 메인으로</button>
      </div>
    </Mid></Wrap>
  );

  if (phase === "end") return (
    <Rslt score={score} maxScore={list.length * 20}
      onRetry={() => { setIdx(0); setScore(0); setCombo(0); setTime(15); setInput(""); setGlow(null); setHistory([]); setPhase("playing"); sfx.start(); setTimeout(() => iref.current?.focus(), 100); }}
      onBack={onBack}
      extra={[["콤보", combo+"연속"], ["정답", history.filter(h=>h.ok).length+"/"+list.length]]}
      detail={history}
    />
  );

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
          <div style={{ fontSize:"1.22rem", fontWeight:600, textAlign:"center", lineHeight:1.6, marginTop:combo>=2?10:0 }}>{list[idx]?.d}</div>
          {glow === "correct" && <div style={{ color:"#22c55e", textAlign:"center", fontWeight:700, marginTop:8 }}>✓ {list[idx]?.w}</div>}
          {glow === "wrong" && input && <div style={{ color:"#ef4444", textAlign:"center", marginTop:8 }}>✗ {input}</div>}
        </Card>
        <div style={{ display:"flex", gap:10, width:"100%", maxWidth:400, marginTop:18 }}>
          <TInput inputRef={iref} value={input} onChange={e=>{setInput(e.target.value);sfx.type();}} onEnter={submit} placeholder="한국어로 입력하세요" glow={glow}/>
          <SBtn onClick={submit}>→</SBtn>
        </div>
      </Mid>
    </Wrap>
  );
}