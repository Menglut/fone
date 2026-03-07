import React from 'react';

const Step3Design = ({ data, setData, prevStep, nextStep }) => {
  // 현재 선택된 테마 확인 (기본값은 'modern')
  const currentTheme = data.theme || 'modern';

  // 테마 변경 핸들러
  const handleThemeChange = (themeId) => {
    setData(prev => ({ ...prev, theme: themeId }));
  };

  // 제공할 디자인 템플릿 목록
  const templates = [
    {
      id: 'modern',
      name: 'Modern Blue (기본)',
      desc: '신뢰감을 주는 블루 포인트와 깔끔한 화이트 배경의 정석 테마',
      colors: ['#ffffff', '#1e40af', '#f1f5f9']
    },
    {
      id: 'dark',
      name: 'F1 Racing Dark',
      desc: '강렬한 블랙과 레드 포인트로 기술적 깊이를 강조하는 다크 테마',
      colors: ['#111111', '#e10600', '#2a2a2a']
    },
    {
      id: 'minimal',
      name: 'Minimal Mono',
      desc: '오직 흑백의 타이포그래피로 승부하는 극강의 미니멀리즘 테마',
      colors: ['#fafafa', '#000000', '#e5e5e5']
    }
  ];

  return (
    <section className="rwInputArea">

      <div className="rwCard" style={{ marginBottom: '30px' }}>
        <div className="rwCardHead design-card-head">
          <div>
            <div className="rwCardTitle"><span>🎨 포트폴리오 디자인(템플릿) 선택</span></div>
            <div className="rwCardSub">작성하신 데이터가 어떻게 보여질지 분위기를 결정합니다. 언제든 다시 바꿀 수 있습니다!</div>
          </div>
        </div>

        {/* 템플릿 선택 그리드 */}
        <div className="theme-grid">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              onClick={() => handleThemeChange(tpl.id)}
              // ✨ 선택된 테마에 'active' 클래스만 추가하여 CSS에서 처리하도록 변경
              className={`theme-card ${currentTheme === tpl.id ? 'active' : ''}`}
            >
              {/* 활성화 시 체크 아이콘 */}
              {currentTheme === tpl.id && (
                <div className="theme-check">✓</div>
              )}

              {/* 테마 컬러 팔레트 (동적 색상만 inline style 유지) */}
              <div className="color-palette">
                <div className="color-box" style={{ flex: 3, backgroundColor: tpl.colors[0] }}></div>
                <div className="color-box" style={{ flex: 1, backgroundColor: tpl.colors[1] }}></div>
                <div className="color-box" style={{ flex: 2, backgroundColor: tpl.colors[2] }}></div>
              </div>

              <h4 className="theme-name">{tpl.name}</h4>
              <p className="theme-desc">{tpl.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 하단 버튼 영역 */}
      <div className="rwActionArea step-action-area">
        <button className="rwBtn secondary fullLarge" onClick={prevStep}>
          ⬅️ STEP 2 : 프로젝트 수정
        </button>
        <button className="rwBtn primary fullLarge" onClick={nextStep}>
          STEP 4 : 최종 결과 확인하러 가기 ➡️
        </button>
      </div>

    </section>
  );
};

export default Step3Design;