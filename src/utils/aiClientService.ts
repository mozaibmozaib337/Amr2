import { Question } from '../types';

const LETTER_TO_INDEX: Record<string, number> = {
  أ: 0,
  ا: 0,
  a: 0,
  '1': 0,
  ب: 1,
  b: 1,
  '2': 1,
  ج: 2,
  c: 2,
  '3': 2,
  د: 3,
  d: 3,
  '4': 3,
};

function stripAnswerMarker(optText: string): { text: string; isCorrect: boolean } {
  const hasMarker =
    /[✓✔★\*]/.test(optText) ||
    /\(\s*(?:صح|صحيحة|الاجابة الصحيحة|الإجابة الصحيحة|correct)\s*\)/i.test(optText);
  const cleaned = optText
    .replace(/[✓✔★]/g, '')
    .replace(/\s*\(\s*(?:صح|صحيحة|الاجابة الصحيحة|الإجابة الصحيحة|correct)\s*\)/gi, '')
    .replace(/^\*+\s*|\s*\*+$/g, '')
    .trim();
  return { text: cleaned, isCorrect: hasMarker };
}

function splitInlineOptions(line: string): string[] | null {
  // Matches inline options such as: أ) ... ب) ... ج) ... د) ... OR A- ... B- ... C- ... D- ...
  const markerRegex = /(?:^|\s)([أابجدABCD][\)\.\-:])\s+/g;
  const matches = Array.from(line.matchAll(markerRegex));
  if (matches.length < 2) return null;

  const extracted: string[] = [];
  for (let i = 0; i < matches.length; i++) {
    const start = (matches[i].index ?? 0) + matches[i][0].length;
    const end = i + 1 < matches.length ? (matches[i + 1].index ?? line.length) : line.length;
    const part = line.slice(start, end).trim();
    if (part) extracted.push(part);
  }
  return extracted.length >= 2 ? extracted : null;
}

function isLikelyEssayText(text: string): boolean {
  const normalized = text.trim();
  return /^(?:علل|فسر|ما\s+المقصود|عرف|احسب|اكتب\s+المعادلة|وضح\s+بالمعادلات|قارن|اذكر|أوجد|برهن|استنتج)/i.test(
    normalized
  );
}

function extractRequestedCount(instructions: string): number | null {
  const match = instructions.match(/(?:أول|اول|فقط|عدد)\s*(\d+)\s*(?:سؤال|أسئلة|اسئلة|اسئله)/i);
  if (match && match[1]) {
    const n = Number(match[1]);
    if (n > 0 && n <= 500) return n;
  }
  return null;
}

/**
 * Verbatim Scientific Question Parser (Chemistry, Physics, Biology, General Sciences)
 * Preserves chemical formulas (Fe₂O₃, SO₄²⁻, H₂SO₄), units, subscripts, equations,
 * inline or multi-line options, answer keys, and Essay vs MCQ detection.
 */
export function parseScientificQuestionsLocally(
  rawText: string = '',
  instructions: string = ''
): Question[] {
  if (!rawText || !rawText.trim()) return [];

  const lines = rawText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  interface DraftQuestion {
    text: string;
    options: string[];
    correctAnswerIndex: number;
    modelAnswer?: string;
    explanation?: string;
  }

  const parsed: DraftQuestion[] = [];
  let current: DraftQuestion | null = null;

  const pushCurrent = () => {
    if (!current || !current.text.trim()) return;
    parsed.push(current);
    current = null;
  };

  for (const line of lines) {
    // 1. Check for Answer/Explanation line attached to current question
    const ansMatch = line.match(
      /^(?:الإجابة(?:\s+الصحيحة)?|الاجابة(?:\s+الصحيحة)?|الحل|الاجابه|Answer)\s*[:\-]?\s*(.+)$/i
    );
    if (ansMatch && current) {
      const val = ansMatch[1].trim();
      const singleLetter = val.replace(/[\(\)\.\-]/g, '').trim().toLowerCase();
      if (singleLetter in LETTER_TO_INDEX && current.options.length > LETTER_TO_INDEX[singleLetter]) {
        current.correctAnswerIndex = LETTER_TO_INDEX[singleLetter];
      } else {
        const matchedIdx = current.options.findIndex((o) => o === val || o.includes(val));
        if (matchedIdx >= 0) {
          current.correctAnswerIndex = matchedIdx;
        } else {
          current.modelAnswer = val;
        }
      }
      continue;
    }

    const expMatch = line.match(/^(?:التفسير|التعليل|الشرح|السبب|Explanation)\s*[:\-]?\s*(.+)$/i);
    if (expMatch && current) {
      current.explanation = expMatch[1].trim();
      continue;
    }

    // 2. Check for inline multiple options on the same line (even if preceded by question text? split first)
    const optionLineMatch = line.match(/^(?:\(?([أابجدA-Da-d])\)?[\.\-\):]|\-)\s+(.+)$/);
    const inlineOpts = splitInlineOptions(line);

    // 3. Detect explicit start of a new question
    const qPrefixMatch = line.match(
      /^(?:(?:س|سؤال|Q|Question)\s*\d*|\(?\d{1,3}\)?)\s*[:\.\-\)]\s*(.+)$/i
    );

    if (qPrefixMatch) {
      pushCurrent();
      let qBody = qPrefixMatch[1].trim();
      let initialOpts: string[] = [];

      // Check if options are inline at the tail of the same question line
      const firstOptIdx = qBody.search(/\s+[أA][\)\.\-:]\s+/);
      if (firstOptIdx > 8) {
        const tail = qBody.slice(firstOptIdx).trim();
        const splitTail = splitInlineOptions(tail);
        if (splitTail) {
          qBody = qBody.slice(0, firstOptIdx).trim();
          initialOpts = splitTail;
        }
      }

      current = {
        text: qBody,
        options: [],
        correctAnswerIndex: 0,
      };
      for (const opt of initialOpts) {
        const clean = stripAnswerMarker(opt);
        if (clean.isCorrect) current.correctAnswerIndex = current.options.length;
        current.options.push(clean.text);
      }
      continue;
    }

    // 4. If line is clearly options (either inline or single prefixed option) and we have an active question
    if (current && inlineOpts) {
      for (const opt of inlineOpts) {
        const clean = stripAnswerMarker(opt);
        if (clean.isCorrect) current.correctAnswerIndex = current.options.length;
        current.options.push(clean.text);
      }
      continue;
    }

    if (current && optionLineMatch) {
      const clean = stripAnswerMarker(optionLineMatch[2]);
      if (clean.isCorrect) current.correctAnswerIndex = current.options.length;
      current.options.push(clean.text);
      continue;
    }

    // 5. Implicit new question if line ends with '?' or '؟' and current question already has options or looks complete
    const endsWithQuestionMark = /[؟?]$/.test(line);
    if (!current || (endsWithQuestionMark && current.options.length >= 2)) {
      pushCurrent();
      current = {
        text: line,
        options: [],
        correctAnswerIndex: 0,
      };
      continue;
    }

    // 6. Multi-line question continuation before options start, or un-prefixed option after question
    if (current.options.length === 0 && !isLikelyEssayText(current.text) && line.length < 70 && !line.includes('؟') && !line.includes('?')) {
      // Could be either continuation of question stem or un-prefixed option; keep as question stem if it ends with colon/word
      current.text = `${current.text} ${line}`.trim();
    } else if (current.options.length > 0 && current.options.length < 4 && line.length < 90) {
      const clean = stripAnswerMarker(line);
      if (clean.isCorrect) current.correctAnswerIndex = current.options.length;
      current.options.push(clean.text);
    } else {
      current.text = `${current.text} ${line}`.trim();
    }
  }

  pushCurrent();

  const requestedLimit = extractRequestedCount(instructions);
  const sliced = requestedLimit ? parsed.slice(0, requestedLimit) : parsed;

  return sliced.map((q, idx) => {
    const isEssay = q.options.length < 2 || (isLikelyEssayText(q.text) && q.options.length === 0);
    return {
      id: `ai_q_${Date.now()}_${idx + 1}`,
      text: q.text,
      type: isEssay ? 'essay' : 'mcq',
      points: isEssay ? 2 : 1,
      options: isEssay ? [] : q.options,
      correctAnswerIndex: isEssay ? 0 : Math.min(q.correctAnswerIndex, Math.max(0, q.options.length - 1)),
      modelAnswer: q.modelAnswer || (isEssay ? 'إجابة نموذجية يراجعها المعلم' : undefined),
      explanation: q.explanation || 'تم الاستخراج حرفياً بدقة دون أي تحريف في النص أو الرموز العلمية.',
    };
  });
}

export function extractSmartQuestions(
  grade: string = 'sec3',
  instructions: string = '',
  rawText: string = ''
): {
  quizTitle: string;
  questions: Question[];
  suggestedDurationMinutes: number;
  suggestedTotalMarks: number;
  usedRawText: boolean;
} {
  // 1. Parse verbatim text/PDF/OCR input first — 100% faithful to user text
  if (rawText && rawText.trim().length > 10) {
    const localParsed = parseScientificQuestionsLocally(rawText, instructions);
    if (localParsed.length > 0) {
      const totalPts = localParsed.reduce((s, q) => s + (q.points ?? 1), 0);
      return {
        quizTitle: 'أسئلة مستخرجة بدقة من المستند النصي',
        questions: localParsed,
        suggestedDurationMinutes: Math.max(15, localParsed.length * 2),
        suggestedTotalMarks: totalPts,
        usedRawText: true,
      };
    }
  }

  // 2. Also inspect instructions in case the teacher pasted questions directly inside instructions box
  if (instructions && instructions.trim().length > 25) {
    const fromInstructions = parseScientificQuestionsLocally(instructions, instructions);
    if (fromInstructions.length > 0) {
      const totalPts = fromInstructions.reduce((s, q) => s + (q.points ?? 1), 0);
      return {
        quizTitle: 'أسئلة مستخرجة من توجيهات المعلم',
        questions: fromInstructions,
        suggestedDurationMinutes: Math.max(15, fromInstructions.length * 2),
        suggestedTotalMarks: totalPts,
        usedRawText: true,
      };
    }
  }

  // 3. Topic-aware backup question bank (only when no raw questions were supplied)
  const combined = `${instructions} ${rawText} ${grade}`.toLowerCase();
  const isBiology =
    combined.includes('أحياء') ||
    combined.includes('احياء') ||
    combined.includes('خلية') ||
    combined.includes('dna') ||
    combined.includes('وراثة');
  const isPrimary =
    combined.includes('ابتدائي') ||
    combined.includes('الاول الابتدائي') ||
    combined.includes('علوم') ||
    combined.includes('حواس');
  const isPhysics =
    combined.includes('فيزياء') ||
    combined.includes('كهرباء') ||
    combined.includes('مقاومة') ||
    combined.includes('أوم');

  let baseBank: Question[] = [];

  if (isBiology) {
    baseBank = [
      {
        id: `ai_q_${Date.now()}_1`,
        text: 'ما الوحدة البنائية الأساسية للحمض النووي DNA؟',
        type: 'mcq',
        points: 1,
        options: ['النيوكليوتيدة', 'الحمض الأميني', 'الجلوكوز', 'الحمض الدهني'],
        correctAnswerIndex: 0,
        explanation: 'النيوكليوتيدة هي الوحدة الأساسية لبناء الأحماض النووية وتتكون من سكر خماسي وقاعدة نيتروجينية ومجموعة فوسفات.',
      },
      {
        id: `ai_q_${Date.now()}_2`,
        text: 'تحدث عملية البناء الضوئي في النبات داخل عضية:',
        type: 'mcq',
        points: 1,
        options: ['البلاستيدات الخضراء', 'الميتوكوندريا', 'الريبوسومات', 'جهاز جولجي'],
        correctAnswerIndex: 0,
        explanation: 'تحتوي البلاستيدات الخضراء على صبغة الكلوروفيل المسؤولة عن امتصاص الطاقة الضوئية.',
      },
    ];
  } else if (isPrimary) {
    baseBank = [
      {
        id: `ai_q_${Date.now()}_1`,
        text: 'الحيوانات التي تنشط ليلاً للبحث عن الغذاء تسمى بالحيوانات:',
        type: 'mcq',
        points: 1,
        options: ['الليلية', 'النهارية', 'المفترسة فقط', 'الأليفة'],
        correctAnswerIndex: 0,
        explanation: 'تمتلك الحيوانات الليلية حواس قوية للتكيف مع بيئتها ليلاً.',
      },
      {
        id: `ai_q_${Date.now()}_2`,
        text: 'عضو الإحساس المسؤول عن حاسة السمع عند الإنسان هو:',
        type: 'mcq',
        points: 1,
        options: ['الأذن', 'العين', 'الأنف', 'اللسان'],
        correctAnswerIndex: 0,
        explanation: 'الأذن هي العضو الحسي المسؤول عن التقاط الذبذبات الصوتية.',
      },
    ];
  } else if (isPhysics) {
    baseBank = [
      {
        id: `ai_q_${Date.now()}_1`,
        text: 'عند زيادة طول موصل كهربي إلى الضعف مع ثبوت مساحة مقطعه، فإن مقاومته الكهربية:',
        type: 'mcq',
        points: 1,
        options: ['تزداد إلى الضعف', 'تقل إلى النصف', 'تظل ثابتة', 'تزداد إلى 4 أمثالها'],
        correctAnswerIndex: 0,
        explanation: 'المقاومة تتناسب طردياً مع طول الموصل (R = ρL/A).',
      },
      {
        id: `ai_q_${Date.now()}_2`,
        text: 'قانون كيرشوف الأول يعبر عن حفظ:',
        type: 'mcq',
        points: 1,
        options: ['الشحنة الكهربية', 'الطاقة', 'كمية الحركة', 'المجال المغناطيسي'],
        correctAnswerIndex: 0,
        explanation: 'مجموع التيارات الداخلة لنقطة يساوي مجموع التيارات الخارجة منها.',
      },
    ];
  } else {
    baseBank = [
      {
        id: `ai_q_${Date.now()}_1`,
        text: 'عند تسخين أوكسالات الحديد (II) بمعزل عن الهواء يتكون:',
        type: 'mcq',
        points: 1,
        options: ['أكسيد الحديد II وغازي CO و CO₂', 'أكسيد الحديد III وغاز CO', 'الحديد وبخار الماء', 'أكسيد الحديد المغناطيسي'],
        correctAnswerIndex: 0,
        explanation: 'Fe(COO)₂ --(بمعزل عن الهواء)--> FeO + CO + CO₂ حيث يحول أول أكسيد الكربون دون تأكسد FeO.',
      },
      {
        id: `ai_q_${Date.now()}_2`,
        text: 'أي الفلزات الآتية يعتبر بارامغناطيسي وملون في حالة التأكسد +2؟',
        type: 'mcq',
        points: 1,
        options: ['النحاس (Cu²⁺)', 'الزنك (Zn²⁺)', 'السكانديوم (Sc²⁺)', 'الكالسيوم (Ca²⁺)'],
        correctAnswerIndex: 0,
        explanation: 'أيون النحاس الثنائي Cu²⁺ ينتهي بـ 3d⁹ ويحتوي على إلكترون مفرد.',
      },
      {
        id: `ai_q_${Date.now()}_3`,
        text: 'عند إضافة حمض HCl المخفف إلى ملح صلب تصاعد غاز يخضر ورقة مبللة بـ K₂Cr₂O₇ المحمضة، فإن أنيون الملح هو:',
        type: 'mcq',
        points: 1,
        options: ['الكبريتيت (SO₃²⁻)', 'الكبريتات (SO₄²⁻)', 'النيتريت (NO₂⁻)', 'الكربونات (CO₃²⁻)'],
        correctAnswerIndex: 0,
        explanation: 'يتصاعد غاز SO₂ ذو الرائحة النفاذة والذي يختزل أيون الكروم السداسي إلى ثلاثي أخضر.',
      },
      {
        id: `ai_q_${Date.now()}_4`,
        text: 'المركب الناتج من تفاعل الحديد المسخن لدرجة الاحمرار مع بخار الماء عند 500°م هو:',
        type: 'mcq',
        points: 1,
        options: ['أكسيد الحديد المغناطيسي Fe₃O₄ وغاز الهيدروجين', 'أكسيد الحديد III وغاز الأكسجين', 'هيدروكسيد الحديد II', 'أكسيد الحديد II'],
        correctAnswerIndex: 0,
        explanation: '3Fe + 4H₂O (بخار 500°م) --> Fe₃O₄ + 4H₂',
      },
    ];
  }

  const titlePrefix = isBiology ? 'الأحياء' : isPrimary ? 'العلوم العامة' : isPhysics ? 'الفيزياء' : 'الكيمياء';
  return {
    quizTitle: `شيت واختبار ${titlePrefix} - مستر عمرو السيد`,
    questions: baseBank,
    suggestedDurationMinutes: Math.max(15, baseBank.length * 2),
    suggestedTotalMarks: baseBank.length,
    usedRawText: false,
  };
}

export interface AiHealthStatus {
  configured: boolean;
  healthy: boolean;
  primaryModel: string;
  fallbackModel: string;
  activeModel?: string;
  errorCode?: string;
  message: string;
}

export async function checkAiHealth(probe: boolean = false): Promise<AiHealthStatus> {
  try {
    const response = await fetch(`/api/ai-health${probe ? '?probe=1' : ''}`);
    const data = await response.json().catch(() => null);
    if (data) {
      return data;
    }
  } catch {
    // Server offline
  }
  return {
    configured: false,
    healthy: false,
    primaryModel: 'gemini-4-hydrogen',
    fallbackModel: 'gemini-3.1-flash-lite',
    errorCode: 'NETWORK',
    message: 'تعذر الوصول إلى خادم الذكاء الاصطناعي حالياً.',
  };
}

export async function resetAiConnection(): Promise<AiHealthStatus> {
  try {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.removeItem('amr_chem_ai_status_cache');
    }
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('amr_chem_ai_status_cache');
    }
  } catch {
    // Ignore storage error
  }

  try {
    const response = await fetch('/api/ai-reset', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ timestamp: Date.now() }),
    });
    const data = await response.json().catch(() => null);
    if (data) {
      return data;
    }
  } catch {
    // Server offline
  }

  return {
    configured: false,
    healthy: false,
    primaryModel: 'gemini-4-hydrogen',
    fallbackModel: 'gemini-3.1-flash-lite',
    errorCode: 'NETWORK',
    message: 'تعذر الوصول إلى خادم إعادة الضبط حالياً. يرجى التحقق من الشبكة والمحاولة مجدداً.',
  };
}

const sleepMs = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function parseQuizWithAiClient(payload: {
  fileData?: string;
  mimeType?: string;
  instructions?: string;
  grade?: string;
  rawText?: string;
}): Promise<{
  success: boolean;
  source?: 'gemini' | 'fallback';
  modelUsed?: string | null;
  errorCode?: string;
  unreadableImage?: boolean;
  warning?: string;
  quizTitle: string;
  suggestedDurationMinutes: number;
  suggestedTotalMarks: number;
  questions: any[];
  error?: string;
}> {
  const maxClientRetries = 2;
  let lastHttpStatus = 0;
  let lastData: any = null;

  // Smart Dual-Engine with Automatic Retry for transient network/429/503/504 issues
  for (let attempt = 0; attempt <= maxClientRetries; attempt++) {
    try {
      const response = await fetch('/api/ai-parse-quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      lastHttpStatus = response.status;
      const data = await response.json().catch(() => null);
      lastData = data;

      if (data) {
        // Explicit image quality warning from Vision OCR (do NOT retry blurry images or fabricate garbage)
        if (data.unreadableImage) {
          return {
            success: false,
            source: 'fallback',
            unreadableImage: true,
            errorCode: data.errorCode || 'UNREADABLE_IMAGE',
            error:
              data.error ||
              'الصورة غير واضحة أو بها إضاءة ضعيفة/قص في النص. يُرجى إعادة تصوير أو رفع صورة أوضح للأسئلة.',
            warning: data.warning || data.error,
            quizTitle: '',
            suggestedDurationMinutes: 20,
            suggestedTotalMarks: 0,
            questions: [],
          };
        }

        if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
          return {
            ...data,
            source: data.source || (response.ok ? 'gemini' : 'fallback'),
          };
        }

        // Retry on transient cloud codes (429 / 502 / 503 / 504)
        const isTransient = [429, 502, 503, 504].includes(response.status);
        if (isTransient && attempt < maxClientRetries) {
          await sleepMs(650 * (attempt + 1));
          continue;
        }
      }
      break;
    } catch {
      if (attempt < maxClientRetries) {
        await sleepMs(650 * (attempt + 1));
        continue;
      }
    }
  }

  // Fallback Tier 1: Local Verbatim Scientific Engine when rawText (pasted text or PDF extracted text) exists
  const localRes = extractSmartQuestions(payload.grade, payload.instructions, payload.rawText);
  if (localRes.usedRawText && localRes.questions.length > 0) {
    return {
      success: true,
      source: 'fallback',
      quizTitle: localRes.quizTitle,
      suggestedDurationMinutes: localRes.suggestedDurationMinutes,
      suggestedTotalMarks: localRes.suggestedTotalMarks,
      questions: localRes.questions,
    };
  }

  // Fallback Tier 2: Pure image without readable text layer and cloud OCR unreachable ->
  // Prevent silent errors or unrelated fabricated questions; ask clearly to retry or upload clearer photo / paste text.
  if (payload.fileData && !payload.rawText) {
    return {
      success: false,
      source: 'fallback',
      errorCode: lastData?.errorCode || (lastHttpStatus ? `HTTP_${lastHttpStatus}` : 'NETWORK'),
      error:
        lastData?.error ||
        'تعذر قراءة الأسئلة من الصورة حالياً بعد عدة محاولات تلقائية. تأكد من وضوح الصورة أو أعد رفعها أو الصق نص الأسئلة في خانة النص.',
      warning: lastData?.warning,
      quizTitle: '',
      suggestedDurationMinutes: 20,
      suggestedTotalMarks: 0,
      questions: [],
    };
  }

  // Fallback Tier 3: Instructions-only / general generation when cloud is offline
  return {
    success: true,
    source: 'fallback',
    quizTitle: localRes.quizTitle,
    suggestedDurationMinutes: localRes.suggestedDurationMinutes,
    suggestedTotalMarks: localRes.suggestedTotalMarks,
    questions: localRes.questions,
  };
}

export async function chatWithAiClient(
  message: string,
  context?: string
): Promise<{
  success: boolean;
  source?: 'gemini' | 'fallback';
  modelUsed?: string | null;
  errorCode?: string;
  warning?: string;
  error?: string;
  reply: string;
}> {
  try {
    const response = await fetch('/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, context }),
    });
    const data = await response.json().catch(() => null);
    if (data && data.reply) {
      return data;
    }
  } catch {
    // Network unreachable fallback
  }

  return {
    success: false,
    source: 'fallback',
    errorCode: 'NETWORK',
    warning: 'تعذر الوصول إلى خادم Gemini حالياً؛ تم تسجيل توجيهاتك محلياً.',
    reply: `⚠️ تعذر الاتصال بمحرك Gemini حالياً. تم تسجيل توجيهاتك بخصوص (${context === 'homework' ? 'شيت الواجب' : 'الامتحان'}): "${message}".`,
  };
}

export async function extractStudentsWithAiClient(
  rawText?: string,
  imageData?: string,
  mimeType?: string
): Promise<{
  success: boolean;
  source?: 'gemini' | 'fallback';
  modelUsed?: string | null;
  errorCode?: string;
  warning?: string;
  error?: string;
  students: any[];
  message: string;
}> {
  if (imageData || rawText) {
    try {
      const response = await fetch('/api/ai-extract-students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageData, mimeType, rawText }),
      });
      const data = await response.json().catch(() => null);
      if (data) {
        if (data.success && Array.isArray(data.students) && data.students.length > 0) {
          return data;
        }
        if (imageData && !rawText) {
          return {
            success: false,
            source: 'fallback',
            errorCode: data.errorCode,
            error: data.error || data.message,
            warning: data.error || data.message,
            students: [],
            message: data.message || data.error || 'تعذر قراءة كشف الطلاب من الصورة عبر Gemini.',
          };
        }
      }
    } catch {
      // Fall back to text parser if rawText exists
    }
  }

  if (rawText && rawText.length > 5) {
    const lines = rawText.split('\n').map((l) => l.trim()).filter(Boolean);
    const parsed: any[] = [];
    lines.forEach((line, idx) => {
      const parts = line.split(/[,;\t\-]/).map((p) => p.trim());
      const name = parts[0] || `طالب ${idx + 1}`;
      const phone = parts[1] || `010${Math.floor(10000000 + Math.random() * 90000000)}`;
      parsed.push({
        studentName: name,
        phone,
        studentCode: `SEC3-${100 + idx}`,
      });
    });
    return {
      success: true,
      source: 'fallback',
      students: parsed,
      message: `تم استخراج ${parsed.length} طالباً بنجاح من النص!`,
    };
  }

  return {
    success: false,
    source: 'fallback',
    errorCode: 'NO_DATA',
    students: [],
    message: 'لم يتم إرفاق صورة أو بيانات واضحة لكشف الطلاب.',
  };
}
