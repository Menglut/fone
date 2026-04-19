import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import html2pdf from 'html2pdf.js';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import mermaid from 'mermaid';
import mainLogo from '../assets/logo.png';

// 기존에 쓰시던 CSS 그대로 재활용!
import '../css/BuilderPage.css'; 
import '../css/PortfolioEditor.css'; 

const API_BASE = process.env.REACT_APP_API_BASE;

// 다이어그램 뷰어
const MermaidViewer = ({ code }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (code && ref.current) {
      const cleanCode = code.replace(/```mermaid\n?/gi, '').replace(/```\n?/g, '').trim();
      try {
        mermaid.initialize({ startOnLoad: false, theme: 'default' });
        mermaid.render(`mermaid-res-${Math.random().toString(36).substr(2, 9)}`, cleanCode)
          .then((result) => { if(ref.current) ref.current.innerHTML = result.svg; })
          .catch((e) => console.error("Mermaid Render Error", e));
      } catch (error) {
        if(ref.current) ref.current.innerHTML = "<p>다이어그램 생성 불가</p>";
      }
    }
  }, [code]);
  return <div ref={ref} className="mermaid-wrapper" />;
};

export default function PortfolioEditPage() {
  const { id } = useParams(); // URL에서 포트폴리오 ID 추출
  const navigate = useNavigate();
  const printRef = useRef(null);

  const [isLoading, setIsLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [projects, setProjects] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);

  const userStr = localStorage.getItem('user');
  const userInfo = userStr ? JSON.parse(userStr) : { name: "지원자", email: "" };

  // 1. 기존 포트폴리오 데이터 불러오기
  useEffect(() => {
    const fetchPortfolio = async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/portfolio/detail/${id}`);
        if (res.data.success) {
          setTitle(res.data.data.title || "나의 포트폴리오");
          
          // 백엔드에 content나 portfolioData 필드로 저장된 배열 가져오기
          let loadedData = res.data.data.content || res.data.data.portfolioData;
          if (typeof loadedData === 'string') loadedData = JSON.parse(loadedData);
          
          setProjects(Array.isArray(loadedData) ? loadedData : [loadedData]);
        }
      } catch (error) {
        console.error("포트폴리오 불러오기 에러:", error);
        alert("데이터를 불러오지 못했습니다.");
        navigate(-1);
      } finally {
        setIsLoading(false);
      }
    };
    fetchPortfolio();
  }, [id, navigate]);

  // 2. 실시간 수정 핸들러
  const handleInlineEdit = (field, value) => {
    setProjects(prev => {
      const newProjects = [...prev];
      newProjects[currentIdx] = { ...newProjects[currentIdx], [field]: value };
      return newProjects;
    });
  };

  // 3. 덮어쓰기 저장 로직
  const handleSaveChanges = async () => {
    try {
      await axios.post(`${API_BASE}/api/portfolio`, {
        userId: userInfo.id || userInfo._id || userInfo.email,
        portfolioId: id, // 수정 모드임을 백엔드에 알림
        title: title,
        content: projects // 수정된 프로젝트 배열 덮어쓰기
      });
      alert('성공적으로 수정되었습니다! 🎉');
      navigate('/mypage');
    } catch (error) {
      console.error('수정 실패:', error);
      alert('저장에 실패했습니다.');
    }
  };

  // 4. PDF 다운로드
  const handleDownloadPdf = () => {
    const element = printRef.current;
    const opt = {
      margin: 0,
      filename: `${title}_업데이트.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  if (isLoading) return <div style={{textAlign: 'center', marginTop: '100px'}}>데이터를 불러오는 중입니다...</div>;

  return (
    <div className="room-container modern-theme" style={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* 🌟 헤더 */}
      {/* 🌟 통일된 스타일의 헤더 (room-header 클래스 유지) */}
      <header className="room-header" style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '16px 32px', 
        flexShrink: 0 
      }}>
        {/* 1. 로고 영역 (다른 화면과 동일하게 복구) */}
        <div className="room-logo-btn" onClick={() => navigate('/')}>
          <img 
            src={mainLogo} 
            alt="F1ND YOUR WAY 로고" 
            className="builder-logo-img" 
          />
        </div>
        
        {/* 2. 중앙 제목 입력 영역 (절대 위치 정렬) */}
        <div style={{ 
          position: 'absolute', 
          left: '50%', 
          transform: 'translateX(-50%)', /* ✨ 화면의 가로 정중앙으로 강제 고정 */
          zIndex: 10
        }}>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input 
              type="text" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              style={{ 
                background: 'rgba(255, 255, 255, 0.08)', 
                border: '1px solid rgba(255, 255, 255, 0.1)', 
                borderRadius: '999px', 
                color: '#fff', 
                textAlign: 'center',
                fontSize: '0.95rem',
                fontWeight: '500',
                outline: 'none',
                width: '320px',
                padding: '8px 40px',
                transition: 'all 0.2s ease'
              }}
              placeholder="포트폴리오 제목을 입력하세요"
              onFocus={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.15)';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.3)';
              }}
              onBlur={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.08)';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
              }}
            />
          </div>
        </div>

        {/* 3. 액션 버튼 영역 (BuilderResultPage 스타일 적용) */}
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button 
            className="room-exit-btn" 
            onClick={handleDownloadPdf} 
            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.2)' }}
          >
            📄 PDF 다운로드
          </button>
          <button 
            className="room-exit-btn" 
            onClick={handleSaveChanges} 
            style={{ backgroundColor: '#fff', color: '#111' }}
          >
            💾 저장 및 나가기
          </button>
        </div>
      </header>

      <main className="modern-layout" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* 🛠️ 좌측: 수정 에디터 (기존 BuilderPage Draft 패널 재활용) */}
        <aside className="modern-draft-panel" style={{ width: '40%', height: '100%', overflowY: 'auto', borderRight: '1px solid #e2e8f0' }}>
          <div className="draft-header">
            <div>
              <span className="draft-badge">Edit Mode</span>
              <h2 className="draft-title">내용 수정하기</h2>
            </div>
          </div>
          
          <div className="draft-scroller">
            {projects.map((proj, idx) => (
              <div 
                key={idx} 
                className={`exp-card ${currentIdx === idx ? 'active-card' : ''}`}
                onClick={() => setCurrentIdx(idx)} // 카드 클릭 시 활성화
                style={{ cursor: 'pointer' }}
              >
                <h3 className="exp-card-title">Experience {idx + 1} {currentIdx === idx && <span className="pulse-dot"></span>}</h3>
                
                {currentIdx === idx && (
                  <>
                    <div className="draft-input-group active-glow">
                      <label>프로젝트 명</label>
                      <textarea value={proj.title} onChange={(e) => handleInlineEdit('title', e.target.value)} rows={1} />
                    </div>
                    <div className="draft-input-group active-glow" style={{'--accent': '#2563eb'}}>
                      <label>도구/기술</label>
                      <textarea value={proj.techStack} onChange={(e) => handleInlineEdit('techStack', e.target.value)} />
                    </div>
                    <div className="draft-input-group active-glow" style={{'--accent': '#db2777'}}>
                      <label>배경 및 문제점</label>
                      <textarea value={proj.why} onChange={(e) => handleInlineEdit('why', e.target.value)} rows={3} />
                    </div>
                    <div className="draft-input-group active-glow" style={{'--accent': '#db2777'}}>
                      <label>해결 전략</label>
                      <textarea value={proj.how} onChange={(e) => handleInlineEdit('how', e.target.value)} rows={3} />
                    </div>
                    <div className="draft-input-group active-glow" style={{'--accent': '#f59e0b'}}>
                      <label>핵심 성과</label>
                      <textarea value={proj.then} onChange={(e) => handleInlineEdit('then', e.target.value)} rows={3} />
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </aside>

        {/* 📄 우측: A4 실시간 미리보기 */}
        <section className="modern-chat-section" style={{ width: '60%', height: '100%', backgroundColor: '#f1f5f9', padding: '40px 20px', overflowY: 'auto' }}>
          <div className="a4-paper-container" style={{ width: '100%', maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
            <div className="a4-paper" ref={printRef} style={{ backgroundColor: '#fff', padding: '60px', borderRadius: '8px', boxShadow: '0 20px 50px rgba(0,0,0,0.1)' }}>
              
              <header className="preview-header" style={{ borderBottomColor: '#1e40af' }}>
                <h1 className="preview-name">{userInfo.name || '지원자'}</h1>
                <div className="preview-job" style={{ color: '#1e40af' }}>AI 역량 추출 포트폴리오</div>
                <p className="preview-intro" style={{ marginTop: '15px' }}>
                  해당 문서는 AI 전문가 패널과의 심층 대화를 통해 추출된 핵심 경험 및 트러블슈팅 리포트입니다.
                </p>
              </header>

              {projects.map((project, idx) => {
                let safeChartData = [];
                try {
                  if (Array.isArray(project.chartData)) safeChartData = project.chartData;
                  else if (typeof project.chartData === 'string' && project.chartData.trim() !== '') {
                    safeChartData = JSON.parse(project.chartData);
                  }
                } catch(e) {}

                return (
                  <section key={idx} className="preview-project-section" style={{ marginTop: '40px' }}>
                    <h2 className="preview-project-title" style={{ fontSize: '1.4rem', marginBottom: '10px' }}>
                      <span style={{ color: '#1e40af', marginRight: '8px' }}>0{idx + 1}.</span> 
                      {project.title || '프로젝트 명'}
                    </h2>
                    
                    <div className="preview-tags-wrap" style={{ marginBottom: '20px' }}>
                      {project.techStack?.split(',').map((tag, i) => tag.trim() && (
                        <span key={i} style={{ background: '#1e40af', color: '#fff', padding: '4px 10px', borderRadius: '4px', fontSize: '0.85rem', marginRight: '8px' }}>
                          #{tag.trim()}
                        </span>
                      ))}
                    </div>

                    <div className="troubleshooting-card" style={{ borderLeft: '4px solid #1e40af33', paddingLeft: '20px' }}>
                      <h4 style={{ marginBottom: '15px' }}>💡 핵심 경험 및 전략</h4>

                      {(project.architectureCode || safeChartData.length > 0) && (
                        <div style={{ display: 'grid', gap: '15px', marginBottom: '20px' }}>
                          {project.architectureCode && (
                            <div style={{ border: '1px solid #e2e8f0', padding: '20px', borderRadius: '8px' }}>
                              <MermaidViewer code={project.architectureCode} />
                            </div>
                          )}
                          {safeChartData.length > 0 && (
                            <div style={{ border: '1px solid #e2e8f0', padding: '20px', borderRadius: '8px', height: '250px' }}>
                              <h5 style={{ marginBottom: '10px', color: '#64748b' }}>📈 성과 지표 변화</h5>
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={safeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none' }} />
                                  <Area type="monotone" dataKey="value" stroke="#1e40af" strokeWidth={3} fillOpacity={0.1} fill="#1e40af" />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </div>
                      )}

                      <div style={{ lineHeight: '1.8' }}>
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                          <span style={{ color: '#dc2626', width: '60px', fontWeight: 'bold' }}>배경.</span>
                          <span>{project.why || '-'}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                          <span style={{ color: '#16a34a', width: '60px', fontWeight: 'bold' }}>전략.</span>
                          <span>{project.how || '-'}</span>
                        </div>
                        <div style={{ display: 'flex', gap: '15px' }}>
                          <span style={{ color: '#f59e0b', width: '60px', fontWeight: 'bold' }}>성과.</span>
                          <span style={{ fontWeight: 'bold' }}>{project.then || '-'}</span>
                        </div>
                      </div>
                    </div>
                  </section>
                );
              })}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}