"use client";
import { useState, useEffect } from "react";

export default function GameCollocation({ onBack }) {
  const [list, setList] = useState([]);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [checking, setChecking] = useState(false);

  const loadBatch = async () => {
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        body: JSON.stringify({
          prompt: `한국어 연어(Collocation) 퀴즈 10개 JSON 배열.
          [조건]
          1. 아주 자주 쓰이는 짝꿍 표현 위주.
          2. 명확한 조사를 포함해서 제시.
          
          [예시]
          [{"q": "신발을", "a": "신다"}, {"q": "꿈을", "a": "꾸다"}, {"q": "길을", "a": "묻다"}]
          `
        })
      });
      const data = await res.json();
      const text = data.text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(text.match(/\[.*\]/s)[0]);
      setList(prev => [...prev, ...parsed]);
    } catch (e) {}
  };

  useEffect(() => { loadBatch(); }, []);

  const check = async (e) => {
    e.preventDefault();
    if (!input.trim() || checking) return;

    // 1차: 정해진 모범 답안과 같으면 통과 (빠른 처리)
    if (input.trim() === list[idx].a) {
      passQuiz();
      return;
    }

    setChecking(true);

    // 2차: AI에게 대체 정답 가능성 확인 (다중 정답 처리)
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        body: JSON.stringify({
          prompt: `한국어 관용구/연어 판별.
          
          질문: "${list[idx].q}" (목적어 등)
          원래정답: "${list[idx].a}" (서술어)
          유저입력: "${input}"
          
          [판단 기준]
          유저가 입력한 서술어가 질문과 결합했을 때 **자연스럽고 말이 되는 표현**이면 true.
          예) 질문:"길을", 정답:"묻다", 유저:"건너다" -> true (길을 건너다 도 말이 됨)
          예) 질문:"밥을", 정답:"먹다", 유저:"마시다" -> false
          
          응답(JSON): {"correct": boolean}
          `
        })
      });
      const data = await res.json();
      const text = data.text.replace(/```json/g, "").replace(/```/g, "").trim();
      const result = JSON.parse(text);

      if (result.correct) {
        // AI가 인정해줌
        alert(`오! "${input}"(도) 말이 되네요! 정답 인정! 🙆‍♂️`);
        passQuiz();
      } else {
        alert(`어색해요! 🙅‍♂️\n짝꿍 단어는 '${list[idx].a}' 입니다.`);
        // 틀리면 종료
        onBack(list, score);
      }

    } catch (e) {
      console.error(e);
      alert("오류가 발생했습니다.");
      setChecking(false);
    }
  };

  const passQuiz = () => {
    setScore(s => s + 10);
    // alert("딩동댕! 🎵"); // 연속 진행을 위해 alert 생략 가능 (선택)
    setInput("");
    setChecking(false);

    if (idx + 1 < list.length) {
        setIdx(i => i + 1);
        if (list.length - (idx + 1) < 3) loadBatch();
    } else { 
        loadBatch(); 
        setIdx(i => i + 1); 
    }
  };

  if (list.length === 0) return <div className="result-box"><h3>문제 가져오는 중...</h3></div>;

  return (
    <div className="game-container">
      <div className="header"><button onClick={() => onBack([], score)}>나가기</button> <span>{score}점</span></div>
      <div className="quiz-card">
        <h3>👫 짝꿍 단어 찾기</h3>
        <h1 style={{marginTop:'30px', fontSize:'2.5rem', color:'#2d3436'}}>
            {list[idx].q} <span style={{color:'#4da6ff'}}>[ ? ]</span>
        </h1>
      </div>
      <form onSubmit={check} className="input-area">
        <input value={input} onChange={e=>setInput(e.target.value)} disabled={checking} autoFocus placeholder={checking ? "AI가 생각 중..." : "짝꿍 단어 입력"} />
        <button type="submit" disabled={checking}>확인</button>
      </form>
    </div>
  );
}