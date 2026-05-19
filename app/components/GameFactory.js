"use client";
import { useState, useEffect, useRef } from "react";
import { useSFX, Wrap, Mid, Hdr, TBar, Card, TInput, SBtn, Ptcl, Rslt } from "@/lib/gameShared";

// ── GAME 6: 단어 공장 ────────────────────────────────────────
const ALL_CHO=["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
const QZ_CHO=["ㄱ","ㄴ","ㄷ","ㄹ","ㅁ","ㅂ","ㅅ","ㅇ","ㅈ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
const getIni=c=>{const code=c.charCodeAt(0)-44032;if(code<0||code>11171)return "";return ALL_CHO[Math.floor(code/588)];};
export default function GameFactory({ onBack }) {
  const sfx = useSFX();
  const [tgts] = useState(()=>{ const c=QZ_CHO; return [c[Math.floor(Math.random()*c.length)],c[Math.floor(Math.random()*c.length)]]; });
  const [words, setWords] = useState([]); const [input, setInput] = useState("");
  const [time, setTime] = useState(60); const [phase, setPhase] = useState("playing");
  const [score, setScore] = useState(0); const [err, setErr] = useState("");
  const iref = useRef(null);
  useEffect(()=>{ sfx.start(); setTimeout(()=>iref.current?.focus(),80); },[]);
  useEffect(()=>{
    if(phase!=="playing") return;
    const id=setInterval(()=>setTime(p=>{ if(p<=1){clearInterval(id);setPhase("done");return 0;} if(p<=10)sfx.tick(); return p-1; }),1000);
    return()=>clearInterval(id);
  },[phase]);

  const addWord = () => {
    const val=input.trim(); setInput(""); setErr("");
    if(!val) return;
    if(words.includes(val)){setErr("이미 입력한 단어예요!");return;}
    if(val.length!==2){setErr("2글자만 가능해요!");return;}
    if(!/^[가-힣]{2}$/.test(val)){setErr("완성된 한글만 입력하세요!");return;}
    if(getIni(val[0])!==tgts[0]||getIni(val[1])!==tgts[1]){setErr(`초성이 [${tgts[0]} ${tgts[1]}]이어야 해요!`);return;}
    setWords(p=>[...p,val]); setScore(s=>s+10); sfx.pop(); setTimeout(()=>iref.current?.focus(),20);
  };

  const [detail, setDetail] = useState([]);
  const [verifying, setVerifying] = useState(false);

  useEffect(()=>{
    if(phase!=="done") return;
    if(!words.length){ setDetail([]); return; }
    setVerifying(true);
    fetch("/api/gemini",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt:`초성 '${tgts[0]} ${tgts[1]}' 2글자 단어 유효성 검사. 표준국어대사전 기준 명사인지. 입력:${JSON.stringify(words)}. JSON만: {"results":[{"word":"단어","ok":true,"reason":"이유(틀린 경우만)"}]}`})})
      .then(r=>r.json()).then(d=>{ try{ const p=JSON.parse(d.text.replace(/\`\`\`json|\`\`\`/g,"").trim()); const results=p.results||[]; setDetail(results.map(r=>({word:r.word,ok:r.ok,pts:r.ok?10:0,reason:r.reason||null}))); const valid=results.filter(r=>r.ok).length; setScore(valid*10); }catch(e){ setDetail(words.map(w=>({word:w,ok:true,pts:10}))); } setVerifying(false); }).catch(()=>{ setDetail(words.map(w=>({word:w,ok:true,pts:10}))); setVerifying(false); });
  },[phase]);

  if(verifying) return <Wrap><div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}><div style={{fontSize:"2.2rem"}}>🤖</div><div style={{color:"#94a3b8",animation:"pulse 1s infinite"}}>사전 검증 중...</div></div></Wrap>;

  if(phase==="done") return <Rslt score={score} maxScore={Math.max(score,20)} onRetry={() => { setWords([]); setInput(""); setScore(0); setDetail([]); setVerifying(false); setErr(""); setTime(60); setPhase("playing"); }} onBack={onBack} extra={[["단어수",words.length+"개"],["인정",detail.filter(d=>d.ok).length+"개"],["불인정",detail.filter(d=>!d.ok).length+"개"]]} detail={detail}/>;

  return (
    <Wrap>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"11px 17px",flexShrink:0}}>
        <button onClick={() => onBack()} style={{width:33,height:33,borderRadius:"50%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"#64748b",cursor:"pointer",fontSize:"0.82rem"}}>✕</button>
        <div style={{display:"flex",gap:10,alignItems:"center"}}>
          {tgts.map((c,i)=><div key={i} style={{width:44,height:44,borderRadius:11,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"1.4rem",fontWeight:900,color:"#fff"}}>{c}</div>)}
        </div>
        <div style={{color:time<=10?"#ef4444":"#94a3b8",fontWeight:700,animation:time<=10?"pulse 1s infinite":undefined}}>{time}s</div>
      </div>
      <TBar pct={time/60} urgent={time<=10}/>
      <div style={{flex:1,overflowY:"auto",padding:"12px 16px",display:"flex",flexWrap:"wrap",gap:8,alignContent:"flex-start"}}>
        {words.map((w,i)=><span key={i} style={{padding:"7px 12px",borderRadius:20,background:"rgba(99,102,241,0.12)",border:"1px solid rgba(99,102,241,0.3)",color:"#a78bfa",fontWeight:700,fontSize:"0.86rem",animation:"popin .2s ease-out"}}>{w}</span>)}
        {!words.length&&<div style={{color:"#1e293b",fontSize:"0.8rem"}}>{tgts[0]}ㅏ{tgts[1]}ㅡ 형태의 2글자 단어를 만드세요!</div>}
      </div>
      {err&&<div style={{textAlign:"center",color:"#ef4444",fontSize:"0.76rem",padding:"4px 16px"}}>{err}</div>}
      <div style={{padding:"11px 16px",display:"flex",gap:10,borderTop:"1px solid rgba(255,255,255,0.06)",flexShrink:0}}>
        <TInput inputRef={iref} value={input} onChange={e=>{setInput(e.target.value);sfx.type();}} onEnter={addWord} placeholder={`${tgts[0]}ㅏ${tgts[1]}ㅡ 형태의 2글자`}/>
        <SBtn onClick={addWord}>+</SBtn>
      </div>
      <input ref={iref} style={{position:"fixed",opacity:0,pointerEvents:"none",width:1,height:1}} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();addWord();}}} onChange={e=>setInput(e.target.value)} value={input}/>
    </Wrap>
  );
}