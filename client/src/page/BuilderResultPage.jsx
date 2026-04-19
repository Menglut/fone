import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import mermaid from 'mermaid';
import html2pdf from 'html2pdf.js';
import axios from 'axios';
import mainLogo from '../assets/logo.png';

import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

// ✨ 이미 프로젝트에 존재하는 완벽한 CSS들을 그대로 재활용합니다!
import '../css/BuilderPage.css'; 
import '../css/PortfolioEditor.css'; 

const API_BASE = process.env.REACT_APP_API_BASE;

// 🎨 테마 팔레트 데이터
const THEMES = {
  modern: {
    bg: '#f1f5f9', paperBg: '#ffffff', text: '#1e293b', textSub: '#64748b',
    accent: '#1e40af', border: '#e2e8f0', shadow: '0 20px 50px rgba(0,0,0,0.1)',
    tagBg: '#1e40af', tagText: '#ffffff', mermaidTheme: 'default'
  },
  dark: {
    bg: '#0a0a0a', paperBg: '#141414', text: '#f3f4f6', textSub: '#9ca3af',
    accent: '#e10600', border: '#2a2a2a', shadow: '0 20px 50px rgba(225,6,0,0.15)',
    tagBg: '#e10600', tagText: '#ffffff', mermaidTheme: 'dark'
  },
  minimal: {
    bg: '#ffffff', paperBg: '#ffffff', text: '#000000', textSub: '#555555',
    accent: '#000000', border: '#000000', shadow: 'none',
    tagBg: '#000000', tagText: '#ffffff', mermaidTheme: 'neutral'
  }
};

// 📊 다이어그램 뷰어
const MermaidViewer = ({ code, themeMode }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (code && ref.current) {
      const cleanCode = code.replace(/```mermaid\n?/gi, '').replace(/```\n?/g, '').trim();
      try {
        mermaid.initialize({ startOnLoad: false, theme: themeMode });
        mermaid.render(`mermaid-res-${Math.random().toString(36).substr(2, 9)}`, cleanCode)
          .then((result) => { if(ref.current) ref.current.innerHTML = result.svg; })
          .catch((e) => console.error("Mermaid Render Error", e));
      } catch (error) {
        if(ref.current) ref.current.innerHTML = "<p>다이어그램 생성 불가</p>";
      }
    }
  }, [code, themeMode]);
  return <div ref={ref} className="mermaid-wrapper" />;
};

export default function BuilderResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const printRef = useRef(null);
  const [theme, setTheme] = useState('modern');

  const rawData = location.state?.portfolioData;
  const projectList = Array.isArray(rawData) ? rawData : (rawData ? [rawData] : []);

  const getUserInfo = () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : { name: "지원자", email: "" };
  };
  const userInfo = getUserInfo();

  useEffect(() => {
    if (!projectList || projectList.length === 0) {
      alert('완성된 포트폴리오 데이터가 없습니다.');
      navigate('/');
    }
  }, [projectList, navigate]);

  // 🖨️ PDF 다운로드 (html2pdf는 printRef 안의 내용만 깔끔하게 캡처합니다)
  const handleDownloadPdf = () => {
    const element = printRef.current;
    const opt = {
      margin: 0,
      filename: `${userInfo.name || '포트폴리오'}_AI_Builder.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  // 💾 ✨ 포트폴리오 DB + 경험 DB 동시 저장 로직으로 통합
  const handleSaveToDashboard = async () => {
    const userId = userInfo?.id || userInfo?._id || userInfo?.email || 'guest';
    
    // builderRoute.js의 /save 가 인식할 수 있는 데이터 구조
    const payload = {
      userId: userId,
      title: `${userInfo.name || '지원자'}의 AI 대화형 포트폴리오`,
      content: projectList // 대화로 만든 경험 배열
    };

    try {
      // 경험(Experience) DB와 대화 기록 저장
      await axios.post(`${API_BASE}/api/builder/save`, payload);
      
      //포트폴리오(Portfolio) DB에 결과물 저장
      const res = await axios.post(`${API_BASE}/api/portfolio`, payload);
      
      if (res.data.success) {
        alert('포트폴리오와 경험 자산이 성공적으로 저장되었습니다! 🎉');
        navigate('/mypage'); 
      } else {
        alert('저장에 실패했습니다.');
      }
    } catch (error) {
      console.error('포트폴리오 저장 에러:', error);
      alert('서버 오류로 인해 저장하지 못했습니다.');
    }
  };

  if (!projectList || projectList.length === 0) return null;
  const currentTheme = THEMES[theme];

  return (
    <div className="rwPreviewArea" style={{ minHeight: '100vh', backgroundColor: currentTheme.bg, paddingBottom: '100px' }}>
      
      {/* 🚀 기존 헤더 스타일 완벽 복구 */}
      <header className="room-header" style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
        <div className="room-logo-btn" onClick={() => navigate('/')}>
          <img 
            src={mainLogo} 
            alt="F1ND YOUR WAY 로고" 
            className="builder-logo-img" 
          />
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select 
            value={theme} 
            onChange={(e) => setTheme(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', outline: 'none', cursor: 'pointer' }}
          >
            <option value="modern">Modern (Blue)</option>
            <option value="dark">Dark (Red)</option>
            <option value="minimal">Minimal (B&W)</option>
          </select>
          <button 
            className="room-exit-btn" 
            onClick={handleDownloadPdf}
            style={{ backgroundColor: currentTheme.accent, borderColor: currentTheme.accent, color: '#fff' }}
          >
            📄 PDF 다운로드
          </button>
          <button 
            className="room-exit-btn" 
            onClick={handleSaveToDashboard}
            style={{ backgroundColor: '#fff', color: '#111', borderColor: '#cbd5e1' }}
          >
            📊 대시보드로 이동
          </button>
        </div>
      </header>

      {/* 📄 A4 용지 프리뷰 영역 (PortfolioEditor.css 클래스 사용) */}
      <div className="a4-paper-container" style={{ marginTop: '40px' }}>
        <div
          className="a4-paper"
          ref={printRef}
          style={{
            backgroundColor: currentTheme.paperBg,
            color: currentTheme.text,
            boxShadow: currentTheme.shadow,
            border: theme === 'minimal' ? '1px solid #000' : 'none'
          }}
        >
          {/* 헤더 프로필 */}
          <header className="preview-header" style={{ borderBottomColor: currentTheme.accent }}>
            <h1 className="preview-name">{userInfo.name || '지원자'}</h1>
            <div className="preview-job" style={{ color: currentTheme.accent }}>
              AI 역량 추출 포트폴리오
            </div>
            <div className="preview-contact" style={{ color: currentTheme.textSub }}>
              {userInfo.email && <span>Email. {userInfo.email}</span>}
            </div>
            <p className="preview-intro" style={{ marginTop: '15px' }}>
              해당 문서는 AI 전문가 패널과의 심층 대화를 통해 추출된 핵심 경험 및 트러블슈팅 리포트입니다.
            </p>
          </header>

          {/* 프로젝트 리스트 렌더링 */}
          {projectList.map((project, idx) => {
            
            // ✨ 추가된 핵심 방어 코드: 차트 데이터가 무조건 '배열' 형태를 유지하도록 강제 변환
            let safeChartData = [];
            try {
              if (Array.isArray(project.chartData)) {
                safeChartData = project.chartData;
              } else if (typeof project.chartData === 'string' && project.chartData.trim() !== '') {
                const parsed = JSON.parse(project.chartData);
                safeChartData = Array.isArray(parsed) ? parsed : [];
              }
            } catch (e) {
              safeChartData = [];
            }

            return (
              <section key={idx} className="preview-project-section">
                <div className="preview-project-header">
                  <h2 className="preview-project-title">
                    <span style={{ color: currentTheme.accent, marginRight: '8px' }}>0{idx + 1}.</span> 
                    {project.title || '프로젝트 명 미작성'}
                  </h2>
                </div>

                <div className="preview-tags-wrap">
                  {project.techStack?.split(',').map((tag, i) => tag.trim() && (
                    <span
                      key={i}
                      className="preview-tag"
                      style={{
                        background: currentTheme.tagBg,
                        color: currentTheme.tagText,
                        border: theme === 'minimal' ? '1px solid #000' : 'none'
                      }}
                    >
                      #{tag.trim()}
                    </span>
                  ))}
                </div>

                <div
                  className="troubleshooting-card"
                  style={{ borderLeftColor: `${currentTheme.accent}33` }}
                >
                  <h4 className="trouble-title">💡 핵심 경험 및 전략</h4>

                  {/* 시각화 영역 (다이어그램 & 성과 그래프) */}
                  {(project.architectureCode || safeChartData.length > 0) && (
                    <div className="trouble-visuals" style={{ display: 'grid', gap: '15px', marginBottom: '20px' }}>
                      
                      {/* 다이어그램 */}
                      {project.architectureCode && (
                        <div className="visual-box" style={{ borderColor: currentTheme.border, padding: '20px', borderRadius: '8px', border: `1px solid ${currentTheme.border}` }}>
                            <MermaidViewer code={project.architectureCode} themeMode={currentTheme.mermaidTheme} />
                        </div>
                      )}

                      {/* 성과 그래프 */}
                      {safeChartData.length > 0 && (
                        <div className="visual-box" style={{ borderColor: currentTheme.border, padding: '20px', borderRadius: '8px', border: `1px solid ${currentTheme.border}`, height: '250px' }}>
                          <h5 style={{ marginBottom: '15px', color: currentTheme.textSub, fontSize: '0.9rem' }}>📈 성과 지표 변화</h5>
                          <ResponsiveContainer width="100%" height="100%">
                            {/* ✨ 기존의 복잡했던 파싱 로직을 빼고 안전한 safeChartData로 렌더링 */}
                            <AreaChart data={safeChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                              <defs>
                                <linearGradient id={`colorValue-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={currentTheme.accent} stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor={currentTheme.accent} stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={currentTheme.border} />
                              <XAxis dataKey="name" stroke={currentTheme.textSub} fontSize={12} tickLine={false} axisLine={false} />
                              <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: currentTheme.shadow }} />
                              <Area type="monotone" dataKey="value" stroke={currentTheme.accent} strokeWidth={3} fillOpacity={1} fill={`url(#colorValue-${idx})`} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="trouble-details">
                    <div className="trouble-row" style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                        <span className="trouble-label" style={{ color: '#dc2626', width: '60px', fontWeight: 'bold' }}>배경.</span>
                        <span className="trouble-text">{project.why || '작성된 배경이 없습니다.'}</span>
                    </div>
                    <div className="trouble-row" style={{ display: 'flex', gap: '15px', marginBottom: '10px' }}>
                        <span className="trouble-label" style={{ color: '#16a34a', width: '60px', fontWeight: 'bold' }}>전략.</span>
                        <span className="trouble-text">{project.how || '작성된 문제해결 전략이 없습니다.'}</span>
                    </div>
                    <div className="trouble-row" style={{ display: 'flex', gap: '15px' }}>
                        <span className="trouble-label" style={{ color: '#f59e0b', width: '60px', fontWeight: 'bold' }}>성과.</span>
                        <span className="trouble-text" style={{ fontWeight: 'bold' }}>{project.then || '작성된 성과가 없습니다.'}</span>
                    </div>
                  </div>
                </div>

              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}