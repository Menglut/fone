import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
// ✨ PDF 다운로드를 위한 라이브러리 추가
import html2pdf from 'html2pdf.js';

const THEMES = {
  modern: {
    bg: '#f1f5f9', paperBg: '#ffffff', text: '#1e293b', textSub: '#64748b',
    accent: '#1e40af', border: '#e2e8f0', shadow: '0 20px 50px rgba(0,0,0,0.1)',
    tagBg: '#1e40af', tagText: '#ffffff',
    mermaidTheme: 'default'
  },
  dark: {
    bg: '#0a0a0a', paperBg: '#141414', text: '#f3f4f6', textSub: '#9ca3af',
    accent: '#e10600', border: '#2a2a2a', shadow: '0 20px 50px rgba(225,6,0,0.15)',
    tagBg: '#e10600', tagText: '#ffffff',
    mermaidTheme: 'dark'
  },
  minimal: {
    bg: '#ffffff', paperBg: '#ffffff', text: '#000000', textSub: '#555555',
    accent: '#000000', border: '#000000', shadow: 'none',
    tagBg: '#000000', tagText: '#ffffff',
    mermaidTheme: 'neutral'
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

const Step4Result = ({ data, prevStep, onSave }) => {
  const currentTheme = THEMES[data.theme || 'modern'];
  const printRef = useRef(null);

  const handleDownloadPdf = () => {
    const element = printRef.current;
    const opt = {
      margin:       0,
      filename:     `${data.profile.name || '포트폴리오'}_Portfolio.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(element).save();
  };

  return (
    <section className="rwPreviewArea step4-wrapper" style={{ background: currentTheme.bg }}>

      <div className="preview-top-text">
        <h2>최종 포트폴리오 미리보기</h2>
        <p>선택하신 디자인이 적용된 결과물입니다. (모든 폰트는 Pretendard로 통일)</p>
      </div>

      <div className="a4-paper-container">
        <div
          className="a4-paper"
          ref={printRef}
          style={{
            backgroundColor: currentTheme.paperBg,
            color: currentTheme.text,
            boxShadow: currentTheme.shadow,
            border: data.theme === 'minimal' ? '1px solid #000' : 'none'
          }}
        >

          <header className="preview-header" style={{ borderBottomColor: currentTheme.accent }}>
            <h1 className="preview-name">{data.profile.name}</h1>
            <div className="preview-job" style={{ color: currentTheme.accent }}>
              {data.profile.jobTitle}
            </div>
            <div className="preview-contact" style={{ color: currentTheme.textSub }}>
              {data.profile.email && <span>Email. {data.profile.email}</span>}
              {data.profile.github && <span>Link. {data.profile.github}</span>}
            </div>
            <p className="preview-intro">{data.profile.intro}</p>
          </header>

          {data.projects.map((project) => (
            <section key={project.id} className="preview-project-section">
              <div className="preview-project-header">
                <h2 className="preview-project-title">{project.title}</h2>
                <span className="preview-project-period" style={{ color: currentTheme.textSub }}>
                  {project.period}
                </span>
              </div>

              <p className="preview-project-summary" style={{ color: currentTheme.accent }}>
                {project.summary}
              </p>

              <div className="preview-tags-wrap">
                {project.techStack?.split(',').map((tag, i) => tag.trim() && (
                  <span
                    key={i}
                    className="preview-tag"
                    style={{
                      background: currentTheme.tagBg,
                      color: currentTheme.tagText,
                      border: data.theme === 'minimal' ? '1px solid #000' : 'none'
                    }}
                  >
                    #{tag.trim()}
                  </span>
                ))}
              </div>

              {project.troubleshootings.map((trouble, tIdx) => (
                <div
                  key={trouble.id}
                  className="troubleshooting-card"
                  style={{ borderLeftColor: `${currentTheme.accent}33` }}
                >
                  <h4 className="trouble-title">{tIdx + 1}. {trouble.title}</h4>

                  {/* ✨ 이미지 주소(imageUrl) 조건 추가 및 배열 검사(Array.isArray) 강화 */}
                  {(trouble.architectureCode || trouble.imageUrl || (Array.isArray(trouble.chartData) && trouble.chartData.length > 0)) && (
                    <div className="trouble-visuals" style={{ display: 'grid', gap: '15px', marginBottom: '20px' }}>

                      {/* Mermaid 다이어그램 */}
                      {trouble.architectureCode && (
                        <div className="visual-box" style={{ borderColor: currentTheme.border, padding: '20px', borderRadius: '8px', border: `1px solid ${currentTheme.border}` }}>
                           <MermaidViewer code={trouble.architectureCode} themeMode={currentTheme.mermaidTheme} />
                        </div>
                      )}

                      {/* ✨ 누락되었던 이미지(사진) 렌더링 복구 */}
                      {trouble.imageUrl && (
                        <div className="visual-box" style={{ borderColor: currentTheme.border, padding: '20px', borderRadius: '8px', border: `1px solid ${currentTheme.border}`, textAlign: 'center' }}>
                           <img src={trouble.imageUrl} alt="Architecture Preview" style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px' }} />
                        </div>
                      )}

                      {/* ✨ ResponsiveContainer 높이 상실 버그 해결 (height: 220px 강제 부여) */}
                      {Array.isArray(trouble.chartData) && trouble.chartData.length > 0 && (
                        <div className="visual-box chart-box" style={{ height: '220px', width: '100%', borderColor: currentTheme.border, padding: '15px', borderRadius: '8px', border: `1px solid ${currentTheme.border}` }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trouble.chartData}>
                              <defs>
                                <linearGradient id={`grad-${trouble.id}`} x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={currentTheme.accent} stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor={currentTheme.accent} stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={currentTheme.border} />
                              <XAxis dataKey="name" fontSize={11} tick={{fill: currentTheme.textSub}} axisLine={false} tickLine={false} />
                              <Tooltip contentStyle={{ background: currentTheme.paperBg, color: currentTheme.text, borderColor: currentTheme.border, borderRadius: '4px' }} />
                              <Area type="monotone" dataKey="value" stroke={currentTheme.accent} strokeWidth={2.5} fill={`url(#grad-${trouble.id})`} animationDuration={1000} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="trouble-details">
                    <div className="trouble-row">
                        <span className="trouble-label label-why">Why.</span>
                        <span className="trouble-text">{trouble.why}</span>
                    </div>
                    <div className="trouble-row">
                        <span className="trouble-label label-how">How.</span>
                        <span className="trouble-text">{trouble.how}</span>
                    </div>
                    <div className="trouble-row">
                        <span className="trouble-label label-then">Then.</span>
                        <span className="trouble-text">{trouble.then}</span>
                    </div>
                  </div>
                </div>
              ))}
            </section>
          ))}
        </div>
      </div>

      <div className="rwActionArea preview-action-area">
          <button className="rwBtn secondary fullLarge btn-back" onClick={prevStep}>
            ⬅️ 디자인 다시 선택
          </button>
          <button
            className="rwBtn secondary fullLarge"
            onClick={handleDownloadPdf}
            style={{ maxWidth: '280px', height: '60px', fontSize: '16px', color: '#1e40af', borderColor: '#1e40af', backgroundColor: 'white' }}
          >
            📄 PDF 다운로드
          </button>
          <button className="rwBtn primary fullLarge btn-save" onClick={onSave} style={{ backgroundColor: '#1e40af' }}>
            💾 대시보드에 최종 저장하기
          </button>
      </div>
    </section>
  );
};

export default Step4Result;