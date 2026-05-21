import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import '../css/ReverseInterviewPrep.css';
import mainLogo from '../assets/logo.png';

const API_BASE = process.env.REACT_APP_API_BASE || '';

const SOURCE_META = {
  resume: {
    label: '자기소개서',
    icon: '📄',
    empty: '저장된 자기소개서가 없습니다.',
  },
  portfolio: {
    label: '포트폴리오',
    icon: '🧩',
    empty: '저장된 포트폴리오가 없습니다.',
  },
  experience: {
    label: '경험',
    icon: '💼',
    empty: '저장된 경험이 없습니다.',
  },
};

const JOB_SITE_LINKS = [
  {
    id: 'jasoseol',
    label: '자소설닷컴',
    description: '공채·자소서 문항 확인',
    buildUrl: () => 'https://jasoseol.com/recruit',
  },
  {
    id: 'jobkorea',
    label: '잡코리아',
    description: '기업·직무 공고 검색',
    buildUrl: (keyword) =>
      keyword
        ? `https://www.jobkorea.co.kr/Search/?stext=${encodeURIComponent(keyword)}`
        : 'https://www.jobkorea.co.kr/',
  },
  {
    id: 'saramin',
    label: '사람인',
    description: '채용정보 검색',
    buildUrl: (keyword) =>
      keyword
        ? `https://www.saramin.co.kr/zf_user/search/recruit?searchword=${encodeURIComponent(keyword)}`
        : 'https://www.saramin.co.kr/',
  },
];

const getStoredUser = () => {
  try {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  } catch {
    return null;
  }
};

const getUserId = (user) => user?.id || user?._id || user?.email || '';

const toArray = (value) => {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
};

const compactText = (value, maxLength = 160) => {
  const text = String(value || '').replace(/\s+/g, ' ').trim();
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength).trim()}...`;
};

const makeSourceKey = (source) => `${source.type}:${source.id}`;

const normalizeSourceItem = (type, item, index) => {
  const id = item?._id || item?.id || item?.title || `${type}-${index}`;

  const contentCandidates = [
    item?.content,
    item?.body,
    item?.answer,
    item?.intro,
    item?.summary,
    item?.description,
    item?.preview,
    item?.why,
    item?.how,
    item?.then,
  ];

  let content = contentCandidates.find((candidate) => String(candidate || '').trim());

  if (!content && item?.projects) content = JSON.stringify(item.projects);
  if (!content && item?.troubleshootings) content = JSON.stringify(item.troubleshootings);

  return {
    id,
    type,
    title:
      item?.title ||
      item?.name ||
      item?.projectName ||
      item?.question ||
      `${SOURCE_META[type]?.label || '자료'} ${index + 1}`,
    subtitle:
      item?.targetJob ||
      item?.position ||
      item?.job ||
      item?.company ||
      item?.targetCompany ||
      item?.createdAt?.slice?.(0, 10) ||
      '',
    content: compactText(content || item?.text || '', 260),
    raw: item,
  };
};

const normalizeSources = (payload) => {
  const data = payload?.data || payload || {};

  const resumes = toArray(data.resumes || data.resume || data.coverLetters || data.documents?.resumes)
    .map((item, index) => normalizeSourceItem('resume', item, index));

  const portfolios = toArray(data.portfolios || data.portfolio || data.documents?.portfolios)
    .map((item, index) => normalizeSourceItem('portfolio', item, index));

  const experiences = toArray(data.experiences || data.experience || data.documents?.experiences)
    .map((item, index) => normalizeSourceItem('experience', item, index));

  return { resume: resumes, portfolio: portfolios, experience: experiences };
};

const flattenSources = (groupedSources) => [
  ...groupedSources.resume,
  ...groupedSources.portfolio,
  ...groupedSources.experience,
];

const normalizePrepareResponse = (responseData) => {
  const payload = responseData?.data || responseData || {};
  const session = payload.session || payload.interviewSession || null;

  return {
    sessionId: payload.sessionId || session?._id || session?.id || '',
    session,
    company: payload.company || null,
    selectedExperiences: payload.selectedExperiences || [],
    summary: payload.summary || session?.summary || '',
  };
};

export default function ReverseInterviewPrep() {
  const navigate = useNavigate();

  const [userId, setUserId] = useState('');
  const [sources, setSources] = useState({ resume: [], portfolio: [], experience: [] });
  const [selectedSourceKeys, setSelectedSourceKeys] = useState([]);
  const [company, setCompany] = useState({
    name: '',
    position: '',
    jobDescription: '',
    jobPostingUrl: '',
  });
  const [isImportingJobPost, setIsImportingJobPost] = useState(false);
  const [isLoadingSources, setIsLoadingSources] = useState(true);
  const [isPreparing, setIsPreparing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const allSources = useMemo(() => flattenSources(sources), [sources]);
  const selectedSources = useMemo(
    () => allSources.filter((source) => selectedSourceKeys.includes(makeSourceKey(source))),
    [allSources, selectedSourceKeys],
  );

  useEffect(() => {
    const fetchSources = async () => {
      const user = getStoredUser();

      if (!user) {
        alert('로그인이 필요합니다.');
        navigate('/auth');
        return;
      }

      const currentUserId = getUserId(user);
      setUserId(currentUserId);

      if (!currentUserId) {
        setErrorMessage('사용자 정보를 찾을 수 없습니다. 다시 로그인해주세요.');
        setIsLoadingSources(false);
        return;
      }

      try {
        const res = await axios.get(`${API_BASE}/api/interview/sources/${encodeURIComponent(currentUserId)}`);
        const normalized = normalizeSources(res.data);
        setSources(normalized);

        const firstSource = flattenSources(normalized)[0];
        if (firstSource) setSelectedSourceKeys([makeSourceKey(firstSource)]);
      } catch (primaryError) {
        console.warn('새 역면접 sources API 실패, 기존 API로 fallback 시도:', primaryError);

        try {
          const [resumeRes, portfolioRes, experienceRes] = await Promise.all([
            axios.get(`${API_BASE}/api/resume/${encodeURIComponent(currentUserId)}`).catch(() => ({ data: { data: [] } })),
            axios.get(`${API_BASE}/api/portfolio/${encodeURIComponent(currentUserId)}`).catch(() => ({ data: { data: [] } })),
            axios.get(`${API_BASE}/api/experience/${encodeURIComponent(currentUserId)}`).catch(() => ({ data: { data: [] } })),
          ]);

          const fallbackSources = normalizeSources({
            resumes: resumeRes.data?.data,
            portfolios: portfolioRes.data?.data,
            experiences: experienceRes.data?.data,
          });

          setSources(fallbackSources);

          const firstSource = flattenSources(fallbackSources)[0];
          if (firstSource) setSelectedSourceKeys([makeSourceKey(firstSource)]);
        } catch (fallbackError) {
          console.error('면접 자료 로드 실패:', fallbackError);
          setErrorMessage('면접에 사용할 자료를 불러오지 못했습니다.');
        }
      } finally {
        setIsLoadingSources(false);
      }
    };

    fetchSources();
  }, [navigate]);

  const handleCompanyChange = (field, value) => {
    setCompany((prev) => ({ ...prev, [field]: value }));
  };

  const getJobSearchKeyword = () => {
    return [company.name, company.position]
      .map((item) => item.trim())
      .filter(Boolean)
      .join(' ');
  };

  const openJobSite = (site) => {
    const keyword = getJobSearchKeyword();
    window.open(site.buildUrl(keyword), '_blank', 'noopener,noreferrer');
  };

  const handleCopySearchKeyword = async () => {
    const keyword = getJobSearchKeyword();

    if (!keyword) {
      alert('기업명 또는 지원 직무를 먼저 입력해주세요.');
      return;
    }

    try {
      await navigator.clipboard.writeText(keyword);
      alert(`검색어를 복사했습니다: ${keyword}`);
    } catch {
      alert(`검색어: ${keyword}`);
    }
  };

  const handleImportJobPostingUrl = async () => {
    const url = company.jobPostingUrl.trim();

    if (!url) {
      alert('채용공고 URL을 입력해주세요.');
      return;
    }

    if (!/^https?:\/\//i.test(url)) {
      alert('URL은 http:// 또는 https://로 시작해야 합니다.');
      return;
    }

    setIsImportingJobPost(true);
    setErrorMessage('');

    try {
      const res = await axios.post(`${API_BASE}/api/interview/job-posting/preview`, { url });

      if (res.data?.success === false) {
        throw new Error(res.data?.message || '채용공고를 불러오지 못했습니다.');
      }

      const payload = res.data?.data || res.data || {};
      const importedCompany = payload.company || payload;

      setCompany((prev) => ({
        ...prev,
        name: importedCompany.name || prev.name,
        position: importedCompany.position || prev.position,
        jobDescription:
          importedCompany.jobDescription ||
          payload.summary ||
          payload.text ||
          prev.jobDescription,
        jobPostingUrl: url,
      }));
    } catch (error) {
      console.error('채용공고 URL 분석 실패:', error);
      setErrorMessage(
        error.response?.data?.message ||
          error.message ||
          '채용공고 URL 분석에 실패했습니다. 접근이 막힌 사이트라면 공고 내용을 직접 붙여넣어 주세요.',
      );
    } finally {
      setIsImportingJobPost(false);
    }
  };

  const toggleSource = (source) => {
    const key = makeSourceKey(source);

    setSelectedSourceKeys((prev) => {
      if (prev.includes(key)) return prev.filter((item) => item !== key);
      return [...prev, key];
    });
  };

  const validateBeforeStart = () => {
    if (!userId) {
      alert('로그인 정보가 없습니다. 다시 로그인해주세요.');
      return false;
    }

    if (!company.name.trim()) {
      alert('기업명을 입력해주세요.');
      return false;
    }

    if (!company.position.trim()) {
      alert('지원 직무를 입력해주세요.');
      return false;
    }

    if (selectedSources.length === 0) {
      alert('역면접에 사용할 내 경험 또는 문서를 1개 이상 선택해주세요.');
      return false;
    }

    return true;
  };

  const handleStartInterview = async () => {
    if (!validateBeforeStart()) return;

    setIsPreparing(true);
    setErrorMessage('');

    const payloadCompany = {
      name: company.name.trim(),
      position: company.position.trim(),
      jobDescription: company.jobDescription.trim(),
      jobPostingUrl: company.jobPostingUrl.trim(),
    };

    const payloadSources = selectedSources.map((source) => ({
      type: source.type,
      id: source.id,
      title: source.title,
      content: source.content,
      raw: source.raw,
    }));

    try {
      const res = await axios.post(`${API_BASE}/api/interview/prepare`, {
        userId,
        mode: 'reverse',
        company: payloadCompany,
        selectedSources: payloadSources,
        save: true,
      });

      if (res.data?.success === false) {
        throw new Error(res.data?.message || '역면접 준비에 실패했습니다.');
      }

      const prepared = normalizePrepareResponse(res.data);

      navigate('/interview/defense', {
        state: {
          sessionId: prepared.sessionId,
          session: prepared.session,
          company: prepared.company || payloadCompany,
          selectedSources,
          selectedExperiences: prepared.selectedExperiences,
          summary: prepared.summary,
          initialMode: 'weakness',
        },
      });
    } catch (error) {
      console.error('역면접 준비 실패:', error);
      setErrorMessage(error.response?.data?.message || error.message || 'AI 역면접 준비 중 오류가 발생했습니다.');
    } finally {
      setIsPreparing(false);
    }
  };

  return (
    <div className="rip-container interview-prep-v2">
      <header className="rip-header">
        <button type="button" className="rip-logo-btn" onClick={() => navigate('/')}>
          <img src={mainLogo} alt="F1ND YOUR WAY" className="rip-logo-img" />
        </button>

        <button type="button" className="rip-back-btn" onClick={() => navigate('/mypage')}>
          BACK TO DASHBOARD
        </button>
      </header>

      <main className="rip-wrap">
        <section className="rip-title-section">
          <span className="rip-chip">AI REVERSE INTERVIEW</span>
          <h1 className="rip-main-title">역면접 준비 설정</h1>
          <p className="rip-sub-title">
            여기서는 기업과 내 서류만 선택합니다. 약점 역면접, 강점 역면접, 자유 면접 연습은 면접방 안에서 자유롭게 바꿔가며 사용할 수 있습니다.
          </p>
        </section>

        {errorMessage && <div className="rip-error-box">{errorMessage}</div>}

        <section className="prep-step-card company-card">
          <div className="prep-step-head">
            <span>01</span>
            <div>
              <h2>기업과 직무 입력</h2>
              <p>AI 지원자가 답변할 기업/직무 기준입니다. 공고 URL이나 직접 입력을 사용할 수 있습니다.</p>
            </div>
          </div>

          <div className="company-form-grid">
            <label className="prep-field full job-url-field">
              <span>채용공고 URL</span>
              <div className="job-url-input-row">
                <input
                  value={company.jobPostingUrl}
                  onChange={(e) => handleCompanyChange('jobPostingUrl', e.target.value)}
                  placeholder="예: https://www.saramin.co.kr/... 또는 채용공고 상세 URL"
                />
                <button
                  type="button"
                  className="job-url-import-btn"
                  onClick={handleImportJobPostingUrl}
                  disabled={isImportingJobPost}
                >
                  {isImportingJobPost ? '분석 중...' : 'URL 불러오기'}
                </button>
              </div>
              <small>URL 접근이 막힌 공고는 아래 채용공고/기업 특징 칸에 내용을 직접 붙여넣으면 됩니다.</small>

              <div className="job-site-shortcuts" aria-label="채용 사이트 바로가기">
                <div className="job-site-shortcuts-head">
                  <strong>채용 사이트 바로가기</strong>
                  <button type="button" onClick={handleCopySearchKeyword}>
                    검색어 복사
                  </button>
                </div>

                <div className="job-site-button-grid">
                  {JOB_SITE_LINKS.map((site) => (
                    <button
                      key={site.id}
                      type="button"
                      className={`job-site-btn ${site.id}`}
                      onClick={() => openJobSite(site)}
                    >
                      <strong>{site.label}</strong>
                      <span>{site.description}</span>
                    </button>
                  ))}
                </div>

                <p className="job-site-guide">
                  공고 사이트에서 상세 공고를 연 뒤 주소창 URL을 복사해서 위 입력칸에 붙여넣고
                  <b> URL 불러오기</b>를 누르면 기업/직무/공고 요약이 자동 반영됩니다.
                </p>
              </div>
            </label>

            <label className="prep-field">
              <span>기업명</span>
              <input
                value={company.name}
                onChange={(e) => handleCompanyChange('name', e.target.value)}
                placeholder="예: 카카오, 네이버, 삼성전자"
              />
            </label>

            <label className="prep-field">
              <span>지원 직무</span>
              <input
                value={company.position}
                onChange={(e) => handleCompanyChange('position', e.target.value)}
                placeholder="예: 백엔드 개발자, 프론트엔드 개발자"
              />
            </label>

            <label className="prep-field full">
              <span>채용공고 / 기업 특징</span>
              <textarea
                value={company.jobDescription}
                onChange={(e) => handleCompanyChange('jobDescription', e.target.value)}
                placeholder="예: Java/Spring, 대용량 트래픽, 협업 경험, 문제 해결 능력을 중요하게 보는 직무입니다."
                rows={5}
              />
            </label>
          </div>
        </section>

        <section className="prep-step-card">
          <div className="prep-step-head">
            <span>02</span>
            <div>
              <h2>내 서류와 경험 선택</h2>
              <p>AI 지원자가 답변 근거로 사용할 자기소개서, 포트폴리오, 경험을 여러 개 선택할 수 있습니다.</p>
            </div>
          </div>

          {isLoadingSources ? (
            <div className="source-loading-card">
              <div className="rip-scanner-line" />
              <p>내 자료를 불러오는 중입니다...</p>
            </div>
          ) : (
            <div className="source-group-grid">
              {Object.entries(SOURCE_META).map(([type, meta]) => (
                <div className="source-group" key={type}>
                  <div className="source-group-title">
                    <span>{meta.icon}</span>
                    <strong>{meta.label}</strong>
                  </div>

                  {sources[type].length === 0 ? (
                    <p className="source-empty">{meta.empty}</p>
                  ) : (
                    <div className="source-list">
                      {sources[type].map((source) => {
                        const key = makeSourceKey(source);
                        const isSelected = selectedSourceKeys.includes(key);

                        return (
                          <button
                            key={key}
                            type="button"
                            className={`source-card ${isSelected ? 'selected' : ''}`}
                            onClick={() => toggleSource(source)}
                          >
                            <div className="source-card-top">
                              <strong>{source.title}</strong>
                              <span>{isSelected ? '선택됨' : '선택'}</span>
                            </div>
                            {source.subtitle && <small>{source.subtitle}</small>}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="prep-summary-card reverse-summary-card">
          <div>
            <span className="summary-badge">ROOM MODE SELECT</span>
            <h2>면접방에서 기능을 선택합니다</h2>
            <p>
              선택 자료 {selectedSources.length}개를 기준으로 {company.name || '선택한 기업'}의{' '}
              {company.position || '지원 직무'} 역면접 방을 엽니다. 입장 후 약점/강점/자유 모드를 자유롭게 전환할 수 있습니다.
            </p>
          </div>

          <button
            type="button"
            className="rip-start-btn v2"
            onClick={handleStartInterview}
            disabled={isPreparing || isLoadingSources}
          >
            {isPreparing ? '역면접 방 준비 중...' : '역면접 방 입장'}
          </button>
        </section>
      </main>
    </div>
  );
}
