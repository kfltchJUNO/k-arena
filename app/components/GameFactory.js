"use client";
import { useState, useEffect } from "react";

const CHO_LIST = ["ㄱ","ㄲ","ㄴ","ㄷ","ㄸ","ㄹ","ㅁ","ㅂ","ㅃ","ㅅ","ㅆ","ㅇ","ㅈ","ㅉ","ㅊ","ㅋ","ㅌ","ㅍ","ㅎ"];
const TARGETS = ["ㅇㅅ", "ㄱㅈ", "ㅅㄱ", "ㅇㄱ", "ㅎㄱ", "ㅂㄷ", "ㅈㄱ", "ㄱㅅ", "ㅁㅈ", "ㅇㄹ", "ㅅㅁ", "ㅂㅅ"];

export default function GameFactory({ onBack }) {
  const [target, setTarget] = useState("");
  const [input, setInput] = useState("");
  const [words, setWords] = useState([]);
  const [timeLeft, setTimeLeft] = useState(60);
  const [gameState, setGameState] = useState("playing");
  const [score, setScore] = useState(0);
  const [aiMsg, setAiMsg] = useState("");

  // 초성 추출
  const getChosung = (str) => {
    let result = "";
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i) - 44032;
      if (code > -1 && code < 11172) result += CHO_LIST[Math.floor(code / 588)];
      else result += str[i];
    }
    return result;
  };

  useEffect(() => {
    setTarget(TARGETS[Math.floor(Math.random() * TARGETS.length)]);
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) { clearInterval(timer); finishGame(); return 0; }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const finishGame = async () => {
    // 1. 게임 상태 변경
    setGameState("verifying");
    setAiMsg("🤖 AI가 단어를 검증하고 있습니다...");
    
    let finalScore = 0; // 점수 임시 저장 변수

    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `다음 단어 목록을 확인하고, 표준국어대사전에 있는 유효한 명사만 골라내.
          입력단어: ${JSON.stringify(words)}
          
          응답형식(JSON): ["단어1", "단어2"]`
        }),
      });
      const data = await res.json();
      const text = data.text.replace(/```json/g, "").replace(/```/g, "").trim();
      
      let validWords = [];
      try {
        validWords = JSON.parse(text.match(/\[.*\]/s)[0]);
      } catch (e) {
        // 파싱 실패 시 입력한 단어 모두 인정 (유저 보호)
        validWords = words; 
      }

      const correct = validWords.length;
      // 점수 계산: 개당 10점 + (10개 단위 보너스)
      finalScore = (correct * 10) + (Math.floor(correct / 10) * 10);
      
      setScore(finalScore); // 상태 업데이트
      setAiMsg(`검증 완료! 유효 단어 ${correct}개 인정.`);
      
    } catch(e) {
      console.error(e);
      // API 에러 시 전부 정답 처리
      finalScore = words.length * 10;
      setScore(finalScore);
      setAiMsg("AI 연결 불안정. 모든 단어를 점수로 인정합니다!");
    }
    
    setGameState("result");
  };

  const handleInput = (e) => {
    e.preventDefault();
    if(!input.trim()) return;
    
    // 초성 검사
    const cho = getChosung(input).substring(0,2);
    if(cho !== target.replace(/ /g,'')) { alert(`초성이 [${target}]이어야 해요!`); setInput(""); return; }
    
    // 중복 검사
    if(words.includes(input)) { alert("이미 쓴 단어예요!"); setInput(""); return; }
    
    setWords([...words, input]);
    setInput("");
  };

  return (
    <div className="game-container">
      {/* 나가기 버튼 클릭 시 현재 score 상태 전달 */}
      <div className="header">
        <button onClick={() => onBack(null, score)}>나가기</button> 
        <span>⏳ {timeLeft}s</span>
      </div>

      {gameState === "playing" && (
        <>
          <div className="quiz-card" style={{flex:'0 0 auto', padding:'10px'}}>
            <h2 style={{fontSize:'3.5rem', margin:'10px 0', letterSpacing:'5px'}}>{target}</h2>
            <p>초성에 맞는 단어를 많이 입력하세요!</p>
          </div>
          <div className="scroll-box">
            {words.map((w, i) => <span key={i} className="tag">{w}</span>)}
          </div>
          <form onSubmit={handleInput} className="input-area">
            <input value={input} onChange={e=>setInput(e.target.value)} placeholder="단어 입력" autoFocus />
            <button type="submit">입력</button>
          </form>
        </>
      )}

      {gameState === "verifying" && (
        <div className="result-box">
          <h3>{aiMsg}</h3>
        </div>
      )}

      {gameState === "result" && (
        <div className="result-box">
          <h3>{aiMsg}</h3>
          <h1>{score}점</h1>
          {/* 여기서도 score를 정확히 전달 */}
          <button onClick={() => onBack(null, score)} className="full-btn">로비로</button>
        </div>
      )}
    </div>
  );
}