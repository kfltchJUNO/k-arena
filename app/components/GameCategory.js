"use client";
import { useState, useEffect, useRef } from "react";

export default function GameCategory({ onBack, pastTopics = [] }) {
  const [topic, setTopic] = useState("");
  const [input, setInput] = useState("");
  const [words, setWords] = useState([]);
  const [timeLeft, setTimeLeft] = useState(40);
  const [gameState, setGameState] = useState("loading");
  const [score, setScore] = useState(0);
  const [feedback, setFeedback] = useState([]);
  
  // 주제 고정용 Ref
  const topicLocked = useRef(false);

  const startRound = async () => {
    if (topicLocked.current) return;
    topicLocked.current = true;
    
    setGameState("loading");
    setFeedback([]);
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `구체적인 명사 카테고리 주제 1개 선정. 추상적 금지. 이미 낸 주제(${JSON.stringify(pastTopics)}) 제외. 
          응답: { "topic": "주제명" }`
        })
      });
      const data = await res.json();
      const json = JSON.parse(data.text.replace(/```json|```/g, "").trim());
      setTopic(json.topic);
      setGameState("playing");
      setTimeLeft(40);
      setWords([]);
    } catch (e) {
      setTopic("한국의 산 이름");
      setGameState("playing");
    }
  };

  useEffect(() => { startRound(); }, []);

  useEffect(() => {
    if (gameState !== "playing") return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { clearInterval(timer); finishGame(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [gameState]);

  const handleInput = (e) => {
    e.preventDefault();
    const val = input.trim();
    if (!val || words.includes(val)) { setInput(""); return; }
    setWords([...words, val]);
    setInput("");
  };

  const finishGame = async () => {
    setGameState("verifying");
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        body: JSON.stringify({
          prompt: `주제: "${topic}" / 입력값: ${JSON.stringify(words)}. 하나씩 채점해.
          응답: { "results": [{ "word": "단어", "isCorrect": true }], "totalScore": 점수 }`
        })
      });
      const data = await res.json();
      const result = JSON.parse(data.text.replace(/```json|```/g, "").trim());
      setScore(result.totalScore);
      setFeedback(result.results);
    } catch (e) {
      setScore(words.length * 10);
      setFeedback(words.map(w => ({ word: w, isCorrect: true })));
    }
    setGameState("result");
  };

  const restart = () => {
    topicLocked.current = false;
    startRound();
  };

  return (
    <div className="game-container">
      <div className="header">
        <button onClick={() => onBack([topic], score, true)}>나가기</button>
        <span>⏳ {timeLeft}s | {score}점</span>
      </div>

      {gameState === "playing" && (
        <>
          <div className="quiz-card" style={{ flex: '0 0 auto', padding: '20px' }}>
            <h2 style={{ color: 'var(--primary)', fontSize: '2rem' }}>{topic}</h2>
          </div>
          <div className="scroll-box">
            {words.map((w, i) => <span key={i} className="tag">{w}</span>)}
          </div>
          <form onSubmit={handleInput} className="input-area">
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="단어 입력" autoFocus />
          </form>
        </>
      )}

      {gameState === "loading" && <div className="result-box"><h3>주제를 불러오는 중...</h3></div>}
      {gameState === "verifying" && <div className="result-box"><h2>채점 중...</h2></div>}
      {gameState === "result" && (
        <div className="result-box">
          <h3>{topic}</h3>
          <h1>{score}점</h1>
          <div style={{display:'flex', flexWrap:'wrap', gap:'5px', justifyContent:'center'}}>
            {feedback.map((f, i) => (
              <span key={i} className="tag" style={{background: f.isCorrect?'#e1f5fe':'#ffebee'}}>{f.word} {f.isCorrect?'O':'X'}</span>
            ))}
          </div>
          <button onClick={restart} className="full-btn">한 판 더!</button>
          <button onClick={() => onBack([topic], score, false)} className="text-btn">저장하고 나가기</button>
        </div>
      )}
    </div>
  );
}