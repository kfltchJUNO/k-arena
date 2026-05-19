"use client";
import { useState, useEffect, useRef } from "react";
import { useSFX, Wrap, Mid, Hdr, TBar, Card, TInput, SBtn, Ptcl, Rslt } from "@/lib/gameShared";

// ── GAME 5: 주제 러쉬 ────────────────────────────────────────
const TOPICS = ["한국 음식","동물","색깔","스포츠","나라","과일","직업","교통수단","계절","가전제품"];
export default function GameCategory({ onBack }) {
  const sfx = useSFX();
  const [topic] = useState(()=>TOPICS[Math.floor(Math.random()*TOPICS.length)]);
  const [words, setWords] = useState([]); const [input, setInput] = useState("");
  const [time, setTime] = useState(40); const [phase, setPhase] = useState("playing");
  const [score, setScore] = useState(0);
  const iref = useRef(null);
  useEffect(()=>{ sfx.start(); setTimeout(()=>iref.current?.focus(),80); },[]);
  useEffect(()=>{
    if(phase!=="playing") return;
    const id=setInterval(()=>setTime(p=>{ if(p<=1){clearInterval(id);setPhase("done");return 0;} if(p<=10)sfx.tick(); return p-1; }),1000);
    return()=>clearInterval(id);
  },[phase]);

  const addWord = () => {
    const val=input.trim(); if(!val||words.includes(val)) return;
    setWords(p=>[...p,val]); setInput(""); sfx.pop(); setScore(s=>s+10);
    setTimeout(()=>iref.current?.focus(),20);
  };

  const [detail, setDetail] = useState([]);
  const [verifying, setVerifying] = useState(false);

  useEffect(()=>{
    if(phase!=="done") return;
    if(!words.length){ setDetail([]); return; }
    setVerifying(true);
    fetch("/api/gemini",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:`주제:"${topic}". 다음 단어들이 주제에 맞는지 판정해줘. 입력:${JSON.stringify(words)}. JSON만: {"results":[{"word":"단어","ok":true,"reason":"이유(틀린 경우만)"}]}`})})
      .then(r=>r.json()).then(d=>{ try{ const p=JSON.parse(d.text.replace(/\`\`\`json|\`\`\`/g,"").trim()); const results=p.results||[]; setDetail(results.map(r=>({word:r.word,ok:r.ok,pts:r.ok?10:0,reason:r.reason||null}))); const valid=results.filter(r=>r.ok).length; setScore(valid*10); }catch(e){ setDetail(words.map(w=>({word:w,ok:true,pts:10}))); } setVerifying(false); }).catch(()=>{ setDetail(words.map(w=>({word:w,ok:true,pts:10}))); setVerifying(false); });
  },[phase]);

  if(verifying) return <Wrap><div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}><div style={{fontSize:"2.2rem"}}>🤖</div><div style={{color:"#94a3b8",animation:"pulse 1s infinite"}}>AI 채점 중...</div></div></Wrap>;

  if(phase==="done") return (
    <Rslt score={score} maxScore={Math.max(score,20)} onRetry={() => { setWords([]); setInput(""); setScore(0); setDetail([]); setVerifying(false); setTime(40); setPhase("playing"); }} onBack={onBack} extra={[["단어수",words.length+"개"],["인정",detail.filter(d=>d.ok).length+"개"],["불인정",detail.filter(d=>!d.ok).length+"개"]]} detail={detail}/>
  );

  return (
    <Wrap>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 17px",flexShrink:0}}>
        <button onClick={() => onBack()} style={{width:33,height:33,borderRadius:"50%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"#64748b",cursor:"pointer",fontSize:"0.82rem"}}>✕</button>
        <div style={{textAlign:"center"}}><div style={{color:"#64748b",fontSize:"0.62rem"}}>주제</div><div style={{color:"#06b6d4",fontWeight:900,fontSize:"1.1rem"}}>{topic}</div></div>
        <div style={{color:time<=10?"#ef4444":"#94a3b8",fontWeight:700,fontSize:"1rem",animation:time<=10?"pulse 1s infinite":undefined}}>{time}s</div>
      </div>
      <TBar pct={time/40} urgent={time<=10}/>
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexWrap:"wrap",gap:8,alignContent:"flex-start"}}>
        {words.map((w,i)=><span key={i} style={{padding:"7px 12px",borderRadius:20,background:"rgba(6,182,212,0.12)",border:"1px solid rgba(6,182,212,0.3)",color:"#06b6d4",fontWeight:700,fontSize:"0.86rem",animation:"popin .2s ease-out"}}>{w}</span>)}
        {!words.length&&<div style={{color:"#1e293b",fontSize:"0.8rem"}}>단어를 최대한 많이 입력하세요!</div>}
      </div>
      <div style={{padding:"11px 16px",display:"flex",gap:10,borderTop:"1px solid rgba(255,255,255,0.06)",flexShrink:0}}>
        <TInput inputRef={iref} value={input} onChange={e=>setInput(e.target.value)} onEnter={addWord} placeholder="단어 입력 후 Enter"/>
        <SBtn onClick={addWord} color="#06b6d4">+</SBtn>
      </div>
      <input ref={iref} style={{position:"fixed",opacity:0,pointerEvents:"none",width:1,height:1}} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addWord();}}} onChange={e=>setInput(e.target.value)} value={input}/>
    </Wrap>
  );
}