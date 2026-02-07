"use client";
import { useState, useEffect } from "react";

export default function GameIdiom({ onBack, pastIdioms = [] }) {
  const [list, setList] = useState([]);
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showMeaning, setShowMeaning] = useState(false); // 정답 후 뜻 보여주기

  // 사자성어 데이터 로딩
  const loadBatch = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `한국어 사자성어 퀴즈 5개를 만들어.
          [조건]
          1. 많이 쓰이는 필수 사자성어 위주.
          2. 이미 낸 문제(${JSON.stringify(pastIdioms)}) 제외.
          3. JSON 응답: [{ "front": "대기", "back": "만성", "meaning": "큰 그릇은 늦게 이루어진다" }, ...]
          4. 오직 JSON 배열만 반환해.`
        })
      });
      const data = await res.json();
      const text = data.text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(text);
      setList(prev => [...prev, ...parsed]);
      setLoading(false);
    } catch (e) {
      // 에러 시 기본 데이터
      setList(prev => [...prev, { front: "금의", back: "환향", "meaning": "비단옷 입고 고향에 돌아옴" }]);
      setLoading(false);
    }
  };

  useEffect(() => { loadBatch(); }, []);

  const check = (e) => {
    e.preventDefault();
    if (!list[idx] || showMeaning) return; // 이미 정답 처리 중이면 무시

    // 정답 체크 (공백 제거)
    if (input.replace(/\s/g, "") === list[idx].back) {
      setScore(s => s + 20);
      setShowMeaning(true); // 뜻 보여주기 모드 진입
    } else {
      alert(`땡! 정답은 [${list[idx].back}] 입니다.`);
      setShowMeaning(true);
    }
  };

  const nextProblem = () => {
    setShowMeaning(false);
    setInput("");
    
    if (idx + 1 < list.length) {
      setIdx(idx + 1);
      if (list.length - (idx + 1) < 2) loadBatch(); // 미리 로딩
    } else {
      alert("모든 문제를 풀었습니다!");
      onBack(list.map(i => i.front + i.back), score, false);
    }
  };

  if (loading && list.length === 0) return <div className="result-box"><h3>사자성어 준비 중... 🦁</h3></div>;
  if (!list[idx]) return null;

  return (
    <div className="game-container">
      <div className="header">
        <button onClick={() => onBack([], score, true)}>나가기</button>
        <span>문제 {idx + 1} | {score}점</span>
      </div>

      <div className="quiz-card">
        <h3>🦁 사자성어 이어말하기</h3>
        
        {/* 문제 표시 영역 */}
        <div style={{
          display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', 
          margin: '30px 0', fontSize: '2.5rem', fontWeight: 'bold'
        }}>
          <div style={{color: 'var(--primary)'}}>{list[idx].front}</div>
          <div style={{color: '#b2bec3'}}>??</div>
        </div>

        {/* 정답 맞힌 후 뜻 보여주기 */}
        {showMeaning ? (
          <div style={{animation: 'fadeIn 0.3s', padding:'20px', background:'#f1f2f6', borderRadius:'15px'}}>
            <h2 style={{color: '#00b894', margin:'0 0 10px 0'}}>{list[idx].front}{list[idx].back}</h2>
            <p style={{fontSize:'1.1rem', color:'#636e72', margin:0}}>{list[idx].meaning}</p>
            <button onClick={nextProblem} className="full-btn" style={{marginTop:'15px'}}>다음 문제 ➤</button>
          </div>
        ) : (
          <p style={{color:'#636e72'}}>뒤에 올 두 글자는 무엇일까요?</p>
        )}
      </div>

      {!showMeaning && (
        <form onSubmit={check} className="input-area">
          <input 
            value={input} 
            onChange={e => setInput(e.target.value)} 
            placeholder="뒤 2글자 입력" 
            autoFocus 
            maxLength={2}
          />
          <button type="submit">제출</button>
        </form>
      )}
    </div>
  );
}