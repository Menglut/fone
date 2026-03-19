import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import html2pdf from "html2pdf.js";
import axios from "axios"; // ✨ API 통신을 위해 axios 추가
import "../css/Resume.css";
import { useResumeFlow } from "../context/ResumeFlowContext";

const API_BASE = "http://localhost:5000"; // 백엔드 주소

export default function ResumeResult() {
  const nav = useNavigate();
  const { preview, resetAll } = useResumeFlow();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isSaving, setIsSaving] = useState(false); // ✨ 저장 로딩 상태

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

  const downloadPdf = () => {
    if (!preview.trim()) return;

    const element = document.getElementById("pdf-content");
    const opt = {
      margin: 15,
      filename: "F1ND_YOUR_WAY_자기소개서.pdf",
      image: { type: "jpeg", quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };

    html2pdf().set(opt).from(element).save();
  };

  // ✨ 자기소개서 DB 저장 함수 추가
  const saveResume = async () => {
    if (!preview.trim()) return;

    // 1. 로그인 유저 확인
    const userStr = localStorage.getItem('user');
    if (!userStr) {
      alert("로그인이 필요합니다.");
      return nav('/auth');
    }
    const user = JSON.parse(userStr);
    const userId = user.id || user._id || user.email;

    // 2. 제목 입력받기
    const defaultTitle = `${new Date().toLocaleDateString()} 완성본`;
    const titleInput = window.prompt("저장할 자기소개서의 제목을 입력하세요:", defaultTitle);

    // 취소 버튼을 누르면 저장 중단
    if (titleInput === null) return;

    setIsSaving(true);

    try {
      // 3. 백엔드로 데이터 전송 (백엔드의 Resume 스키마에 맞게 조정 필요)
      const res = await axios.post(`${API_BASE}/api/resume`, {
        userId: userId,
        title: titleInput || "제목 없는 자기소개서",
        content: preview // 완성된 자소서 텍스트
      });

      if (res.data.success) {
        alert("✅ 패독(대시보드)에 성공적으로 저장되었습니다!");
        nav('/mypage'); // 저장 후 마이페이지로 이동하여 확인
      }
    } catch (error) {
      console.error("저장 실패:", error);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setIsSaving(false);
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
        </div>
      </header>

      <main className="rwWrap">
        <section className="rwIntro">
          <div className="rwChip">PHASE 03 : FINAL LAP</div>
          <h1 className="rwTitle">
            FINAL : <span className="rwAccent">최종 결과물</span>
          </h1>
          <p className="rwDesc">
            설계가 완료되었습니다. 최종 결과물을 확인하세요.<br/>
            텍스트를 복사하거나 PDF로 추출, 또는 대시보드에 저장할 수 있습니다.
          </p>
        </section>

        <section style={{ width: '100%', margin: '0 auto' }}>
          <div className="rwCard" style={{ minHeight: '600px', padding: '40px' }}>

            <div className="rwCardHead" style={{ marginBottom: '30px', borderBottom: '2px solid #eee' }}>
              <div>
                <div className="rwCardTitle">FINAL OUTPUT DOCUMENT</div>
                <div className="rwCardSub">생성 완료된 자기소개서</div>
              </div>

              {/* ✨ 액션 버튼 영역 (저장 버튼 추가 및 스타일 조정) */}
              <div className="rwActions" style={{ display: 'flex', gap: '10px' }}>
                <button
                  className="rwBtn ghost sm"
                  onClick={copyPreview}
                  disabled={!preview.trim() || isSaving}
                  title="텍스트 복사"
                  style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                >
                  COPY TEXT
                </button>
                <button
                  className="rwBtn ghost sm"
                  onClick={downloadPdf}
                  disabled={!preview.trim() || isSaving}
                  title="PDF 다운로드"
                  style={{ padding: '8px 16px', fontSize: '0.9rem' }}
                >
                  EXPORT PDF
                </button>
                <button
                  className="rwBtn primary sm"
                  onClick={saveResume}
                  disabled={!preview.trim() || isSaving}
                  title="대시보드에 저장"
                  style={{ padding: '8px 20px', fontSize: '0.9rem', backgroundColor: '#E10600' }}
                >
                  {isSaving ? "SAVING..." : "SAVE TO PADDOCK"}
                </button>
              </div>
            </div>

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

          <div style={{ textAlign: 'center', margin: '40px 0', display: 'flex', flexDirection: 'column', gap: '15px', alignItems: 'center' }}>
            <p style={{ color: '#666', fontSize: '0.95rem' }}>
              결과물이 만족스럽지 않나요? <br/><br/>
              데이터를 유지한 채 인터뷰 단계로 돌아가 답변을 수정할 수 있습니다.
            </p>

            <div style={{ display: 'flex', gap: '15px' }}>
              <button
                className="rwBtn ghost smno"
                onClick={startOver}
                style={{ width: '140px', padding: '12px' }}
              >
                START OVER
              </button>
              <button
                className="rwBtn primary smno"
                onClick={() => nav("/resume/interview")}
                style={{ width: '250px', padding: '12px' }}
              >
                RETUNE ENGINE (답변 수정)
              </button>
            </div>
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