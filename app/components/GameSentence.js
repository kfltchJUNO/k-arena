"use client";
import { useState, useEffect } from "react";

export default function GameSentence({ onBack, pastSentences = [] }) {
  const [quizList, setQuizList] = useState([]);
  const [idx, setIdx] = useState(0);
  const [userSelect, setUserSelect] = useState([]);
  const [score, setScore] = useState(0);
  const [loading, setLoading] = useState(true);

  // 5문장 배치 로딩
  const loadBatch = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/gemini", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: `한국어 문장 퍼즐 5개를 만들어.
          
          [조건]
          1. 초등~중학생 수준의 3~5어절 문장.
          2. 이미 낸 문장(${JSON.stringify(pastSentences)}) 제외.
          3. JSON 배열: [{ "sentence": "나는 학교에 간다", "parts": ["학교에", "간다", "나는"] }, ...]
          parts는 순서를 무작위로 섞어서 줘.`
        })
      });
      const data = await res.json();
      const text = data.text.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(text.match(/\[.*\]/s)[0]);
      setQuizList(prev => [...prev, ...parsed]);
      setLoading(false);
    } catch (e) {
      setQuizList(prev => [...prev, {sentence:"나는 밥을 먹었다", parts:["먹었다","나는","밥을"]}]);
      setLoading(false);
    }
  };

  useEffect(() => { loadBatch(); }, []);

  // 단어 선택 (자동 채점 기능 제거 -> 버튼으로 변경)
  const handleSelect = (part) => {
    setUserSelect([...userSelect, part]);
  };

  // ★ 제출 버튼 클릭 시 채점
  const checkAnswer = () => {
    if (userSelect.length === 0) return;

    // 공백 제거 후 비교 (단순 순서 확인)
    const current = userSelect.join("");
    const target = quizList[idx].sentence.replace(/ /g, "");
    
    if (current === target) {
      setScore(s => s + 20);
      alert("정답입니다! 👏");
      nextQuiz();
    } else {
      alert("틀렸습니다! 순서를 다시 생각해보세요.");
      setUserSelect([]); // 틀리면 초기화
    }
  };

  const nextQuiz = () => {
    setUserSelect([]);
    if (idx + 1 < quizList.length) {
      setIdx(i => i + 1);
      // 미리 로딩
      if (quizList.length - (idx + 1) < 2) loadBatch();
    } else { 
      alert("새로운 문장을 가져옵니다!"); 
      loadBatch(); 
      setIdx(i => i + 1); 
    }
  };

  if (quizList.length === 0 || !quizList[idx]) return <div className="result-box"><h3>문장 조각을 섞는 중...</h3></div>;
  const quiz = quizList[idx];

  return (
    <div className="game-container">
      <div className="header">
        <button onClick={() => onBack([], score)}>나가기</button> 
        <span>{score}점</span>
      </div>
      
      <div className="quiz-card" style={{justifyContent:'flex-start', paddingTop:'40px'}}>
        <h3>🧩 문장 조각 맞추기 ({idx+1}번)</h3>
        
        {/* 완성된 문장이 보이는 곳 */}
        <div style={{
          minHeight:'80px', 
          borderBottom:'3px solid #eee', 
          width:'90%', 
          margin:'30px auto', 
          fontSize:'1.5rem', 
          fontWeight:'bold', 
          lineHeight:'1.5',
          color: '#2d3436',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap',
          gap: '5px'
        }}>
          {userSelect.length === 0 ? <span style={{color:'#ccc', fontSize:'1rem'}}>단어를 순서대로 누르세요</span> : 
            userSelect.map((word, i) => (
              <span key={i} style={{color:'var(--primary)'}}>{word}</span>
            ))
          }
        </div>

        {/* 선택지 버튼들 */}
        <div style={{display:'flex', gap:'10px', flexWrap:'wrap', justifyContent:'center', width:'95%'}}>
          {quiz.parts.map((part, i) => (
            <button key={i} onClick={() => handleSelect(part)} disabled={userSelect.includes(part)}
              style={{
                padding:'12px 20px', 
                fontSize:'1.1rem', 
                borderRadius:'25px',
                background: userSelect.includes(part) ? '#f1f2f6' : 'white',
                border: userSelect.includes(part) ? '2px solid #ddd' : '2px solid var(--primary)',
                color: userSelect.includes(part) ? '#ccc' : '#2d3436',
                boxShadow: userSelect.includes(part) ? 'none' : '0 4px 6px rgba(0,0,0,0.05)',
                transition: 'all 0.2s'
              }}>
              {part}
            </button>
          ))}
        </div>

        {/* ★ 조작 버튼 영역 (다시 놓기 / 제출하기) */}
        <div style={{marginTop:'50px', display:'flex', gap:'15px', width:'90%'}}>
          <button 
            onClick={() => setUserSelect([])} 
            style={{
              flex: 1,
              background:'#ff7675', 
              color:'white', 
              padding:'15px', 
              borderRadius:'15px',
              fontSize:'1rem',
              fontWeight:'bold',
              border:'none',
              cursor:'pointer'
            }}
          >
            다시 놓기 ↺
          </button>

          <button 
            onClick={checkAnswer} 
            disabled={userSelect.length === 0}
            style={{
              flex: 2, /* 제출 버튼을 더 크게 */
              background: userSelect.length > 0 ? 'var(--primary)' : '#b2bec3', 
              color:'white', 
              padding:'15px', 
              borderRadius:'15px',
              fontSize:'1.1rem',
              fontWeight:'bold',
              border:'none',
              boxShadow: userSelect.length > 0 ? '0 4px 10px rgba(108, 92, 231, 0.3)' : 'none',
              cursor: userSelect.length > 0 ? 'pointer' : 'not-allowed'
            }}
          >
            제출하기 ✅
          </button>
        </div>

      </div>
    </div>
  );
}