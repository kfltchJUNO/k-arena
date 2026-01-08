"use client";
import { useState, useEffect } from "react";

export default function GameProverb({ onBack, pastProverbs = [] }) {
  const [quizList, setQuizList] = useState([]);
  const [current, setCurrent] = useState(0);
  const [input, setInput] = useState("");
  const [msg, setMsg] = useState("AI가 속담 책을 펴고 있습니다...");
  const [score, setScore] = useState(0);

  const loadQuizzes = async () => {
    setMsg("속담 5개를 가져오는 중...");
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `한국 속담 퀴즈 5개 JSON 배열로.
          
          [필수 조건]
          1. 속담을 정확히 반으로 쪼개야 함.
          2. **'front'에는 속담의 앞부분만! 절대로 전체 속담을 넣지 마.**
          3. 'back'에는 나머지 뒷부분만.
          4. 이미 낸 문제(${JSON.stringify(pastProverbs)}) 제외.
          
          [잘못된 예]
          front: "가는 말이 고와야 오는 말이 곱다" (X - 전체 다 줌)
          
          [올바른 예]
          front: "가는 말이 고와야"
          back: "오는 말이 곱다"
          
          응답: [{"front": "...", "back": "..."}]`
        })
      });
      const data = await res.json();
      const text = data.text.replace(/```json/g, "").replace(/```/g, "").trim();
      const json = JSON.parse(text.match(/\[.*\]/s)[0]);

      // ★ 데이터 필터링 (혹시 모를 오류 방지)
      const validQuizzes = json.filter(q => {
         // 앞부분이 뒷부분을 포함하거나 너무 길면 제외
         if (q.front.includes(q.back)) return false; 
         if (q.front.length > 20) return false; 
         return true;
      });

      setQuizList(prev => [...prev, ...validQuizzes]);
      setMsg("");
    } catch (e) {
      // 에러 시 기본 문제
      setQuizList(prev => [...prev, {front: "원숭이도 나무에서", back: "떨어진다"}]);
    }
  };

  useEffect(() => { loadQuizzes(); }, []);

  // 무한 스크롤 로딩
  useEffect(() => {
    if (quizList.length > 0 && quizList.length - current < 2) {
      loadQuizzes();
    }
  }, [current, quizList]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim()) return;
    
    const q = quizList[current];
    // 공백 제거 후 비교 (정답 인정 범위 넓힘)
    const userAnswer = input.replace(/\s/g, "");
    const correctAnswer = q.back.replace(/\s/g, "");
    
    if (correctAnswer.includes(userAnswer) && userAnswer.length >= 2) {
      setScore(s => s + 20);
      alert(`정답! ⭕\n"${q.front} ${q.back}"`);
      nextQuiz();
    } else {
      alert(`땡! ❌\n정답: ${q.back}`);
      // 틀리면 종료 (점수 전달)
      onBack(quizList.slice(0, current + 1), score);
    }
  };

  const nextQuiz = () => {
    setInput("");
    setCurrent(c => c + 1);
  };

  if (quizList.length === 0) return <div className="result-box"><h3>{msg}</h3></div>;
  const q = quizList[current];

  return (
    <div className="game-container">
      <div className="header">
        <button onClick={() => onBack(quizList.slice(0, current), score)}>나가기</button> 
        <span>{score}점</span>
      </div>
      <div className="quiz-card">
        <h3>⚡ 속담 이어달리기 ({current + 1}번째)</h3>
        
        <h1 style={{color: '#6c5ce7', margin: '30px 0', fontSize:'2.2rem', wordBreak:'keep-all'}}>
          {q?.front}
        </h1>
        <h2 style={{color: '#aaa'}}>( ... )</h2>
      </div>
      <form onSubmit={handleSubmit} className="input-area">
        <input value={input} onChange={e=>setInput(e.target.value)} placeholder="뒷부분을 완성하세요" autoFocus />
        <button type="submit">확인</button>
      </form>
    </div>
  );
}