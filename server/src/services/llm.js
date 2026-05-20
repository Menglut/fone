import dotenv from 'dotenv';
import OpenAI from 'openai';

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY,
  baseURL: 'https://api.deepseek.com',
});

function safeJsonParse(content = '{}', fallback = {}) {
  const cleaned = String(content || '{}')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch (error) {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(cleaned.slice(firstBrace, lastBrace + 1));
      } catch (_) {
        return fallback;
      }
    }
    return fallback;
  }
}

function isClearlyNegativeAnswer(answer = '') {
  const normalized = String(answer).trim().toLowerCase();
  if (!normalized) return true;

  return (
    /^(몰라|모름|모르겠|모르겠어|없어|없습니다|없는데|없죠|안 해|안해|안 해봤|안해봤|못 해|못해|기억 안|기억이 안|사용 안|써본 적 없|경험 없|없음)/.test(normalized) ||
    /(구체적인 내용은 추후|추후 말씀|아직 정리|잘 모르|경험이 없어|학습할 계획|관심을 가지고|ai가 다|ai가 해|제가 한 건 없)/i.test(normalized) ||
    /^(x|no|none|nothing|n\/a)$/i.test(normalized)
  );
}

function normalizeEvidence(value) {
  if (!value || typeof value !== 'object') return {};
  return {
    role: value.role || '',
    situation: value.situation || '',
    action: value.action || '',
    result: value.result || '',
    technologies: Array.isArray(value.technologies) ? value.technologies.filter(Boolean) : [],
    metrics: Array.isArray(value.metrics) ? value.metrics.filter(Boolean) : [],
    learning: value.learning || '',
  };
}

function sanitizeSingleQuestion(question, fallback) {
  const raw = String(question || '').replace(/\s+/g, ' ').trim();
  if (!raw) return fallback;

  const questionMarkIndex = raw.indexOf('?');
  if (questionMarkIndex >= 0) {
    return raw.slice(0, questionMarkIndex + 1).trim();
  }

  return raw
    .split(/(?:그리고|또한|다음으로|추가로)/)[0]
    .trim() || fallback;
}

function getUsableAnswers(answers = []) {
  return Array.isArray(answers) ? answers.filter((item) => item?.usable === true) : [];
}

function buildAnswersBlock(answers = []) {
  if (!Array.isArray(answers) || answers.length === 0) return '(없음)';

  return answers
    .map((a, idx) => {
      const evidence = normalizeEvidence(a.evidence);
      const evidenceText = [
        evidence.role && `역할: ${evidence.role}`,
        evidence.situation && `상황: ${evidence.situation}`,
        evidence.action && `행동: ${evidence.action}`,
        evidence.result && `결과: ${evidence.result}`,
        evidence.technologies.length && `기술: ${evidence.technologies.join(', ')}`,
        evidence.metrics.length && `수치: ${evidence.metrics.join(', ')}`,
        evidence.learning && `배운 점: ${evidence.learning}`,
      ]
        .filter(Boolean)
        .join(' / ');

      return [
        `질문 ${idx + 1}: ${a.question || ''}`,
        `답변 ${idx + 1}: ${a.answer || ''}`,
        evidenceText && `확인된 근거: ${evidenceText}`,
      ]
        .filter(Boolean)
        .join('\n');
    })
    .join('\n\n');
}


function countCharsWithSpaces(text = '') {
  return String(text || '').length;
}

function toSafeNumber(value) {
  const normalized = String(value || '').replace(/,/g, '').trim();
  const number = Number(normalized);
  return Number.isFinite(number) ? number : 0;
}

function resolveCoverLetterLengthRule(jobPost = '', options = {}) {
  const jobText = String(jobPost || '');
  const optionText = String(options?.length || '');

  const optionNumberMatch = optionText.match(/(\d{2,5})\s*자/);
  const optionTarget = optionNumberMatch ? toSafeNumber(optionNumberMatch[1]) : 0;

  const defaultMin = Number(options?.minChars) || 800;
  const defaultTarget = Number(options?.targetChars) || Math.max(optionTarget || 1000, defaultMin);

  const rule = {
    minChars: defaultMin,
    targetChars: defaultTarget,
    maxChars: null,
    source: 'default',
    sourceLabel: '공고 제한 없음',
  };

  const rangeMatch = jobText.match(/(\d{2,5})\s*(?:~|-|–|—)\s*(\d{2,5})\s*자/);
  if (rangeMatch) {
    const start = toSafeNumber(rangeMatch[1]);
    const end = toSafeNumber(rangeMatch[2]);
    const min = Math.min(start, end);
    const max = Math.max(start, end);
    return {
      minChars: Math.max(100, min),
      targetChars: max,
      maxChars: max,
      source: 'job-post-range',
      sourceLabel: `공고 기준 ${min}~${max}자`,
    };
  }

  const maxMatches = Array.from(jobText.matchAll(/(\d{2,5})\s*자\s*(?:이내|이하|내로|까지|제한)/g));
  if (maxMatches.length) {
    const max = Math.min(...maxMatches.map((match) => toSafeNumber(match[1])).filter(Boolean));
    return {
      minChars: Math.max(100, Math.floor(max * 0.8)),
      targetChars: max,
      maxChars: max,
      source: 'job-post-max',
      sourceLabel: `공고 기준 ${max}자 이내`,
    };
  }

  const minMatch = jobText.match(/(\d{2,5})\s*자\s*(?:이상|이상으로|넘게)/);
  if (minMatch) {
    const min = toSafeNumber(minMatch[1]);
    return {
      minChars: min,
      targetChars: Math.max(min + 150, defaultTarget),
      maxChars: null,
      source: 'job-post-min',
      sourceLabel: `공고 기준 ${min}자 이상`,
    };
  }

  const aroundMatch = jobText.match(/(\d{2,5})\s*자\s*(?:내외|정도|분량|가량)/);
  if (aroundMatch) {
    const target = toSafeNumber(aroundMatch[1]);
    return {
      minChars: Math.max(100, Math.floor(target * 0.85)),
      targetChars: target,
      maxChars: Math.ceil(target * 1.15),
      source: 'job-post-around',
      sourceLabel: `공고 기준 ${target}자 내외`,
    };
  }

  return rule;
}

function buildLengthInstruction(lengthRule) {
  if (lengthRule.maxChars) {
    return `- 분량은 공백 포함 ${lengthRule.maxChars}자 이내를 반드시 지킨다. 가능하면 ${lengthRule.minChars}자 이상, ${lengthRule.targetChars}자에 가깝게 작성한다.`;
  }

  return `- 분량은 공백 포함 최소 ${lengthRule.minChars}자 이상으로 작성한다. 가능하면 ${lengthRule.targetChars}자 내외로 충분히 작성한다.`;
}

async function expandCoverLetterToLength({ content, lengthRule, jobPost, baseExperience, usableAnswers, rejectedAnswers, options }) {
  const original = String(content || '').trim();
  const currentChars = countCharsWithSpaces(original);
  const shouldExpand = currentChars > 0 && currentChars < lengthRule.minChars;
  const shouldCondense = Boolean(lengthRule.maxChars && currentChars > lengthRule.maxChars);

  if (!shouldExpand && !shouldCondense) return original;

  const system = `
너는 한국어 자기소개서 문장 보강 전문가다.
기존 자기소개서를 분량 기준에 맞게 조정하되, 사용자가 말하지 않은 사실은 절대 추가하지 않는다.

[절대 규칙]
- 새로운 프로젝트명, 기술명, 수치, 성과, 경력, 문제 해결 과정을 지어내지 않는다.
- 사용 가능한 추가 답변과 기본 경험에 있는 사실만 사용한다.
- rejectedAnswers에 포함된 내용은 긍정 경험으로 쓰지 않는다.
- 공고에 있는 기술을 사용자가 경험한 것처럼 단정하지 않는다.
- 마크다운, 제목, 번호, 불릿 없이 자연스러운 서술형 문단으로 작성한다.
- 부족한 분량은 역할의 의미, 행동 과정, 배운 점, 지원 직무와의 연결성을 더 자세히 풀어 보강한다.
${buildLengthInstruction(lengthRule)}

반드시 JSON 객체만 반환한다.
{
  "content": "분량 기준에 맞게 보강 또는 압축한 자기소개서 본문"
}
`.trim();

  const user = `
[기존 자기소개서]
${original}

[채용 공고/회사 질문]
${jobPost}

[기본 경험 입력]
${baseExperience || '(없음)'}

[사용 가능한 추가 답변]
${buildAnswersBlock(usableAnswers)}

[사용 금지/부정 답변]
${
  rejectedAnswers.length
    ? rejectedAnswers.map((a) => `- 질문: ${a.question || ''}\n  답변: ${a.answer || ''}\n  제외 이유: ${a.reason || '사용자가 충분한 경험 근거를 제공하지 않음'}`).join('\n')
    : '(없음)'
}

[옵션]
톤: ${options?.tone || '담백'}
유형: ${options?.type || '자유형'}

위 정보만 사용해 분량 기준에 맞게 조정해라.
`.trim();

  try {
    const resp = await client.chat.completions.create({
      model: 'deepseek-chat',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.18,
    });

    const parsed = safeJsonParse(resp.choices[0]?.message?.content || '{}', {});
    const nextContent = String(parsed.content || '').trim();

    if (!nextContent) return original;
    if (lengthRule.maxChars && countCharsWithSpaces(nextContent) > lengthRule.maxChars) return original;
    if (shouldExpand && countCharsWithSpaces(nextContent) <= currentChars) return original;

    return nextContent;
  } catch (error) {
    console.error('자기소개서 분량 보강 실패:', error);
    return original;
  }
}

/**
 * ✅ 자기소개서 생성 (근거 기반 / 허위 생성 방지)
 */
export async function generateCoverLetter({ resume, jobPost, options }) {
  const interviewAnswers = Array.isArray(resume?.interviewAnswers) ? resume.interviewAnswers : [];
  const rejectedAnswers = Array.isArray(resume?.rejectedAnswers) ? resume.rejectedAnswers : [];
  const usableAnswers = getUsableAnswers(interviewAnswers);
  const baseExperience = String(resume?.experience || '').trim();
  const lengthRule = resolveCoverLetterLengthRule(jobPost, options);

  const weakBaseExperience = !baseExperience || isClearlyNegativeAnswer(baseExperience);

  if (usableAnswers.length === 0 && weakBaseExperience) {
    return {
      canGenerate: false,
      content: '',
      missingFields: ['구체적인 역할', '사용 기술 또는 업무 방식', '문제 해결 과정', '결과 또는 배운 점'],
      message:
        '현재 입력만으로는 거짓 없이 자기소개서를 작성하기 어렵습니다. 실제로 수행한 경험, 맡은 역할, 사용한 기술이나 업무 방식, 결과를 조금 더 알려주세요.',
      nextQuestion:
        '수업, 팀 프로젝트, 아르바이트, 인턴, 개인 프로젝트 중 하나라도 좋습니다. 본인이 직접 맡았던 역할과 한 일을 구체적으로 알려주실 수 있을까요?',
    };
  }

  const system = `
너는 한국어 자기소개서 작성 전문가다.
반드시 사용자가 직접 제공한 사실과 검증된 채용공고 정보만 사용해서 자기소개서를 작성한다.

[절대 규칙]
- 사용자가 말하지 않은 기술, 성과, 수치, 프로젝트명, 경력, 문제 해결 과정을 절대 지어내지 않는다.
- 사용자가 "몰라", "안 해봤어", "사용 안 했다", "경험 없다"라고 답한 내용은 절대 경험으로 쓰지 않는다.
- rejectedAnswers에 있는 답변은 "하지 않았다/모른다"는 제외 근거로만 참고하고, 긍정 경험으로 사용하지 않는다.
- usableAnswers와 baseExperience에 있는 구체적 사실만 자기소개서 근거로 사용한다.
- 근거가 부족하면 억지로 자기소개서를 완성하지 말고 canGenerate:false로 반환한다.
- 마크다운 제목, 번호, 불릿, '#', '*'를 사용하지 않는다.
- 문단이 자연스럽게 이어지는 서술형 글로 작성한다.
- 채용공고의 직무 상세, 지원 자격, 우대 사항과 사용자의 실제 경험이 연결되는 부분만 강조한다.
- 채용공고에 적힌 기술이나 자격요건을 사용자가 경험했다고 단정하지 않는다.
- HTML, CSS3, JavaScript, Spring Framework, RDBMS 같은 기술명은 사용자가 직접 경험했다고 말한 경우에만 본인의 역량으로 작성한다.
${buildLengthInstruction(lengthRule)}

[반환 형식]
반드시 JSON 객체만 반환한다.
{
  "canGenerate": true,
  "missingFields": [],
  "message": "",
  "nextQuestion": "",
  "content": "자기소개서 본문"
}
`.trim();

  const user = `
[채용 공고/회사 질문]
${jobPost}

[기본 경험 입력]
${baseExperience || '(없음)'}

[사용 가능한 추가 답변]
${buildAnswersBlock(usableAnswers)}

[사용 금지/부정 답변]
${
  rejectedAnswers.length
    ? rejectedAnswers.map((a) => `- 질문: ${a.question || ''}\n  답변: ${a.answer || ''}\n  제외 이유: ${a.reason || '사용자가 충분한 경험 근거를 제공하지 않음'}`).join('\n')
    : '(없음)'
}

[옵션]
톤: ${options?.tone || '담백'}
분량: ${options?.length || '공고 제한이 없으면 최소 800자, 목표 1000자 내외'}
유형: ${options?.type || '자유형'}
strictEvidenceOnly: ${options?.strictEvidenceOnly !== false}

[분량 기준]
기준 출처: ${lengthRule.sourceLabel}
최소 글자 수: ${lengthRule.minChars}자
목표 글자 수: ${lengthRule.targetChars}자
최대 글자 수: ${lengthRule.maxChars ? `${lengthRule.maxChars}자` : '제한 없음'}

위 정보만 사용해 한국어 자기소개서를 작성해라.
`.trim();

  const resp = await client.chat.completions.create({
    model: 'deepseek-chat',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.18,
  });

  const parsed = safeJsonParse(resp.choices[0]?.message?.content || '{}', {
    canGenerate: false,
    content: '',
    missingFields: ['AI 응답 파싱 실패'],
    message: '자기소개서 생성 응답을 해석하지 못했습니다. 입력을 조금 더 구체적으로 작성해 주세요.',
    nextQuestion: '본인이 직접 수행한 역할, 행동, 결과를 한 문단으로 알려주세요.',
  });

  const canGenerate = parsed.canGenerate !== false;
  let content = String(parsed.content || '').trim();

  if (canGenerate && content) {
    content = await expandCoverLetterToLength({
      content,
      lengthRule,
      jobPost,
      baseExperience,
      usableAnswers,
      rejectedAnswers,
      options,
    });
  }

  return {
    canGenerate,
    content,
    missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields : [],
    message: parsed.message || '',
    nextQuestion: parsed.nextQuestion || '',
    lengthInfo: {
      ...lengthRule,
      actualChars: countCharsWithSpaces(content),
    },
  };
}

/**
 * ✅ 추가 질문 생성 (공고 기반, 질문 수 고정 X)
 */
export async function generateFollowupQuestions({ experienceText, companyQuestion }) {
  const system = `
너는 한국어 자기소개서 컨설턴트다.
목표: 채용공고에 맞는 자기소개서를 쓰기 위해 사용자의 실제 경험에서 부족한 근거를 찾는 추가 질문을 만든다.

규칙:
- nextQuestion은 반드시 하나의 질문만 작성한다. 줄바꿈, "그리고", "또한"으로 두 질문을 이어 쓰지 않는다.
- 질문은 6개 이내로 생성한다.
- 사용자가 말하지 않은 기술 경험을 단정하지 않는다.
- 채용공고의 직무 상세, 지원 자격, 우대 사항과 연결되는 질문을 우선한다.
- 질문은 답하기 쉬운 한 문장으로 작성한다.
- category는 아래 중 하나만 사용한다: role, situation, problem, action, tech, metric, reflection
- 반드시 JSON 객체만 응답한다.

{
  "questions": [
    {"id": "q1", "category": "role", "text": "..."}
  ]
}
`.trim();

  const user = `
[채용공고]
${companyQuestion}

[사용자 기본 경험]
${experienceText}
`.trim();

  const resp = await client.chat.completions.create({
    model: 'deepseek-chat',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.2,
  });

  const parsed = safeJsonParse(resp.choices[0]?.message?.content || '{}', { questions: [] });
  const qs = Array.isArray(parsed.questions) ? parsed.questions : [];

  const normalized = qs
    .filter((q) => q?.text)
    .slice(0, 6)
    .map((q, idx) => ({
      id: typeof q.id === 'string' ? q.id : `q${idx + 1}`,
      category: q.category || 'action',
      text: q.text,
    }));

  if (normalized.length) return normalized;

  return [
    {
      id: 'q1',
      category: 'role',
      text: '이 경험에서 본인이 직접 맡았던 역할과 책임은 무엇이었나요?',
    },
    {
      id: 'q2',
      category: 'action',
      text: '문제를 해결하기 위해 본인이 직접 실행한 행동이나 방법은 무엇이었나요?',
    },
    {
      id: 'q3',
      category: 'reflection',
      text: '이 경험을 통해 배운 점이나 지원 직무와 연결되는 강점은 무엇인가요?',
    },
  ];
}

/**
 * ✅ 사용자 답변 품질 평가
 */
export async function evaluateAnswerQuality({
  jobPost,
  baseExperience,
  question,
  answer,
  previousAnswers = [],
  userProfile,
  turnCount = 1,
}) {
  const currentAnswer = String(answer || '').trim();
  const usableCountBefore = getUsableAnswers(previousAnswers).length;

  if (isClearlyNegativeAnswer(currentAnswer)) {
    return {
      usable: false,
      isNegativeAnswer: true,
      score: 0,
      reason: '사용자가 해당 경험을 모른다거나 해본 적 없다고 답했습니다.',
      evidence: null,
      missingFields: ['직접 수행한 역할', '구체적인 행동', '결과 또는 배운 점'],
      shouldAskAgain: true,
      readyToGenerate: false,
      nextQuestion:
        '좋아요. 말씀해주신 내용은 확인했어요. 이제 실제로 해본 경험을 중심으로 조금 더 연결해볼게요. 대신 실제로 해본 수업, 팀 프로젝트, 개인 프로젝트, 아르바이트 경험 중 직무와 조금이라도 연결되는 일이 있었나요?',
    };
  }

  const system = `
너는 자기소개서 근거 검증 담당자다.
사용자의 답변이 자기소개서에 사용할 수 있는 실제 경험 근거인지 평가한다.

[평가 기준]
- usable은 사용자가 직접 한 역할/행동/경험이 확인될 때만 true다.
- 단순히 "열심히 했다", "잘했다", "모르겠다"처럼 근거가 없으면 usable:false다.
- 답변에 없는 기술, 성과, 수치를 절대 추측하지 않는다.
- readyToGenerate는 지금까지 사용 가능한 근거가 충분할 때만 true다.
- 충분한 기준: 역할, 상황/문제, 행동, 결과/배운 점 중 최소 3개가 확인되어야 한다.
- 부족하면 nextQuestion에 다음에 물어볼 질문 1개를 작성한다.
- 반드시 JSON 객체만 반환한다.

{
  "usable": true,
  "isNegativeAnswer": false,
  "score": 0,
  "reason": "평가 이유",
  "evidence": {
    "role": "",
    "situation": "",
    "action": "",
    "result": "",
    "technologies": [],
    "metrics": [],
    "learning": ""
  },
  "missingFields": [],
  "shouldAskAgain": false,
  "readyToGenerate": false,
  "nextQuestion": "다음 질문"
}
`.trim();

  const user = `
[사용자 프로필]
${JSON.stringify(userProfile || {}, null, 2)}

[채용공고]
${jobPost}

[기본 경험]
${baseExperience || '(없음)'}

[이전 답변 평가 결과]
${JSON.stringify(previousAnswers || [], null, 2)}

[현재 질문]
${question || '(없음)'}

[현재 답변]
${currentAnswer}

[현재 질문 차례]
${turnCount}
`.trim();

  const resp = await client.chat.completions.create({
    model: 'deepseek-chat',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.1,
  });

  const parsed = safeJsonParse(resp.choices[0]?.message?.content || '{}', {});
  const evidence = normalizeEvidence(parsed.evidence);
  const evidenceScore = [
    evidence.role,
    evidence.situation,
    evidence.action,
    evidence.result,
    evidence.learning,
    evidence.technologies.length,
    evidence.metrics.length,
  ].filter(Boolean).length;

  const hasAction = Boolean(evidence.action);
  const hasConcreteEvidence = evidenceScore >= 3 && hasAction;
  const usable = parsed.usable === true && hasConcreteEvidence;
  const usableCountAfter = usableCountBefore + (usable ? 1 : 0);

  return {
    usable,
    isNegativeAnswer: parsed.isNegativeAnswer === true,
    score: Number(parsed.score || (usable ? 60 : 20)),
    reason: parsed.reason || (usable ? '자기소개서에 활용 가능한 근거가 일부 확인되었습니다.' : '답변의 구체성이 부족합니다.'),
    evidence: usable ? evidence : null,
    missingFields: Array.isArray(parsed.missingFields) ? parsed.missingFields : [],
    shouldAskAgain: parsed.shouldAskAgain !== false && !usable,
    readyToGenerate: parsed.readyToGenerate === true && usableCountAfter >= 4,
    nextQuestion: sanitizeSingleQuestion(
      parsed.nextQuestion,
      '이 경험에서 본인이 직접 맡은 역할, 실행한 행동, 결과나 배운 점을 조금 더 구체적으로 알려주실 수 있을까요?'
    ),
  };
}

/**
 * ✅ 통과에 필요한 추천 답변 가이드 생성
 */
export async function suggestStrongAnswer({
  jobPost,
  baseExperience,
  question,
  currentInput,
  previousAnswers = [],
  userProfile,
}) {
  const system = `
너는 자기소개서 답변 가이드 작성 도우미다.
사용자가 다음 질문에 답할 때, 자기소개서 근거 평가를 통과하기 좋은 답변 구조를 제안한다.

[절대 규칙]
- 사용자가 말하지 않은 사실, 기술, 성과, 수치를 완성된 사실처럼 만들어내지 않는다.
- 필요한 정보가 없으면 [직접 작성: ...] 형태의 빈칸으로 남긴다.
- 답변에는 역할, 직접 한 행동, 사용 기술, 문제 상황, 결과 또는 배운 점이 자연스럽게 들어가야 한다.
- 사용자가 그대로 복사해도 거짓말이 되지 않도록, 확인되지 않은 부분은 반드시 괄호형 빈칸으로 표시한다.
- 반드시 JSON 객체만 반환한다.

{
  "suggestedAnswer": "추천 답변",
  "checklist": ["이 답변에서 채워야 할 항목"],
  "note": "사용자에게 보여줄 짧은 안내"
}
`.trim();

  const user = `
[사용자 프로필]
${JSON.stringify(userProfile || {}, null, 2)}

[채용공고]
${jobPost || '(없음)'}

[기본 경험]
${baseExperience || '(없음)'}

[이전 답변]
${JSON.stringify(previousAnswers || [], null, 2)}

[현재 질문]
${question || '(없음)'}

[사용자가 현재 입력 중인 답변]
${currentInput || '(없음)'}
`.trim();

  const resp = await client.chat.completions.create({
    model: 'deepseek-chat',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.2,
  });

  const parsed = safeJsonParse(resp.choices[0]?.message?.content || '{}', {});

  const fallbackAnswer = `저는 [직접 작성: 프로젝트명]에서 [직접 작성: 맡은 역할]을 담당했습니다. 이 과정에서 [직접 작성: 구현한 기능 또는 해결한 문제]를 직접 수행했고, [직접 작성: 사용한 기술과 사용 이유]를 활용했습니다. 특히 [직접 작성: 어려웠던 점]을 해결하기 위해 [직접 작성: 내가 한 행동]을 적용했습니다. 그 결과 [직접 작성: 결과 또는 배운 점]을 얻었습니다.`;

  return {
    suggestedAnswer: String(parsed.suggestedAnswer || fallbackAnswer).trim(),
    checklist: Array.isArray(parsed.checklist)
      ? parsed.checklist.filter(Boolean)
      : ['맡은 역할', '직접 구현한 기능', '문제 상황', '해결 행동', '결과 또는 배운 점'],
    note:
      parsed.note ||
      '괄호 안의 빈칸을 본인의 실제 경험으로 바꾼 뒤 보내면, 자기소개서에 사용할 수 있는 근거로 정리하기 쉬워요.',
  };
}


/**
 * ✅ 저장된 자기소개서 전체 글 다듬기
 */
export async function polishResumeText({ title, content, mode = 'professional', targetLength = 800 }) {
  const currentContent = String(content || '').trim();
  const safeTargetLength = Math.max(Number(targetLength) || 800, 500);

  if (!currentContent) {
    return {
      polishedText: '',
      note: '다듬을 자기소개서 내용이 없습니다.',
    };
  }

  const modeGuide = {
    grammar: '오탈자, 어색한 문장, 반복 표현을 교정하되 원문의 분량과 의미를 최대한 유지한다.',
    professional: '자기소개서에 어울리도록 문장을 더 전문적이고 설득력 있게 다듬되, 원문에 없는 경험은 추가하지 않는다.',
    expand: `원문에 있는 사실만 바탕으로 문장 간 연결, 역할 설명, 배운 점, 직무 연결성을 보강한다. 가능하면 공백 포함 ${safeTargetLength}자 이상으로 작성하되, 근거가 부족하면 억지로 늘리지 않는다.`,
  };

  const system = `
너는 한국어 자기소개서 문장 다듬기 전문가다.
사용자가 저장해둔 자기소개서 본문을 더 자연스럽고 설득력 있게 다듬는다.

[절대 규칙]
- 사용자가 원문에 쓰지 않은 경험, 기술, 성과, 수치, 회사명, 프로젝트명을 새로 만들지 않는다.
- 원문의 의미를 바꾸지 않는다.
- 자기소개서 본문만 다듬는다. 마크다운 제목, 번호, 불릿, '#', '*'를 사용하지 않는다.
- 문단은 자연스럽게 나누되, 과하게 짧게 요약하지 않는다.
- mode가 expand일 때도 원문에 있는 사실을 풀어 쓰는 방식으로만 분량을 보강한다.
- 확인되지 않은 정량 성과를 추가하지 않는다.

[반환 형식]
반드시 JSON 객체만 반환한다.
{
  "polishedText": "다듬은 자기소개서 본문",
  "note": "무엇을 다듬었는지 짧은 설명"
}
`.trim();

  const user = `
[제목]
${title || '(제목 없음)'}

[다듬기 모드]
${mode}

[모드 설명]
${modeGuide[mode] || modeGuide.professional}

[목표 글자 수]
${mode === 'expand' ? `공백 포함 ${safeTargetLength}자 이상을 목표로 한다.` : '원문 분량을 크게 줄이지 않는다.'}

[원문 자기소개서]
${currentContent}
`.trim();

  const resp = await client.chat.completions.create({
    model: 'deepseek-chat',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: mode === 'expand' ? 0.25 : 0.18,
  });

  const parsed = safeJsonParse(resp.choices[0]?.message?.content || '{}', {});
  const polishedText = String(parsed.polishedText || '').trim();

  return {
    polishedText: polishedText || currentContent,
    note:
      parsed.note ||
      (mode === 'expand'
        ? '원문에 없는 내용은 추가하지 않고, 문장 연결과 설명을 중심으로 보강했습니다.'
        : '원문에 없는 내용은 추가하지 않고 문장만 자연스럽게 다듬었습니다.'),
  };
}

/**
 * ✅ 사용자 답변 AI 다듬기
 */
export async function improveUserAnswer({ jobPost, baseExperience, question, answer, userProfile }) {
  const currentAnswer = String(answer || '').trim();

  if (!currentAnswer || isClearlyNegativeAnswer(currentAnswer)) {
    return {
      canImprove: false,
      improvedAnswer: '',
      note: '현재 답변은 다듬을 수 있는 실제 경험 정보가 부족합니다. 없는 경험은 만들지 않고, 실제로 해본 내용만 추가로 적어주세요.',
    };
  }

  const system = `
너는 자기소개서 답변 문장 다듬기 도우미다.
사용자의 답변을 더 자연스럽고 구체적인 한국어 문장으로 정리한다.

[절대 규칙]
- 사용자가 말하지 않은 사실, 기술, 수치, 성과를 추가하지 않는다.
- 없는 경험을 만들어내지 않는다.
- 답변의 의미를 바꾸지 않는다.
- 문장은 3~5문장 이내로 정리한다.
- 반드시 JSON 객체만 반환한다.

{
  "canImprove": true,
  "improvedAnswer": "다듬은 답변",
  "note": "어떤 점을 다듬었는지 짧게 설명"
}
`.trim();

  const user = `
[사용자 프로필]
${JSON.stringify(userProfile || {}, null, 2)}

[채용공고]
${jobPost}

[기본 경험]
${baseExperience || '(없음)'}

[질문]
${question || '(없음)'}

[사용자 원문 답변]
${currentAnswer}
`.trim();

  const resp = await client.chat.completions.create({
    model: 'deepseek-chat',
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ],
    temperature: 0.2,
  });

  const parsed = safeJsonParse(resp.choices[0]?.message?.content || '{}', {});

  return {
    canImprove: parsed.canImprove !== false,
    improvedAnswer: String(parsed.improvedAnswer || '').trim(),
    note: parsed.note || '원문에 없는 내용은 추가하지 않고 문장만 다듬었습니다.',
  };
}

/**
 * ✅ 포트폴리오 생성 (전 직군 범용, JSON Mode 적용)
 */
export async function generatePortfolioJson({ userPrompt }) {
  const system = `
너는 사용자의 입력 데이터를 분석하여 해당 직무(마케팅, 기획, 디자인, 영업, 개발 등)를 스스로 파악하고, 그 직무의 최고 전문가이자 포트폴리오 컨설턴트로 빙의한다.
사용자의 거친(Rough) 입력을 바탕으로, 면접관을 사로잡을 수 있는 '문제 해결(Troubleshooting) 중심'의 고급 포트폴리오 데이터를 생성해라.

[필수 규칙]
1. 직무 파악 및 어휘 최적화: 사용자의 직무에 맞는 전문 어휘를 사용해라. (예: 마케팅='ROAS, 퍼널 최적화', 기획='고객 여정, 와이어프레임', 영업='전환율, 파이프라인 구축', 개발='병목 해소, 동기화').
2. 프론트엔드 호환성: JSON 키값은 지정된 영단어(techStack, architectureCode 등)를 그대로 유지하되, 내용은 직무에 맞게 창의적으로 채워라.
   - techStack: 해당 직무의 핵심 툴이나 역량 (예: GA4, Figma, B2B Sales, Excel, React 등)
   - architectureCode: Mermaid.js 문법(graph TD). IT 직군이라면 시스템 아키텍처를, 마케팅/기획/영업 직군이라면 '업무 프로세스', '고객 여정(User Journey)', '세일즈 퍼널(Funnel)', '의사결정 트리' 등을 시각적으로 표현해라.
3. 핵심은 단순 업무 나열이 아니라 **Why(문제/배경) - How(해결책/전략) - Then(성과/결과)** 구조다.
4. 성과(Then)에는 직무에 맞는 정량적인 지표(예: '이탈률 20% 감소', '매출 30% 증가')를 문맥에 맞게 가상으로 생성해라.
5. 반드시 아래 형태의 JSON 객체로만 응답해라:

{
  "profile": {
    "name": "입력 없으면 빈칸",
    "jobTitle": "직무 (예: 퍼포먼스 마케터, 서비스 기획자, Backend Developer 등)",
    "email": "입력 없으면 빈칸",
    "intro": "3~4문장의 매력적인 자기소개 (해당 직무의 강점 중심)"
  },
  "projects": [
      {
        "title": "프로젝트/업무명",
        "period": "기간",
        "summary": "한 줄 요약",
        "techStack": "사용 툴 및 핵심 역량",
        "troubleshootings": [
          {
            "title": "문제 해결/개선 경험 제목",
            "why": "발생한 문제 또는 기회",
            "how": "해결 과정 및 전략",
            "then": "개선된 성과 (정량적 수치 포함)",
            "architectureCode": "Mermaid.js 문법(graph TD). 직무에 맞는 프로세스나 흐름도 작성.",
            "chartData": [
               { "name": "개선 전", "value": 100 },
               { "name": "전략 실행", "value": 150 },
               { "name": "최종 성과", "value": 250 }
            ]
          }
        ]
      }
    ]
  }
  `.trim();

  const user = `[사용자 입력 데이터]\n${userPrompt}`;

  try {
    const resp = await client.chat.completions.create({
      model: 'deepseek-chat',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.5,
    });

    const content = resp.choices[0]?.message?.content?.trim() || '{}';
    return JSON.parse(content);

  } catch (error) {
    console.error('DeepSeek API Error:', error);
    throw new Error('AI 포트폴리오 생성 실패');
  }
}

/**
 * ✅ 역면접 스캐너: 전 직군 범용 서류 기반 압박 질문 생성 (JSON Mode 적용)
 */
export async function generateReverseInterviewAttacks({ documentContent, targetJob }) {
  // 지원 직무가 명시되어 있으면 해당 직무 전문가로, 없으면 '인사 담당 임원'으로 페르소나 설정
  const jobContext = targetJob ? `[${targetJob}] 직무의 최고 전문가이자 실무 면접관` : `깐깐한 최고 인사 담당 임원(CHRO)`;

  const system = `
너는 ${jobContext}이다.
지원자의 서류(자기소개서 또는 포트폴리오)를 분석하여, 논리적 허점, 직무 전문성의 부족함, 또는 압박하기 좋은 약점을 정확히 3가지 찾아내서 날카로운 질문을 던져라.

[조건]
1. 단순한 사실 확인이 아니라 "왜(Why)"와 "어떻게(How)"를 파고드는 압박 질문이어야 한다.
2. 해당 직무에서 가장 중요하게 생각하는 핵심 역량(예: 마케팅-ROI, 기획-기대효과/리스크, 개발-최적화, 영업-클라이언트 설득 논리 등)의 빈틈을 찔러라.
3. 반드시 아래 형태의 JSON 객체로만 응답해라:

{
  "attacks": [
    {
      "type": "EXPERTISE",
      "question": "지원 직무의 전문성, 하드스킬, 또는 툴 활용 능력의 한계를 파고드는 날카로운 질문 (예: 이 방식을 선택한 명확한 기준이 뭔가요? 다른 대안은 없었나요?)"
    },
    {
      "type": "PROBLEM_SOLVING",
      "question": "서류에 기재된 문제 해결 과정에서 논리적 비약이나 리스크(부작용)를 지적하는 압박 질문"
    },
    {
      "type": "IMPACT",
      "question": "기재된 성과나 결과의 실제 기여도를 의심하거나, 수치적 근거의 빈약함을 파고드는 질문"
    }
  ]
}
※ type은 질문의 성격에 맞춰 EXPERTISE, PROBLEM_SOLVING, IMPACT 중 하나로 지정해라.
  `.trim();

  const user = `[지원자 서류 내용]\n${documentContent}`;

  try {
    const resp = await client.chat.completions.create({
      model: 'deepseek-chat',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.6,
    });

    const content = resp.choices[0]?.message?.content?.trim() || '{}';
    const parsed = JSON.parse(content);

    return parsed.attacks || [];

  } catch (error) {
    console.error('DeepSeek Interview API Error:', error);
    throw new Error('AI 압박 질문 생성 실패');
  }
}

/**
 * ✅ 실시간 모의 면접: AI 답변, 모범 답안 및 꼬리 질문 동시 생성 (JSON Mode)
 */
export async function generateInterviewResponseAndFollowUps({ documentContent, currentQuestion, chatContext }) {
  const system = `
너는 지금 면접을 보고 있는 '지원자'이자, 동시에 유저를 돕는 '면접 컨설턴트'다.
면접관(사용자)이 질문을 던지면, 오직 제공된 [지원자 서류 내용]에 있는 팩트만 가지고 대답해라.

[행동 지침]
1. 서류에 관련 내용이 충분하다면: 자신감 있고 논리적으로 대답해라. (isStuttering: false, modelAnswer: "")
2. 서류에 관련 내용이 없거나 부족하다면(예: 치명적 단점, 비용, 실패 경험 등):
   - answer: 서류에 해당 내용이 없다는 것을 명확히 인정하며 당황하는 지원자의 대답을 작성해라. (isStuttering: true)
   - modelAnswer: 면접 컨설턴트의 입장에서 "실제 면접이었다면 이렇게 대답하는 것이 좋습니다" 또는 "이 부분을 서류에 추가하세요"라는 명확하고 실전적인 모범 답안(가이드)을 작성해라.

[꼬리 질문(Follow-ups) 생성 지침]
- 대답이 끝난 직후, 면접관이 이어서 파고들 만한 날카로운 '꼬리 질문' 2개를 만들어라.

반드시 아래 형태의 JSON 객체로만 응답해라:
{
  "answer": "지원자로서의 대답",
  "isStuttering": true 또는 false,
  "modelAnswer": "모범 답안 및 조언 (내용이 충분했다면 빈 문자열로 둬라)",
  "followUps": [
    { "id": "q1", "type": "FOLLOW-UP", "question": "첫 번째 꼬리 질문" },
    { "id": "q2", "type": "FOLLOW-UP", "question": "두 번째 꼬리 질문" }
  ]
}
  `.trim();

  const contextText = chatContext && chatContext.length > 0 
    ? chatContext.map(c => `${c.sender === 'user' ? '면접관' : '지원자'}: ${c.text}`).join('\n')
    : '첫 번째 질문입니다.';

  const user = `
[지원자 서류 내용]
${documentContent}

[이전 대화 맥락]
${contextText}

[면접관의 현재 질문]
${currentQuestion}
  `.trim();

  try {
    const resp = await client.chat.completions.create({
      model: 'deepseek-chat',
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      temperature: 0.6,
    });

    const content = resp.choices[0]?.message?.content?.trim() || '{}';
    return JSON.parse(content);
  } catch (error) {
    console.error('DeepSeek Interview Chat API Error:', error);
    throw new Error('AI 면접 답변 생성 실패');
  }
}

/**
 * ✅ [모든 직군 범용] 포트폴리오 빌더: 3명의 전문가 페르소나 및 단계별 데이터 추출 (JSON Mode)
 */
export async function generateBuilderChatAndExtract({ userInfo, chatContext, currentProjectData, userInput }) {
  
  const contextText = chatContext && chatContext.length > 0 
    ? chatContext.map(c => `${c.sender}: ${c.text}`).join('\n')
    : '대화를 시작해주세요. (안내: 사용자에게 어떤 프로젝트나 경험을 포트폴리오로 작성할지, 예시와 함께 편하게 물어보세요.)';

  const userPrompt = `
[지원자 기본 정보]
${JSON.stringify(userInfo || {})}

[현재까지 작성된 포트폴리오 초안 (빈칸을 확인하세요)]
${JSON.stringify(currentProjectData || {})}

[이전 대화 맥락]
${contextText}

[지원자의 최근 대답]
${userInput}
  `.trim();

  // ------------------------------------------------------------------
  // 🧠 [AI 1번] 대화 및 추천 답변 전용 프롬프트 (간결한 3줄 분량 확보용)
  // ------------------------------------------------------------------
  const chatSystemPrompt = `
너는 포트폴리오 대행사 단톡방 시스템이다. 
[ 🚨 절대 규칙: 사용자가 말하지 않은 내용을 절대로 스스로 지어내지 마라! ]

[ 단톡방 토론 시나리오 - 아래 상태 중 하나를 선택해 진행해라 ]

🔴 상태 A: 대화 진행 중 (데이터가 덜 모였거나, 분량이 짧을 때)
1. 다수 전문가 등장: 매 턴마다 EXPERT, STRATEGY, HR 중 문맥에 맞는 전문가가 **1~2명** 등장하여 분석을 제공해라. (최대 2명으로 제한)
2. 분량 확보 유도 (매우 중요): 사용자의 답변이 너무 짧아 포트폴리오에 2~3줄로 적기 부족하다면, 칭찬과 함께 "이력서에 핵심을 담기 위해, [특정 부분]에 대해 조금만 더 구체적으로 설명해주시겠어요?"라고 유도해라.
3. 시스템 요약 필수: 마지막엔 반드시 SYSTEM이 "요약: [내용]"을 말한 뒤, 부족한 항목이나 분량을 채우기 위한 단 1개의 질문을 던져라.

🟢 상태 B: 대화 종료 (techStack, why, how, then이 모두 파악되었고, 각 항목을 2~3줄 이상 작성할 수 있을 만큼 구체적인 내용이 충분히 모였을 때)
- 분량과 내용이 충분하다면 더 이상 질문하지 마라.
- 전문가 대화와 요약을 모두 생략하고, 즉시 SYSTEM이 아래 멘트만 출력해라.
- "✨ 하나의 완벽한 프로젝트 경험이 완성되었습니다! 우측 캔버스를 확인해 주세요. 추가할 경험이 있다면 상단의 [+ 새 경험 추가]를 눌러주시고, 모두 완료되었다면 [FINISH BUILD]를 눌러주세요."

[응답 포맷 (반드시 JSON)]
경고: 마크다운( \`\`\`json )이나 주석(//) 절대 금지.
{
  "chats": [
    { "speaker": "EXPERT", "message": "칭찬 및 분석 내용" },
    { "speaker": "STRATEGY", "message": "추가 코멘트 (상태 A일 경우 이처럼 전문가를 여러 명 배치해라)" },
    { "speaker": "SYSTEM", "message": "상태 A라면 '요약 + 질문', 상태 B라면 '종료 멘트'" }
  ],
  "suggestions": [ "추천 답변 1", "추천 답변 2" ] 
}
※ 상태 A(진행 중)일 때는 반드시 suggestions에 2개를 작성해라.
※ 상태 B(종료)일 때만 suggestions를 []로 비워라.
  `.trim();

  // ------------------------------------------------------------------
  // 🧠 [AI 2번] 데이터 추출 및 시각화 전용 프롬프트 (핵심 3줄 제한 & 차트 데이터 타입 엄수)
  // ------------------------------------------------------------------
  const extractSystemPrompt = `
너는 포트폴리오 데이터 추출 AI다. 

[ 🚨 데이터 추출 엄격 규칙 (반드시 지킬 것) ]
1. 🛑 수치 및 성과 조작 100% 금지 (가장 중요): 
   - 사용자가 "빨라졌다"라고만 했다면 가짜 숫자를 상상해서 "20% 빨라졌다"고 쓰지 마라.
   - 사용자가 언급하지 않은 도구, 기간, 수치, 성과는 절대 지어내지 마라.
2. 🧱 전문적이고 간결한 서술 (최대 3줄 제한): 
   - 사용자의 짧은 답변을 바탕으로 직무에 맞는 전문 용어를 활용해 문맥을 다듬어라.
   - 단, 불필요한 미사여구나 동어 반복을 빼고, 내용이 있는 항목(why, how, then)은 **핵심만 담은 2~3문장의 간결한 줄글**로 작성해라. (정보가 아예 없다면 빈칸 유지)
3. 🏗️ 아키텍처는 전문가적 추론 100% 허용 (무조건 생성): 
   - 사용자의 'how(해결 전략)' 내용이 짧더라도, 해당 직무의 프로세스를 추론하여 'architectureCode'(graph TD 형식)를 무조건 생성해라. 
   - 🚨 문법 에러 방지(매우 중요): Mermaid 도형 안의 텍스트에는 괄호 (), 더하기 +, 콤마 ,, 콜론 : 등의 특수문자를 절대 사용하지 마라! 오직 한글, 영문, 띄어쓰기만 사용해라.
4. 📊 차트 단일 지표 및 데이터 타입 강제 (에러 방지 핵심!): 
   - 사용자가 '명확한 숫자'를 언급했을 때만 차트 데이터를 생성해라.
   - 여러 수치를 언급해도 가장 핵심적인 '단 1개의 지표'만 선정해라.
   - 시간의 흐름(예: 개선 전 -> 개선 후)에 따른 선형적 논리 순서로 구성해라.
   - 🚨 차트의 'value' 값은 반드시 순수한 숫자(Number) 타입이어야 한다! 문자열("10%"), 단위를 포함한 값("20명")은 절대 불가하다. (예: value: 10)

[응답 포맷 (반드시 JSON)]
경고: 마크다운( \`\`\`json )이나 주석(//) 절대 금지.
{
  "extractedData": {
    "title": "언급된 경우만 작성 (없으면 \"\")",
    "techStack": "언급된 경우만 작성 (없으면 \"\")",
    "why": "팩트 기반으로 최대 3문장의 간결한 줄글 작성 (없으면 \"\")",
    "how": "팩트 기반으로 최대 3문장의 간결한 줄글 작성 (없으면 \"\")",
    "then": "팩트 기반으로 최대 3문장의 간결한 줄글 작성 (없으면 \"\")",
    "architectureCode": "흐름이 파악된 경우 무조건 Mermaid 생성 (없으면 \"\")",
    "chartData": []
  }
}
※ 중요: chartData는 숫자를 명확히 말했을 때만 [{"name":"개선 전","value":10}, {"name":"개선 후","value":50}] 처럼 'value'에 반드시 순수 숫자만 넣고, 수치가 없다면 무조건 빈 배열 [] 상태를 유지해라!
  `.trim();
  
  // 🛡️ JSON 철벽 방어 및 파싱 함수
  const safeParseJSON = (content, fallbackData) => {
    try {
      return JSON.parse(content);
    } catch (initialError) {
      try {
        let cleanText = content.replace(/```json/gi, '').replace(/```/g, '').trim();
        const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
        if (jsonMatch) cleanText = jsonMatch[0];
        cleanText = cleanText.replace(/[\u0000-\u0019]+/g, ""); 
        return JSON.parse(cleanText);
      } catch (parseError) {
        console.error('🚨 JSON 파싱 최종 실패. 복구 불가:', content);
        return fallbackData;
      }
    }
  };

  try {
    // 🚀 [병렬 처리 핵심] 대화 생성(채팅)과 데이터 추출을 동시에 실행합니다.
    const [chatResponse, extractResponse] = await Promise.all([
      client.chat.completions.create({
        model: 'deepseek-chat',
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: chatSystemPrompt }, { role: 'user', content: userPrompt }],
        temperature: 0.2, // 대화는 유연하게
      }),
      client.chat.completions.create({
        model: 'deepseek-chat',
        response_format: { type: 'json_object' },
        messages: [{ role: 'system', content: extractSystemPrompt }, { role: 'user', content: userPrompt }],
        temperature: 0.1, // 데이터 추출은 사실 기반으로 깐깐하게
      })
    ]);

    // 각 응답 내용 가져오기
    let chatContent = chatResponse.choices[0]?.message?.content?.trim() || '{}';
    let extractContent = extractResponse.choices[0]?.message?.content?.trim() || '{}';

    // 안전하게 파싱 (에러 발생 시 Fallback 데이터 제공)
    const parsedChat = safeParseJSON(chatContent, {
      chats: [{ speaker: "SYSTEM", message: "AI가 전문가들의 의견을 취합하는 중 데이터 구조에 오류가 발생했습니다. 조금 더 단순하게 말씀해 주시겠어요?" }],
      suggestions: []
    });
    
    const parsedExtract = safeParseJSON(extractContent, {
      extractedData: currentProjectData || {}
    });

    // ✨ 두 AI의 결과물을 하나로 합쳐서 프론트엔드로 전달
    return {
      chats: parsedChat.chats || [],
      suggestions: parsedChat.suggestions || [],
      extractedData: parsedExtract.extractedData || currentProjectData || {}
    };

  } catch (error) {
    console.error('DeepSeek Builder API Error (Parallel):', error);
    throw new Error('AI 빌더 응답 생성 실패');
  }
}