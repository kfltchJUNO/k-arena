"use client";
import { useState, useEffect } from "react";
import { auth, googleProvider, db } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, updateDoc, increment, getDoc } from "firebase/firestore";

// 모든 게임 컴포넌트 Import
import GameFactory from "./components/GameFactory";
import GameSpeed from "./components/GameSpeed";
import GameWordChain from "./components/GameWordChain";
import GameProverb from "./components/GameProverb";
import GameCategory from "./components/GameCategory";
import GameHomonym from "./components/GameHomonym";
import GameRain from "./components/GameRain";
import GameAntonym from "./components/GameAntonym";
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
  "best_rain", "best_antonym", "best_initial",
  "best_synonym", "best_collocation", "best_sentence", "best_twenty",
  "best_proverb", "best_category", "best_homonym"
];

export default function Home() {
  const [user, setUser] = useState(null);
  const [activeGame, setActiveGame] = useState(null);
  const [activeGroup, setActiveGroup] = useState(null);
  
  const [history, setHistory] = useState({
    topics: [], proverbs: [], homonyms: [], rainWords: [], antonyms: [], 
    initials: [], synonyms: [], collocations: [], sentences: [], twentyWords: []
  });

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        const ref = doc(db, "k_arena_users", u.uid);
        const snap = await getDoc(ref);
        if (snap.exists()) {
          await updateDoc(ref, { lastLogin: new Date(), loginCount: increment(1), nickname: u.displayName });
        } else {
          await setDoc(ref, { nickname: u.displayName, email: u.email, lastLogin: new Date(), loginCount: 1, gamePlayCount: 0, totalScore: 0 });
        }
      }
    });
    return () => unsub();
  }, []);

  const login = () => signInWithPopup(auth, googleProvider);
  const logout = () => { signOut(auth); window.location.reload(); };

  const startGame = async (name) => {
    setActiveGame(name);
    if(user) await updateDoc(doc(db, "k_arena_users", user.uid), { gamePlayCount: increment(1) });
  };

  const openGroup = (groupName) => { setActiveGroup(groupName); };

  // 게임 종료 처리 (isAborted: 중도 포기 여부)
  const finishGame = async (gameId, items, score = 0, isAborted = false) => {
    if (gameId && items) {
      setHistory(prev => ({ ...prev, [gameId]: [...(prev[gameId] || []), ...items] }));
    }

    // 나가기 버튼을 누른 경우 점수 저장 안 함
    if (isAborted) {
      setActiveGame(null);
      return;
    }

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

  // 1. 게임 렌더링
  if (activeGame) {
    // 공통 onBack 핸들러 (세 번째 인자 true 전달 시 저장 안 함)
    const props = { onBack: (i, s, a) => finishGame(activeGame === 'rain' ? 'rainWords' : activeGame === 'category' ? 'topics' : activeGame + 's', i, s, a) };
    if (activeGame === 'twenty') props.onBack = (i, s, a) => finishGame('twentyWords', i, s, a);

    switch (activeGame) {
      case 'factory': return <GameFactory onBack={(i, s, a) => finishGame('factory', i, s, a)} />;
      case 'speed': return <GameSpeed onBack={(i, s, a) => finishGame('speed', i, s, a)} />;
      case 'wordchain': return <GameWordChain onBack={(i, s, a) => finishGame('wordchain', i, s, a)} />;
      case 'rain': return <GameRain onBack={(i, s, a) => finishGame('rainWords', i, s, a)} pastWords={history.rainWords} />;
      case 'antonym': return <GameAntonym onBack={(i, s, a) => finishGame('antonyms', i, s, a)} />;
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

  // 2. 로그인 전 화면
  if (!user) {
    return (
      <div className="container">
        <header><h1>🇰🇷 K-Arena</h1><p className="sub-title">한국어 두뇌 트레이닝</p></header>
        <div className="screen active"><h2>로그인</h2><button className="google-btn" onClick={login}>G 구글로 시작하기</button></div>
      </div>
    );
  }

  // 3. 그룹 메뉴 화면 (뒤로가기 버튼 추가됨)
  if (activeGroup) {
    return (
      <div className="container">
        <header style={{display:'flex', alignItems:'center', justifyContent:'center', position:'relative', padding:'20px'}}>
          <button 
            onClick={() => setActiveGroup(null)} 
            style={{
              position:'absolute', left:'20px', background:'none', border:'none', 
              fontSize:'1rem', cursor:'pointer', color:'#636e72', display:'flex', alignItems:'center', fontWeight:'bold'
            }}
          >
             ◀ 메인으로
          </button>
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
                <button className="game-card" onClick={() => startGame('antonym')}><h3>🐸 반대말</h3><p>청기백기 퀴즈</p></button>
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

  // 4. 메인 메뉴 화면
  return (
    <div className="container">
      <header>
        <h1>🇰🇷 K-Arena</h1>
        <p className="sub-title">Hot & Speed AI Game</p>
      </header>

      <div className="screen active" style={{maxWidth:'600px'}}>
        <div className="user-bar" style={{display:'flex', justifyContent:'space-between', padding:'10px', alignItems:'center'}}>
          <span>👋 <b>{user.displayName}</b>님</span>
          <div>
            <button onClick={() => setActiveGame('ranking')} className="text-btn" style={{marginRight:'5px', color:'#4da6ff'}}>🏆 랭킹</button>
            <button onClick={logout} className="text-btn">로그아웃</button>
          </div>
        </div>
        <hr />
        
        <div className="zone-title" style={{marginTop:'10px', marginBottom:'10px', color:'#2d3436'}}>🔥 <b>오늘의 추천 게임</b></div>
        
        <div className="game-grid" style={{marginBottom:'20px'}}>
           <button className="game-card" onClick={() => startGame('wordchain')} style={{gridColumn: '1 / -1', background:'#fff5f5', borderColor:'#ff7675'}}>
             <h3 style={{color:'#d63031'}}>🧩 끝말잇기</h3><p>AI를 이겨라! 무제한 끝장 승부</p>
           </button>
        </div>

        <div className="game-grid">
          <button className="game-card" onClick={() => openGroup('speed_zone')}><h3>🕵️ 스피드 퀴즈</h3><p>스무고개 / 연상퀴즈</p></button>
          <button className="game-card" onClick={() => openGroup('pair_zone')}><h3>🔗 짝꿍 찾기</h3><p>반대말 / 유의어</p></button>
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