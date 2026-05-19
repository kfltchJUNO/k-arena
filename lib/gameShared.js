"use client";
import { useState, useEffect, useRef } from "react";

// ── SFX ──────────────────────────────────────────────────────
export function useSFX() {
  const C = useRef(null);
  const g = () => { if (!C.current) C.current = new (window.AudioContext || window.webkitAudioContext)(); if (C.current.state === "suspended") C.current.resume(); return C.current; };
  const t = (f, tp, d, v = 0.13, dl = 0) => { try { const c = g(), o = c.createOscillator(), gn = c.createGain(); o.connect(gn); gn.connect(c.destination); o.type = tp; o.frequency.setValueAtTime(f, c.currentTime + dl); gn.gain.setValueAtTime(0, c.currentTime + dl); gn.gain.linearRampToValueAtTime(v, c.currentTime + dl + 0.01); gn.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dl + d); o.start(c.currentTime + dl); o.stop(c.currentTime + dl + d + 0.05); } catch (e) {} };
  const n = (d, v = 0.04, dl = 0) => { try { const c = g(), b = c.createBuffer(1, c.sampleRate * d, c.sampleRate), dt = b.getChannelData(0); for (let i = 0; i < dt.length; i++) dt[i] = Math.random() * 2 - 1; const s = c.createBufferSource(), gn = c.createGain(); s.buffer = b; s.connect(gn); gn.connect(c.destination); gn.gain.setValueAtTime(v, c.currentTime + dl); gn.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dl + d); s.start(c.currentTime + dl); } catch (e) {} };
  return {
    correct: () => { t(523,"sine",.1,.18); t(659,"sine",.1,.2,.08); t(880,"sine",.18,.22,.16); n(.06,.03,.16); },
    wrong:   () => { t(200,"sawtooth",.15,.14); t(160,"square",.1,.08,.08); n(.12,.04); },
    type:    () => t(1100,"sine",.03,.04),
    tick:    () => t(1400,"square",.06,.09),
    select:  () => { t(440,"sine",.06,.1); t(550,"sine",.08,.12,.05); },
    desel:   () => t(330,"sine",.05,.08),
    done:    () => { [523,659,784,1047,1319].forEach((f,i) => t(f,"sine",.22,.16,i*.09)); n(.1,.04,.45); },
    over:    () => [440,370,311,262].forEach((f,i) => t(f,"sawtooth",.28,.12,i*.18)),
    start:   () => { t(392,"sine",.08,.13); t(523,"sine",.08,.15,.09); t(659,"sine",.18,.18,.18); },
    pop:     () => { t(660,"sine",.07,.15); t(880,"sine",.1,.13,.06); },
    reveal:  () => { t(550,"sine",.08,.12); t(700,"sine",.12,.1,.06); },
    timeout: () => { t(300,"triangle",.2,.1); t(240,"triangle",.25,.1,.15); },
    miss:    () => { t(250,"sawtooth",.2,.12); n(.1,.04); },
    levelup: () => [523,587,659,784,880,1047].forEach((f,i) => t(f,"sine",.18,.14,i*.06)),
  };
}

// ── 공통 키프레임 ─────────────────────────────────────────────
export const KF = `
@keyframes shake{0%{transform:translateX(0)}15%{transform:translateX(-9px)}35%{transform:translateX(7px)}55%{transform:translateX(-5px)}75%{transform:translateX(3px)}100%{transform:translateX(0)}}
@keyframes popin{0%{transform:scale(.5);opacity:0}65%{transform:scale(1.08);opacity:1}100%{transform:scale(1);opacity:1}}
@keyframes fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes slidein{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:translateX(0)}}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
@keyframes pfly{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(var(--vx),var(--vy)) scale(0);opacity:0}}
@keyframes dropin{0%{opacity:0;transform:translateY(-28px)}100%{opacity:1;transform:translateY(0)}}
`;

// ── 공통 UI ───────────────────────────────────────────────────
export function Wrap({ children }) {
  return (
    <div style={{ minHeight:"100dvh", background:"linear-gradient(160deg,#06090f,#0f172a)", display:"flex", flexDirection:"column", fontFamily:"system-ui,sans-serif", color:"#e2e8f0" }}>
      <style>{KF + `*{box-sizing:border-box} ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-thumb{background:#1e293b;border-radius:4px}`}</style>
      {children}
    </div>
  );
}

export function Mid({ children }) {
  return <div style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", padding:"16px 20px", position:"relative" }}>{children}</div>;
}

export function Hdr({ onBack, score, prog, total }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:10, padding:"13px 17px", flexShrink:0 }}>
      {/* FIX: onClick={() => onBack()} 로 래핑 — SyntheticEvent 전달 방지 */}
      <button onClick={() => onBack()} style={{ width:33, height:33, borderRadius:"50%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", color:"#64748b", cursor:"pointer", fontSize:"0.82rem", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
      {prog != null && (
        <div style={{ flex:1, display:"flex", gap:4, justifyContent:"center" }}>
          {Array.from({ length: total||8 }, (_,i) => (
            <div key={i} style={{ width:7, height:7, borderRadius:"50%", background:i<prog?"#8b5cf6":i===prog?"#fff":"rgba(255,255,255,0.15)", transform:i===prog?"scale(1.4)":"scale(1)", transition:"all .25s" }} />
          ))}
        </div>
      )}
      {score != null && (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"flex-end", flexShrink:0 }}>
          <span style={{ color:"#475569", fontSize:"0.6rem", letterSpacing:".1em" }}>SCORE</span>
          <span style={{ color:"#fff", fontWeight:900, fontSize:"1rem" }}>{score}</span>
        </div>
      )}
    </div>
  );
}

export function TBar({ pct, urgent }) {
  const c = urgent ? "#ef4444" : pct>.5 ? "#22c55e" : "#f59e0b";
  return <div style={{ height:4, background:"rgba(255,255,255,0.06)", margin:"0 17px", borderRadius:2, overflow:"hidden", flexShrink:0 }}><div style={{ height:"100%", width:`${pct*100}%`, background:c, boxShadow:`0 0 8px ${c}88`, borderRadius:2, transition:"width 1s linear,background .3s" }}/></div>;
}

export function Card({ children, glow, shake, style={} }) {
  const bc = glow==="correct"?"#22c55e":glow==="wrong"?"#ef4444":"rgba(255,255,255,0.09)";
  return <div style={{ width:"100%", maxWidth:400, borderRadius:22, border:`1.5px solid ${bc}`, background:"rgba(255,255,255,0.04)", backdropFilter:"blur(16px)", padding:"26px 22px", position:"relative", transition:"border-color .25s", animation:shake?"shake .35s ease-out":glow==="correct"?"popin .25s ease-out":undefined, ...style }}>{children}</div>;
}

// FIX: 모바일 키보드 대응 — inputMode="text", enterKeyHint, scrollIntoView
export function TInput({ value, onChange, onEnter, placeholder="입력하세요", glow, inputRef }) {
  const bc = glow==="correct"?"#22c55e":glow==="wrong"?"#ef4444":"rgba(255,255,255,0.11)";
  return (
    <input
      ref={inputRef}
      value={value}
      onChange={onChange}
      onKeyDown={e => { if (e.key==="Enter") { e.preventDefault(); onEnter&&onEnter(); } }}
      // FIX: 모바일에서 키보드가 올라올 때 입력창이 보이도록
      onFocus={e => { setTimeout(() => e.target.scrollIntoView({ behavior:"smooth", block:"center" }), 300); }}
      placeholder={placeholder}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="none"
      inputMode="text"
      enterKeyHint="done"
      style={{ flex:1, padding:"13px 16px", borderRadius:13, border:`1.5px solid ${bc}`, background:"rgba(255,255,255,0.05)", color:"#e2e8f0", fontSize:"1rem", fontFamily:"inherit", outline:"none", transition:"border-color .2s" }}
    />
  );
}

export function SBtn({ onClick, color="#6366f1", children, disabled }) {
  return <button onClick={disabled?undefined:onClick} style={{ width:50, height:50, borderRadius:13, background:disabled?"#1e293b":`linear-gradient(135deg,${color},${color}cc)`, border:"none", color:"#fff", fontSize:"1.2rem", cursor:disabled?"not-allowed":"pointer", flexShrink:0, boxShadow:disabled?"none":`0 4px 16px ${color}40` }}>{children}</button>;
}

export function Ptcl({ trigger, color="#a78bfa" }) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    if (!trigger) return;
    const CS = ["#ff6b6b","#ffd93d","#6bcb77","#4d96ff","#ff6bce","#fff",color];
    setItems(Array.from({length:12},(_,i)=>({id:Date.now()+i, x:30+Math.random()*40, y:40+Math.random()*20, vx:(Math.random()-.5)*120, vy:-(35+Math.random()*70), c:CS[Math.floor(Math.random()*CS.length)], s:6+Math.random()*7})));
    const tid = setTimeout(()=>setItems([]),700);
    return ()=>clearTimeout(tid);
  },[trigger]);
  return <div style={{position:"absolute",inset:0,pointerEvents:"none",overflow:"hidden",zIndex:20}}>{items.map(p=><div key={p.id} style={{position:"absolute",left:p.x+"%",top:p.y+"%",width:p.s,height:p.s,borderRadius:"50%",background:p.c,animation:"pfly .65s ease-out forwards","--vx":p.vx+"px","--vy":p.vy+"px"}}/>)}</div>;
}

// FIX: onBack을 () => onBack() 으로 래핑 — SyntheticEvent 전달 방지
export function Rslt({ score, maxScore, onBack, onRetry, extra=[], detail=[] }) {
  const pct = Math.round((score/maxScore)*100);
  const grade = pct>=90?"S":pct>=70?"A":pct>=50?"B":"C";
  const gc = {S:"#ffd700",A:"#22c55e",B:"#4d96ff",C:"#f87171"}[grade];
  return (
    <Wrap>
      <div style={{flex:1,overflowY:"auto",padding:"24px 20px"}}>
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:8,animation:"fadein .4s ease-out"}}>
          <div style={{fontSize:"2.6rem"}}>{pct>=90?"🎉":pct>=70?"😎":pct>=50?"😊":"😅"}</div>
          <div style={{color:"#475569",fontSize:"0.68rem",letterSpacing:".12em"}}>RESULT</div>
          <div style={{fontSize:"4.5rem",fontWeight:900,color:gc,lineHeight:1,animation:"popin .4s cubic-bezier(.34,1.56,.64,1)"}}>{grade}</div>
          <div style={{color:"#e2e8f0",fontSize:"1.7rem",fontWeight:800}}>{score}점</div>
          <div style={{display:"flex",gap:8,marginTop:4,marginBottom:8,flexWrap:"wrap",justifyContent:"center"}}>
            {[["점수",score+"점"],["등급",grade],...extra].map(([l,v])=>(
              <div key={l} style={{background:"rgba(255,255,255,0.05)",border:"1px solid rgba(255,255,255,0.08)",borderRadius:10,padding:"8px 11px",textAlign:"center",minWidth:58}}>
                <div style={{color:"#475569",fontSize:"0.58rem",marginBottom:2}}>{l}</div>
                <div style={{color:"#e2e8f0",fontWeight:800,fontSize:"0.88rem"}}>{v}</div>
              </div>
            ))}
          </div>
          {detail.length>0&&(
            <div style={{width:"100%",maxWidth:400,marginBottom:8}}>
              <div style={{color:"#475569",fontSize:"0.68rem",letterSpacing:".1em",marginBottom:8,textAlign:"center"}}>— 상세 결과 —</div>
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {detail.map((d,i)=>(
                  <div key={i} style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:d.ok?"rgba(34,197,94,0.07)":"rgba(239,68,68,0.07)",border:`1px solid ${d.ok?"rgba(34,197,94,0.2)":"rgba(239,68,68,0.2)"}`,borderRadius:10,padding:"9px 13px",animation:`fadein .3s ease-out ${i*.04}s both`}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,flex:1,minWidth:0}}>
                      <span style={{fontSize:"0.9rem"}}>{d.ok?"✅":"❌"}</span>
                      <span style={{color:"#e2e8f0",fontWeight:600,fontSize:"0.88rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{d.word}</span>
                      {d.answer&&!d.ok&&<span style={{color:"#64748b",fontSize:"0.74rem",flexShrink:0}}>→ {d.answer}</span>}
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:6,flexShrink:0}}>
                      {d.pts!=null&&<span style={{color:d.ok?"#22c55e":"#ef4444",fontWeight:700,fontSize:"0.8rem"}}>{d.ok?"+"+d.pts:"0"}점</span>}
                      {d.reason&&<span style={{color:"#64748b",fontSize:"0.7rem"}}>{d.reason}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div style={{display:"flex",gap:10,marginTop:4}}>
            <button onClick={onRetry} style={{padding:"12px 22px",borderRadius:12,background:"linear-gradient(135deg,#6366f1,#8b5cf6)",border:"none",color:"#fff",fontWeight:700,cursor:"pointer",fontFamily:"inherit"}}>다시 하기</button>
            {/* FIX: () => onBack() 으로 래핑 */}
            <button onClick={() => onBack()} style={{padding:"12px 22px",borderRadius:12,background:"rgba(255,255,255,0.07)",border:"1px solid rgba(255,255,255,0.1)",color:"#94a3b8",fontWeight:600,cursor:"pointer",fontFamily:"inherit"}}>나가기</button>
          </div>
        </div>
      </div>
    </Wrap>
  );
}