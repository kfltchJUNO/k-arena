"use client";
import { useState, useEffect, useRef } from "react";
import { useSFX, Wrap, Mid, Hdr, TBar, Card, TInput, SBtn, Ptcl, Rslt } from "@/lib/gameShared";

// ── GAME 1: 끝말잇기 ─────────────────────────────────────────
export default function GameWordChain({ onBack }) {
  const sfx = useSFX();
  const [msgs, setMsgs] = useState([{from:"ai",text:"끝말잇기 시작! 먼저 단어를 입력해줘 😉"}]);
  const [input, setInput] = useState(""); const [loading, setLoading] = useState(false); const [score, setScore] = useState(0);
  const scrollRef = useRef(null); const iref = useRef(null);
  useEffect(() => {
    if(scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [msgs]);
  // FIX: 모바일 키보드 올라올 때 스크롤 유지
  useEffect(() => {
    const onResize = () => { if(scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight; };
    window.visualViewport?.addEventListener('resize', onResize);
    return () => window.visualViewport?.removeEventListener('resize', onResize);
  }, []);
  useEffect(() => setTimeout(()=>iref.current?.focus(),80), []);

  const send = async () => {
    const word = input.trim(); if(!word||loading||!/^[가-힣]+$/.test(word)) return;
    setMsgs(p=>[...p,{from:"user",text:word}]); setInput(""); setLoading(true); sfx.type();
    try {
      const aiMsgs = msgs.filter(m=>m.from==="ai");
      const lastAi = aiMsgs.length>1 ? aiMsgs[aiMsgs.length-1].text.replace(/[^가-힣]/g,"") : "";
      const prompt = !lastAi
        ? `끝말잇기 첫 턴. 유저 단어:"${word}". 유효한 명사면 끝 글자로 시작하는 단어로 받아쳐. JSON만: {"valid":true,"reply":"단어"} 또는 {"valid":false,"reason":"이유"}. reply는 순수 한글만, 한방단어 금지.`
        : `끝말잇기 진행. AI이전단어:"${lastAi}", 유저입력:"${word}". 명사이고 끝말 이어지면 valid:true. JSON만: {"valid":true,"reply":"단어"} 또는 {"valid":false,"reason":"이유"}. reply는 순수 한글만.`;
      const res = await fetch("/api/gemini",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({prompt})});
      const d = await res.json();
      const json = JSON.parse(d.text.replace(/```json|```/g,"").trim());
      if(json.valid){ setMsgs(p=>[...p,{from:"ai",text:json.reply}]); setScore(s=>s+10); sfx.correct(); }
      else { setMsgs(p=>[...p,{from:"ai",text:`땡! ${json.reason} 😅`}]); sfx.wrong(); }
    } catch(e) { setMsgs(p=>[...p,{from:"ai",text:"오류가 났어요. 다시 해줘!"}]); }
    setLoading(false); setTimeout(()=>iref.current?.focus(),100);
  };

  return (
    <Wrap>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 17px",flexShrink:0}}>
        <button onClick={() => onBack()} style={{width:33,height:33,borderRadius:"50%",background:"rgba(255,255,255,0.06)",border:"1px solid rgba(255,255,255,0.1)",color:"#64748b",cursor:"pointer",fontSize:"0.82rem"}}>✕</button>
        <div style={{color:"#e2e8f0",fontWeight:900,fontSize:"0.95rem"}}>🧩 끝말잇기</div>
        <div style={{display:"flex",flexDirection:"column",alignItems:"flex-end"}}><span style={{color:"#475569",fontSize:"0.6rem"}}>SCORE</span><span style={{color:"#fff",fontWeight:900}}>{score}</span></div>
      </div>
      <div ref={scrollRef} style={{flex:1,overflowY:"auto",padding:"10px 16px",display:"flex",flexDirection:"column",gap:9}}>
        {msgs.map((m,i)=>(
          <div key={i} style={{display:"flex",justifyContent:m.from==="user"?"flex-end":"flex-start",alignItems:"flex-end",gap:7,animation:"fadein .25s ease-out"}}>
            {m.from==="ai"&&<div style={{fontSize:"1.3rem",flexShrink:0}}>🤖</div>}
            <div style={{maxWidth:"72%",padding:"10px 14px",borderRadius:m.from==="user"?"15px 4px 15px 15px":"4px 15px 15px 15px",background:m.from==="user"?"linear-gradient(135deg,#6366f1,#8b5cf6)":"rgba(255,255,255,0.07)",color:"#e2e8f0",fontSize:"0.95rem",wordBreak:"break-all",border:m.from==="user"?"none":"1px solid rgba(255,255,255,0.1)"}}>
              {m.text}
            </div>
          </div>
        ))}
        {loading&&<div style={{color:"#475569",fontSize:"0.78rem",marginLeft:38,animation:"pulse 1s infinite"}}>AI 생각 중...</div>}
      </div>
      <div style={{padding:"11px 16px",display:"flex",gap:10,borderTop:"1px solid rgba(255,255,255,0.06)",flexShrink:0}}>
        <TInput inputRef={iref} value={input} onChange={e=>setInput(e.target.value)} onEnter={send} placeholder="한글 단어 입력"/>
        <SBtn onClick={send} disabled={loading}>{loading?"⏳":"→"}</SBtn>
      </div>
      <input ref={iref} style={{position:"fixed",opacity:0,pointerEvents:"none",width:1,height:1}} onKeyDown={e=>{if(e.key==="Enter"){e.preventDefault();send();}}} onChange={e=>setInput(e.target.value)} value={input}/>
    </Wrap>
  );
}