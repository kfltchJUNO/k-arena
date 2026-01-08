"use client";
import { useState, useEffect } from "react";
import { db } from "@/lib/firebase";
import { collection, getDocs, orderBy, query } from "firebase/firestore";

export default function Admin({ onBack }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  // 관리자 인증
  const checkPassword = () => {
    if (password === "rhksflwk1" || password === "관리자1") { // 암호 설정
      setIsAdmin(true);
      fetchUsers();
    } else {
      alert("암호가 틀렸습니다.");
    }
  };

  // 사용자 데이터 가져오기
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "k_arena_users"), orderBy("lastLogin", "desc"));
      const querySnapshot = await getDocs(q);
      const userList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(userList);
    } catch (e) {
      alert("데이터 로딩 실패: " + e.message);
    }
    setLoading(false);
  };

  if (!isAdmin) {
    return (
      <div className="screen active">
        <h2>🔒 관리자 인증</h2>
        <input 
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          placeholder="관리자 암호 입력"
          style={{width: '100%', padding: '10px', margin: '10px 0'}}
        />
        <button className="google-btn" onClick={checkPassword}>확인</button>
        <button className="text-btn" onClick={onBack} style={{marginTop: '10px'}}>돌아가기</button>
      </div>
    );
  }

  return (
    <div className="screen active" style={{maxWidth: '600px', textAlign: 'left'}}>
      <div className="header">
        <h3>📊 사용자 통계</h3>
        <button onClick={onBack} style={{background:'#888', padding:'5px 10px', fontSize:'0.8rem'}}>닫기</button>
      </div>
      
      {loading ? <div>데이터 불러오는 중...</div> : (
        <div style={{overflowX: 'auto', marginTop: '10px'}}>
          <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem'}}>
            <thead>
              <tr style={{background: '#eee', borderBottom: '2px solid #ddd'}}>
                <th style={{padding: '8px'}}>닉네임</th>
                <th style={{padding: '8px'}}>총 플레이</th>
                <th style={{padding: '8px'}}>접속 횟수</th>
                <th style={{padding: '8px'}}>최근 접속</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} style={{borderBottom: '1px solid #eee'}}>
                  <td style={{padding: '8px', fontWeight: 'bold'}}>{u.nickname || '익명'}</td>
                  <td style={{padding: '8px', textAlign: 'center', color: '#4da6ff'}}>{u.gamePlayCount || 0}</td>
                  <td style={{padding: '8px', textAlign: 'center'}}>{u.loginCount || 1}</td>
                  <td style={{padding: '8px', color: '#888', fontSize: '0.8rem'}}>
                    {u.lastLogin?.seconds ? new Date(u.lastLogin.seconds * 1000).toLocaleDateString() : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}