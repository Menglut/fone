import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import html2pdf from "html2pdf.js"; // ✨ 라이브러리 추가
import "../css/Resume.css";
import { useResumeFlow } from "../context/ResumeFlowContext";

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

  // ✨ 백엔드 API 호출 대신 화면을 바로 PDF로 저장하도록 수정
  const downloadPdf = () => {
    if (!preview.trim()) return;

    // PDF로 만들 HTML 요소 선택
    const element = document.getElementById("pdf-content");

    // PDF 변환 옵션 설정
    const opt = {
      margin: 15, // 여백 설정 (mm)
      filename: "F1ND_YOUR_WAY_자기소개서.pdf", // 저장될 파일명
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 }, // 해상도 높이기 (글씨 깨짐 방지)
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    // 생성 및 다운로드 실행
    html2pdf().set(opt).from(element).save();
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

        {/* Document View Section */}
        <section style={{ width: '100%', margin: '0 auto' }}>
          <div className="rwCard" style={{ minHeight: '600px', padding: '40px' }}>

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

            {/* ✨ id="pdf-content" 추가: 이 안의 내용만 PDF로 캡처됩니다 */}
            <div
              id="pdf-content"
              className="rwPreviewBox previewArea"
              aria-label="미리보기"
              style={{
                background: 'white',
                border: 'none',
                padding: '10px',
                fontSize: '1.05rem',
                lineHeight: '1.8',
                color: '#222',
                fontFamily: "'Pretendard', serif",
                whiteSpace: 'pre-wrap'
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