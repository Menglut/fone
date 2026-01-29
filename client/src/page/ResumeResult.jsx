import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../css/Resume.css";
import { useResumeFlow } from "../context/ResumeFlowContext";

const API_BASE = "http://localhost:5000";

export default function ResumeResult() {
  const nav = useNavigate();
  const { preview, setPreview, resetAll } = useResumeFlow();
  const [isScrolled, setIsScrolled] = useState(false);

  // 스크롤 감지
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    // 결과가 없으면 입력 페이지로 리다이렉트
    if (!preview || !preview.trim()) {
      nav("/resume/input", { replace: true });
    }
  }, [preview, nav]);

  const copyPreview = async () => {
    try {
      await navigator.clipboard.writeText(preview);
      alert("클립보드에 복사되었습니다. (Ctrl+V로 붙여넣기)");
    } catch {
      alert("복사 실패: 브라우저 권한을 확인해주세요.");
    }
  };

  const downloadPdf = async () => {
    if (!preview.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/api/pdf`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "자기소개서", content: preview }),
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "coverletter.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      alert("PDF 다운로드 중 오류가 발생했습니다.");
    }
  };

  const startOver = () => {
    if (!window.confirm("WARNING: 모든 데이터를 삭제하고 처음으로 돌아가시겠습니까?")) return;
    resetAll();
    nav("/resume/input");
  };

  return (
    <div className="rwPage">
      {/* 헤더 */}
      <header className={`rwTop ${isScrolled ? "scrolled" : ""}`}>
        <div className="rwTopInner">
          <div className="nav-logo-btn" onClick={() => (window.location.href = "/")}>
            <div className="logo-symbol">
              <span>F1</span>
            </div>
            <div className="logo-text-group">
              <span className="logo-title">F1ND YOUR WAY</span>
            </div>
          </div>

          <div className="rwTopRight">

          </div>
        </div>
      </header>

      <main className="rwWrap">
        {/* Intro Section */}
        <section className="rwIntro">
          <div className="rwChip">PHASE 03 : FINAL LAP</div>
          <h1 className="rwTitle">
            FINAL : <span className="rwAccent">최종 결과물</span>
          </h1>
          <p className="rwDesc">
            설계가 완료되었습니다. 최종 결과물을 확인하세요.<br/>
            텍스트를 복사하거나 PDF로 추출하여 제출할 수 있습니다.
          </p>
        </section>

        {/* Document View Section (Full Width) */}
        {/* 기존 maxWidth: 900px 제거 -> width: 100% 적용 */}
        <section style={{ width: '100%', margin: '0 auto' }}>
          <div className="rwCard" style={{ minHeight: '600px', padding: '40px' }}>

            {/* Card Header with Actions */}
            <div className="rwCardHead" style={{ marginBottom: '30px', borderBottom: '2px solid #eee' }}>
              <div>
                <div className="rwCardTitle">FINAL OUTPUT DOCUMENT</div>
                <div className="rwCardSub">생성 완료된 자기소개서</div>
              </div>

              <div className="rwActions" style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="rwBtn ghost sm"
                  onClick={copyPreview}
                  disabled={!preview.trim()}
                  title="텍스트 복사"
                >
                  COPY TEXT
                </button>
                <button
                  className="rwBtn primary sm"
                  onClick={downloadPdf}
                  disabled={!preview.trim()}
                  title="PDF 다운로드"
                >
                  EXPORT PDF
                </button>
              </div>
            </div>

            {/* Content Area */}
            <div
              className="rwPreviewBox previewArea"
              aria-label="미리보기"
              style={{
                background: 'white',
                border: 'none',
                padding: '10px',
                fontSize: '1.05rem',
                lineHeight: '1.8',
                color: '#222',
                fontFamily: "'Pretendard', serif", // 본문 가독성 폰트
                whiteSpace: 'pre-wrap' // 줄바꿈 보존
              }}
            >
              {preview.trim() ? (
                preview
              ) : (
                <div className="rwPreviewPlaceholder" style={{ height: '300px' }}>
                  데이터 로딩 실패. 다시 생성해주세요.
                </div>
              )}
            </div>

          </div>

          {/* Bottom Actions */}
          <div style={{ textAlign: 'center', marginTop: '40px', display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
            <p style={{ color: '#666', fontSize: '0.95rem' }}>
              결과물이 만족스럽지 않나요? <br/><br/>
              데이터를 유지한 채 인터뷰 단계로 돌아가 답변을 수정할 수 있습니다.
            </p>

            <button
              className="rwBtn primary smno"
              onClick={() => nav("/resume/interview")}
              style={{ width: '300px' }}
            >
              RETUNE ENGINE (답변 수정)
            </button>
          </div>

        </section>

        <footer className="rwFooter">
          <div className="rwFooterInner">
            <div className="rwFootLeft">
              <span style={{fontFamily: 'Rajdhani', fontWeight: 700}}>F1ND THE WAY</span>
              <span style={{margin: '0 10px'}}>|</span>
              <span>ENGINEERED FOR SUCCESS</span>
            </div>
            <div className="rwFootRight">
              © {new Date().getFullYear()} KIM'S PADDOCK
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}