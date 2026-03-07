import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import mermaid from 'mermaid';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import '../css/ExperienceEditor.css';

const API_BASE = "http://localhost:5000";

const MermaidViewer = ({ code }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (code && ref.current) {
      const cleanCode = code.replace(/```mermaid\n?/gi, '').replace(/```\n?/g, '').trim();
      try {
        // ✨ 포트폴리오 스타일: 흰 배경, 검은 글씨
        mermaid.initialize({ startOnLoad: false, theme: 'default' });
        mermaid.render(`mermaid-ee-${Math.random().toString(36).substr(2, 9)}`, cleanCode)
          .then((result) => { if (ref.current) ref.current.innerHTML = result.svg; });
      } catch (e) { console.error(e); }
    }
  }, [code]);
  return <div ref={ref} className="ee-flex-gap-15" />;
};

export default function ExperienceEditor() {
  const navigate = useNavigate();
  const location = useLocation();
  const expId = location.state?.expId || null;

  const [isLoading, setIsLoading] = useState(false);
  const [expandedIndex, setExpandedIndex] = useState(0);

  const [formData, setFormData] = useState({
    title: '', period: '', role: '', techStack: '', summary: '',
    troubleshootings: [
      { id: crypto.randomUUID(), title: '', why: '', how: '', then: '', architectureCode: '', imageUrl: '', chartData: [] }
    ]
  });

  useEffect(() => {
    const user = localStorage.getItem('user');
    if (!user) return navigate('/auth');
    if (expId) fetchExperienceDetail(expId);
  }, [expId, navigate]);

  const fetchExperienceDetail = async (id) => {
    try {
      const res = await axios.get(`${API_BASE}/api/experience/detail/${id}`);
      if (res.data.success) {
        const d = res.data.data;
        setFormData({ ...d, techStack: Array.isArray(d.techStack) ? d.techStack.join(', ') : d.techStack });
      }
    } catch (e) { console.error(e); }
  };

  const handleTroubleChange = (idx, e) => {
    const { name, value } = e.target;
    const newTroubles = [...formData.troubleshootings];

    if (name === 'chartDataRaw') {
      try { newTroubles[idx]['chartData'] = JSON.parse(value); } catch (err) { }
    } else {
      newTroubles[idx][name] = value;
    }

    setFormData({ ...formData, troubleshootings: newTroubles });
  };

  const addTroubleshooting = () => {
    const newCase = { id: crypto.randomUUID(), title: '새로운 기술적 도전', why: '', how: '', then: '', architectureCode: '', imageUrl: '', chartData: [] };
    setFormData(prev => ({ ...prev, troubleshootings: [...prev.troubleshootings, newCase] }));
    setExpandedIndex(formData.troubleshootings.length);
  };

  const removeTroubleshooting = (e, idx) => {
    e.stopPropagation();
    if (!window.confirm("이 사례를 삭제하시겠습니까?")) return;
    setFormData({ ...formData, troubleshootings: formData.troubleshootings.filter((_, i) => i !== idx) });
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      const userId = user.id || user._id || user.email;
      await axios.post(`${API_BASE}/api/experience`, {
        userId, expId, ...formData,
        techStack: typeof formData.techStack === 'string' ? formData.techStack.split(',').map(s => s.trim()).filter(Boolean) : formData.techStack
      });
      alert("저장 완료."); navigate('/mypage');
    } catch (e) { alert("저장 실패."); } finally { setIsLoading(false); }
  };

  const deleteProject = async () => {
    if (!expId) return;
    if (!window.confirm("저장된 프로젝트를 삭제하시겠습니까?")) return;
    try {
      await axios.delete(`${API_BASE}/api/experience/${expId}`);
      alert("삭제되었습니다."); navigate('/mypage');
    } catch (e) { alert("삭제 실패"); }
  };

  return (
    <div className="ee-container">
      <nav className="ee-dark-header">
        <div className="pe-logo-btn" onClick={() => navigate('/')}>
          <div className="pe-logo-symbol"><span>F1</span></div>
          <div className="pe-logo-text-group"><span className="pe-logo-title">F1ND YOUR WAY</span></div>
        </div>
        <button className="pe-back-btn" onClick={() => navigate('/mypage')}>BACK TO GARAGE</button>
      </nav>

      <div className="ee-content-wrap">
        <div className="pe-title-section">
          <h1 className="pe-main-title ee-text-dark">Saved Experience</h1>
          <p className="pe-sub-title ee-text-gray">프로젝트 스펙과 상세 데이터를 관리하세요.</p>
        </div>

        <section className="ee-main-card">
            <label className="ee-section-label">PROJECT SPECIFICATION</label>
            <div className="pe-grid">
              <div className="pe-input-group pe-full">
                <label className="pe-label">PROJECT TITLE</label>
                <input type="text" className="pe-input ee-input-light ee-input-oswald"
                       value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              </div>
              <div className="pe-input-group">
                <label className="pe-label">PERIOD</label>
                <input type="text" className="pe-input ee-input-light" value={formData.period} onChange={(e) => setFormData({...formData, period: e.target.value})} />
              </div>
              <div className="pe-input-group">
                <label className="pe-label">ROLE (직무)</label>
                <input type="text" className="pe-input ee-input-light" value={formData.role} onChange={(e) => setFormData({...formData, role: e.target.value})} placeholder="예: 프론트엔드 개발자" />
              </div>
            </div>
        </section>

        <div className="ee-list-container">
          <span className="ee-section-label">TECHNICAL CHALLENGES</span>
          {formData.troubleshootings.map((trouble, idx) => (
            <div key={trouble.id || idx} className={`ee-project-card ${expandedIndex === idx ? 'active' : ''}`}>
              <div className="ee-card-summary" onClick={() => setExpandedIndex(expandedIndex === idx ? null : idx)}>
                <div>
                  <div className="ee-title-group">
                    <span className="ee-count">{idx + 1}</span>
                    <span className="ee-main-title">{trouble.title || '새로운 기술 사례'}</span>
                  </div>
                  <div className="ee-item-meta">
                    <span className="ee-item-role-badge">{formData.role || 'ROLE 미설정'}</span>
                    <span>|</span>
                    <span>{formData.period || 'PERIOD 미설정'}</span>
                  </div>
                </div>
                <div className="ee-flex-gap-15">
                  <button className="ee-btn-delete" onClick={(e) => removeTroubleshooting(e, idx)}>DELETE</button>
                  <div className="ee-toggle-icon">{expandedIndex === idx ? '▲' : '▼'}</div>
                </div>
              </div>

              {expandedIndex === idx && (
                <div className="ee-detail-content">

                  {/* ✨ 시각화 박스: 포트폴리오 스타일 (흰 배경, 파란 선, 검은 글씨) */}
                  <div className="ee-visual-box">
                    <label className="ee-visual-label">ARCHITECTURE & VISUALS</label>

                    {trouble.architectureCode && <MermaidViewer code={trouble.architectureCode} />}

                    {trouble.chartData && trouble.chartData.length > 0 && (
                      <div className="ee-chart-wrap">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={trouble.chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" stroke="#1e293b" fontSize={11} tickLine={false} axisLine={false} />
                            <YAxis hide />
                            <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#1e293b' }} />
                            {/* ✨ 포트폴리오 스타일: 파란색 선 */}
                            <Area type="monotone" dataKey="value" stroke="#1e40af" fill="#eff6ff" strokeWidth={2.5} animationDuration={1500} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    <div className="ee-image-upload-box">
                        <label className="ee-input-label-small">CHART DATA (JSON)</label>
                        <textarea
                          className="pe-input ee-input-light ee-textarea-json"
                          name="chartDataRaw"
                          value={JSON.stringify(trouble.chartData)}
                          onChange={(e) => handleTroubleChange(idx, e)}
                          placeholder='[{"name":"Before","value":80},{"name":"After","value":20}]'
                        />

                        <label className="ee-input-label-small">ARCHITECTURE IMAGE URL</label>
                        <input type="text" className="pe-input ee-input-light" name="imageUrl" value={trouble.imageUrl || ''} onChange={(e) => handleTroubleChange(idx, e)} placeholder="이미지 URL을 입력하세요" />
                        {trouble.imageUrl && <img src={trouble.imageUrl} alt="preview" className="ee-preview-img" />}
                    </div>
                  </div>

                  <div className="pe-grid ee-mt-30">
                    <div className="pe-input-group pe-full ee-mb-15">
                      <label className="pe-label">CASE TITLE</label>
                      <input type="text" className="pe-input ee-input-light" name="title" value={trouble.title} onChange={(e) => handleTroubleChange(idx, e)} />
                    </div>
                    <div className="pe-input-group pe-full">
                      <label className="pe-label ee-text-why">WHY (PROBLEM/CONTEXT)</label>
                      <textarea className="pe-textarea ee-input-light" name="why" value={trouble.why} onChange={(e) => handleTroubleChange(idx, e)} />
                    </div>
                    <div className="pe-input-group pe-full">
                      <label className="pe-label ee-text-how">HOW (ACTION/SOLUTION)</label>
                      <textarea className="pe-textarea ee-input-light" name="how" value={trouble.how} onChange={(e) => handleTroubleChange(idx, e)} />
                    </div>
                    <div className="pe-input-group pe-full">
                      <label className="pe-label ee-text-then">THEN (RESULT/LEARNED)</label>
                      <textarea className="pe-textarea ee-input-light" name="then" value={trouble.then} onChange={(e) => handleTroubleChange(idx, e)} />
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
          <button className="ee-btn-add" onClick={addTroubleshooting}>+ ADD NEW CASE</button>
        </div>

        <div className="ee-flex-gap-15 ee-mt-30">
          <button className="ee-btn-save-dark" onClick={handleSave} disabled={isLoading}>SAVE EXPERIENCE ➔</button>
          <button className="ee-btn-delete-outline" onClick={deleteProject}>DELETE EXPERIENCE</button>
        </div>
      </div>
    </div>
  );
}