"use client";
import { useState, useEffect, useRef } from "react";
import { useSFX, Wrap, Mid, Hdr, TBar, Card, TInput, SBtn, Ptcl, Rslt } from "@/lib/gameShared";

// ── GAME 4: 연상 탐정 ────────────────────────────────────────
const DET_FB = [
  {word:"김치",hints:["한국","빨간색","배추"]},
  {word:"바나나",hints:["노란색","달콤해요","원숭이"]},
  {word:"이순신",hints:["조선시대","거북선","장군"]},
  {word:"피자",hints:["이탈리아","치즈","둥근 모양"]},
  {word:"기타",hints:["현악기","6줄","록 음악"]},
];
function GameDetective({ onBack }) {
  const sfx = useSFX();
  const [list] = useState([...DET_FB].sort(()=>Math.random()-.5));
  const [idx, setIdx] = useState(0); const [score, setScore] = useState(0);
  const [input, setInput] = useState(""); const [phase, setPhase] = useState("playing");
  const [glow, setGlow] = useState(null); const [shake, setShake] = useState(false); const [pt, setPt] = useState(0);
  const [history, setHistory] = useState([]);
  const iref = useRef(null);
  useEffect(()=>setTimeout(()=>iref.current?.focus(),80),[]);

  const submit = () => {
    const val=input.trim(); if(!val||!list[idx]) return;
    if(val===list[idx].word){
      setScore(s=>s+30); setPt(p=>p+1); setGlow("correct"); setHistory(h=>[...h,{word:list[idx].word,ok:true,pts:30}]); sfx.correct();
      setTimeout(()=>{ if(idx+1>=list.length){setPhase("end");sfx.done();} else{setIdx(i=>i+1);setGlow(null);setInput("");setTimeout(()=>iref.current?.focus(),50);} },520);
    } else { setHistory(h=>[...h,{word:list[idx].word,ok:false,pts:0,reason:val?`입력: '${val}'`:null}]); setGlow("wrong"); setShake(true); sfx.wrong(); setTimeout(()=>{setShake(false);setGlow(null);setInput("");setTimeout(()=>iref.current?.focus(),40);},440); }
  };

  if(phase==="end") return <Rslt score={score} maxScore={list.length*30} onRetry={()=>{setIdx(0);setScore(0);setGlow(null);setInput("");setHistory([]);setPhase("playing");setTimeout(()=>iref.current?.focus(),80);}} onBack={onBack} extra={[["정답",history.filter(h=>h.ok).length+"/"+list.length]]} detail={history}/>;
  const q=list[idx];
  return (
    <Wrap>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 17px",flexShrink:0}}>
        <button onClick={onBack} style={{width:33,height:33,borderRadius:"50%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"#64748b",cursor:"pointer",fontSize:"0.82rem"}}>✕</button>
        <div style={{color:"#e2e8f0",fontWeight:900,fontSize:"0.92rem"}}>🕵️ 연상 탐정</div>
        <div style={{color:"#fff",fontWeight:900}}>{score}</div>
      </div>
      <Mid>
        <Ptcl trigger={pt} color="#8b5cf6"/>
        <div style={{color:"#334155",fontSize:"0.68rem",marginBottom:12}}>사건 {idx+1} / {list.length}</div>
        <Card glow={glow} shake={shake}>
          <div style={{color:"#64748b",fontSize:"0.7rem",textAlign:"center",marginBottom:14}}>🔍 세 가지 단서로 정체를 밝혀라!</div>
          <div style={{display:"flex",flexDirection:"column",gap:9}}>
            {q.hints.map((h,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,background:"rgba(255,255,255,0.05)",borderRadius:10,padding:"11px 14px",animation:`fadein .3s ease-out ${i*.1}s both`}}>
                <span style={{color:["#6366f1","#a78bfa","#f59e0b"][i],fontWeight:700,fontSize:"0.78rem",flexShrink:0}}>단서 {i+1}</span>
                <span style={{color:"#e2e8f0",fontWeight:600,fontSize:"0.98rem"}}>{h}</span>
              </div>
            ))}
          </div>
          {glow==="correct"&&<div style={{color:"#22c55e",textAlign:"center",fontWeight:700,marginTop:10}}>🎉 정답: {q.word}!</div>}
          {glow==="wrong"&&<div style={{color:"#ef4444",textAlign:"center",fontSize:"0.82rem",marginTop:10}}>다시 생각해보세요!</div>}
        </Card>
        <div style={{display:"flex",gap:10,width:"100%",maxWidth:400,marginTop:14}}>
          <TInput value={input} onChange={e=>{setInput(e.target.value);sfx.type();}} onEnter={submit} placeholder="정체는 바로..." glow={glow}/>
          <SBtn onClick={submit} color="#8b5cf6">🔍</SBtn>
        </div>
        <input ref={iref} style={{position:"fixed",opacity:0,pointerEvents:"none",width:1,height:1}} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();submit();}}} onChange={e=>setInput(e.target.value)} value={input}/>
      </Mid>
    </Wrap>
  );
}