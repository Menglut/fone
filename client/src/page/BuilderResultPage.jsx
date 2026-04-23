import React, { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import mermaid from 'mermaid';
import html2pdf from 'html2pdf.js';
import axios from 'axios';
import mainLogo from '../assets/logo.png';

// ✨ 수정 1: YAxis(세로축) 추가 임포트
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';

import '../css/BuilderPage.css'; 
import '../css/PortfolioEditor.css'; 

const API_BASE = process.env.REACT_APP_API_BASE;

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
        mermaid.initialize({ 
          startOnLoad: false, 
          theme: themeMode,
          flowchart: { useMaxWidth: true, htmlLabels: true } 
        });
        mermaid.render(`mermaid-res-${Math.random().toString(36).substr(2, 9)}`, cleanCode)
          .then((result) => { 
            if(ref.current) {
              ref.current.innerHTML = result.svg;
              const svgEl = ref.current.querySelector('svg');
              if(svgEl) {
                // ✨ 수정 2: 아키텍처가 부모 컨테이너에 꽉 차도록 확대
                svgEl.style.width = '100%';
                svgEl.style.height = '100%';
                svgEl.style.maxHeight = '100%'; 
              }
            } 
          })
          .catch((e) => console.error("Mermaid Render Error", e));
      } catch (error) {
        if(ref.current) ref.current.innerHTML = "<p>다이어그램 생성 불가</p>";
      }
    }
  }, [code, themeMode]);
  return <div ref={ref} style={{ width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center' }} />;
};

export default function BuilderResultPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [theme, setTheme] = useState('modern');

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
  const projectList = rawContentExtraction(initialProjectList);

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

  const handleDownloadPdf = () => {
    const element = document.getElementById('portfolio-content'); 
    if (!element) return;

    const opt = {
      margin: 0,
      filename: `${userInfo.name || '지원자'}_포트폴리오.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2, 
        useCORS: true, 
        scrollY: 0,
        windowWidth: 1122 
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'landscape' 
      }
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

  // ✨ 수정 3: 빈 페이지 생성 방지를 위해 높이를 209mm로 1mm 깎고, 마진 제거
  const slideStyle = {
    width: '297mm',
    height: '209mm', 
    backgroundColor: currentTheme.paperBg,
    color: currentTheme.text,
    border: theme === 'minimal' ? '1px solid #000' : 'none',
    padding: '30px 45px',
    boxSizing: 'border-box',
    pageBreakInside: 'avoid',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden'
  };

  return (
    <div className="rwPreviewArea" style={{ minHeight: '100vh', backgroundColor: currentTheme.bg, paddingBottom: '100px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      
      <header className="room-header" style={{ width: '100%', position: 'sticky', top: 0, zIndex: 100, borderBottom: '1px solid #e2e8f0', backgroundColor: '#fff', display: 'flex', justifyContent: 'space-between', padding: '16px 32px', boxSizing: 'border-box', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
        <div className="room-logo-btn" onClick={() => navigate('/')}>
          <img src={mainLogo} alt="F1ND YOUR WAY 로고" className="builder-logo-img" />
        </div>
        
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <select value={theme} onChange={(e) => setTheme(e.target.value)} style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #cbd5e1', cursor: 'pointer' }}>
            <option value="modern">Modern (Blue)</option>
            <option value="dark">Dark (Red)</option>
            <option value="minimal">Minimal (B&W)</option>
          </select>
          <button className="room-exit-btn" onClick={handleDownloadPdf} style={{ backgroundColor: currentTheme.accent, borderColor: currentTheme.accent, color: '#fff' }}>📄 PDF 다운로드</button>
          <button className="room-exit-btn" onClick={handleSaveToDashboard} style={{ backgroundColor: '#fff', color: '#111', borderColor: '#cbd5e1' }}>📊 대시보드로 이동</button>
        </div>
      </header>

      <div id="portfolio-content" style={{ marginTop: '40px' }}>
        
        {/* 화면에서 볼 때 슬라이드 간격을 띄우기 위한 Wrapper */}
        <div style={{ marginBottom: '30px', boxShadow: currentTheme.shadow }}>
          <section className="portfolio-slide" style={{ ...slideStyle, justifyContent: 'center', textAlign: 'center' }}>
            <div style={{ borderBottom: `3px solid ${currentTheme.accent}`, paddingBottom: '20px', marginBottom: '20px', width: '80%', margin: '0 auto' }}>
              <h1 style={{ fontSize: '4rem', fontWeight: 'bold' }}>{userInfo.name || '지원자'}</h1>
              <h2 style={{ color: currentTheme.accent, fontSize: '2rem' }}>AI 역량 추출 포트폴리오</h2>
            </div>
            <div style={{ color: currentTheme.textSub, fontSize: '1.2rem' }}>
              {userInfo.email && <p>Email: {userInfo.email}</p>}
              <p style={{ marginTop: '30px', lineHeight: '1.6' }}>전문가 패널과의 대화를 통해 추출된 핵심 경험 리포트</p>
            </div>
          </section>
        </div>

        {projectList.map((project, idx) => {
          let safeChartData = [];
          try {
            let rawChart = project.chartData;
            if (typeof rawChart === 'string' && rawChart.trim() !== '') rawChart = JSON.parse(rawChart);
            // value를 숫자로 강제 변환하여 에러 방지
            if (Array.isArray(rawChart)) {
              safeChartData = rawChart
                .filter(item => item && item.name && item.value !== undefined)
                .map(item => ({ ...item, value: Number(item.value) }))
                .slice(0, 5);
            }
          } catch (e) {}

          return (
            <div key={idx} style={{ marginBottom: '30px', boxShadow: currentTheme.shadow }}>
              <section className="portfolio-slide" style={slideStyle}>
                <div style={{ borderBottom: `2px solid ${currentTheme.accent}`, paddingBottom: '10px', marginBottom: '20px' }}>
                  <h2 style={{ fontSize: '2rem', fontWeight: 'bold' }}>
                    <span style={{ color: currentTheme.accent, marginRight: '10px' }}>0{idx + 1}.</span> {project.title}
                  </h2>
                </div>

                <div style={{ display: 'flex', gap: '30px', flex: 1, minHeight: 0 }}>
                  
                  {/* 좌측: 텍스트 */}
                  <div style={{ flex: '0 0 45%', display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    {/* ✨ 수정 4: WebkitLineClamp 속성을 제거하여 텍스트가 짤리지 않게 함 */}
                    <div style={{ padding: '15px', backgroundColor: `${currentTheme.accent}0a`, borderRadius: '8px' }}>
                      <div style={{ color: '#dc2626', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>📌 배경</div>
                      <div style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>{project.why}</div>
                    </div>
                    <div style={{ padding: '15px', backgroundColor: `${currentTheme.accent}0a`, borderRadius: '8px' }}>
                      <div style={{ color: '#16a34a', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>🚀 전략</div>
                      <div style={{ fontSize: '0.95rem', lineHeight: '1.6' }}>{project.how}</div>
                    </div>
                    <div style={{ padding: '15px', backgroundColor: `${currentTheme.accent}0a`, borderRadius: '8px' }}>
                      <div style={{ color: '#f59e0b', fontWeight: 'bold', fontSize: '1.1rem', marginBottom: '5px' }}>🏆 성과</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 'bold', lineHeight: '1.5' }}>{project.then}</div>
                    </div>
                  </div>

                  {/* 우측: 시각자료 */}
                  <div style={{ flex: '0 0 55%', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                    {project.architectureCode && (
                      <div style={{ flex: 1, border: `1px solid ${currentTheme.border}`, borderRadius: '8px', padding: '10px', display: 'flex', alignItems: 'center', minHeight: 0 }}>
                        <MermaidViewer code={project.architectureCode} themeMode={currentTheme.mermaidTheme} />
                      </div>
                    )}
                    
                    {safeChartData.length > 0 && (
                      <div style={{ height: '220px', border: `1px solid ${currentTheme.border}`, borderRadius: '8px', padding: '20px' }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={safeChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                            <defs>
                              <linearGradient id={`colorValue-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={currentTheme.accent} stopOpacity={0.3}/>
                                <stop offset="95%" stopColor={currentTheme.accent} stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={currentTheme.border} />
                            <XAxis dataKey="name" stroke={currentTheme.textSub} fontSize={11} tickLine={false} axisLine={false} />
                            
                            {/* ✨ 수정 5: YAxis 추가하여 세로축 숫자 표시 */}
                            <YAxis stroke={currentTheme.textSub} fontSize={11} tickLine={false} axisLine={false} width={60} />
                            
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: currentTheme.shadow }} />
                            <Area type="monotone" dataKey="value" stroke={currentTheme.accent} strokeWidth={3} fillOpacity={1} fill={`url(#colorValue-${idx})`} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>

                </div>
              </section>
            </div>
          );
        })}
      </div>
    </div>
  );
}