"use client";
import { useState, useEffect } from "react";
import { auth, googleProvider, db } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged, updateProfile } from "firebase/auth";
import { doc, setDoc, updateDoc, increment, getDoc, collection, query, where, getDocs } from "firebase/firestore";

// 컴포넌트들 Import
import GameFactory from "./components/GameFactory";
import GameSpeed from "./components/GameSpeed";
import GameWordChain from "./components/GameWordChain";
import GameProverb from "./components/GameProverb";
import GameCategory from "./components/GameCategory";
import GameHomonym from "./components/GameHomonym";
import GameRain from "./components/GameRain";
import GameIdiom from "./components/GameIdiom";
import GameInitial from "./components/GameInitial";
import GameSynonym from "./components/GameSynonym";
import GameCollocation from "./components/GameCollocation";
import GameSentence from "./components/GameSentence";
import GameTwenty from "./components/GameTwenty";
import Admin from "./components/Admin";
import Ranking from "./components/Ranking";
import "./globals.css";

const ALL_GAME_KEYS = [
  "best_factory", "best_speed", "best_wordchain",
  "best_rain", "best_idiom", "best_initial",
  "best_synonym", "best_collocation", "best_sentence", "best_twenty",
  "best_proverb", "best_category", "best_homonym"
];

export default function Home() {
  const [user, setUser] = useState(null);
  const [activeGame, setActiveGame] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  
  // 닉네임 변경 관련 상태
  const [isEditingNick, setIsEditingNick] = useState(false);
  const [newNickname, setNewNickname] = useState("");
  const [nickCheckMsg, setNickCheckMsg] = useState(""); // 중복 확인 메시지
  const [isNickAvailable, setIsNickAvailable] = useState(false); // 사용 가능 여부

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
          // DB에 있는 닉네임이 최신이므로 Auth 정보보다 우선시해서 가져옴
          const dbData = snap.data();
          if (dbData.nickname && dbData.nickname !== u.displayName) {
             // 로컬 유저 상태 강제 업데이트 (화면 표시용)
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

  // 닉네임 중복 확인 함수
  const checkNicknameDuplicate = async () => {
    const nick = newNickname.trim();
    if (nick.length < 2 || nick.length > 8) {
      setNickCheckMsg("❌ 2~8글자 사이로 입력해주세요.");
      setIsNickAvailable(false);
      return;
    }
    if (nick === user.displayName) {
      setNickCheckMsg("🤔 현재 닉네임과 같습니다.");
      setIsNickAvailable(false);
      return;
    }

    try {
      // firestore 전체 유저 중에서 nickname이 같은 사람이 있는지 검색
      const q = query(collection(db, "k_arena_users"), where("nickname", "==", nick));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        setNickCheckMsg("❌ 이미 사용 중인 닉네임입니다.");
        setIsNickAvailable(false);
      } else {
        setNickCheckMsg("✅ 사용 가능한 닉네임입니다!");
        setIsNickAvailable(true);
      }
    } catch (error) {
      console.error("닉네임 확인 중 오류:", error);
      setNickCheckMsg("⚠️ 오류가 발생했습니다.");
    }
  };

  // 닉네임 최종 저장 함수
  const saveNickname = async () => {
    if (!isNickAvailable) {
      alert("중복 확인을 먼저 해주세요!");
      return;
    }
    try {
      const nick = newNickname.trim();
      
      // 1. Firebase Auth 프로필 업데이트 (로그인 정보)
      await updateProfile(auth.currentUser, { displayName: nick });
      
      // 2. Firestore DB 업데이트 (랭킹 정보)
      await updateDoc(doc(db, "k_arena_users", user.uid), { nickname: nick });
      
      // 3. 로컬 상태 업데이트
      setUser({ ...user, displayName: nick });
      setIsEditingNick(false);
      setNickCheckMsg("");
      alert("닉네임이 변경되었습니다! 🎉");
    } catch (error) {
      console.error("닉네임 저장 실패:", error);
      alert("닉네임 변경에 실패했습니다.");
    }
  };

  const startGame = async (name) => {
    setActiveGame(name);
    if(user) await updateDoc(doc(db, "k_arena_users", user.uid), { gamePlayCount: increment(1) });
  };

  const openGroup = (groupName) => { setActiveGroup(groupName); };

  const finishGame = async (gameId, items, score = 0, isAborted = false) => {
    if (gameId && items) {
      setHistory(prev => ({ ...prev, [gameId]: [...(prev[gameId] || []), ...items] }));
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

          let newTotalScore = 0;
          ALL_GAME_KEYS.forEach(key => {
            if (key === bestKey) newTotalScore += Math.max(score, currentBest);
            else newTotalScore += (userData[key] || 0);
          });
          if (newTotalScore !== userData.totalScore) updates['totalScore'] = newTotalScore;
          if (Object.keys(updates).length > 0) await updateDoc(userRef, updates);
        }
      } catch (e) { console.error(e); }
    }
    setActiveGame(null);
  };

  if (activeGame) {
    const props = { onBack: (i, s, a) => finishGame(activeGame === 'rain' ? 'rainWords' : activeGame === 'category' ? 'topics' : activeGame + 's', i, s, a) };
    if (activeGame === 'twenty') props.onBack = (i, s, a) => finishGame('twentyWords', i, s, a);

    switch (activeGame) {
      case 'factory': return <GameFactory onBack={(i, s, a) => finishGame('factory', i, s, a)} />;
      case 'speed': return <GameSpeed onBack={(i, s, a) => finishGame('speed', i, s, a)} />;
      case 'wordchain': return <GameWordChain onBack={(i, s, a) => finishGame('wordchain', i, s, a)} />;
      case 'rain': return <GameRain onBack={(i, s, a) => finishGame('rainWords', i, s, a)} pastWords={history.rainWords} />;
      case 'idiom': return <GameIdiom onBack={(i, s, a) => finishGame('idioms', i, s, a)} pastIdioms={history.idioms} />;
      case 'initial': return <GameInitial onBack={(i, s, a) => finishGame('initials', i, s, a)} />;
      case 'synonym': return <GameSynonym onBack={(i, s, a) => finishGame('synonyms', i, s, a)} pastWords={history.synonyms} />;
      case 'collocation': return <GameCollocation onBack={(i, s, a) => finishGame('collocations', i, s, a)} />;
      case 'sentence': return <GameSentence onBack={(i, s, a) => finishGame('sentences', i, s, a)} pastSentences={history.sentences} />;
      case 'twenty': return <GameTwenty onBack={(i, s, a) => finishGame('twentyWords', i, s, a)} pastWords={history.twentyWords} />;
      case 'proverb': return <GameProverb onBack={(i, s, a) => finishGame('proverbs', i, s, a)} pastProverbs={history.proverbs} />;
      case 'category': return <GameCategory onBack={(i, s, a) => finishGame('topics', i, s, a)} pastTopics={history.topics} />;
      case 'homonym': return <GameHomonym onBack={(i, s, a) => finishGame('homonyms', i, s, a)} pastWords={history.homonyms} />;
      case 'admin': return <Admin onBack={() => setActiveGame(null)} />;
      case 'ranking': return <Ranking onBack={() => setActiveGame(null)} />;
      default: return null;
    }
  }

  if (!user) {
    return (
      <div className="container">
        <header><h1>🇰🇷 K-Arena</h1><p className="sub-title">한국어 두뇌 트레이닝</p></header>
        <div className="screen active"><h2>로그인</h2><button className="google-btn" onClick={login}>G 구글로 시작하기</button></div>
      </div>
    );
  }

  if (activeGroup) {
    return (
      <div className="container">
        <header style={{display:'flex', alignItems:'center', justifyContent:'center', position:'relative', padding:'20px'}}>
          <button onClick={() => setActiveGroup(null)} style={{position:'absolute', left:'20px', background:'none', border:'none', fontSize:'1rem', cursor:'pointer', color:'#636e72', display:'flex', alignItems:'center', fontWeight:'bold'}}>◀ 메인으로</button>
          <h1 style={{fontSize:'1.8rem', margin:0}}>
            {activeGroup === 'speed_zone' && "🕵️ 스피드 퀴즈"}
            {activeGroup === 'pair_zone' && "🔗 짝꿍 찾기"}
            {activeGroup === 'initial_zone' && "🤫 초성 퀴즈왕"}
            {activeGroup === 'arcade_zone' && "🕹️ 타자 아케이드"}
          </h1>
        </header>
        <div className="screen active" style={{paddingTop:'20px'}}>
          <div className="game-grid">
            {activeGroup === 'speed_zone' && (
              <>
                <button className="game-card" onClick={() => startGame('speed')}><h3>🚀 스피드 퀴즈</h3><p>설명 보고 맞히기</p></button>
                <button className="game-card" onClick={() => startGame('twenty')}><h3>👶 스무고개 Jr</h3><p>쉬운 힌트 퀴즈</p></button>
                <button className="game-card" onClick={() => startGame('homonym')}><h3>🕵️ 연상 탐정</h3><p>단서 보고 추리</p></button>
              </>
            )}
            {activeGroup === 'pair_zone' && (
              <>
                <button className="game-card" onClick={() => startGame('idiom')}><h3>🦁 사자성어</h3><p>앞뒤가 딱! 이어말하기</p></button>
                <button className="game-card" onClick={() => startGame('synonym')}><h3>🔗 유의어 잇기</h3><p>비슷한 말 찾기</p></button>
                <button className="game-card" onClick={() => startGame('collocation')}><h3>👫 짝꿍 단어</h3><p>관용구 완성하기</p></button>
              </>
            )}
            {activeGroup === 'initial_zone' && (
              <>
                <button className="game-card" onClick={() => startGame('initial')}><h3>🤫 자음 퀴즈</h3><p>초성 보고 맞히기</p></button>
                <button className="game-card" onClick={() => startGame('factory')}><h3>🏭 단어 공장</h3><p>초성 단어 만들기</p></button>
              </>
            )}
            {activeGroup === 'arcade_zone' && (
              <>
                <button className="game-card" onClick={() => startGame('rain')}><h3>🌧️ 단어 비</h3><p>타자로 막아내라!</p></button>
                <button className="game-card" onClick={() => startGame('category')}><h3>🌊 주제 러쉬</h3><p>단어 폭격기</p></button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <header>
        <h1>🇰🇷 K-Arena</h1>
        <p className="sub-title">Hot & Speed AI Game</p>
      </header>

      <div className="screen active" style={{maxWidth:'600px'}}>
        <div className="user-bar" style={{
          display:'flex', flexDirection:'column', padding:'15px', background:'white',
          borderBottom:'1px solid #eee'
        }}>
          {/* 닉네임 변경 및 유저 정보 표시 영역 */}
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', width:'100%', marginBottom: isEditingNick ? '10px' : '0'}}>
            <div style={{display:'flex', alignItems:'center', gap:'8px', fontSize:'1.1rem'}}>
              {isEditingNick ? (
                // 닉네임 수정 모드
                <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                   <div style={{display:'flex', gap:'5px'}}>
                      <input 
                        value={newNickname}
                        onChange={(e) => {
                          setNewNickname(e.target.value);
                          setIsNickAvailable(false); // 변경 시 다시 확인 필요
                          setNickCheckMsg("");
                        }}
                        placeholder="2~8글자"
                        style={{padding:'5px', fontSize:'1rem', width:'120px', border:'1px solid #ccc', borderRadius:'5px'}}
                      />
                      <button onClick={checkNicknameDuplicate} style={{fontSize:'0.8rem', padding:'5px 8px', background:'#6c5ce7', color:'white', border:'none', borderRadius:'5px', cursor:'pointer'}}>
                        중복확인
                      </button>
                   </div>
                   <span style={{fontSize:'0.8rem', color: isNickAvailable ? 'green' : 'red'}}>{nickCheckMsg}</span>
                </div>
              ) : (
                // 일반 모드
                <>
                  <span>👋 <b>{user.displayName}</b>님</span>
                  <button onClick={() => { setIsEditingNick(true); setNickCheckMsg(""); setIsNickAvailable(false); }} style={{background:'none', border:'none', cursor:'pointer', fontSize:'1rem'}}>✏️</button>
                </>
              )}
            </div>

            <div style={{display:'flex', gap:'5px'}}>
              {isEditingNick ? (
                <>
                  <button onClick={saveNickname} disabled={!isNickAvailable} style={{background: isNickAvailable ? '#00b894' : '#ccc', color:'white', border:'none', padding:'5px 10px', borderRadius:'5px', cursor: isNickAvailable?'pointer':'not-allowed'}}>저장</button>
                  <button onClick={() => { setIsEditingNick(false); setNewNickname(user.displayName); }} style={{background:'#eee', color:'#333', border:'none', padding:'5px 10px', borderRadius:'5px', cursor:'pointer'}}>취소</button>
                </>
              ) : (
                <>
                  <button onClick={() => setActiveGame('ranking')} className="text-btn" style={{color:'#4da6ff'}}>🏆 랭킹</button>
                  <button onClick={logout} className="text-btn">로그아웃</button>
                </>
              )}
            </div>
          </div>
        </div>
        
        <hr style={{margin:0, border:'none', borderTop:'1px solid #eee'}} />
        
        <div className="zone-title" style={{marginTop:'15px', marginBottom:'10px', color:'#2d3436', paddingLeft:'15px'}}>🔥 <b>오늘의 추천 게임</b></div>
        
        <div className="game-grid" style={{marginBottom:'20px'}}>
           <button className="game-card" onClick={() => startGame('wordchain')} style={{gridColumn: '1 / -1', background:'#fff5f5', borderColor:'#ff7675'}}>
             <h3 style={{color:'#d63031'}}>🧩 끝말잇기</h3><p>AI를 이겨라! 무제한 끝장 승부</p>
           </button>
        </div>

        <div className="game-grid">
          <button className="game-card" onClick={() => openGroup('speed_zone')}><h3>🕵️ 스피드 퀴즈</h3><p>스무고개 / 연상퀴즈</p></button>
          <button className="game-card" onClick={() => openGroup('pair_zone')}><h3>🔗 짝꿍 찾기</h3><p>사자성어 / 유의어</p></button>
          <button className="game-card" onClick={() => openGroup('initial_zone')}><h3>🤫 초성 퀴즈왕</h3><p>자음퀴즈 / 단어공장</p></button>
          <button className="game-card" onClick={() => openGroup('arcade_zone')}><h3>🕹️ 타자 아케이드</h3><p>단어비 / 주제러쉬</p></button>
          <button className="game-card" onClick={() => startGame('sentence')}><h3>🧩 문장 조각</h3><p>어순 맞추기 퍼즐</p></button>
          <button className="game-card" onClick={() => startGame('proverb')}><h3>⚡ 척하면 착!</h3><p>속담 이어달리기</p></button>
        </div>

        <div style={{marginTop: '30px', borderTop: '1px dashed #ddd', paddingTop: '10px', textAlign:'center'}}>
           <button onClick={() => setActiveGame('admin')} style={{background:'none', border:'none', color:'#ccc', fontSize:'0.8rem'}}>🔒 관리자 페이지</button>
        </div>
      </div>
    </div>
  );
}