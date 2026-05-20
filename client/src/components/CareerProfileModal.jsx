import { useState } from "react";
import "./CareerProfileModal.css";

const companyTypes = [
  { id: "large", ko: "대기업", en: "Conglomerates" },
  { id: "mid", ko: "중견기업", en: "Mid-sized Corps" },
  { id: "sme", ko: "중소기업", en: "SMEs" },
  { id: "public", ko: "공기업", en: "Public Corps" },
  { id: "startup", ko: "스타트업", en: "Startups" },
  { id: "foreign", ko: "외국계 기업", en: "Foreign Corps" },
  { id: "professional", ko: "전문직", en: "Professionals" },
  { id: "government", ko: "정부/공공기관", en: "Government" },
];

const jobCategories = [
  { id: "dev", label: "개발 (Dev)" },
  { id: "plan", label: "기획 (Plan)" },
  { id: "design", label: "디자인 (Design)" },
  { id: "marketing", label: "마케팅 (Mktg)" },
  { id: "sales", label: "영업 (Sales)" },
  { id: "hr", label: "HR" },
  { id: "finance", label: "금융 (Fin)" },
  { id: "manufacturing", label: "제조 (Mfg)" },
  { id: "etc", label: "etc." },
];

const jobDetailMap = {
  dev: [
    "프론트엔드 개발자",
    "백엔드 개발자",
    "풀스택 개발자",
    "모바일 앱 개발자",
    "AI 엔지니어",
    "데이터 엔지니어",
  ],
  plan: [
    "서비스 기획자",
    "프로덕트 매니저",
    "프로젝트 매니저",
    "사업 기획자",
  ],
  design: [
    "UI/UX 디자이너",
    "프로덕트 디자이너",
    "브랜드 디자이너",
    "그래픽 디자이너",
  ],
  marketing: [
    "디지털 마케터",
    "콘텐츠 마케터",
    "퍼포먼스 마케터",
    "브랜드 마케터",
  ],
  sales: [
    "B2B 영업",
    "B2C 영업",
    "영업 관리자",
    "고객사 관리",
  ],
  hr: [
    "채용 담당자",
    "인사 담당자",
    "교육 담당자",
    "조직문화 담당자",
  ],
  finance: [
    "회계 담당자",
    "재무 분석가",
    "투자 분석가",
    "리스크 관리 담당자",
  ],
  manufacturing: [
    "생산 관리자",
    "품질 관리자",
    "공정 엔지니어",
    "제조 엔지니어",
  ],
  etc: [
    "기타 직무",
  ],
};

function SproutIcon() {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M40 67V38"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M39 40C28 25 16 24 9 29C17 49 31 52 40 40Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M41 39C49 20 64 16 73 22C66 45 51 52 41 39Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M22 68H58"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function BriefcaseIcon() {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M28 25V20C28 16.7 30.7 14 34 14H46C49.3 14 52 16.7 52 20V25"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M15 29H65C68.3 29 71 31.7 71 35V61C71 64.3 68.3 67 65 67H15C11.7 67 9 64.3 9 61V35C9 31.7 11.7 29 15 29Z"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />
      <path
        d="M9 43H71"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <path
        d="M34 43V48H46V43"
        stroke="currentColor"
        strokeWidth="4"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CareerProfileModal({ onClose, onSave }) {
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState("rookie");

    const [companyTypeIds, setCompanyTypeIds] = useState([]);

    const [selectedJobCategory, setSelectedJobCategory] = useState("");
    const [selectedJobDetail, setSelectedJobDetail] = useState("");

  const toggleCompany = (id) => {
    setCompanyTypeIds((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

    const selectJobCategory = (categoryId) => {
        setSelectedJobCategory(categoryId);
        setSelectedJobDetail("");
    };

    const selectJobDetail = (detail) => {
        setSelectedJobDetail(detail);
    };

  const handleNext = () => {
    if (step < 3) {
      setStep((prev) => prev + 1);
      return;
    }

    onSave({
        status,
        companyTypes: companyTypeIds,
        jobCategory: selectedJobCategory,
        jobDetail: selectedJobDetail,
    });
  };

  const handlePrev = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  return (
    <div className="modal-backdrop">
      <div className="career-modal">
        <button className="modal-close" onClick={onClose}>
          ×
        </button>

        <h2>커리어 프로필 완성</h2>

        <div className="progress-area">
          <div className="progress-line" />

          {[1, 2, 3].map((num) => (
            <span
              key={num}
              className={`progress-dot ${step >= num ? "active" : ""}`}
            />
          ))}
        </div>

        <p className="step-count">{step} / 3</p>

        {step === 1 && (
          <section className="modal-section">
            <h3>루키자 상태 선택</h3>

            <div className="status-card-wrap">
              <button
                className={`status-card ${
                  status === "rookie" ? "selected" : ""
                }`}
                onClick={() => setStatus("rookie")}
              >
                <span className="check-mark">✓</span>

                <div className="status-icon sprout-icon">
                    <SproutIcon />
                </div>

                <strong>루키 &#40;신입&#41;</strong>

                <p>
                  새로운 도전을
                  <br />
                  시작하는 지원자
                </p>
              </button>

              <button
                className={`status-card ${
                  status === "career" ? "selected" : ""
                }`}
                onClick={() => setStatus("career")}
              >
                <span className="check-mark">✓</span>

                <div className="status-icon briefcase-icon">
                    <BriefcaseIcon />
                </div>

                <strong>경력/이직 지원자</strong>

                <p>
                  새로운 트랙으로
                  <br />
                  도약하는 지원자
                </p>
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="modal-section">
            <h3>희망 기업 분류 선택</h3>

            <div className="company-grid">
              {companyTypes.map((item) => {
                const selected = companyTypeIds.includes(item.id);

                return (
                  <button
                    key={item.id}
                    className={`choice-box ${selected ? "selected" : ""}`}
                    onClick={() => toggleCompany(item.id)}
                  >
                    <span className="box-check">{selected ? "✓" : ""}</span>

                    <span>
                      {item.ko}
                      <br />
                      <small>&#40;{item.en}&#41;</small>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {step === 3 && (
            <section className="modal-section">
                <h3>희망 직군/직무 선택</h3>

                <div className="chip-panel">
                {jobCategories.map((job) => {
                    const selected = selectedJobCategory === job.id;

                    return (
                    <button
                        key={job.id}
                        className={`job-chip ${selected ? "selected" : ""}`}
                        onClick={() => selectJobCategory(job.id)}
                    >
                        {selected && <span>✓</span>}
                        {job.label}
                    </button>
                    );
                })}
                </div>

                <p className="job-detail-title">세부 직무 선택</p>

                <div className="chip-panel second">
                {selectedJobCategory ? (
                    jobDetailMap[selectedJobCategory].map((detail) => {
                    const selected = selectedJobDetail === detail;

                    return (
                        <button
                        key={detail}
                        className={`job-chip ${selected ? "selected" : ""}`}
                        onClick={() => selectJobDetail(detail)}
                        >
                        {selected && <span>✓</span>}
                        {detail}
                        </button>
                    );
                    })
                ) : (
                    <p className="job-empty-text">먼저 희망 직군을 선택해주세요.</p>
                )}
                </div>
            </section>
            )}
        <div className="modal-actions">
          {step > 1 && (
            <button className="ghost-btn" onClick={handlePrev}>
              이전
            </button>
          )}

          <button className="primary-btn" onClick={handleNext}>
            {step === 3 ? "완료 및 저장" : "다음"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CareerProfileModal;