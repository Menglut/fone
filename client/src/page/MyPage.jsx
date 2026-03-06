// src/page/MyPage.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios'; // 💡 API 통신을 위해 추가
import '../css/HomePage.css'; 

export default function MyPage() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [portfolio, setPortfolio] = useState(null); // 💡 포트폴리오 데이터를 담을 상태
  const [isLoading, setIsLoading] = useState(true); // 💡 로딩 상태

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      const parsedUser = JSON.parse(storedUser);
      setUser(parsedUser);
      // 유저 정보가 확인되면 포트폴리오 데이터를 불러옵니다.
      fetchPortfolio(parsedUser);
    } else {
      alert('로그인이 필요한 페이지입니다.');
      navigate('/auth');
    }
  }, [navigate]);

  // 💡 포트폴리오 불러오기 함수
  const fetchPortfolio = async (currentUser) => {
    try {
      // 프로젝트 구조에 따라 유저 고유값이 id, _id, 또는 email일 수 있습니다.
      // 포트폴리오 저장 시 사용했던 식별자와 똑같은 값을 써야 합니다!
      const userId = currentUser.id || currentUser._id || currentUser.email; 
      
      const response = await axios.get(`http://localhost:5000/api/portfolio/${userId}`);
      
      if (response.data.success) {
        setPortfolio(response.data.data); // 성공적으로 가져오면 상태 업데이트
      }
    } catch (error) {
      // 404 에러(포트폴리오가 아직 없는 경우)는 자연스러운 현상이므로 조용히 넘어갑니다.
      console.log('포트폴리오가 아직 없거나 데이터를 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null; // 유저 정보가 없으면 빈 화면

  return (
    <div className="container" style={{ minHeight: '100vh', paddingTop: '100px', backgroundColor: '#0E0E0E' }}>

      {/* 헤더 */}
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

        {/* 2. 저장된 자소서 */}
        <div style={{ background: '#141414', padding: '30px', border: '1px solid #333', borderRadius: '8px', flex: '1', minWidth: '300px' }}>
          <h2 style={{ color: '#E10600', marginBottom: '20px', fontFamily: 'Oswald' }}>SAVED RESUMES</h2>
          <p style={{ color: '#888' }}>아직 저장된 자기소개서가 없습니다.</p>
          <button className="signup-btn" onClick={() => navigate('/resume/input')} style={{ marginTop: '20px' }}>새로 만들기 ➔</button>
        </div>

        {/* 3. 저장된 포트폴리오 (동적 렌더링 적용) */}
        <div style={{ background: '#141414', padding: '30px', border: '1px solid #333', borderRadius: '8px', flex: '1', minWidth: '300px' }}>
          <h2 style={{ color: '#E10600', marginBottom: '20px', fontFamily: 'Oswald' }}>SAVED PORTFOLIOS</h2>
          
          {isLoading ? (
            <p style={{ color: '#888' }}>데이터를 불러오는 중입니다...</p>
          ) : portfolio ? (
            // 포트폴리오 데이터가 있을 때 보여줄 화면
            <div>
              <p style={{ color: '#fff', fontSize: '1.2rem', marginBottom: '10px' }}>
                📄 {portfolio.title || '나의 포트폴리오'}
              </p>
              <p style={{ color: '#888', fontSize: '0.9rem', marginBottom: '20px' }}>
                최근 수정일: {new Date(portfolio.updatedAt).toLocaleDateString()}
              </p>
              <button 
                className="signup-btn" 
                onClick={() => navigate('/portfolio', { state: { goToPreview: true } })} 
                style={{ marginTop: '10px', width: '100%' }}
              >
                수정 / 미리보기 ➔
              </button>
            </div>
          ) : (
            // 포트폴리오 데이터가 없을 때 보여줄 화면
            <div>
              <p style={{ color: '#888' }}>아직 저장된 포트폴리오가 없습니다.</p>
              <button className="signup-btn" onClick={() => navigate('/portfolio')} style={{ marginTop: '20px' }}>새로 만들기 ➔</button>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}