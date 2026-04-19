import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../css/ReverseInterviewPrep.css';
import mainLogo from '../assets/logo.png';

const API_BASE = process.env.REACT_APP_API_BASE;

export default function ReverseInterviewPrep() {
  const navigate = useNavigate();

  // 💡 기존 experiences 대신 documents(자기소개서, 포트폴리오 등) 상태로 변경
  const [documents, setDocuments] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState("");
  const [selectedDocType, setSelectedDocType] = useState("resume"); // 현재는 resume로 고정, 추후 portfolio 확장 가능

  const [isScanning, setIsScanning] = useState(false);
  const [attackList, setAttackList] = useState([]);

  // 1. 유저 서류 데이터 불러오기 (우선 자기소개서 기준)
  useEffect(() => {
    const fetchUserDocuments = async () => {
      const userStr = localStorage.getItem('user');
      if (!userStr) {
        alert("로그인이 필요합니다.");
        return navigate('/auth');
      }
      const user = JSON.parse(userStr);
      const userId = user.id || user._id || user.email;

      try {
        // DB에 저장된 자기소개서 목록을 불러옵니다.
        const res = await axios.get(`${API_BASE}/api/resume/${userId}`);
        if (res.data.success && res.data.data) {
          const docs = Array.isArray(res.data.data) ? res.data.data : [res.data.data];
          setDocuments(docs);

          if (docs.length > 0) {
            setSelectedDocId(docs[0]._id);
            setSelectedDocType('resume');
          }
        }
      } catch (err) {
        console.error("서류 데이터를 불러오지 못했습니다.", err);
      }
    };
    fetchUserDocuments();
  }, [navigate]);

  // 2. 공격 지점 추출 (✨ 진짜 AI 스캔 API 연동)
  const handleScanTarget = async () => {
    if (!selectedDocId) return alert("분석할 서류를 선택해주세요.");

    setIsScanning(true);
    setAttackList([]);

    try {
      // 직전에 만든 백엔드의 AI 역면접 생성 라우터로 요청을 보냅니다.
      const res = await axios.post(`${API_BASE}/api/interview/generate-attacks`, {
        docType: selectedDocType, // 'resume' 또는 'portfolio'
        docId: selectedDocId
      });

      if (res.data.success) {
        // AI가 분석한 JSON 데이터를 그대로 리스트에 꽂아줍니다!
        setAttackList(res.data.data);
      } else {
        alert(`스캔 실패: ${res.data.message}`);
      }
    } catch (error) {
      console.error("AI 스캔 오류:", error);
      alert("AI 서버와 통신하는 도중 오류가 발생했습니다.");
    } finally {
      setIsScanning(false);
    }
  };

  // 3. 채팅방(전투) 화면으로 이동
  const handleStartDefense = () => {
    if (attackList.length === 0) return;
    navigate('/interview/defense', {
      state: {
        targetId: selectedDocId,
        targetType: selectedDocType,
        initialAttacks: attackList
      }
    });
  };

  return (
    <div className="rip-container">
      {/* 🏎️ 헤더 (다크 테마) */}
      <header className="rip-header">
        <div className="rip-logo-btn" onClick={() => navigate('/')}>
          <img 
            src={mainLogo} 
            alt="F1ND YOUR WAY 로고" 
            className="rip-logo-img" 
          />
        </div>
        <button
          className="rip-back-btn"
          onClick={() => navigate('/mypage')}
        >
          BACK TO DASHBOARD
        </button>
      </header>

      {/* 📄 메인 콘텐츠 (화이트 톤) */}
      <main className="rip-wrap">
        <section className="rip-title-section">
          <div className="rip-chip">STRESS TEST SETUP</div>
          <h1 className="rip-main-title">INTERVIEW</h1>
          <p className="rip-sub-title">
            타겟 문서를 스캔하면 AI가 가장 치명적인 약점(공격 리스트)을 추천해 줍니다.<br/>
            내가 직접 면접관이 되어 이 질문들로 내 서류를 방어하는 AI 아바타를 압박해 보세요.
          </p>
        </section>

        <div className="rip-grid">
          {/* 왼쪽: 서류 선택 카드 */}
          <div className="rip-card">
            <div className="rip-card-header">01. SELECT TARGET DOCUMENT</div>

            <div className="rip-select-group">
              <label>Target Document (Resume / Portfolio)</label>
              <select
                className="rip-select"
                value={selectedDocId}
                onChange={(e) => setSelectedDocId(e.target.value)}
              >
                <option value="" disabled>스캔할 서류를 선택하세요</option>
                {documents.map((doc, idx) => (
                  <option key={doc._id || idx} value={doc._id}>
                    {doc.title || `자기소개서 ${idx + 1}`} {doc.targetJob && `(${doc.targetJob})`}
                  </option>
                ))}
              </select>
            </div>

            <button
              className="rip-scan-btn"
              onClick={handleScanTarget}
              disabled={isScanning || documents.length === 0}
            >
              {isScanning ? "AI 스캐닝 진행 중... 잠시만 기다려주세요" : "AI 스캔 시작"}
            </button>

            {isScanning && <div className="rip-scanner-line"></div>}
          </div>

          {/* 오른쪽: 추출된 공격 리스트 카드 */}
          <div className="rip-card">
            <div className="rip-card-header" style={{ borderBottomColor: '#fca5a5' }}>
              02. DETECTED VULNERABILITIES
            </div>

            {!isScanning && attackList.length === 0 && (
              <div style={{ textAlign: 'center', color: '#64748b', padding: '40px 0', fontSize: '0.95rem' }}>
                타겟 서류를 스캔하면 직무에 맞춘 압박 질문이 나타납니다.
              </div>
            )}

            <div className="rip-attack-list">
              {attackList.map((attack, idx) => (
                <div key={idx} className="rip-attack-item">
                  <span className="rip-attack-tag">[{attack.type}]</span>
                  <div style={{ fontWeight: '600', color: '#1e293b' }}>{attack.question}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 면접장 입장 버튼 */}
        {attackList.length > 0 && (
          <div className="rip-start-btn-wrap">
            <button className="rip-start-btn" onClick={handleStartDefense}>
              ENTER INTERVIEW ROOM
            </button>
          </div>
        )}
      </main>
    </div>
  );
}