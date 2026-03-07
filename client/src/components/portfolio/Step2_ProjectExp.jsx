import React, { useState, useMemo, useEffect, useRef } from 'react';
import axios from 'axios';
import mermaid from 'mermaid';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import '../../css/Step2_ProjectExp.css';

const API_BASE = "http://localhost:5000";

const MermaidViewer = ({ code }) => {
  const ref = useRef(null);
  useEffect(() => {
    if (code && ref.current) {
      const cleanCode = code.replace(/```mermaid\n?/gi, '').replace(/```\n?/g, '').trim();
      try {
        mermaid.initialize({ startOnLoad: false, theme: 'default' });
        mermaid.render(`mermaid-step2-${Math.random().toString(36).substr(2, 9)}`, cleanCode)
          .then((result) => { if (ref.current) ref.current.innerHTML = result.svg; })
          .catch((e) => console.error("Mermaid Render Error", e));
      } catch (error) {
        if (ref.current) ref.current.innerHTML = "<p style='color:red; font-size:12px;'>다이어그램 렌더링 오류</p>";
      }
    }
  }, [code]);
  return <div ref={ref} className="step2-mermaid-wrap" />;
};

const Step2ProjectExp = ({ data, setData, prevStep, nextStep }) => {
  const [aiPrompt, setAiPrompt] = useState("");
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [masterProjects, setMasterProjects] = useState([]);

  const handleOpenProjectModal = async () => {
    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) return alert("로그인이 필요합니다.");
      const user = JSON.parse(storedUser);
      const userId = user.id || user._id || user.email;

      const response = await axios.get(`${API_BASE}/api/experience/${userId}`);
      if (response.data.success && response.data.data) {
        setMasterProjects(response.data.data);
        setIsModalOpen(true);
      } else {
        alert("저장된 프로젝트가 없습니다.");
      }
    } catch (error) {
      alert("프로젝트 정보를 불러오는데 실패했습니다.");
    }
  };

  // ✨ [해결 포인트 1] 사용자님의 말씀대로 '묶인 데이터'를 완벽하게 파싱(자르기)합니다.
  const handleSelectProject = async (projectSummary) => {
    try {
      const projectId = projectSummary._id || projectSummary.id;
      const response = await axios.get(`${API_BASE}/api/experience/detail/${projectId}`);

      if (response.data.success) {
        const fullProject = response.data.data;

        const formattedProject = {
          ...fullProject,
          id: crypto.randomUUID(),
          troubleshootings: fullProject.troubleshootings?.map(t => {
            // 💡 문자열로 묶여서 날아온 데이터를 그래프가 읽을 수 있는 배열(Array)로 파싱합니다.
            let parsedChart = [];
            if (t.chartData) {
              if (typeof t.chartData === 'string') {
                try { parsedChart = JSON.parse(t.chartData); } catch(e) {}
              } else if (Array.isArray(t.chartData)) {
                parsedChart = t.chartData;
              }
            }

            return {
              ...t,
              id: crypto.randomUUID(),
              chartData: parsedChart // 파싱이 완료된 깨끗한 배열 데이터 저장
            };
          }) || [{ id: crypto.randomUUID(), title: '', why: '', how: '', then: '', architectureCode: "", imageUrl: "", chartData: [] }]
        };

        setData(prev => ({ ...prev, projects: [formattedProject, ...prev.projects] }));
        setIsModalOpen(false);
      }
    } catch (error) {
      console.error("상세 정보 호출 에러:", error);
      alert("상세 데이터를 불러오지 못했습니다.");
    }
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return alert("프로젝트 경험을 적어주세요!");
    setIsAiLoading(true);
    try {
      const response = await axios.post(`${API_BASE}/api/generate/portfolio`, {
        userPrompt: `내 프로젝트 경험이야. 기술 스택, 요약, 트러블슈팅(Why-How-Then)을 포함해서 JSON으로 줘. 내용: ${aiPrompt}`
      });
      if (response.data.success) {
        const aiData = response.data.data;
        setData(prev => ({
          ...prev,
          projects: [...(aiData.projects || []).map(p => ({
            ...p,
            id: crypto.randomUUID(),
            troubleshootings: p.troubleshootings?.map(t => ({
                ...t,
                id: crypto.randomUUID()
            }))
          })), ...prev.projects]
        }));
        setAiPrompt("");
      }
    } catch (error) { alert("AI 생성 오류"); } finally { setIsAiLoading(false); }
  };

  const handleSaveToMaster = async (project) => {
    try {
      const storedUser = localStorage.getItem('user');
      if (!storedUser) return alert("로그인이 필요합니다.");

      const user = JSON.parse(storedUser);
      const userId = user.id || user._id || user.email;

      if (!project.title.trim()) return alert("프로젝트 제목을 입력해주세요.");

      const response = await axios.post(`${API_BASE}/api/experience`, {
        userId,
        ...project
     });

      if (response.data.success) {
        alert(`✅ '${project.title}'이(가) 마스터 데이터로 성공적으로 저장되었습니다!`);
      }
    } catch (error) {
      console.error("Save Error:", error);
      alert("저장에 실패했습니다. 백엔드 스키마를 확인하세요.");
    }
  };

  // ✨ [해결 포인트 2] ExperienceEditor.jsx와 완벽하게 동일한 체인지 핸들러
  const handleProjectChange = (pIndex, e) => {
    const { name, value } = e.target;
    const newProjects = [...data.projects];
    newProjects[pIndex][name] = value;
    setData(prev => ({ ...prev, projects: newProjects }));
  };

  const handleTroubleChange = (pIndex, tIndex, e) => {
    const { name, value } = e.target;
    const newProjects = [...data.projects];
    const newTroubles = [...newProjects[pIndex].troubleshootings];

    if (name === 'chartDataRaw') {
      try {
        newTroubles[tIndex]['chartData'] = JSON.parse(value);
      } catch (err) { }
    } else {
      newTroubles[tIndex][name] = value;
    }

    newProjects[pIndex].troubleshootings = newTroubles;
    setData(prev => ({ ...prev, projects: newProjects }));
  };

  const addProject = () => {
    setData(prev => ({
      ...prev,
      projects: [{
        id: crypto.randomUUID(), title: '', period: '', summary: '', techStack: '',
        troubleshootings: [{ id: crypto.randomUUID(), title: '', why: '', how: '', then: '', architectureCode: "", imageUrl: "", chartData: [] }]
      }, ...prev.projects]
    }));
  };

  const removeProject = (id) => {
    setData(prev => ({ ...prev, projects: prev.projects.filter(p => p.id !== id) }));
  };

  const canGoNext = useMemo(() => data.projects.length > 0 && data.projects[0].title.trim().length > 0, [data.projects]);

  return (
    <section className="rwInputArea">
      <div className="rwCard rwCardAI">
        <div className="rwCardHead"><div className="rwCardTitle"><span>🤖 AI 아키텍트 & 프로젝트 설계자</span></div></div>
        <textarea className="rwTextarea" value={aiPrompt} onChange={(e) => setAiPrompt(e.target.value)} placeholder="프로젝트 업무를 적어주시면 AI가 내용을 구성합니다." rows={4} style={{ resize: 'none' }} />
        <button className="rwBtn primary full" onClick={handleAiGenerate} disabled={isAiLoading || !aiPrompt.trim()} style={{ marginTop: '15px' }}>
          {isAiLoading ? "AI 설계 중..." : "✨ AI로 프로젝트 생성"}
        </button>
      </div>

      <div className="rwActionArea" style={{ margin: '30px 0', display: 'flex', gap: '15px' }}>
        <button className="rwBtn secondary" onClick={addProject}>➕ 새 프로젝트 직접 추가</button>
        <button className="rwBtn secondary" onClick={handleOpenProjectModal} style={{ borderColor: '#1e40af', color: '#1e40af' }}>📂 내 프로젝트 선택해서 불러오기</button>
      </div>

      <div className="rwProjectsList">
        {data.projects.map((project, pIndex) => (
          <div key={project.id} className="rwCard" style={{ marginBottom: '40px' }}>
            <div className="rwCardHead">
              <div className="rwCardTitle"><span>📌 PROJECT {pIndex + 1}</span></div>
              <div>
                  <button className="rwBtn textOnly" onClick={() => handleSaveToMaster(project)} style={{ color: '#2563eb', fontWeight: 'bold', marginRight: '15px', background: 'transparent', border: 'none', cursor: 'pointer' }}>저장</button>
                  <button className="rwBtn textOnly" onClick={() => removeProject(project.id)} style={{ color: '#ef4444', background: 'transparent', border: 'none', cursor: 'pointer' }}>삭제</button>
              </div>
            </div>

            <div className="rwCardBodyGrid">
              <div className="input-group-rw"><label>프로젝트명 *</label><input type="text" className="rwInputText" name="title" value={project.title} onChange={(e) => handleProjectChange(pIndex, e)} /></div>
              <div className="input-group-rw"><label>진행 기간</label><input type="text" className="rwInputText" name="period" value={project.period} onChange={(e) => handleProjectChange(pIndex, e)} /></div>
              <div className="input-group-rw fullWidth"><label>기술 스택</label><input type="text" className="rwInputText" name="techStack" value={project.techStack} onChange={(e) => handleProjectChange(pIndex, e)} /></div>
              <div className="input-group-rw fullWidth"><label>한 줄 요약</label><input type="text" className="rwInputText" name="summary" value={project.summary} onChange={(e) => handleProjectChange(pIndex, e)} /></div>
            </div>

            <div style={{ marginTop: '30px', paddingBottom: '10px', borderBottom: '1px solid #eee', fontWeight: '700', color: '#1e40af' }}>
              🛠️ KEY TROUBLESHOOTING
            </div>

            {project.troubleshootings.map((trouble, tIndex) => (
              <div key={trouble.id} className="step2-trouble-card">
                <div className="input-group-rw">
                  <label>문제 해결 주제</label>
                  <input type="text" className="rwInputText" name="title" value={trouble.title} onChange={(e) => handleTroubleChange(pIndex, tIndex, e)} />
                </div>

                {/* 시각화 데이터 렌더링 영역 */}
                {(trouble.architectureCode || trouble.imageUrl || (trouble.chartData && trouble.chartData.length > 0)) && (
                  <div className="step2-visual-grid">
                    {trouble.architectureCode && (
                      <div className="step2-visual-box">
                        <span className="step2-visual-label">SYSTEM ARCHITECTURE</span>
                        <MermaidViewer code={trouble.architectureCode} />
                      </div>
                    )}
                    {trouble.imageUrl && (
                      <div className="step2-visual-box">
                        <img src={trouble.imageUrl} alt="Architecture Preview" style={{ maxWidth: '100%', height: 'auto', borderRadius: '4px' }} />
                      </div>
                    )}
                    {trouble.chartData && trouble.chartData.length > 0 && (
                      <div className="step2-visual-box">
                        <span className="step2-visual-label">PERFORMANCE METRIC</span>
                        <div className="step2-chart-wrap" style={{ height: '220px', width: '100%' }}>
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={trouble.chartData}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                              <XAxis dataKey="name" stroke="#000000" fontSize={11} tickLine={false} axisLine={false} />
                              <YAxis hide />
                              <Tooltip contentStyle={{ background: '#fff', border: '1px solid #cbd5e1', borderRadius: '4px', color: '#000' }} />
                              <Area type="monotone" dataKey="value" stroke="#1e40af" fill="#eff6ff" strokeWidth={2.5} animationDuration={1000} />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ✨ [해결 포인트 3] 텍스트창에 JSON 바인딩 완벽 복구 */}
                <div className="rwCardBodyGrid" style={{ gap: '15px', marginTop: '20px', marginBottom: '20px', padding: '15px', background: '#ffffff', border: '1px dashed #cbd5e1', borderRadius: '8px' }}>
                  <div className="input-group-rw fullWidth" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px', color: '#64748b' }}>Architecture Code (Mermaid)</label>
                    <textarea
                      className="rwTextarea"
                      style={{ fontSize: '12px', height: '60px', minHeight: '60px' }}
                      name="architectureCode"
                      value={trouble.architectureCode || ''}
                      onChange={(e) => handleTroubleChange(pIndex, tIndex, e)}
                      placeholder="graph TD; A-->B;"
                    />
                  </div>
                  <div className="input-group-rw fullWidth" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px', color: '#64748b' }}>Chart Data (JSON)</label>
                    <textarea
                      className="rwTextarea"
                      style={{ fontSize: '12px', height: '60px', minHeight: '60px' }}
                      name="chartDataRaw"
                      value={trouble.chartData && trouble.chartData.length > 0 ? JSON.stringify(trouble.chartData) : ''}
                      onChange={(e) => handleTroubleChange(pIndex, tIndex, e)}
                      placeholder='[{"name":"Before","value":80},{"name":"After","value":20}]'
                    />
                  </div>
                  <div className="input-group-rw fullWidth" style={{ marginBottom: 0 }}>
                    <label style={{ fontSize: '12px', color: '#64748b' }}>Architecture Image URL</label>
                    <input
                      type="text"
                      className="rwInputText"
                      name="imageUrl"
                      value={trouble.imageUrl || ''}
                      onChange={(e) => handleTroubleChange(pIndex, tIndex, e)}
                      placeholder="이미지 URL을 입력하세요"
                    />
                  </div>
                </div>

                <div className="rwCardBodyGrid" style={{ gap: '20px' }}>
                  <div className="input-group-rw fullWidth">
                    <label style={{ color: '#dc2626' }}>[Why] 문제 배경 및 원인</label>
                    <textarea className="rwTextarea short" name="why" value={trouble.why} onChange={(e) => handleTroubleChange(pIndex, tIndex, e)} rows={3} style={{ resize: 'none' }} />
                  </div>
                  <div className="input-group-rw fullWidth">
                    <label style={{ color: '#2563eb' }}>[How] 해결 과정 및 기술적 선택</label>
                    <textarea className="rwTextarea short" name="how" value={trouble.how} onChange={(e) => handleTroubleChange(pIndex, tIndex, e)} rows={3} style={{ resize: 'none' }} />
                  </div>
                  <div className="input-group-rw fullWidth">
                    <label style={{ color: '#16a34a' }}>[Then] 결과 및 배운 점</label>
                    <textarea className="rwTextarea short" name="then" value={trouble.then} onChange={(e) => handleTroubleChange(pIndex, tIndex, e)} rows={3} style={{ resize: 'none' }} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="step2-modal-overlay">
          <div className="step2-modal-content">
            <div className="step2-modal-header">
              <h3 className="step2-modal-title">불러올 프로젝트 선택</h3>
              <button className="step2-modal-close" onClick={() => setIsModalOpen(false)}>&times;</button>
            </div>
            <div>
              {masterProjects.map((p) => (
                <div key={p._id || p.id} className="step2-modal-item">
                  <div>
                    <div style={{ fontWeight: '700', color: '#1e293b' }}>{p.title}</div>
                    <div style={{ fontSize: '12px', color: '#64748b' }}>{p.period}</div>
                  </div>
                  <button className="rwBtn secondary short" onClick={() => handleSelectProject(p)} style={{ fontSize: '12px' }}>추가</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="rwActionArea" style={{ marginTop: '60px', display: 'flex', gap: '20px' }}>
        <button className="rwBtn secondary fullLarge" onClick={prevStep}>⬅️ STEP 1 수정</button>
        <button className="rwBtn primary fullLarge" onClick={nextStep} disabled={!canGoNext}>STEP 3 이동 ➡️</button>
      </div>
    </section>
  );
};

export default Step2ProjectExp;