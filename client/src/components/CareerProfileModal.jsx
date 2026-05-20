import { useState } from "react";
import "./CareerProfileModal.css";

const jobCategories = [
  { id: "dev", label: "개발", short: "Dev" },
  { id: "plan", label: "기획", short: "Plan" },
  { id: "design", label: "디자인", short: "Design" },
  { id: "marketing", label: "마케팅", short: "Mktg" },
  { id: "sales", label: "영업", short: "Sales" },
  { id: "hr", label: "HR", short: "People" },
  { id: "finance", label: "금융", short: "Finance" },
  { id: "manufacturing", label: "제조", short: "Mfg" },
  { id: "etc", label: "기타", short: "Etc" },
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
  etc: ["기타 직무"],
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

function CareerProfileModal({ onClose, onSave, initialData = {} }) {
  const [step, setStep] = useState(1);
  const [status, setStatus] = useState(initialData.status || "rookie");
  const [selectedJobCategory, setSelectedJobCategory] = useState(
    initialData.jobCategory || ""
  );
  const [selectedJobDetail, setSelectedJobDetail] = useState(
    initialData.jobDetail || ""
  );

  const selectJobCategory = (categoryId) => {
    setSelectedJobCategory(categoryId);
    setSelectedJobDetail("");
  };

  const handleNext = () => {
    if (step < 2) {
      setStep((prev) => prev + 1);
      return;
    }

    onSave({
      status,
      jobCategory: selectedJobCategory,
      jobDetail: selectedJobDetail,
    });
  };

  const handlePrev = () => {
    setStep((prev) => Math.max(1, prev - 1));
  };

  return (
    <div className="modal-backdrop" role="dialog" aria-modal="true">
      <div className="career-modal">
        <button className="modal-close" onClick={onClose} aria-label="닫기">
          ×
        </button>

        <div className="career-modal-hero">
          <span className="modal-eyebrow">Career Setup</span>
          <h2>커리어 프로필 수정</h2>
          <p>지원 상태와 희망 직무만 간단하게 선택하세요.</p>
        </div>

        <div className="progress-area">
          <div className="progress-line" />
          {[1, 2].map((num) => (
            <span
              key={num}
              className={`progress-dot ${step >= num ? "active" : ""}`}
            />
          ))}
        </div>

        <p className="step-count">STEP {step} / 2</p>

        {step === 1 && (
          <section className="modal-section">
            <div className="section-title-row">
              <span>01</span>
              <h3>지원 상태 선택</h3>
            </div>

            <div className="status-card-wrap">
              <button
                type="button"
                className={`status-card ${status === "rookie" ? "selected" : ""}`}
                onClick={() => setStatus("rookie")}
              >
                <span className="check-mark">✓</span>

                <div className="status-icon sprout-icon">
                  <SproutIcon />
                </div>

                <strong>루키 · 신입</strong>
                <p>
                  첫 커리어를 시작하는
                  <br />
                  신입 지원자
                </p>
              </button>

              <button
                type="button"
                className={`status-card ${status === "career" ? "selected" : ""}`}
                onClick={() => setStatus("career")}
              >
                <span className="check-mark">✓</span>

                <div className="status-icon briefcase-icon">
                  <BriefcaseIcon />
                </div>

                <strong>경력 · 이직</strong>
                <p>
                  경험을 바탕으로
                  <br />
                  다음 트랙을 준비하는 지원자
                </p>
              </button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="modal-section">
            <div className="section-title-row">
              <span>02</span>
              <h3>희망 직군/직무 선택</h3>
            </div>

            <div className="job-category-grid">
              {jobCategories.map((job) => {
                const selected = selectedJobCategory === job.id;

                return (
                  <button
                    type="button"
                    key={job.id}
                    className={`job-category-card ${selected ? "selected" : ""}`}
                    onClick={() => selectJobCategory(job.id)}
                  >
                    <span className="job-category-short">{job.short}</span>
                    <strong>{job.label}</strong>
                  </button>
                );
              })}
            </div>

            <div className="job-detail-block">
              <p className="job-detail-title">세부 직무 선택</p>

              <div className="chip-panel second">
                {selectedJobCategory ? (
                  jobDetailMap[selectedJobCategory].map((detail) => {
                    const selected = selectedJobDetail === detail;

                    return (
                      <button
                        type="button"
                        key={detail}
                        className={`job-chip ${selected ? "selected" : ""}`}
                        onClick={() => setSelectedJobDetail(detail)}
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
            </div>
          </section>
        )}

        <div className="modal-actions">
          {step > 1 && (
            <button type="button" className="ghost-btn" onClick={handlePrev}>
              이전
            </button>
          )}

          <button type="button" className="primary-btn" onClick={handleNext}>
            {step === 2 ? "완료 및 저장" : "다음"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CareerProfileModal;
