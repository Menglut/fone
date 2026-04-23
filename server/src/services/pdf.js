import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

// 기존 (title, content) 대신 포트폴리오 전체 데이터 객체를 받습니다.
// 예: data = { profile: { name, intro }, projects: [ {title, why, how, then}, ... ] }
export async function createPdfBuffer(portfolioData) {
  const pdfDoc = await PDFDocument.create();
  
  // ✨ 1. A4 가로 사이즈 (PPT 슬라이드 비율과 유사)
  const A4_LANDSCAPE = [841.89, 595.28]; 
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const margin = 50;

  // ---------------------------------------------------------
  // 📄 1페이지: 기본 설명 (프로필 슬라이드)
  // ---------------------------------------------------------
  const profilePage = pdfDoc.addPage(A4_LANDSCAPE);
  let y = profilePage.getHeight() - margin;

  profilePage.drawText("Profile & Intro", { x: margin, y, size: 24, font, color: rgb(0, 0, 0) });
  y -= 40;

  // 프로필 정보 그리기 (예시)
  const introText = portfolioData?.profile?.intro || "기본 설명이 여기에 들어갑니다.";
  const introLines = wrapText(introText, 80); // 가로가 넓어졌으니 80자 기준으로 줄바꿈
  
  for (const line of introLines) {
    profilePage.drawText(line, { x: margin, y, size: 12, font, color: rgb(0.2, 0.2, 0.2) });
    y -= 18;
  }

  // ---------------------------------------------------------
  // 📄 2페이지부터: 경험 작성 내용 (1 프로젝트 = 1 슬라이드)
  // ---------------------------------------------------------
  const projects = portfolioData?.projects || [];

  for (const proj of projects) {
    // ✨ 핵심: 프로젝트마다 무조건 새로운 페이지를 추가합니다.
    const projPage = pdfDoc.addPage(A4_LANDSCAPE);
    let projY = projPage.getHeight() - margin;

    // 프로젝트 제목
    projPage.drawText(proj.title || "Project Title", { x: margin, y: projY, size: 20, font, color: rgb(0, 0, 0) });
    projY -= 35;

    // 프로젝트 상세 내용 합치기
    const projectContent = `
배경(Why): ${proj.why || ''}

해결(How): ${proj.how || ''}

성과(Then): ${proj.then || ''}
    `.trim();

    const projLines = wrapText(projectContent, 80);

    for (const line of projLines) {
      // 텍스트가 슬라이드 아래로 넘어가지 않게 방어
      if (projY < margin) {
          break; // 실제로는 폰트 사이즈를 줄이거나 내용 요약 필요
      }
      projPage.drawText(line, { x: margin, y: projY, size: 11, font, color: rgb(0.1, 0.1, 0.1) });
      projY -= 16;
    }
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

// 텍스트 래핑 함수 (가로 기준 글자수 조정)
function wrapText(str, maxChars) {
  return str.split('\n').flatMap((p) => {
    const out = [];
    let s = p.trim();
    while (s.length > maxChars) {
      out.push(s.slice(0, maxChars));
      s = s.slice(maxChars);
    }
    out.push(s);
    return out.concat(['']);
  });
}