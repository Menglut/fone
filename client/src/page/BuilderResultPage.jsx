import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import mermaid from 'mermaid';
import html2pdf from 'html2pdf.js';
import axios from 'axios';
import mainLogo from '../assets/logo.png';

import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

import '../css/BuilderPage.css'; 
import '../css/PortfolioEditor.css'; 

const API_BASE = process.env.REACT_APP_API_BASE;

// 🎨 테마 팔레트 데이터 (유지)
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

  // ✨ 수정 1: AI가 준 데이터의 중첩(troubleshootings) 구조를 평탄화하는 헬퍼 함수 적용
  const rawContentExtraction = (projectArray) => {
    return projectArray.map(proj => {
      if (proj.troubleshootings && proj.troubleshootings.length > 0) {
        const first = proj.troubleshootings[0];
        return {
          ...proj,
          why: first.why || proj.why || "",
          how: first.how || proj.how || "",
          then: first.then || proj.then || "",
          architectureCode: first.architectureCode || proj.architectureCode || "",
          chartData: first.chartData || proj.chartData || []
        };
      }
      return proj;
    });
  };

  const rawData = location.state?.portfolioData;
  const initialProjectList = Array.isArray(rawData) ? rawData : (rawData ? [rawData] : []);
  const projectList = rawContentExtraction(initialProjectList); // 평탄화 적용

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

  // ✨ 수정 2: PDF 다운로드 규격 동기화 (여백 추가, 가로 너비 고정, 페이지 잘림 방지)
  const handleDownloadPdf = () => {
    const element = printRef.current;
    const opt = {
      margin: [10, 10, 10, 10], 
      filename: `${userInfo.name || '포트폴리오'}_F1ND.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, windowWidth: 800 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    html2pdf().set(opt).from(element).save();
  };

  const handleSaveToDashboard = async () => {
    const userId = userInfo?.id || userInfo?._id || userInfo?.email || 'guest';
    
    const payload = {
      userId: userId,
      title: `${userInfo.name || '지원자'}의 AI 대화형 포트폴리오`,
      content: projectList 
    };

    try {
      await axios.post(`${API_BASE}/api/builder/save`, {
        userId: userId,
        title: payload.title,
        portfolioData: projectList 
      });
      
      const res = await axios.post(`${API_BASE}/api/portfolio`, payload);
      
      if (res.data.success) {
        alert('포트폴리오가 성공적으로 저장되었습니다! 🎉');
        navigate('/mypage'); 
      }
    } catch (error) {
      console.error('저장 에러:', error);
      alert('저장 중 오류가 발생했습니다.');
    }
  };

  if (!projectList || projectList.length === 0) return null;
  const currentTheme = THEMES[theme];

  return (
    <div className="rwPreviewArea" style={{ minHeight: '100vh', backgroundColor: currentTheme.bg, paddingBottom: '100px' }}>
      
      <header className="room-header" style={{ position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff' }}>
        <div className="room-logo-btn" onClick={() => navigate('/')}>
          <img src={mainLogo} alt="F1ND YOUR WAY 로고" className="builder-logo-img" />
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

      <div className="a4-paper-container" style={{ marginTop: '40px' }}>
        <div
          className="a4-paper"
          ref={printRef}
          style={{ backgroundColor: currentTheme.paperBg, color: currentTheme.text, boxShadow: currentTheme.shadow, border: theme === 'minimal' ? '1px solid #000' : 'none' }}
        >
          <header className="preview-header" style={{ borderBottomColor: currentTheme.accent }}>
            <h1 className="preview-name">{userInfo.name || '지원자'}</h1>
            <div className="preview-job" style={{ color: currentTheme.accent }}>AI 역량 추출 포트폴리오</div>
            <div className="preview-contact" style={{ color: currentTheme.textSub }}>
              {userInfo.email && <span>Email. {userInfo.email}</span>}
            </div>
            <p className="preview-intro" style={{ marginTop: '15px' }}>
              해당 문서는 AI 전문가 패널과의 심층 대화를 통해 추출된 핵심 경험 및 트러블슈팅 리포트입니다.
            </p>
          </header>

          {projectList.map((project, idx) => {
            
            // ✨ 수정 3: 차트 데이터 강력 정제 로직 동기화 (에러 완벽 방지)
            let safeChartData = [];
            try {
              let rawChart = project.chartData;
              if (typeof rawChart === 'string' && rawChart.trim() !== '') {
                rawChart = JSON.parse(rawChart);
              }
              if (Array.isArray(rawChart)) {
                safeChartData = rawChart
                  .filter(item => item && typeof item.name === 'string' && item.value !== undefined)
                  .slice(0, 5);
              }
            } catch (e) {
              console.error("차트 데이터 변환 오류:", e);
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
                      style={{ background: currentTheme.tagBg, color: currentTheme.tagText, border: theme === 'minimal' ? '1px solid #000' : 'none' }}
                    >
                      #{tag.trim()}
                    </span>
                  ))}
                </div>

                <div className="troubleshooting-card" style={{ borderLeftColor: `${currentTheme.accent}33` }}>
                  <h4 className="trouble-title">💡 핵심 경험 및 전략</h4>

                  {(project.architectureCode || safeChartData.length > 0) && (
                    <div className="trouble-visuals" style={{ display: 'grid', gap: '15px', marginBottom: '20px' }}>
                      
                      {project.architectureCode && (
                        <div className="visual-box" style={{ borderColor: currentTheme.border, padding: '20px', borderRadius: '8px', border: `1px solid ${currentTheme.border}` }}>
                            <MermaidViewer code={project.architectureCode} themeMode={currentTheme.mermaidTheme} />
                        </div>
                      )}

                      {safeChartData.length > 0 && (
                        <div className="visual-box" style={{ borderColor: currentTheme.border, padding: '20px', borderRadius: '8px', border: `1px solid ${currentTheme.border}`, height: '250px' }}>
                          <h5 style={{ marginBottom: '15px', color: currentTheme.textSub, fontSize: '0.9rem' }}>📈 성과 지표 변화</h5>
                          <ResponsiveContainer width="100%" height="100%">
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