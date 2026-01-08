"use client";
import { useState, useEffect } from "react";

export default function GameSynonym({ onBack, pastWords = [] }) {
  const [list, setList] = useState([]);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(20); // 20초 제한시간
  const [gameState, setGameState] = useState("loading"); // loading, playing, result
  const [checking, setChecking] = useState(false);

  const loadBatch = async () => {
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        body: JSON.stringify({
          prompt: `한국어 유의어 퀴즈 10개 JSON 배열. 
          이미 낸 단어(${JSON.stringify(pastWords)}) 제외.
          [{"word": "친구", "answer": "벗"}...]`
        })
      });
      const data = await res.json();
      const text = data.text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(text.match(/\[.*\]/s)[0]);
      setList(prev => [...prev, ...parsed]);
      if(gameState === "loading") setGameState("playing");
    } catch (e) {
      setList([{word: "기쁨", answer: "즐거움"}]);
      setGameState("playing");
    }
  };

  useEffect(() => { loadBatch(); }, []);

  // 타이머 로직
  useEffect(() => {
    if (gameState !== "playing") return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          setGameState("result");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState]);

  const check = async (e) => {
    e.preventDefault();
    if (!input.trim() || checking || gameState !== "playing") return;

    if (input.trim() === list[idx].answer) {
      passQuiz();
      return;
    }

    setChecking(true);
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        body: JSON.stringify({
          prompt: `제시어: "${list[idx].word}", 입력: "${input}". 문맥상 유의어면 {"correct": true} 아니면 false. JSON으로만 응답.`
        })
      });
      const data = await res.json();
      const result = JSON.parse(data.text.replace(/```json|```/g, "").trim());
      if (result.correct) passQuiz();
      else { alert("틀렸습니다!"); setInput(""); }
    } catch(e) { alert("오류 발생"); }
    setChecking(false);
  };

  const passQuiz = () => {
    setScore(s => s + 10);
    setTimeLeft(20); // 맞추면 시간 초기화 (혹은 +5초 등 조절 가능)
    setInput("");
    if (idx + 1 < list.length) {
      setIdx(i => i + 1);
      if (list.length - (idx + 1) < 3) loadBatch();
    } else { loadBatch(); setIdx(i => i + 1); }
  };

  if (gameState === "loading") return <div className="result-box"><h3>단어장 준비 중...</h3></div>;

  if (gameState === "result") {
    return (
      <div className="result-box">
        <h1>타임 오버! ⏰</h1>
        <h2>최종 점수: {score}점</h2>
        <button onClick={() => onBack(list.slice(0, idx), score)} className="full-btn">결과 저장하고 나가기</button>
      </div>
    );
  }

  return (
    <div className="game-container">
      <div className="header">
        <button onClick={() => onBack(list.slice(0, idx), score)}>나가기</button>
        <span style={{color: timeLeft < 5 ? 'red' : 'inherit', fontWeight:'bold'}}>⏳ {timeLeft}s</span>
        <span>{score}점</span>
      </div>
      <div className="quiz-card">
        <h3>🔗 유의어 잇기</h3>
        <h1 style={{fontSize:'3.5rem', color:'#6c5ce7'}}>{list[idx]?.word}</h1>
      </div>
      <form onSubmit={check} className="input-area">
        <input value={input} onChange={e=>setInput(e.target.value)} disabled={checking} placeholder="비슷한 단어 입력" autoFocus />
        <button type="submit" disabled={checking}>확인</button>
      </form>
    </div>
  );
}