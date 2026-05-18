"use client";
import { useState, useEffect, useRef } from "react";
import { useSFX, Wrap, Mid, Hdr, TBar, Card, TInput, SBtn, Ptcl, Rslt } from "@/lib/gameShared";

// ── GAME 2: 단어 비 ───────────────────────────────────────────
const RAIN_FB = ["사과","하늘","바다","학교","자동차","컴퓨터","음악","강아지","도서관","여행","고양이","버스","커피","영화","친구","나무","바람","꽃","별","김치","비행기","축구","겨울","여름","봄","가을","눈","비","달","해"];
export default function GameRain({ onBack }) {
  const sfx = useSFX();
  const [pool, setPool] = useState([...RAIN_FB].sort(()=>Math.random()-.5));
  const [active, setActive] = useState([]);
  const [input, setInput] = useState(""); const [score, setScore] = useState(0);
  const [life, setLife] = useState(5); const [level, setLevel] = useState(1); const [phase, setPhase] = useState("playing");
  const lastSpawn = useRef(0); const iref = useRef(null); const activeRef = useRef(active);
  activeRef.current = active;
  useEffect(()=>setTimeout(()=>iref.current?.focus(),80),[]);

  useEffect(()=>{
    if(phase!=="playing") return;
    const id = setInterval(()=>{
      const now = Date.now();
      setActive(prev=>{
        const moved = prev.map(w=>({...w,y:w.y+(0.28+level*0.04)}));
        const missed = moved.filter(w=>w.y>92);
        if(missed.length>0){ sfx.miss(); setLife(l=>{ const nl=l-missed.length; if(nl<=0){setPhase("over");sfx.over();} return Math.max(0,nl); }); }
        return moved.filter(w=>w.y<=92);
      });
      if(activeRef.current.length<6 && pool.length>0 && now-lastSpawn.current>1100 && Math.random()<0.12){
        setPool(p=>{ if(!p.length) return p; const [w,...rest]=p; setActive(a=>[...a,{id:Date.now(),text:w,x:8+Math.random()*78,y:-8}]); lastSpawn.current=now; return rest; });
      }
    },50);
    return()=>clearInterval(id);
  },[phase,level,pool]);

  const submit = () => {
    const val=input.trim(); if(!val) return;
    const target=[...active].sort((a,b)=>b.y-a.y).find(w=>w.text===val);
    if(target){ setActive(p=>p.filter(w=>w.id!==target.id)); setScore(s=>{ const ns=s+10; if(ns%80===0){setLevel(l=>l+1);sfx.levelup();} return ns; }); sfx.correct(); }
    setInput(""); setTimeout(()=>iref.current?.focus(),20);
  };

  if(phase==="over") return <Rslt score={score} maxScore={score+20} onRetry={()=>{setActive([]);setScore(0);setLife(5);setLevel(1);setPool([...RAIN_FB].sort(()=>Math.random()-.5));setPhase("playing");setTimeout(()=>iref.current?.focus(),80);}} onBack={onBack} extra={[["레벨","Lv."+level]]}/>;

  return (
    <Wrap>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 17px",flexShrink:0}}>
        <button onClick={onBack} style={{width:33,height:33,borderRadius:"50%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"#64748b",cursor:"pointer",fontSize:"0.82rem"}}>✕</button>
        <div style={{display:"flex",gap:14,alignItems:"center"}}>
          <span style={{color:"#ef4444",fontSize:"0.88rem"}}>{"❤️".repeat(Math.max(0,life))}</span>
          <span style={{color:"#f59e0b",fontWeight:700,fontSize:"0.82rem"}}>Lv.{level}</span>
          <span style={{color:"#fff",fontWeight:900}}>{score}</span>
        </div>
      </div>
      <TBar pct={1} urgent={life<=2}/>
      <div style={{flex:1,position:"relative",overflow:"hidden",background:"linear-gradient(180deg,#060b18 0%,#0a1628 100%)"}}>
        {active.map(w=>(
          <div key={w.id} style={{position:"absolute",left:`${w.x}%`,top:`${w.y}%`,background:"rgba(99,102,241,0.15)",border:"1.5px solid rgba(99,102,241,0.4)",borderRadius:10,padding:"6px 13px",color:"#a78bfa",fontWeight:700,fontSize:"0.95rem",whiteSpace:"nowrap",backdropFilter:"blur(8px)",transition:"top 0.05s linear",animation:"dropin .3s ease-out"}}>
            {w.text}
          </div>
        ))}
        {active.length===0&&<div style={{position:"absolute",top:"40%",left:"50%",transform:"translate(-50%,-50%)",color:"#1e293b",fontSize:"0.8rem"}}>단어 대기 중...</div>}
      </div>
      <div style={{padding:"11px 16px",display:"flex",gap:10,borderTop:"1px solid rgba(255,255,255,0.06)",flexShrink:0}}>
        <TInput value={input} onChange={e=>setInput(e.target.value)} onEnter={submit} placeholder="단어를 입력해서 막으세요!"/>
        <SBtn onClick={submit} color="#0ea5e9">⚡</SBtn>
      </div>
      <input ref={iref} style={{position:"fixed",opacity:0,pointerEvents:"none",width:1,height:1}} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();submit();}}} onChange={e=>setInput(e.target.value)} value={input}/>
    </Wrap>
  );
}