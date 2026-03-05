// src/page/MyPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/HomePage.css'; // 기존 스타일 재활용

export default function MyPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    } else {
      // 로그인 안 된 상태로 접근하면 쫓아내기
      alert('로그인이 필요한 페이지입니다.');
      navigate('/auth');
    }
  }, [navigate]);

  if (!user) return null; // 유저 정보가 없으면 빈 화면 (깜빡임 방지)

  return (
    <div className="container" style={{ minHeight: '100vh', paddingTop: '100px', backgroundColor: '#0E0E0E' }}>

      {/* 헤더 (임시) */}
      <div style={{ padding: '0 50px', marginBottom: '40px' }}>
        <h1 style={{ fontFamily: 'Oswald', fontSize: '3rem', color: '#fff' }}>DRIVER DASHBOARD</h1>
        <p style={{ color: '#888' }}>{user.name} 님의 커리어 데이터 기록소입니다.</p>
      </div>

      {/* 내 정보 카드들 */}
      <div style={{ padding: '0 50px', display: 'flex', gap: '30px', flexWrap: 'wrap' }}>

        {/* 1. 기본 정보 카드 */}
        <div style={{ background: '#141414', padding: '30px', border: '1px solid #333', borderRadius: '8px', flex: '1', minWidth: '300px' }}>
          <h2 style={{ color: '#E10600', marginBottom: '20px', fontFamily: 'Oswald' }}>PROFILE</h2>
          <p style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '10px' }}>이름: {user.name}</p>
          <p style={{ color: '#aaa', fontSize: '1rem' }}>이메일: {user.email}</p>
        </div>

        {/* 2. 저장된 자소서 (나중에 DB 연결) */}
        <div style={{ background: '#141414', padding: '30px', border: '1px solid #333', borderRadius: '8px', flex: '1', minWidth: '300px' }}>
          <h2 style={{ color: '#E10600', marginBottom: '20px', fontFamily: 'Oswald' }}>SAVED RESUMES</h2>
          <p style={{ color: '#888' }}>아직 저장된 자기소개서가 없습니다.</p>
          <button className="signup-btn" onClick={() => navigate('/resume/input')} style={{ marginTop: '20px' }}>새로 만들기 ➔</button>
        </div>

        {/* 3. 저장된 포트폴리오 (나중에 DB 연결) */}
        <div style={{ background: '#141414', padding: '30px', border: '1px solid #333', borderRadius: '8px', flex: '1', minWidth: '300px' }}>
          <h2 style={{ color: '#E10600', marginBottom: '20px', fontFamily: 'Oswald' }}>SAVED PORTFOLIOS</h2>
          <p style={{ color: '#888' }}>아직 저장된 포트폴리오가 없습니다.</p>
          <button className="signup-btn" onClick={() => navigate('/portfolio')} style={{ marginTop: '20px' }}>새로 만들기 ➔</button>
        </div>

      </div>
    </div>
  );
}