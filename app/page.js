"use client";
import { useState, useEffect } from "react";
import { auth, googleProvider, db } from "@/lib/firebase";
import { signInWithPopup, signOut, onAuthStateChanged } from "firebase/auth";
import { doc, setDoc, updateDoc, increment, getDoc } from "firebase/firestore";

// 컴포넌트들 Import
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

// 점수 합산에 포함할 모든 게임 키 (나중에 게임이 추가되면 여기도 추가해야 함)
const ALL_GAME_KEYS = [
  "best_factory", "best_speed", "best_wordchain",
  "best_rain", "best_antonym", "best_initial",
  "best_synonym", "best_collocation", "best_sentence", "best_twenty",
  "best_proverb", "best_category", "best_homonym"
];

export default function Home() {
  const [user, setUser] = useState(null);
  const [activeGame, setActiveGame] = useState(null);
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

  // ★ 점수 저장 로직 개선 (최고점 합산 방식)
  const finishGame = async (gameId, items, score = 0) => {
    // 1. 중복 방지 데이터 저장
    if (gameId && items) {
      setHistory(prev => ({ ...prev, [gameId]: [...(prev[gameId] || []), ...items] }));
    }

    // 2. 점수 DB 저장
    if (user && score > 0) {
      try {
        const userRef = doc(db, "k_arena_users", user.uid);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const bestKey = `best_${gameId}`;
          const currentBest = userData[bestKey] || 0;
          
          const updates = {};
          let needsUpdate = false;

          // 신기록인 경우에만 해당 게임 점수 갱신
          if (score > currentBest) {
            updates[bestKey] = score;
            needsUpdate = true;
          }

          // ★ [핵심] 통합 점수 재계산 (기존 누적 방식 폐기 -> 최고점 합산 방식)
          // 신기록이 아니더라도, 혹시 이전 데이터가 잘못되어 있을 수 있으니 한 번씩 재계산해주면 좋습니다.
          // 여기서는 '신기록이거나', '게임을 완료했을 때' 무조건 재계산하여 데이터 정합성을 맞춥니다.
          
          let newTotalScore = 0;
          ALL_GAME_KEYS.forEach(key => {
            if (key === bestKey) {
              // 현재 게임은 이번 판 점수와 기존 최고점 중 큰 거 반영
              newTotalScore += Math.max(score, currentBest);
            } else {
              // 다른 게임은 DB에 있는 점수 합산
              newTotalScore += (userData[key] || 0);
            }
          });
          
          // 기존 토탈과 다르면 업데이트
          if (newTotalScore !== userData.totalScore) {
            updates['totalScore'] = newTotalScore;
            needsUpdate = true;
          }

          if (needsUpdate) {
            await updateDoc(userRef, updates);
          }
        }
      } catch (e) {
        console.error("점수 저장 실패", e);
      }
    }

    setActiveGame(null);
  };

  if (activeGame === 'factory') return <GameFactory onBack={(i, s) => finishGame('factory', i, s)} />;
  if (activeGame === 'speed') return <GameSpeed onBack={(i, s) => finishGame('speed', i, s)} />;
  if (activeGame === 'wordchain') return <GameWordChain onBack={(i, s) => finishGame('wordchain', i, s)} />;
  
  if (activeGame === 'rain') return <GameRain onBack={(i, s) => finishGame('rainWords', i, s)} pastWords={history.rainWords} />;
  if (activeGame === 'antonym') return <GameAntonym onBack={(i, s) => finishGame('antonyms', i, s)} />;
  if (activeGame === 'initial') return <GameInitial onBack={(i, s) => finishGame('initials', i, s)} />;
  if (activeGame === 'synonym') return <GameSynonym onBack={(i, s) => finishGame('synonyms', i, s)} pastWords={history.synonyms} />;
  if (activeGame === 'collocation') return <GameCollocation onBack={(i, s) => finishGame('collocations', i, s)} />;
  if (activeGame === 'sentence') return <GameSentence onBack={(i, s) => finishGame('sentences', i, s)} pastSentences={history.sentences} />;
  if (activeGame === 'twenty') return <GameTwenty onBack={(i, s) => finishGame('twentyWords', i, s)} pastWords={history.twentyWords} />;
  
  if (activeGame === 'proverb') return <GameProverb onBack={(i, s) => finishGame('proverbs', i, s)} pastProverbs={history.proverbs} />;
  if (activeGame === 'category') return <GameCategory onBack={(i, s) => finishGame('topics', i, s)} pastTopics={history.topics} />;
  if (activeGame === 'homonym') return <GameHomonym onBack={(i, s) => finishGame('homonyms', i, s)} pastWords={history.homonyms} />;

  if (activeGame === 'admin') return <Admin onBack={() => setActiveGame(null)} />;
  if (activeGame === 'ranking') return <Ranking onBack={() => setActiveGame(null)} />;

  return (
    <div className="container">
      <header>
        <h1>🇰🇷 K-Arena</h1>
        <p className="sub-title">Hot & Speed AI Game</p>
      </header>

      {!user ? (
        <div className="screen active">
          <h2>로그인</h2>
          <button className="google-btn" onClick={login}>G 구글로 시작하기</button>
        </div>
      ) : (
        <div className="screen active" style={{maxWidth:'600px'}}>
          <div className="user-bar">
            <span>👋 <b>{user.displayName}</b>님</span>
            <div>
              <button onClick={() => setActiveGame('ranking')} className="text-btn" style={{marginRight:'5px', color:'#4da6ff'}}>🏆 랭킹</button>
              <button onClick={logout} className="text-btn">로그아웃</button>
            </div>
          </div>
          <hr />
          
          <div className="zone-title">⚡ 실시간/스피드 배틀</div>
          <div className="game-grid">
            <button className="game-card" onClick={() => startGame('factory')}><h3>🏭 단어 공장</h3><p>초성 단어 만들기</p></button>
            <button className="game-card" onClick={() => startGame('speed')}><h3>🚀 스피드 퀴즈</h3><p>설명 보고 맞히기</p></button>
            <button className="game-card" onClick={() => startGame('wordchain')}><h3>🧩 끝말잇기</h3><p>AI와 끝장 승부</p></button>
            <button className="game-card new" onClick={() => startGame('rain')}><h3>🌧️ 단어 비</h3><p>타자로 막아내라!</p></button>
            <button className="game-card new" onClick={() => startGame('antonym')}><h3>🐸 반대말</h3><p>청기백기 퀴즈</p></button>
            <button className="game-card new" onClick={() => startGame('initial')}><h3>🤫 자음 퀴즈</h3><p>초성만 보고 맞히기</p></button>
          </div>

          <div className="zone-title" style={{marginTop:'20px', color:'#6c5ce7'}}>🧠 어휘력 챌린지</div>
          <div className="game-grid">
            <button className="game-card new" onClick={() => startGame('proverb')}><h3>⚡ 척하면 착!</h3><p>속담 이어달리기</p></button>
            <button className="game-card new" onClick={() => startGame('category')}><h3>🌊 주제 러쉬</h3><p>단어 폭격기</p></button>
            <button className="game-card new" onClick={() => startGame('homonym')}><h3>🕵️ 연상 탐정</h3><p>단서 보고 추리</p></button>
            <button className="game-card new" onClick={() => startGame('synonym')}><h3>🔗 유의어 잇기</h3><p>비슷한 말 퀴즈</p></button>
            <button className="game-card new" onClick={() => startGame('collocation')}><h3>👫 짝꿍 단어</h3><p>신발을 (신다)</p></button>
            <button className="game-card new" onClick={() => startGame('sentence')}><h3>🧩 문장 조각</h3><p>순서 맞추기</p></button>
            <button className="game-card new" onClick={() => startGame('twenty')}><h3>👶 스무고개 Jr</h3><p>쉬운 힌트 퀴즈</p></button>
          </div>

          <div style={{marginTop: '30px', borderTop: '1px dashed #ddd', paddingTop: '10px'}}>
             <button onClick={() => setActiveGame('admin')} style={{background:'none', border:'none', color:'#ccc', fontSize:'0.8rem'}}>🔒 관리자 페이지</button>
          </div>
        </div>
      )}
    </div>
  );
}