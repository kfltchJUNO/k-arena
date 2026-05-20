"use client";
import { useState, useEffect } from "react";
import { auth, googleProvider, db } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import { doc, setDoc, updateDoc, increment, getDoc, collection, query, where, getDocs } from "firebase/firestore";

import GameFactory     from "./components/GameFactory";
import GameSpeed       from "./components/GameSpeed";
import GameWordChain   from "./components/GameWordChain";
import GameProverb     from "./components/GameProverb";
import GameCategory    from "./components/GameCategory";
import GameHomonym     from "./components/GameHomonym";
import GameRain        from "./components/GameRain";
import GameIdiom       from "./components/GameIdiom";
import GameInitial     from "./components/GameInitial";
import GameSynonym     from "./components/GameSynonym";
import GameCollocation from "./components/GameCollocation";
import GameSentence    from "./components/GameSentence";
import GameTwenty      from "./components/GameTwenty";
import Admin           from "./components/Admin";
import Ranking         from "./components/Ranking";

const ADMIN_EMAIL = "ot.helper7@gmail.com";

const ALL_GAME_KEYS = [
  "best_factory","best_speed","best_wordchain","best_rain",
  "best_idiom","best_initial","best_synonym","best_collocation",
  "best_sentence","best_twenty","best_proverb","best_category","best_homonym"
];

const LEVEL_THRESHOLDS = [0, 200, 600, 1200];
const GAME_UNLOCK = {
  wordchain:0, speed:0, initial:0, rain:0,
  idiom:1, synonym:1, collocation:1, twenty:1,
  sentence:2, factory:2, homonym:2,
  proverb:3, category:3,
};

const GAMES = [
  {id:"wordchain",  icon:"🧩",name:"끝말잇기",       desc:"AI와 끝장 승부",             color:"#ef4444",tag:"AI대전"},
  {id:"speed",      icon:"⚡",name:"스피드 퀴즈",    desc:"설명 보고 단어 맞히기",      color:"#6366f1",tag:"타이머"},
  {id:"initial",    icon:"🤫",name:"초성 퀴즈",      desc:"초성 힌트로 단어 맞히기",    color:"#a78bfa",tag:"힌트"},
  {id:"rain",       icon:"🌧️",name:"단어 비",         desc:"쏟아지는 단어를 막아라!",    color:"#0ea5e9",tag:"아케이드"},
  {id:"idiom",      icon:"🦁",name:"사자성어 잇기",  desc:"앞 두 글자 보고 뒤 완성",    color:"#f59e0b",tag:"어휘"},
  {id:"synonym",    icon:"🔗",name:"유의어 잇기",    desc:"60초 유의어 배틀",           color:"#06b6d4",tag:"스피드"},
  {id:"collocation",icon:"👫",name:"짝꿍 단어",      desc:"어울리는 동사 고르기",       color:"#ec4899",tag:"4지선다"},
  {id:"twenty",     icon:"👶",name:"스무고개",       desc:"힌트 보고 정답 맞히기",      color:"#f59e0b",tag:"추리"},
  {id:"sentence",   icon:"🧩",name:"문장 조각",      desc:"단어 카드 어순 배열",        color:"#10b981",tag:"퍼즐"},
  {id:"factory",    icon:"🏭",name:"단어 공장",      desc:"초성으로 2글자 단어 만들기", color:"#6366f1",tag:"창작"},
  {id:"homonym",    icon:"🕵️",name:"연상 탐정",      desc:"세 단서로 정체 밝혀라",      color:"#8b5cf6",tag:"추리"},
  {id:"proverb",    icon:"📜",name:"속담 이어달리기",desc:"속담 뒷부분 완성하기",       color:"#22c55e",tag:"어휘"},
  {id:"category",   icon:"🌊",name:"주제 러쉬",      desc:"주제 단어 최대한 많이!",     color:"#06b6d4",tag:"타임어택"},
];

function getLevel(score) {
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (score >= LEVEL_THRESHOLDS[i]) return i;
  }
  return 0;
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap');
@keyframes fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes glow{0%,100%{text-shadow:0 0 20px rgba(0,245,212,.5)}50%{text-shadow:0 0 40px rgba(0,245,212,.9)}}
*{box-sizing:border-box}
::-webkit-scrollbar{width:4px}
::-webkit-scrollbar-thumb{background:#1e293b;border-radius:4px}
`;

export default function Home() {
  const [user,          setUser]          = useState(null);
  const [userData,      setUserData]      = useState(null);
  const [activeGame,    setActiveGame]    = useState(null);
  const [isEditingNick, setIsEditingNick] = useState(false);
  const [newNickname,   setNewNickname]   = useState("");
  const [nickCheckMsg,  setNickCheckMsg]  = useState("");
  const [isNickAvail,   setIsNickAvail]   = useState(false);
  const [showStepModal, setShowStepModal] = useState(false);
  const [lockedMsg,     setLockedMsg]     = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const ref  = doc(db, "k_arena_users", u.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const d = snap.data();
          if (d.nickname && d.nickname !== u.displayName) u.displayName = d.nickname;
          await updateDoc(ref, { lastLogin: new Date(), loginCount: increment(1) });
          setUserData(d);
        } else {
          const init = { nickname:u.displayName, email:u.email, lastLogin:new Date(), loginCount:1, gamePlayCount:0, totalScore:0 };
          await setDoc(ref, init);
          setUserData(init);
        }
        setNewNickname(u.displayName || "");
      } else { setUserData(null); }
    });
    return () => unsub();
  }, []);

  const login  = () => signInWithPopup(auth, googleProvider);
  const logout = () => { signOut(auth); setUser(null); setUserData(null); };

  const checkNick = async () => {
    const nick = newNickname.trim();
    if (nick.length < 2 || nick.length > 8) { setNickCheckMsg("❌ 2~8글자로 입력해주세요"); setIsNickAvail(false); return; }
    if (nick === user.displayName)           { setNickCheckMsg("🤔 현재 닉네임과 같아요");  setIsNickAvail(false); return; }
    const qs = await getDocs(query(collection(db,"k_arena_users"), where("nickname","==",nick)));
    if (!qs.empty) { setNickCheckMsg("❌ 이미 사용 중"); setIsNickAvail(false); }
    else           { setNickCheckMsg("✅ 사용 가능!"); setIsNickAvail(true); }
  };

  const saveNick = async () => {
    if (!isNickAvail) return;
    const nick = newNickname.trim();
    await updateProfile(auth.currentUser, { displayName: nick });
    await updateDoc(doc(db,"k_arena_users",user.uid), { nickname: nick });
    setUser(u => ({ ...u, displayName: nick }));
    setIsEditingNick(false); setNickCheckMsg("");
  };

  const startGame = async (id) => {
    const level    = getLevel(userData?.totalScore || 0);
    const required = GAME_UNLOCK[id] ?? 0;
    if (required > level) {
      setLockedMsg(`🔒 총 ${LEVEL_THRESHOLDS[required]}점 이상이면 열려요!\n현재: ${userData?.totalScore || 0}점`);
      return;
    }
    setLockedMsg("");
    setActiveGame(id);
    if (user) await updateDoc(doc(db,"k_arena_users",user.uid), { gamePlayCount: increment(1) });
  };

  const finishGame = async (...args) => {
    let score = 0, aborted = false;
    if (args.length === 1)      { score = Number(args[0]) || 0; }
    else if (args.length === 2) { if (typeof args[0]==="number"){ score=args[0]; aborted=!!args[1]; } else { score=Number(args[1])||0; } }
    else                        { score=Number(args[1])||0; aborted=!!args[2]; }

    const game = activeGame;
    setActiveGame(null);

    if (aborted || !user || score <= 0 || !game) return;
    try {
      const ref  = doc(db,"k_arena_users",user.uid);
      const snap = await getDoc(ref);
      if (!snap.exists()) return;
      const d = snap.data();
      const bestKey     = `best_${game}`;
      const currentBest = d[bestKey] || 0;
      const updates     = {};
      if (score > currentBest) updates[bestKey] = score;
      let newTotal = 0;
      ALL_GAME_KEYS.forEach(k => {
        if (k===bestKey) newTotal += Math.max(score, currentBest);
        else newTotal += (d[k]||0);
      });
      if (newTotal !== d.totalScore) updates.totalScore = newTotal;
      if (Object.keys(updates).length > 0) {
        await updateDoc(ref, updates);
        setUserData(prev => ({ ...prev, ...updates }));
      }
    } catch (e) { console.error("점수 저장 오류:", e); }
  };

  // ── 게임 화면 ──────────────────────────────────────────────
  if (activeGame) {
    const back = (...a) => finishGame(...a);
    switch (activeGame) {
      case "factory":     return <GameFactory     onBack={back}/>;
      case "speed":       return <GameSpeed       onBack={back}/>;
      case "wordchain":   return <GameWordChain   onBack={back}/>;
      case "rain":        return <GameRain        onBack={back}/>;
      case "idiom":       return <GameIdiom       onBack={back}/>;
      case "initial":     return <GameInitial     onBack={back}/>;
      case "synonym":     return <GameSynonym     onBack={back}/>;
      case "collocation": return <GameCollocation onBack={back}/>;
      case "sentence":    return <GameSentence    onBack={back}/>;
      case "twenty":      return <GameTwenty      onBack={back}/>;
      case "proverb":     return <GameProverb     onBack={back}/>;
      case "category":    return <GameCategory    onBack={back}/>;
      case "homonym":     return <GameHomonym     onBack={back}/>;
      case "admin":       return <Admin           onBack={() => setActiveGame(null)}/>;
      case "ranking":     return <Ranking         onBack={() => setActiveGame(null)}/>;
      default: setActiveGame(null); return null;
    }
  }

  // ── 로그인 화면 ────────────────────────────────────────────
  if (!user) {
    return (
      <div style={{ minHeight:"100dvh", background:"linear-gradient(160deg,#06090f,#0f172a)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"'Nunito',system-ui,sans-serif", color:"#e2e8f0", padding:"24px 20px" }}>
        <style>{CSS}</style>
        <div style={{ width:"100%", maxWidth:360, textAlign:"center", animation:"fadein .5s ease-out" }}>
          <div style={{ fontSize:"4rem", marginBottom:12 }}>⚔️</div>
          <h1 style={{ fontFamily:"'Nunito',sans-serif", fontSize:"2.4rem", fontWeight:900, color:"#00f5d4", animation:"glow 3s ease-in-out infinite", margin:"0 0 4px" }}>K-Arena</h1>
          <p style={{ color:"#6b6b8a", fontSize:"0.8rem", letterSpacing:"0.15em", textTransform:"uppercase", marginBottom:32 }}>한국어 두뇌 트레이닝</p>
          <button onClick={login} style={{ display:"flex", alignItems:"center", gap:12, background:"#fff", color:"#1a1a2e", border:"none", borderRadius:16, padding:"15px 28px", fontSize:"1rem", fontWeight:800, cursor:"pointer", margin:"0 auto 28px", boxShadow:"0 4px 24px rgba(0,0,0,.4)", fontFamily:"inherit" }}>
            <span style={{ fontWeight:900, fontSize:"1.1rem" }}>G</span> 구글로 시작하기
          </button>
          <div style={{ background:"rgba(255,255,255,.03)", border:"1px solid rgba(255,255,255,.07)", borderRadius:16, padding:"18px 16px", textAlign:"left" }}>
            <p style={{ color:"#6b6b8a", fontSize:"0.78rem", lineHeight:1.9, margin:0 }}>
              K-Arena는 한국어 어휘력을 게임으로 키우는 학습 플랫폼입니다.<br/>
              끝말잇기 · 스피드 퀴즈 · 초성 퀴즈 · 속담 이어달리기 등<br/>
              <strong style={{color:"#a78bfa"}}>13가지 게임</strong>으로 재미있게 한국어를 연습하세요.<br/>
              TOPIK 준비생과 한국어 학습자를 위한 최적의 훈련 앱입니다.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── 메인 로비 ──────────────────────────────────────────────
  const totalScore    = userData?.totalScore || 0;
  const level         = getLevel(totalScore);
  const levelNames    = ["🌱 입문", "⚔️ 중급", "🔮 고급", "👑 전설"];
  const nextThreshold = LEVEL_THRESHOLDS[level + 1];
  const isAdmin       = user?.email === ADMIN_EMAIL;

  return (
    <div style={{ minHeight:"100dvh", background:"linear-gradient(160deg,#06090f,#0f172a)", display:"flex", flexDirection:"column", fontFamily:"'Nunito',system-ui,sans-serif", color:"#e2e8f0" }}>
      <style>{CSS}</style>

      {/* 헤더 */}
      <div style={{ flexShrink:0, background:"rgba(255,255,255,.03)", borderBottom:"1px solid rgba(255,255,255,.07)", padding:"12px 16px" }}>
        <div style={{ maxWidth:480, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:"1.3rem" }}>⚔️</span>
              <span style={{ fontFamily:"'Nunito',sans-serif", fontSize:"1.25rem", fontWeight:900, color:"#00f5d4" }}>K-Arena</span>
            </div>
            <div style={{ display:"flex", gap:7 }}>
              <button onClick={() => setActiveGame("ranking")} style={{ background:"rgba(255,199,0,.1)", border:"1px solid rgba(255,199,0,.25)", borderRadius:10, color:"#fbbf24", fontSize:"0.76rem", padding:"6px 11px", cursor:"pointer", fontFamily:"inherit", fontWeight:800 }}>🏆 랭킹</button>
              <button onClick={logout} style={{ background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", borderRadius:10, color:"#94a3b8", fontSize:"0.76rem", padding:"6px 11px", cursor:"pointer", fontFamily:"inherit" }}>로그아웃</button>
            </div>
          </div>

          {/* 닉네임 */}
          {isEditingNick ? (
            <div style={{ display:"flex", flexWrap:"wrap", gap:6, alignItems:"center" }}>
              <input value={newNickname} onChange={e=>{setNewNickname(e.target.value);setIsNickAvail(false);setNickCheckMsg("");}} placeholder="2~8글자" style={{ padding:"7px 11px", fontSize:"0.85rem", width:100, border:"1px solid #334155", borderRadius:9, background:"rgba(255,255,255,.07)", color:"#e2e8f0", outline:"none", fontFamily:"inherit" }}/>
              <button onClick={checkNick} style={{ background:"#6366f1", border:"none", borderRadius:9, color:"#fff", fontSize:"0.74rem", padding:"7px 10px", cursor:"pointer", fontFamily:"inherit", fontWeight:800 }}>중복확인</button>
              <button onClick={saveNick} disabled={!isNickAvail} style={{ background:isNickAvail?"#22c55e":"#334155", border:"none", borderRadius:9, color:"#fff", fontSize:"0.74rem", padding:"7px 10px", cursor:isNickAvail?"pointer":"not-allowed", fontFamily:"inherit", fontWeight:800 }}>저장</button>
              <button onClick={()=>{setIsEditingNick(false);setNewNickname(user.displayName);}} style={{ background:"rgba(255,255,255,.06)", border:"1px solid rgba(255,255,255,.1)", borderRadius:9, color:"#94a3b8", fontSize:"0.74rem", padding:"7px 10px", cursor:"pointer", fontFamily:"inherit" }}>취소</button>
              {nickCheckMsg && <span style={{ fontSize:"0.7rem", color:isNickAvail?"#22c55e":"#ef4444" }}>{nickCheckMsg}</span>}
            </div>
          ) : (
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
              <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                <span style={{ color:"#94a3b8", fontSize:"0.8rem" }}>👋 <b style={{color:"#e2e8f0"}}>{user.displayName}</b>님</span>
                <button onClick={()=>{setIsEditingNick(true);setNickCheckMsg("");setIsNickAvail(false);}} style={{ background:"none", border:"none", cursor:"pointer", fontSize:"0.9rem", padding:0, lineHeight:1 }}>✏️</button>
              </div>
              <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                <span style={{ background:"rgba(99,102,241,.15)", border:"1px solid rgba(99,102,241,.3)", borderRadius:8, color:"#a78bfa", fontSize:"0.7rem", fontWeight:800, padding:"3px 8px" }}>{levelNames[level]}</span>
                <span style={{ color:"#475569", fontSize:"0.7rem" }}>{totalScore.toLocaleString()}점</span>
              </div>
            </div>
          )}

          {/* 레벨 진행 바 */}
          {nextThreshold && (
            <div style={{ marginTop:8 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                <span style={{ color:"#334155", fontSize:"0.63rem" }}>다음 레벨: {LEVEL_THRESHOLDS[level+1]}점</span>
                <span style={{ color:"#334155", fontSize:"0.63rem" }}>{totalScore} / {nextThreshold}</span>
              </div>
              <div style={{ height:4, background:"rgba(255,255,255,.07)", borderRadius:2, overflow:"hidden" }}>
                <div style={{ height:"100%", width:`${Math.min(100,(totalScore/nextThreshold)*100)}%`, background:"linear-gradient(90deg,#6366f1,#a78bfa)", borderRadius:2, transition:"width .5s" }}/>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 잠금 메세지 */}
      {lockedMsg && (
        <div style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.3)", borderRadius:10, padding:"9px 14px", margin:"8px 16px 0", maxWidth:480, marginLeft:"auto", marginRight:"auto", width:"calc(100% - 32px)", display:"flex", justifyContent:"space-between", alignItems:"flex-start", gap:8 }}>
          <span style={{ color:"#f87171", fontSize:"0.8rem", whiteSpace:"pre-line", lineHeight:1.5 }}>{lockedMsg}</span>
          <button onClick={()=>setLockedMsg("")} style={{ background:"none", border:"none", color:"#64748b", fontSize:"1rem", cursor:"pointer", padding:0, lineHeight:1, flexShrink:0 }}>✕</button>
        </div>
      )}

      {/* 게임 그리드 */}
      <div style={{ flex:1, overflowY:"auto", padding:"10px 16px 24px", maxWidth:480, margin:"0 auto", width:"100%" }}>
        <p style={{ color:"#334155", fontSize:"0.68rem", margin:"4px 0 10px" }}>게임 13개 · 🔒는 총점을 올리면 해금돼요</p>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {GAMES.map((g, i) => {
            const req    = GAME_UNLOCK[g.id] ?? 0;
            const locked = req > level;
            return (
              <button key={g.id} onClick={() => startGame(g.id)}
                style={{ background:locked?"rgba(255,255,255,.02)":"rgba(255,255,255,.04)", border:`1px solid ${locked?"rgba(255,255,255,.06)":g.color+"22"}`, borderRadius:18, padding:"14px 12px", textAlign:"left", cursor:"pointer", fontFamily:"inherit", position:"relative", overflow:"hidden", opacity:locked?0.5:1, animation:`fadein .3s ease-out ${i*.03}s both`, WebkitTapHighlightColor:"transparent" }}>
                <div style={{ position:"absolute", top:-16, right:-16, width:56, height:56, borderRadius:"50%", background:`radial-gradient(circle,${g.color}18,transparent 70%)`, pointerEvents:"none" }}/>
                <div style={{ fontSize:"1.4rem", marginBottom:5 }}>{locked?"🔒":g.icon}</div>
                <div style={{ fontWeight:800, fontSize:"0.83rem", color:"#e2e8f0", marginBottom:2, lineHeight:1.3 }}>{g.name}</div>
                <div style={{ color:"#64748b", fontSize:"0.66rem", lineHeight:1.4, marginBottom:locked?0:7 }}>
                  {locked ? `${LEVEL_THRESHOLDS[req]}점 달성 시 해금` : g.desc}
                </div>
                {!locked && <div style={{ display:"inline-block", background:`${g.color}18`, border:`1px solid ${g.color}33`, color:g.color, fontSize:"0.58rem", fontWeight:700, padding:"2px 6px", borderRadius:999 }}>{g.tag}</div>}
              </button>
            );
          })}
        </div>

        {/* STEP Korean 버튼 */}
        <button onClick={() => setShowStepModal(true)} style={{ marginTop:12, width:"100%", background:"linear-gradient(135deg,rgba(99,102,241,.12),rgba(167,139,250,.12))", border:"1.5px solid rgba(99,102,241,.3)", borderRadius:16, padding:"14px 16px", textAlign:"left", cursor:"pointer", fontFamily:"inherit", display:"flex", alignItems:"center", gap:12, WebkitTapHighlightColor:"transparent" }}>
          <span style={{ fontSize:"1.8rem", flexShrink:0 }}>📚</span>
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontWeight:800, fontSize:"0.88rem", color:"#a78bfa", marginBottom:2 }}>STEP Korean 연계 학습</div>
            <div style={{ color:"#64748b", fontSize:"0.7rem" }}>초급 ~ TOPIK II 단계별 어휘 학습</div>
          </div>
          <span style={{ background:"rgba(99,102,241,.2)", border:"1px solid rgba(99,102,241,.3)", borderRadius:8, color:"#a78bfa", fontSize:"0.62rem", fontWeight:800, padding:"4px 8px", flexShrink:0 }}>준비중</span>
        </button>

        {/* 관리자 버튼 */}
        {isAdmin && (
          <div style={{ textAlign:"center", marginTop:14 }}>
            <button onClick={() => setActiveGame("admin")} style={{ background:"rgba(239,68,68,.1)", border:"1px solid rgba(239,68,68,.2)", borderRadius:10, color:"#f87171", fontSize:"0.74rem", padding:"7px 16px", cursor:"pointer", fontFamily:"inherit" }}>🔒 관리자 페이지</button>
          </div>
        )}
      </div>

      {/* STEP Korean 모달 */}
      {showStepModal && (
        <div onClick={() => setShowStepModal(false)} style={{ position:"fixed", inset:0, background:"rgba(0,0,0,.75)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:1000, padding:20 }}>
          <div onClick={e => e.stopPropagation()} style={{ background:"#0f172a", border:"1px solid rgba(99,102,241,.4)", borderRadius:24, padding:"32px 24px", maxWidth:320, width:"100%", textAlign:"center" }}>
            <div style={{ fontSize:"2.8rem", marginBottom:12 }}>📚</div>
            <h3 style={{ color:"#a78bfa", fontWeight:900, fontSize:"1.15rem", marginBottom:10 }}>STEP Korean 연계 학습</h3>
            <p style={{ color:"#94a3b8", fontSize:"0.83rem", lineHeight:1.8, marginBottom:22 }}>
              Step Korean 교재와 연계된<br/>
              단계별 맞춤 학습 기능을 준비 중입니다.<br/><br/>
              {/* FIX: 6급 제거 → TOPIK II 까지만 표기 */}
              <b style={{color:"#e2e8f0"}}>초급 ~ TOPIK II</b>까지<br/>
              8단계 커리큘럼과 함께 곧 출시됩니다! 🎉
            </p>
            <button onClick={() => setShowStepModal(false)} style={{ background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", borderRadius:12, color:"#fff", fontWeight:800, fontSize:"0.95rem", padding:"12px 32px", cursor:"pointer", fontFamily:"inherit" }}>확인</button>
          </div>
        </div>
      )}
    </div>
  );
}