"use client";
import { useState, useEffect, useRef } from "react";
import { useSFX, Wrap, Mid, Hdr, Card, TInput, SBtn, Ptcl, Rslt } from "@/lib/gameShared";

const TW_FB = [
  { word:"휴대폰", hints:["전자기기예요","매일 들고 다녀요","통화를 해요","손 안에 쏙"] },
  { word:"자전거", hints:["두 바퀴예요","페달을 밟아요","친환경 이동수단","Tour de France"] },
  { word:"도서관", hints:["조용한 곳","책이 엄청 많아요","무료로 이용해요","반납 기한이 있어요"] },
  { word:"냉장고", hints:["주방에 있어요","차갑게 해줘요","음식을 보관해요","문을 열면 시원해요"] },
  { word:"우산",   hints:["비올 때 써요","접었다 폈다","위에서 아래로 퍼져요","손잡이가 있어요"] },
  { word:"텔레비전",hints:["거실에 있어요","화면이 크요","뉴스를 봐요","리모컨으로 조작해요"] },
  { word:"세탁기", hints:["가전제품이에요","빨래를 해요","드럼형도 있어요","물과 세제를 써요"] },
  { word:"에어컨", hints:["여름에 켜요","바람이 나와요","차갑게 해줘요","리모컨이 있어요"] },
];

export default function GameTwenty({ onBack }) {
  const sfx = useSFX();
  const [list]  = useState(() => [...TW_FB].sort(() => Math.random() - .5));
  const [idx,   setIdx]   = useState(0);
  const [hStep, setHStep] = useState(0);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [phase, setPhase] = useState("playing");
  const [glow,  setGlow]  = useState(null);
  const [shake, setShake] = useState(false);
  const [pt,    setPt]    = useState(0);
  const [history, setHistory] = useState([]);
  const iref = useRef(null);

  useEffect(() => { setTimeout(() => iref.current?.focus(), 200); }, []);
  // 문제가 바뀔 때 힌트 초기화
  useEffect(() => { if (phase === "playing") setHStep(0); }, [idx, phase]);

  const focusInput = () => setTimeout(() => {
    // FIX: input state를 "" 로 강제 설정 후 포커스
    setInput("");
    setTimeout(() => iref.current?.focus(), 50);
  }, 50);

  const submit = () => {
    const val = input.trim();
    if (!val) return;

    if (val === list[idx].word) {
      const pts = 100 - hStep * 20;
      setScore(s => s + pts);
      setPt(p => p + 1);
      setHistory(h => [...h, { word:list[idx].word, ok:true, pts, reason:`힌트 ${hStep+1}개 사용` }]);
      setGlow("correct");
      sfx.correct();
      setInput(""); // FIX: 정답 즉시 초기화
      setTimeout(() => {
        if (idx + 1 >= list.length) { setPhase("end"); sfx.done(); }
        else { setIdx(i => i + 1); setGlow(null); focusInput(); }
      }, 550);
    } else {
      // FIX: 오답 즉시 input 초기화 — 이후 타이머 포커스 전에 이미 빈 상태
      setInput("");
      if (hStep < list[idx].hints.length - 1) {
        setHStep(h => h + 1);
        sfx.reveal();
        setTimeout(() => iref.current?.focus(), 100);
      } else {
        setHistory(h => [...h, { word:list[idx].word, ok:false, pts:0, reason:"힌트 4개 모두 사용" }]);
        setGlow("wrong");
        setShake(true);
        sfx.wrong();
        setTimeout(() => { setShake(false); setGlow(null); setTimeout(() => iref.current?.focus(), 100); }, 450);
      }
    }
  };

  if (phase === "end") return (
    <Rslt score={score} maxScore={list.length * 100}
      onRetry={() => { setIdx(0); setScore(0); setHStep(0); setInput(""); setGlow(null); setHistory([]); setPhase("playing"); setTimeout(() => iref.current?.focus(), 200); }}
      onBack={onBack}
      extra={[["정답", history.filter(h=>h.ok).length + "/" + list.length]]}
      detail={history}
    />
  );

  const q = list[idx];
  return (
    <Wrap>
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"11px 17px", flexShrink:0 }}>
        <button onClick={() => onBack()} style={{ width:33, height:33, borderRadius:"50%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", color:"#64748b", cursor:"pointer", fontSize:"0.82rem", display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>
        <div style={{ color:"#e2e8f0", fontWeight:900, fontSize:"0.92rem" }}>👶 스무고개</div>
        <div style={{ color:"#fff", fontWeight:900 }}>{score}</div>
      </div>
      <Mid>
        <Ptcl trigger={pt} color="#f59e0b" />
        <div style={{ color:"#334155", fontSize:"0.68rem", letterSpacing:".13em", marginBottom:12 }}>
          힌트 적게 볼수록 고득점! (최대 {100 - hStep * 20}점)
        </div>
        <Card glow={glow} shake={shake}>
          <div style={{ display:"flex", flexDirection:"column", gap:7 }}>
            {q.hints.slice(0, hStep + 1).map((h, i) => (
              <div key={i} style={{ background:"rgba(255,255,255,0.05)", borderRadius:8, padding:"9px 13px", fontSize:"0.82rem", color:"#cbd5e1", borderLeft:`2px solid ${["#6366f1","#a78bfa","#f59e0b","#ef4444"][i]}`, animation:"slidein .3s ease-out" }}>
                💡 힌트 {i + 1}: {h}
              </div>
            ))}
          </div>
          {hStep < q.hints.length - 1 && (
            <div style={{ textAlign:"center", color:"#334155", fontSize:"0.7rem", marginTop:8 }}>틀리면 다음 힌트가 공개돼요</div>
          )}
          {glow === "correct" && <div style={{ color:"#22c55e", textAlign:"center", fontWeight:700, marginTop:8 }}>✓ {q.word}!</div>}
        </Card>
        <div style={{ display:"flex", gap:10, width:"100%", maxWidth:400, marginTop:14 }}>
          <TInput
            inputRef={iref}
            value={input}
            onChange={e => { setInput(e.target.value); sfx.type(); }}
            onEnter={submit}
            placeholder="정답을 입력하세요"
            glow={glow}
          />
          <SBtn onClick={submit} color="#f59e0b">→</SBtn>
        </div>
      </Mid>
    </Wrap>
  );
}