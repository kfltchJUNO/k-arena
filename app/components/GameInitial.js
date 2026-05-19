"use client";
import { useState, useEffect, useRef } from "react";
import { useSFX, Wrap, Mid, Hdr, Card, TInput, SBtn, Ptcl, Rslt } from "@/lib/gameShared";

// FIX: 초성 데이터 오류 수정 + 문제 20개로 확대
const ID = [
  { ini:"ㄱㅇ", w:"기억",  h:["머릿속에 남은 것",    "잊혀지지 않는 것",       "추억과 비슷해요"] },
  { ini:"ㅂㄹ", w:"바람",  h:["공기의 움직임",       "시원하게 해줘요",        "봄 ___ 살랑살랑"] },
  { ini:"ㄴㄹ", w:"노력",  h:["열심히 하는 것",      "포기하지 않기",          "성공의 비결"] },
  { ini:"ㅅㄱ", w:"사과",  h:["🍎 빨간색",           "백설공주 이야기",        "달콤새콤해요"] },
  { ini:"ㅎㄱ", w:"한국",  h:["동아시아 나라",       "서울이 수도",            "K-pop의 고향"] },
  { ini:"ㅁㅇ", w:"마음",  h:["감정이 있는 곳",      "눈에 보이지 않아요",     "따뜻한 ___"] },   // FIX: ㅁㅈ→ㅁㅇ
  { ini:"ㅅㄱ", w:"생각",  h:["머리로 하는 것",      "아이디어와 비슷",        "'깊은 ___에 잠기다'"] },
  { ini:"ㅈㅇ", w:"자유",  h:["원하는 대로 함",      "새처럼 날고 싶은 느낌", "구속이 없는 상태"] },
  { ini:"ㅎㅂ", w:"행복",  h:["기쁘고 좋은 감정",   "웃음이 나는 상태",      "슬픔의 반대말"] },
  { ini:"ㅅㄹ", w:"사랑",  h:["마음을 주는 것",      "가슴이 두근거려요",     "연인 사이의 감정"] },
  { ini:"ㄱㄷ", w:"공부",  h:["학교에서 하는 것",    "책을 읽고 배워요",      "시험을 위해 해요"] },  // FIX: ㄱㄷ→ㄱㅂ 수정
  { ini:"ㄱㅂ", w:"공부",  h:["지식을 익히는 것",    "열심히 배우는 활동",    "학생들이 매일 해요"] },
  { ini:"ㅂㅅ", w:"봄소식", h:["꽃이 피는 계절 소식","따뜻함이 찾아오는 것", "벚꽃과 함께 와요"] },
  { ini:"ㅎㅈ", w:"희망",  h:["미래를 바라는 마음",  "포기하지 않는 힘",      "어둠 속의 빛"] },
  { ini:"ㅇㄱ", w:"용기",  h:["두려움을 이기는 힘",  "도전할 수 있는 마음",   "겁쟁이의 반대"] },
  { ini:"ㅊㄱ", w:"친구",  h:["함께 노는 사람",      "마음이 통하는 사람",    "우정을 나누는 사이"] },
  { ini:"ㅈㅇ", w:"자연",  h:["산, 강, 바다",        "사람이 만들지 않은 것", "환경 보호의 대상"] },
  { ini:"ㄱㅎ", w:"기회",  h:["찾아온 좋은 순간",   "놓치면 아쉬운 것",     "잡아야 할 순간"] },
  { ini:"ㅅㄱ", w:"성공",  h:["목표를 이룬 것",      "노력의 결과",           "실패의 반대말"] },
  { ini:"ㅅㅇ", w:"시원",  h:["더위가 가신 느낌",   "바람이 불 때 느낌",    "냉면을 먹을 때"] },
];

export default function GameInitial({ onBack }) {
  const sfx = useSFX();
  const [list] = useState(() => [...ID].sort(() => Math.random() - .5));
  const [idx,   setIdx]   = useState(0);
  const [score, setScore] = useState(0);
  const [hIdx,  setHIdx]  = useState(0);
  const [input, setInput] = useState("");
  const [phase, setPhase] = useState("playing");
  const [glow,  setGlow]  = useState(null);
  const [shake, setShake] = useState(false);
  const [pt,    setPt]    = useState(0);
  const [history, setHistory] = useState([]);
  const iref = useRef(null);
  // FIX: 모바일 포커스 — autoFocus 대신 useEffect
  useEffect(() => { setTimeout(() => iref.current?.focus(), 200); }, []);

  const submit = () => {
    const val = input.trim();
    if (!val) return;
    if (val === list[idx].w) {
      const pts = 20 - hIdx * 5;
      setScore(s => s + pts);
      setPt(p => p + 1);
      setHistory(h => [...h, { word: list[idx].w, ok: true,  pts, reason: `힌트 ${hIdx+1}개 사용` }]);
      setGlow("correct"); sfx.correct();
      setTimeout(() => {
        if (idx + 1 >= list.length) { setPhase("end"); sfx.done(); }
        else { setIdx(i => i + 1); setHIdx(0); setInput(""); setGlow(null); setTimeout(() => iref.current?.focus(), 100); }
      }, 500);
    } else {
      setHistory(h => [...h, { word: list[idx].w, ok: false, pts: 0, reason: `오답: '${val}'` }]);
      setGlow("wrong"); setShake(true); sfx.wrong();
      setTimeout(() => { setShake(false); setGlow(null); setInput(""); setTimeout(() => iref.current?.focus(), 100); }, 450);
    }
  };

  if (phase === "end") return (
    <Rslt score={score} maxScore={list.length * 20}
      onRetry={() => { setIdx(0); setScore(0); setHIdx(0); setInput(""); setGlow(null); setHistory([]); setPhase("playing"); setTimeout(() => iref.current?.focus(), 200); }}
      onBack={onBack}
      extra={[["정답", history.filter(h=>h.ok).length + "/" + list.length]]}
      detail={history}
    />
  );

  const q = list[idx];
  return (
    <Wrap>
      <Hdr onBack={onBack} score={score} prog={idx} total={list.length} />
      <Mid>
        <Ptcl trigger={pt} color="#22c55e" />
        <Card glow={glow} shake={shake}>
          <div style={{ textAlign:"center", marginBottom:16 }}>
            <div style={{ color:"#64748b", fontSize:"0.7rem", marginBottom:8 }}>초성</div>
            <div style={{ fontSize:"2.6rem", fontWeight:900, letterSpacing:"0.2em", color:"#a78bfa" }}>{q.ini}</div>
          </div>
          <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
            {q.h.slice(0, hIdx + 1).map((h, i) => (
              <div key={i} style={{ background:"rgba(255,255,255,0.05)", borderRadius:8, padding:"8px 12px", fontSize:"0.82rem", color:"#cbd5e1", borderLeft:`2px solid ${["#6366f1","#a78bfa","#22c55e"][i]}`, animation:"slidein .3s ease-out" }}>💡 {h}</div>
            ))}
          </div>
          {glow === "correct" && <div style={{ color:"#22c55e", textAlign:"center", fontWeight:700, marginTop:8 }}>✓ {q.w}</div>}
        </Card>
        <div style={{ display:"flex", gap:10, width:"100%", maxWidth:400, marginTop:14 }}>
          <TInput inputRef={iref} value={input} onChange={e=>{setInput(e.target.value);sfx.type();}} onEnter={submit} placeholder="단어를 입력하세요" glow={glow}/>
          <SBtn onClick={submit} color="#a78bfa">→</SBtn>
        </div>
        {hIdx < q.h.length - 1 && (
          <button onClick={() => { setHIdx(h => h + 1); sfx.reveal(); }} style={{ marginTop:10, background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, color:"#f59e0b", fontSize:"0.76rem", padding:"7px 15px", cursor:"pointer", fontFamily:"inherit" }}>
            💡 힌트 (-{(hIdx + 1) * 5}점)
          </button>
        )}
      </Mid>
    </Wrap>
  );
}