"use client";
import { useState, useEffect } from "react";

export default function GameHomonym({ onBack, pastWords = [] }) {
  const [quizList, setQuizList] = useState([]);
  const [current, setCurrent] = useState(0);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);

  // ★ 5문제 배치 로딩 (연상 퀴즈로 변경)
  const loadBatch = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `한국어 '연상 퀴즈' 5개를 JSON 배열로 줘.
          
          [게임 방식]
          어떤 단어를 설명하는 결정적인 힌트 3개를 줘.
          
          [조건]
          1. 정답은 초등~중학생 수준의 명사.
          2. 이미 낸 단어(${JSON.stringify(pastWords)}) 제외.
          3. 힌트는 점점 구체적으로.
          
          [예시]
          정답: "바나나" -> hints: ["길어요", "노란색", "원숭이"]
          정답: "이순신" -> hints: ["조선시대", "거북선", "장군"]
          
          응답: [{"word": "정답", "hints": ["힌트1", "힌트2", "힌트3"]}, ...]`
        })
      });
      const data = await res.json();
      const text = data.text.replace(/```json/g, "").replace(/```/g, "").trim();
      const newQuizzes = JSON.parse(text.match(/\[.*\]/s)[0]);
      
      setQuizList(prev => [...prev, ...newQuizzes]);
      setLoading(false);
    } catch (e) {
      setQuizList(prev => [...prev, {word: "김치", hints: ["한국", "빨간색", "배추"]}]);
      setLoading(false);
    }
  };

  useEffect(() => { loadBatch(); }, []);

  // 미리 로딩
  useEffect(() => {
    if (quizList.length > 0 && quizList.length - current < 2) loadBatch();
  }, [current, quizList]);

  const checkAnswer = (e) => {
    e.preventDefault();
    if (input.trim() === quizList[current].word) {
      setScore(s => s + 30);
      alert("정답입니다! 명탐정이시군요 🕵️‍♂️");
      setInput("");
      setCurrent(c => c + 1);
    } else {
      alert(`검거 실패! 범인은 [${quizList[current].word}]였습니다.`);
      // 현재 점수 가지고 나가기
      onBack([quizList[current].word], score);
    }
  };

  if (quizList.length === 0) return <div className="result-box"><h3>사건 파일을 여는 중...</h3></div>;
  const quiz = quizList[current];

  return (
    <div className="game-container">
      <div className="header">
        <button onClick={() => onBack([quiz.word], score)}>나가기</button> 
        <span>{score}점</span>
      </div>
      
      <div className="quiz-card" style={{justifyContent:'flex-start', paddingTop:'40px'}}>
        <h3>🕵️ 연상 탐정 ({current + 1}번째 사건)</h3>
        <p style={{color:'#888', marginBottom:'20px'}}>세 가지 단서를 보고 정답을 맞히세요!</p>
        
        <div style={{width:'90%', margin:'0 auto', textAlign:'left'}}>
            <div style={{padding:'15px', background:'white', border:'2px solid #eee', borderRadius:'15px', marginBottom:'10px', fontSize:'1.2rem'}}>
                🔍 단서 1: <b>{quiz.hints[0]}</b>
            </div>
            <div style={{padding:'15px', background:'white', border:'2px solid #eee', borderRadius:'15px', marginBottom:'10px', fontSize:'1.2rem'}}>
                🔍 단서 2: <b>{quiz.hints[1]}</b>
            </div>
            <div style={{padding:'15px', background:'white', border:'2px solid #eee', borderRadius:'15px', marginBottom:'10px', fontSize:'1.2rem'}}>
                🔍 단서 3: <b>{quiz.hints[2]}</b>
            </div>
        </div>
      </div>
      
      <form onSubmit={checkAnswer} className="input-area">
        <input value={input} onChange={e=>setInput(e.target.value)} placeholder="범인은 바로..." autoFocus />
        <button type="submit">검거</button>
      </form>
    </div>
  );
}