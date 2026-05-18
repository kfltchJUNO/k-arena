"use client";
import { useState, useEffect } from "react";
import { auth, googleProvider, db } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import { doc, setDoc, updateDoc, increment, getDoc, collection, query, where, getDocs } from "firebase/firestore";

// ── 새 게임 컴포넌트 Import ───────────────────────────────────
import GameFactory    from "./components/GameFactory";
import GameSpeed      from "./components/GameSpeed";
import GameWordChain  from "./components/GameWordChain";
import GameProverb    from "./components/GameProverb";
import GameCategory   from "./components/GameCategory";
import GameHomonym    from "./components/GameHomonym";
import GameRain       from "./components/GameRain";
import GameIdiom      from "./components/GameIdiom";
import GameInitial    from "./components/GameInitial";
import GameSynonym    from "./components/GameSynonym";
import GameCollocation from "./components/GameCollocation";
import GameSentence   from "./components/GameSentence";
import GameTwenty     from "./components/GameTwenty";
import Admin          from "./components/Admin";
import Ranking        from "./components/Ranking";

const ALL_GAME_KEYS = [
  "best_factory", "best_speed", "best_wordchain",
  "best_rain", "best_idiom", "best_initial",
  "best_synonym", "best_collocation", "best_sentence", "best_twenty",
  "best_proverb", "best_category", "best_homonym"
];

// ── 로비 게임 목록 ─────────────────────────────────────────────
const GAMES = [
  { id:"wordchain",  icon:"🧩", name:"끝말잇기",      desc:"AI와 끝장 승부",            color:"#ef4444", tag:"AI대전" },
  { id:"speed",      icon:"⚡", name:"스피드 퀴즈",   desc:"설명 보고 단어 맞히기",     color:"#6366f1", tag:"타이머" },
  { id:"initial",    icon:"🤫", name:"초성 퀴즈",     desc:"초성 힌트로 단어 맞히기",   color:"#a78bfa", tag:"힌트" },
  { id:"idiom",      icon:"🦁", name:"사자성어 잇기", desc:"앞 두 글자 보고 뒤 완성",   color:"#f59e0b", tag:"어휘" },
  { id:"synonym",    icon:"🔗", name:"유의어 잇기",   desc:"60초 유의어 배틀",          color:"#06b6d4", tag:"스피드" },
  { id:"collocation",icon:"👫", name:"짝꿍 단어",     desc:"어울리는 동사 고르기",      color:"#ec4899", tag:"4지선다" },
  { id:"sentence",   icon:"🧩", name:"문장 조각",     desc:"단어 카드 어순 배열",       color:"#10b981", tag:"퍼즐" },
  { id:"proverb",    icon:"📜", name:"속담 이어달리기",desc:"속담 뒷부분 완성하기",     color:"#22c55e", tag:"어휘" },
  { id:"rain",       icon:"🌧️", name:"단어 비",       desc:"쏟아지는 단어를 막아라!",  color:"#0ea5e9", tag:"아케이드" },
  { id:"twenty",     icon:"👶", name:"스무고개",      desc:"힌트 보고 정답 맞히기",    color:"#f59e0b", tag:"추리" },
  { id:"homonym",    icon:"🕵️", name:"연상 탐정",     desc:"세 단서로 정체 밝혀라",    color:"#8b5cf6", tag:"추리" },
  { id:"category",   icon:"🌊", name:"주제 러쉬",     desc:"주제 단어 최대한 많이!",   color:"#06b6d4", tag:"타임어택" },
  { id:"factory",    icon:"🏭", name:"단어 공장",     desc:"초성으로 2글자 단어 만들기",color:"#6366f1", tag:"창작" },
];

const KF = `
@keyframes fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
@keyframes popin{0%{transform:scale(.5);opacity:0}65%{transform:scale(1.08);opacity:1}100%{transform:scale(1);opacity:1}}
`;

export default function Home() {
  const [user, setUser] = useState(null);
  const [activeGame, setActiveGame] = useState(null);

  // 닉네임 변경 관련
  const [isEditingNick, setIsEditingNick] = useState(false);
  const [newNickname, setNewNickname] = useState("");
  const [nickCheckMsg, setNickCheckMsg] = useState("");
  const [isNickAvailable, setIsNickAvailable] = useState(false);

  const [history, setHistory] = useState({
    topics: [], proverbs: [], homonyms: [], rainWords: [], idioms: [],
    initials: [], synonyms: [], collocations: [], sentences: [], twentyWords: []
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const ref = doc(db, "k_arena_users", u.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          const dbData = snap.data();
          if (dbData.nickname && dbData.nickname !== u.displayName) {
            u.displayName = dbData.nickname;
          }
          await updateDoc(ref, { lastLogin: new Date(), loginCount: increment(1) });
        } else {
          await setDoc(ref, { nickname: u.displayName, email: u.email, lastLogin: new Date(), loginCount: 1, gamePlayCount: 0, totalScore: 0 });
        }
        setNewNickname(u.displayName || "");
      }
    });
    return () => unsub();
  }, []);

  const login = () => signInWithPopup(auth, googleProvider);
  const logout = () => { signOut(auth); window.location.reload(); };

  const checkNicknameDuplicate = async () => {
    const nick = newNickname.trim();
    if (nick.length < 2 || nick.length > 8) { setNickCheckMsg("❌ 2~8글자 사이로 입력해주세요."); setIsNickAvailable(false); return; }
    if (nick === user.displayName) { setNickCheckMsg("🤔 현재 닉네임과 같습니다."); setIsNickAvailable(false); return; }
    try {
      const q = query(collection(db, "k_arena_users"), where("nickname", "==", nick));
      const qs = await getDocs(q);
      if (!qs.empty) { setNickCheckMsg("❌ 이미 사용 중인 닉네임입니다."); setIsNickAvailable(false); }
      else { setNickCheckMsg("✅ 사용 가능한 닉네임입니다!"); setIsNickAvailable(true); }
    } catch { setNickCheckMsg("⚠️ 오류가 발생했습니다."); }
  };

  const saveNickname = async () => {
    if (!isNickAvailable) { alert("중복 확인을 먼저 해주세요!"); return; }
    try {
      const nick = newNickname.trim();
      await updateProfile(auth.currentUser, { displayName: nick });
      await updateDoc(doc(db, "k_arena_users", user.uid), { nickname: nick });
      setUser({ ...user, displayName: nick });
      setIsEditingNick(false); setNickCheckMsg("");
      alert("닉네임이 변경되었습니다! 🎉");
    } catch { alert("닉네임 변경에 실패했습니다."); }
  };

  const startGame = async (name) => {
    setActiveGame(name);
    if (user) await updateDoc(doc(db, "k_arena_users", user.uid), { gamePlayCount: increment(1) });
  };

  const finishGame = async (gameId, items, score = 0, isAborted = false) => {
    if (gameId && items) {
      setHistory(prev => ({ ...prev, [gameId]: [...(prev[gameId] || []), ...(items || [])] }));
    }
    if (isAborted) { setActiveGame(null); return; }
    if (user && score > 0) {
      try {
        const userRef = doc(db, "k_arena_users", user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const bestKey = `best_${gameId}`;
          const currentBest = userData[bestKey] || 0;
          const updates = {};
          if (score > currentBest) updates[bestKey] = score;
          let newTotal = 0;
          ALL_GAME_KEYS.forEach(k => {
            if (k === bestKey) newTotal += Math.max(score, currentBest);
            else newTotal += (userData[k] || 0);
          });
          if (newTotal !== userData.totalScore) updates.totalScore = newTotal;
          if (Object.keys(updates).length > 0) await updateDoc(userRef, updates);
        }
      } catch (e) { console.error(e); }
    }
    setActiveGame(null);
  };

  // ── 게임 화면 ───────────────────────────────────────────────
  if (activeGame) {
    const back = (gameId) => (items, score, aborted) => finishGame(gameId, items, score, aborted);
    switch (activeGame) {
      case "factory":     return <GameFactory    onBack={back("factory")} />;
      case "speed":       return <GameSpeed      onBack={back("speed")} />;
      case "wordchain":   return <GameWordChain  onBack={back("wordchain")} />;
      case "rain":        return <GameRain       onBack={back("rainWords")} pastWords={history.rainWords} />;
      case "idiom":       return <GameIdiom      onBack={back("idioms")} />;
      case "initial":     return <GameInitial    onBack={back("initials")} />;
      case "synonym":     return <GameSynonym    onBack={back("synonyms")} />;
      case "collocation": return <GameCollocation onBack={back("collocations")} />;
      case "sentence":    return <GameSentence   onBack={back("sentences")} />;
      case "twenty":      return <GameTwenty     onBack={back("twentyWords")} />;
      case "proverb":     return <GameProverb    onBack={back("proverbs")} />;
      case "category":    return <GameCategory   onBack={back("topics")} />;
      case "homonym":     return <GameHomonym    onBack={back("homonyms")} />;
      case "admin":       return <Admin          onBack={() => setActiveGame(null)} />;
      case "ranking":     return <Ranking        onBack={() => setActiveGame(null)} />;
      default: return null;
    }
  }

  // ── 로그인 화면 ─────────────────────────────────────────────
  if (!user) {
    return (
      <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#06090f,#0f172a)", display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", fontFamily:"system-ui,sans-serif", color:"#e2e8f0" }}>
        <style>{KF}</style>
        <div style={{ textAlign:"center", animation:"fadein .5s ease-out" }}>
          <div style={{ fontSize:"3.5rem", marginBottom:8 }}>⚔️</div>
          <div style={{ fontSize:"2rem", fontWeight:900, marginBottom:4 }}>K-Arena</div>
          <div style={{ color:"#475569", fontSize:"0.85rem", marginBottom:32 }}>한국어 두뇌 트레이닝</div>
          <button onClick={login} style={{ display:"flex", alignItems:"center", gap:10, background:"#fff", color:"#1e293b", border:"none", borderRadius:14, padding:"13px 28px", fontSize:"1rem", fontWeight:700, cursor:"pointer", margin:"0 auto", boxShadow:"0 4px 20px rgba(0,0,0,0.3)" }}>
            <span style={{ fontSize:"1.2rem" }}>G</span> 구글로 시작하기
          </button>
        </div>
      </div>
    );
  }

  // ── 메인 로비 ───────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:"linear-gradient(160deg,#06090f,#0f172a)", display:"flex", flexDirection:"column", fontFamily:"system-ui,sans-serif", color:"#e2e8f0" }}>
      <style>{KF}</style>

      {/* 헤더 */}
      <div style={{ flexShrink:0, padding:"16px 18px 12px", borderBottom:"1px solid rgba(255,255,255,0.06)" }}>
        <div style={{ maxWidth:560, margin:"0 auto" }}>
          <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <span style={{ fontSize:"1.4rem" }}>⚔️</span>
              <span style={{ fontSize:"1.3rem", fontWeight:900 }}>K-Arena</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:8 }}>
              <button onClick={() => startGame("ranking")} style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"#fbbf24", fontSize:"0.8rem", padding:"5px 12px", cursor:"pointer", fontFamily:"inherit" }}>🏆 랭킹</button>
              <button onClick={logout} style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"#94a3b8", fontSize:"0.8rem", padding:"5px 12px", cursor:"pointer", fontFamily:"inherit" }}>로그아웃</button>
            </div>
          </div>

          {/* 닉네임 */}
          <div style={{ marginTop:10, display:"flex", alignItems:"center", gap:8 }}>
            {isEditingNick ? (
              <>
                <input value={newNickname} onChange={e=>{setNewNickname(e.target.value);setIsNickAvailable(false);setNickCheckMsg("");}} placeholder="2~8글자" style={{ padding:"6px 10px", fontSize:"0.9rem", width:110, border:"1px solid #334155", borderRadius:8, background:"rgba(255,255,255,0.07)", color:"#e2e8f0", outline:"none" }} />
                <button onClick={checkNicknameDuplicate} style={{ background:"#6366f1", border:"none", borderRadius:8, color:"#fff", fontSize:"0.75rem", padding:"6px 10px", cursor:"pointer", fontFamily:"inherit" }}>중복확인</button>
                <button onClick={saveNickname} disabled={!isNickAvailable} style={{ background:isNickAvailable?"#22c55e":"#334155", border:"none", borderRadius:8, color:"#fff", fontSize:"0.75rem", padding:"6px 10px", cursor:isNickAvailable?"pointer":"not-allowed", fontFamily:"inherit" }}>저장</button>
                <button onClick={()=>{setIsEditingNick(false);setNewNickname(user.displayName);}} style={{ background:"rgba(255,255,255,0.07)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"#94a3b8", fontSize:"0.75rem", padding:"6px 10px", cursor:"pointer", fontFamily:"inherit" }}>취소</button>
                {nickCheckMsg && <span style={{ fontSize:"0.72rem", color:isNickAvailable?"#22c55e":"#ef4444" }}>{nickCheckMsg}</span>}
              </>
            ) : (
              <>
                <span style={{ color:"#94a3b8", fontSize:"0.82rem" }}>👋 <b style={{color:"#e2e8f0"}}>{user.displayName}</b>님</span>
                <button onClick={()=>{setIsEditingNick(true);setNickCheckMsg("");setIsNickAvailable(false);}} style={{ background:"none", border:"none", cursor:"pointer", fontSize:"0.9rem", padding:0 }}>✏️</button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* 게임 그리드 */}
      <div style={{ flex:1, overflowY:"auto", padding:"14px 16px 28px", maxWidth:560, margin:"0 auto", width:"100%" }}>
        <div style={{ color:"#475569", fontSize:"0.72rem", marginBottom:12 }}>게임 13개 · 탭해서 시작하세요</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {GAMES.map((g, i) => (
            <button key={g.id} onClick={() => startGame(g.id)}
              style={{ background:"rgba(255,255,255,0.04)", border:`1px solid ${g.color}22`, borderRadius:18, padding:"15px 13px", textAlign:"left", cursor:"pointer", fontFamily:"inherit", position:"relative", overflow:"hidden", animation:`fadein .3s ease-out ${i*.03}s both` }}>
              <div style={{ position:"absolute", top:-18, right:-18, width:60, height:60, borderRadius:"50%", background:`radial-gradient(circle,${g.color}18,transparent 70%)`, pointerEvents:"none" }} />
              <div style={{ fontSize:"1.5rem", marginBottom:5 }}>{g.icon}</div>
              <div style={{ fontWeight:800, fontSize:"0.85rem", color:"#e2e8f0", marginBottom:2 }}>{g.name}</div>
              <div style={{ color:"#64748b", fontSize:"0.68rem", lineHeight:1.4, marginBottom:7 }}>{g.desc}</div>
              <div style={{ display:"inline-block", background:`${g.color}18`, border:`1px solid ${g.color}33`, color:g.color, fontSize:"0.6rem", fontWeight:700, padding:"2px 7px", borderRadius:999 }}>{g.tag}</div>
            </button>
          ))}
        </div>

        <div style={{ textAlign:"center", marginTop:20 }}>
          <button onClick={() => startGame("admin")} style={{ background:"none", border:"none", color:"#1e293b", fontSize:"0.75rem", cursor:"pointer", fontFamily:"inherit" }}>🔒 관리자</button>
        </div>
      </div>
    </div>
  );
}