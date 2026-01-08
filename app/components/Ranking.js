"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, query, orderBy, limit, getDocs } from "firebase/firestore";

const GAME_NAMES = {
  total: "👑 종합 점수 (최고 기록 합산)", // ★ 이름 변경
  best_factory: "🏭 단어 공장",
  best_speed: "🚀 스피드 퀴즈",
  best_wordchain: "🧩 끝말잇기",
  best_rain: "🌧️ 단어 비",
  best_antonym: "🐸 반대말",
  best_initial: "🤫 자음 퀴즈",
  best_proverb: "⚡ 척하면 착!",
  best_category: "🌊 주제 러쉬",
  best_homonym: "🕵️ 연상 탐정",
  best_synonym: "🔗 유의어 잇기",
  best_collocation: "👫 짝꿍 단어",
  best_sentence: "🧩 문장 조각",
  best_twenty: "👶 스무고개 Jr"
};

export default function Ranking({ onBack }) {
  const [activeTab, setActiveTab] = useState("total");
  const [rankers, setRankers] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRanking = async () => {
      setLoading(true);
      setRankers([]);
      try {
        const field = activeTab === "total" ? "totalScore" : activeTab;
        
        const q = query(
          collection(db, "k_arena_users"), 
          orderBy(field, "desc"), 
          limit(10)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const validData = data.filter(u => (u[field] || 0) > 0);
        setRankers(validData);
      } catch (error) {
        console.error("랭킹 로딩 실패:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchRanking();
  }, [activeTab]);

  return (
    <div className="screen active" style={{maxWidth: '500px', height:'80vh', display:'flex', flexDirection:'column'}}>
      <div className="header">
        <h3 style={{margin:0}}>🏆 명예의 전당</h3>
        <button onClick={onBack} style={{background:'#888', padding:'5px 10px', fontSize:'0.8rem'}}>닫기</button>
      </div>

      <div style={{
        display:'flex', gap:'10px', padding:'10px', overflowX:'auto', 
        borderBottom:'1px solid #ddd', background:'#f8f9fa', whiteSpace:'nowrap'
      }}>
        {Object.entries(GAME_NAMES).map(([key, name]) => (
          <button 
            key={key} 
            onClick={() => setActiveTab(key)}
            style={{
              padding:'8px 15px', borderRadius:'20px', fontSize:'0.85rem',
              background: activeTab === key ? '#4da6ff' : 'white',
              color: activeTab === key ? 'white' : '#555',
              border: '1px solid #ddd', boxShadow:'0 2px 2px rgba(0,0,0,0.05)'
            }}
          >
            {name}
          </button>
        ))}
      </div>
      
      <div className="scroll-box" style={{background: 'white', flex:1, padding:0}}>
        {loading ? (
          <div style={{padding:'40px', textAlign:'center', color:'#888'}}>랭킹을 불러오고 있습니다...</div>
        ) : (
          <table style={{width: '100%', borderCollapse: 'collapse'}}>
            <thead>
              <tr style={{background: '#fff', borderBottom: '2px solid #eee', color: '#666', fontSize:'0.9rem'}}>
                <th style={{padding: '12px'}}>순위</th>
                <th style={{padding: '12px', textAlign:'left'}}>닉네임</th>
                <th style={{padding: '12px', textAlign:'right'}}>점수</th>
              </tr>
            </thead>
            <tbody>
              {rankers.map((user, index) => (
                <tr key={user.id} style={{borderBottom: '1px solid #f5f5f5', height: '55px'}}>
                  <td style={{textAlign: 'center', fontWeight: 'bold', fontSize:'1.1rem', color: index < 3 ? '#ff6b6b' : '#333'}}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : index + 1}
                  </td>
                  <td style={{textAlign: 'left', fontWeight: 'bold'}}>
                    {user.nickname || '익명'}
                    {activeTab === 'total' && <span style={{fontSize:'0.7rem', color:'#aaa', display:'block'}}>Lv.{Math.floor((user.totalScore||0)/1000) + 1}</span>}
                  </td>
                  <td style={{textAlign: 'right', paddingRight:'20px', color: '#4da6ff', fontWeight:'bold'}}>
                    {user[activeTab === 'total' ? 'totalScore' : activeTab]?.toLocaleString() || 0}
                  </td>
                </tr>
              ))}
              {rankers.length === 0 && (
                <tr><td colSpan="3" style={{padding:'40px', textAlign:'center', color:'#ccc'}}>아직 랭킹 기록이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}