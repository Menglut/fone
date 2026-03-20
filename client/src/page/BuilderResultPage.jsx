import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../css/HomePage.css'; // 공통 스타일 활용

export default function BuilderResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // 단톡방에서 넘어온 데이터 받기
  const draftData = location.state?.portfolioData || null;

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    // 넘어온 데이터가 없으면 다시 단톡방으로 돌려보냄
    if (!draftData) {
      alert('완성된 데이터가 없습니다.');
      navigate('/interview/prep');
    }
  }, [draftData, navigate]);

  // 1. 클립보드 복사 기능
  const handleCopyText = () => {
    const textToCopy = `
[프로젝트명] ${draftData.title}
[사용 기술 및 로직] ${draftData.techStack}
[UX/UI 문제 해결] ${draftData.problemSolving}
[핵심 성과] ${draftData.impact}
    `.trim();

    navigator.clipboard.writeText(textToCopy)
      .then(() => alert('클립보드에 복사되었습니다! 메모장에 붙여넣기 해보세요.'))
      .catch(() => alert('복사에 실패했습니다.'));
  };

  // 2. PDF 다운로드 (브라우저 기본 인쇄 기능 활용)
  const handlePrintPDF = () => {
    window.print();
  };

  // 3. 진우님의 백엔드로 데이터 저장 (MyPage 연동)
  const handleSaveToDashboard = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }

    setIsSaving(true);
    try {
      // 진우님의 MyPage 코드에 맞춰 백엔드로 POST 요청
      const userId = user.id || user._id || user.email;
      
      const response = await axios.post(`http://localhost:5000/api/portfolio`, {
        userId: userId,
        title: draftData.title,
        content: JSON.stringify(draftData), // 혹은 백엔드 스키마에 맞게 조정
        updatedAt: new Date()
      });

      if (response.data.success) {
        alert('대시보드에 성공적으로 저장되었습니다!');
        navigate('/mypage');
      } else {
        alert('저장에 실패했습니다.');
      }
    } catch (error) {
      console.error("저장 에러:", error);
      alert('서버 연결에 실패했습니다. 백엔드가 켜져 있는지 확인해 주세요.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!draftData) return null;

  return (
    <div className="mp-container">
      <header className="mp-header">
        <div className="mp-header-inner">
          <div className="mp-logo-btn" onClick={() => navigate('/')}>
            <div className="mp-logo-symbol">F1</div>
            <div className="mp-logo-text-group">
              <span className="mp-logo-text">AI RESULT REPORT</span>
            </div>
          </div>
        </div>
      </header>

      <div className="mp-content-wrapper" style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '40px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h1 className="mp-main-title">완성된 포트폴리오 리포트</h1>
          
          {/* 🚀 상단 액션 버튼 그룹 */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <button className="bento-btn-outline" onClick={handleCopyText}>📋 텍스트 복사</button>
            <button className="bento-btn-outline" onClick={handlePrintPDF}>🖨️ PDF 저장</button>
            <button className="bento-btn-primary" onClick={handleSaveToDashboard} disabled={isSaving}>
              {isSaving ? "저장 중..." : "💾 내 대시보드에 저장"}
            </button>
          </div>
        </div>

        {/* 📄 결과물 표시 영역 (이 영역이 PDF 출력 시 메인으로 보임) */}
        <div className="bento-card" style={{ padding: '40px', backgroundColor: '#fff', border: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '24px', borderBottom: '2px solid #111', paddingBottom: '10px', marginBottom: '30px' }}>
            {draftData.title}
          </h2>

          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ color: '#2563eb', fontSize: '16px', marginBottom: '10px' }}>[개발 및 기술 스택]</h3>
            <p style={{ lineHeight: '1.8', color: '#334155' }}>{draftData.techStack || '작성된 내용이 없습니다.'}</p>
          </div>

          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ color: '#db2777', fontSize: '16px', marginBottom: '10px' }}>[UX/UI 및 문제 해결]</h3>
            <p style={{ lineHeight: '1.8', color: '#334155' }}>{draftData.problemSolving || '작성된 내용이 없습니다.'}</p>
          </div>

          <div style={{ marginBottom: '25px' }}>
            <h3 style={{ color: '#f59e0b', fontSize: '16px', marginBottom: '10px' }}>[핵심 성과 및 협업]</h3>
            <p style={{ lineHeight: '1.8', color: '#334155' }}>{draftData.impact || '작성된 내용이 없습니다.'}</p>
          </div>
        </div>
        
        {/* PDF 출력 시 버튼들 숨기기용 CSS (인라인으로 간단히 추가) */}
        <style>
          {`
            @media print {
              .mp-header, .bento-btn-outline, .bento-btn-primary { display: none !important; }
              body { background-color: white; }
              .bento-card { box-shadow: none; border: none; }
            }
          `}
        </style>

      </div>
    </div>
  );
}