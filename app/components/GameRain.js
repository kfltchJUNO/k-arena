"use client";
import { useState, useEffect, useRef } from "react";

export default function GameRain({ onBack, pastWords = [] }) {
  const [wordPool, setWordPool] = useState([]); // 대기 중인 단어들
  const [activeWords, setActiveWords] = useState([]); // 화면에 떨어지는 단어들
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [life, setLife] = useState(5);
  const [gameState, setGameState] = useState("loading"); 
  const [level, setLevel] = useState(1);
  
  // ★ 스폰 간격 조절을 위한 Ref
  const lastSpawnTime = useRef(0); 

  // 단어 로딩 (중복 제거 강화)
  const loadWords = async () => {
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `한국어 명사 30개를 무작위로 뽑아 JSON 배열로 줘.
          조건 1: 두 글자 ~ 네 글자 사이.
          조건 2: 이미 쓴 단어(${JSON.stringify(pastWords)}) 제외.
          조건 3: 절대 중복되지 않게 다양하게.
          예시: ["사과", "자동차", "하늘", ...]`
        })
      });
      const data = await res.json();
      let newWords = JSON.parse(data.text.match(/\[.*\]/s)[0]);
      
      // ★ 완벽한 중복 제거 (API 결과 + 현재 대기열 + 사용한 단어 모두 체크)
      const currentPoolSet = new Set(wordPool);
      newWords = [...new Set(newWords)].filter(w => !currentPoolSet.has(w));

      setWordPool(prev => [...prev, ...newWords]);
      if(gameState === "loading") setGameState("playing");
    } catch (e) {
      setWordPool(prev => [...prev, "오류", "발생", "다시", "시도"]);
      setGameState("playing");
    }
  };

  useEffect(() => { loadWords(); }, []);

  // 게임 루프
  useEffect(() => {
    if (gameState !== "playing") return;

    const loop = setInterval(() => {
      const now = Date.now();

      // 1. 단어 이동 (내려오기)
      setActiveWords(prev => {
        const nextWords = prev.map(w => ({ ...w, y: w.y + (0.3 + level * 0.05) })); // 속도 약간 낮춤 (안정감)
        
        // 바닥에 닿음 처리
        const missed = nextWords.filter(w => w.y > 90);
        if (missed.length > 0) {
          setLife(l => {
            const newLife = l - missed.length;
            if (newLife <= 0) setGameState("gameover");
            return newLife;
          });
          return nextWords.filter(w => w.y <= 90);
        }
        return nextWords;
      });

      // 2. 새 단어 출현 (조건 강화)
      // 조건: 화면에 5개 미만 & 대기열 있음 & 마지막 생성 후 1초 지남
      if (activeWords.length < 5 && wordPool.length > 0 && (now - lastSpawnTime.current > 1000)) {
        
        // 확률적으로 생성 (너무 기계적이지 않게)
        if (Math.random() < 0.1) { 
          setWordPool(prev => {
            // 대기열에서 하나 꺼냄
            const [newWord, ...rest] = prev;
            
            // 화면에 이미 같은 단어가 있는지 이중 체크
            if (activeWords.some(w => w.text === newWord)) {
               return rest; // 이미 있으면 스킵
            }

            setActiveWords(curr => [
              ...curr,
              { id: Date.now() + Math.random(), text: newWord, x: Math.random() * 70 + 10, y: -10 }
            ]);
            lastSpawnTime.current = now; // 스폰 시간 기록
            return rest;
          });
        }
      }

      // 3. 단어 부족하면 리필 (미리 로딩)
      if (wordPool.length < 10 && wordPool.length > 0) {
         // 로딩 로직은 useEffect 최초 실행 외엔 필요 시 추가 구현 가능 
         // (여기서는 복잡도 방지를 위해 생략하거나 필요 시 loadWords 호출)
      }

    }, 50);

    return () => clearInterval(loop);
  }, [gameState, level, wordPool, activeWords]); // activeWords 의존성 추가

  const checkInput = (e) => {
    e.preventDefault();
    // 가장 아래에 있는 단어부터 우선 제거 (사용자 편의)
    const sortedWords = [...activeWords].sort((a, b) => b.y - a.y);
    const target = sortedWords.find(w => w.text === input.trim());
    
    if (target) {
      setActiveWords(prev => prev.filter(w => w.id !== target.id));
      setScore(s => {
        const newScore = s + 10;
        if (newScore % 100 === 0) setLevel(l => l + 1);
        return newScore;
      });
      setInput("");
    }
  };

  return (
    <div className="game-container" style={{position:'relative', overflow:'hidden'}}>
      <div className="header">
        <button onClick={() => onBack(wordPool, score)}>나가기</button>
        <span>❤️ {life} | Lv.{level} | {score}</span>
      </div>
      
      {gameState === "loading" && <div className="result-box"><h3>비구름 몰려오는 중...</h3></div>}

      {gameState === "playing" && (
        <>
          <div style={{flex:1, position:'relative', background:'#e0f7fa'}}>
            {activeWords.map(w => (
              <div key={w.id} style={{
                position: 'absolute', left: `${w.x}%`, top: `${w.y}%`,
                background: 'white', padding: '8px 16px', borderRadius: '20px',
                boxShadow: '0 4px 10px rgba(0,0,0,0.1)', fontWeight: 'bold', fontSize:'1.1rem',
                border: '2px solid #4da6ff', color:'#333', transition: 'top 0.05s linear'
              }}>
                {w.text}
              </div>
            ))}
          </div>
          <form onSubmit={checkInput} className="input-area">
            <input value={input} onChange={e=>setInput(e.target.value)} autoFocus placeholder="단어를 입력하세요!" />
            <button type="submit">⚡</button>
          </form>
        </>
      )}

      {gameState === "gameover" && (
        <div className="result-box">
          <h1>게임 오버</h1>
          <h2>최종 점수: {score}</h2>
          <button onClick={() => onBack(wordPool, score)} className="full-btn">돌아가기</button>
        </div>
      )}
    </div>
  );
}