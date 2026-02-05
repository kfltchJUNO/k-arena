"use client";
import { useState, useEffect } from "react";

export default function GameProverb({ onBack, pastProverbs = [] }) {
  const [list, setList] = useState([]);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);

  const loadBatch = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `한국어 속담 퀴즈 5개를 만들어. 
          형식: 앞부분을 보여주면 뒷부분을 맞히기.
          이미 낸 속담(${JSON.stringify(pastProverbs)}) 제외.
          응답: [{ "question": "가는 말이 고와야", "answer": "오는 말이 곱다" }, ...]`
        })
      });
      const data = await res.json();
      const text = data.text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(text);
      setList(prev => [...prev, ...parsed]);
      setLoading(false);
    } catch (e) {
      setList(prev => [...prev, { question: "가는 말이 고와야", answer: "오는 말이 곱다" }]);
      setLoading(false);
    }
  };

  useEffect(() => { loadBatch(); }, []);

  const check = (e) => {
    e.preventDefault();
    if (!list[idx]) return;

    // 유연한 정답 체크 (공백 제거 후 비교)
    const cleanInput = input.replace(/\s+/g, "");
    const cleanAnswer = list[idx].answer.replace(/\s+/g, "");

    if (cleanInput === cleanAnswer) {
      alert("정답입니다! 👏");
      setScore(s => s + 20);
      setInput("");
      
      if (idx + 1 < list.length) {
        setIdx(idx + 1);
        if (list.length - (idx + 1) < 2) loadBatch();
      } else {
        alert("모든 문제를 풀었습니다!");
        onBack(list, score + 20, false);
      }
    } else {
      alert(`틀렸습니다! 정답: ${list[idx].answer}`);
      // 틀려도 다음 문제로 넘어감 (선택사항)
      if (idx + 1 < list.length) setIdx(idx + 1);
      else onBack(list, score, false);
      setInput("");
    }
  };

  if (loading && list.length === 0) return <div className="result-box"><h3>속담을 불러오는 중...</h3></div>;
  if (!list[idx]) return null;

  return (
    <div className="game-container">
      <div className="header">
        <button onClick={() => onBack(list.slice(0, idx), score, true)}>나가기</button>
        <span>문제 {idx + 1} | {score}점</span>
      </div>
      
      <div className="quiz-card">
        <h3>속담 이어달리기</h3>
        <h1 style={{fontSize:'2.2rem', margin:'20px 0'}}>{list[idx].question}</h1>
        <p>... 뒤에 이어질 말은?</p>
      </div>
      
      <form onSubmit={check} className="input-area">
        <input value={input} onChange={e=>setInput(e.target.value)} autoFocus placeholder="뒷부분을 입력하세요" />
        <button type="submit">제출</button>
      </form>
    </div>
  );
}