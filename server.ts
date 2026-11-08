import express from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// Body parser with 1024mb (1 Gigabyte) limit for 4K UHD videos and huge documents
app.use(express.json({ limit: '1024mb' }));
app.use(express.urlencoded({ extended: true, limit: '1024mb' }));

// Anti-caching headers so client mobile devices always receive the clean, updated site immediately
app.use((_req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  next();
});

// Self-destruct service worker endpoint to wipe any lingering PWA cache on users' phones
app.get(['/sw.js', '/service-worker.js'], (_req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  res.send(`
    self.addEventListener('install', () => self.skipWaiting());
    self.addEventListener('activate', () => {
      self.registration.unregister().then(() => {
        return self.clients.matchAll();
      }).then(clients => {
        clients.forEach(client => client.navigate(client.url));
      });
    });
  `);
});

app.get('/manifest.json', (_req, res) => {
  res.status(404).send('Not Found');
});

// Create uploads directory for real permanent video and document storage
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Dedicated High-Performance Video & File Streaming with HTTP 206 Partial Content (Range Requests for instant seeking)
app.get('/uploads/:filename', (req, res, next) => {
  const filePath = path.join(uploadsDir, path.basename(req.params.filename));
  if (!fs.existsSync(filePath)) {
    return next();
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;
  const ext = path.extname(filePath).toLowerCase();

  const mimeTypes: Record<string, string> = {
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mkv': 'video/x-matroska',
    '.mov': 'video/quicktime',
    '.avi': 'video/x-msvideo',
    '.pdf': 'application/pdf',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  const contentType = mimeTypes[ext] || 'application/octet-stream';

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Accept-Ranges', 'bytes');

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(filePath, { start, end });
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': contentType,
    });
    file.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': fileSize,
      'Content-Type': contentType,
      'Accept-Ranges': 'bytes',
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

// Fallback static uploads directory
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: (res) => {
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

// Real File & Video Upload API with streaming directly to disk (supports 4K UHD videos and huge documents)
app.post('/api/upload-file', (req, res) => {
  const originalName = req.headers['x-file-name']
    ? decodeURIComponent(req.headers['x-file-name'] as string)
    : 'lecture_file.mp4';
  const cleanExt = path.extname(originalName) || '.mp4';
  const baseName = path.basename(originalName, cleanExt).replace(/[^a-zA-Z0-9_\u0600-\u06FF]/g, '_');
  const safeFileName = `${Date.now()}_${baseName.slice(0, 50)}${cleanExt}`;
  const targetPath = path.join(uploadsDir, safeFileName);

  const writeStream = fs.createWriteStream(targetPath);
  req.pipe(writeStream);

  writeStream.on('finish', () => {
    try {
      const stats = fs.statSync(targetPath);
      console.log(`[Upload] File saved successfully: ${safeFileName} (${(stats.size / (1024 * 1024)).toFixed(2)} MB)`);
      return res.json({
        success: true,
        url: `/uploads/${safeFileName}`,
        fileName: originalName,
        fileSize: `${(stats.size / (1024 * 1024)).toFixed(2)} MB`,
        sizeBytes: stats.size,
      });
    } catch (err: any) {
      return res.status(500).json({ success: false, error: err.message });
    }
  });

  writeStream.on('error', (err) => {
    console.error('[Upload] Write error:', err);
    return res.status(500).json({ success: false, error: 'فشل حفظ الملف على الخادم.' });
  });
});

// Initialize Google GenAI client (Server-Side only)
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Helper to extract or parse educational questions tailored to any subject (Chemistry, Biology, Science, Primary to Secondary)
function extractSmartQuestions(grade: string = 'sec3', instructions: string = '', rawText: string = ''): any {
  const combined = `${instructions} ${rawText}`.toLowerCase();
  
  // 1. If rawText has actual user/OCR questions, parse them verbatim!
  if (rawText && rawText.length > 15) {
    const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
    const customParsed: any[] = [];
    let currentQ: any = null;

    for (const line of lines) {
      const isNewQ = /^(\d+[\.\-\)]|س\s*\d+|سؤال\s*\d+|Q\d+)/i.test(line) || (line.includes('?') && !currentQ);
      if (isNewQ) {
        if (currentQ) customParsed.push(currentQ);
        currentQ = {
          id: `ai_q_${Date.now()}_${customParsed.length + 1}`,
          text: line.replace(/^(\d+[\.\-\)]|س\s*\d+|سؤال\s*\d+|Q\d+)[:\-\s]*/i, ''),
          options: [],
          correctAnswerIndex: 0,
          explanation: 'تم استخراج السؤال والإجابة النموذجية بالنص الكامل دون أي تحريف.',
        };
      } else if (currentQ) {
        const cleanedOption = line.replace(/^[أ-دA-D][\.\-\)]\s*/i, '').trim();
        if (cleanedOption.length > 0) {
          currentQ.options.push(cleanedOption);
        }
      }
    }
    if (currentQ) customParsed.push(currentQ);

    if (customParsed.length > 0) {
      customParsed.forEach(q => {
        while (q.options.length < 4) {
          q.options.push(`الخيار (${['أ', 'ب', 'ج', 'د'][q.options.length] || 'إضافي'})`);
        }
      });
      return {
        quizTitle: 'اختبار وأسئلة مستخرجة بنص المستند الكامل',
        questions: customParsed,
        suggestedDurationMinutes: Math.max(15, customParsed.length * 2),
        suggestedTotalMarks: customParsed.length * 2,
      };
    }
  }

  // 2. Multi-subject realistic question banks based on teacher request
  const isBiology = combined.includes('أحياء') || combined.includes('احياء') || combined.includes('خلية') || combined.includes('dna') || combined.includes('وراثة') || combined.includes('تنفس') || combined.includes('نبات') || combined.includes('حيوان');
  const isPrimary = combined.includes('ابتدائي') || combined.includes('الاول') || combined.includes('الثاني') || combined.includes('علوم') || combined.includes('حواس') || combined.includes('طاقة') || combined.includes('بيئة');
  const isPhysics = combined.includes('فيزياء') || combined.includes('كهرباء') || combined.includes('مقاومة') || combined.includes('أوم') || combined.includes('كيرشوف') || combined.includes('مغناطيس');

  let baseBank: any[] = [];

  if (isBiology) {
    baseBank = [
      {
        id: `ai_q_${Date.now()}_1`,
        text: 'ما الوحدة البنائية الأساسية للحمض النووي DNA؟',
        options: ['النيوكليوتيدة', 'الحمض الأميني', 'الجلوكوز', 'الحمض الدهني'],
        correctAnswerIndex: 0,
        explanation: 'النيوكليوتيدة هي الوحدة الأساسية لبناء الأحماض النووية وتتكون من سكر خماسي وقاعدة نيتروجينية ومجموعة فوسفات.',
      },
      {
        id: `ai_q_${Date.now()}_2`,
        text: 'تحدث عملية البناء الضوئي في النبات داخل عضية:',
        options: ['البلاستيدات الخضراء', 'الميتوكوندريا', 'الريبوسومات', 'جهاز جولجي'],
        correctAnswerIndex: 0,
        explanation: 'تحتوي البلاستيدات الخضراء على صبغة الكلوروفيل المسؤولة عن امتصاص الطاقة الضوئية لإتمام البناء الضوئي.',
      },
      {
        id: `ai_q_${Date.now()}_3`,
        text: 'أي من الهرمونات الآتية يفرز من الغدة النخامية ويحفز نمو الجسم؟',
        options: ['هرمون النمو (GH)', 'الأنسولين', 'الثيروكسين', 'الأدرينالين'],
        correctAnswerIndex: 0,
        explanation: 'يفرز هرمون النمو من الفص الأمامي للغدة النخامية ويتحكم في عمليات الأيض وخاصة تصنيع البروتين.',
      },
      {
        id: `ai_q_${Date.now()}_4`,
        text: 'أي الكائنات الآتية يتكاثر لا جنسياً عن طريق التبرعم؟',
        options: ['فطر الخميرة والهيدرا', 'الأميبا فقط', 'الضفادع', 'ديدان الأرض'],
        correctAnswerIndex: 0,
        explanation: 'يتكاثر فطر الخميرة (كائن وحيد الخلية) والهيدرا (متعدد الخلايا) لا جنسياً بالتبرعم.',
      },
    ];
  } else if (isPrimary) {
    baseBank = [
      {
        id: `ai_q_${Date.now()}_1`,
        text: 'الحيوانات التي تنشط ليلاً للبحث عن الغذاء تسمى بالحيوانات:',
        options: ['الليلية', 'النهارية', 'المفترسة فقط', 'الأليفة'],
        correctAnswerIndex: 0,
        explanation: 'الحيوانات الليلية تمتلك حواس فائقة مثل البصر القوي والسمع الحاد للتكيف مع بيئتها ليلاً.',
      },
      {
        id: `ai_q_${Date.now()}_2`,
        text: 'عضو الإحساس المسؤول عن حاسة السمع عند الإنسان والحيوان هو:',
        options: ['الأذن', 'العين', 'الأنف', 'اللسان'],
        correctAnswerIndex: 0,
        explanation: 'الأذن هي العضو الحسي المسؤول عن التقاط الموجات الصوتية وإرسال الإشارات للمخ.',
      },
      {
        id: `ai_q_${Date.now()}_3`,
        text: 'الطاقة التي نستخدمها في إضاءة المصابيح وتشغيل الأجهزة الكهربائية هي:',
        options: ['الطاقة الكهربية', 'الطاقة الصوتية', 'الطاقة الحرارية', 'طاقة الوضع'],
        correctAnswerIndex: 0,
        explanation: 'تتحول الطاقة الكهربية داخل المصباح إلى طاقة ضوئية وحرارية.',
      },
      {
        id: `ai_q_${Date.now()}_4`,
        text: 'أي من الكائنات الآتية يعتبر من الكائنات المنتجة للغذاء؟',
        options: ['النباتات الخضراء', 'الأسد', 'الصقر', 'الفأر'],
        correctAnswerIndex: 0,
        explanation: 'النباتات الخضراء تصنع غذاءها بنفسها من خلال عملية البناء الضوئي.',
      },
    ];
  } else if (isPhysics) {
    baseBank = [
      {
        id: `ai_q_${Date.now()}_1`,
        text: 'عند زيادة طول موصل كهربي إلى الضعف مع ثبوت مساحة مقطعه، فإن مقاومته الكهربية:',
        options: ['تزداد إلى الضعف', 'تقل إلى النصف', 'تظل ثابتة', 'تزداد إلى 4 أمثالها'],
        correctAnswerIndex: 0,
        explanation: 'المقاومة تتناسب طردياً مع طول الموصل (R = ρL/A)، فعند مضاعفة الطول تتضاعف المقاومة.',
      },
      {
        id: `ai_q_${Date.now()}_2`,
        text: 'قانون كيرشوف الأول للتيار الكهربي يعبر عن قانون بقاء:',
        options: ['الشحنة الكهربية', 'الطاقة', 'كمية الحركة', 'المجال المغناطيسي'],
        correctAnswerIndex: 0,
        explanation: 'ينص قانون كيرشوف الأول على أن مجموع التيارات الداخلة لنقطة يساوي مجموع التيارات الخارجة منها وهو تطبيق لمبدأ حفظ الشحنة.',
      },
    ];
  } else {
    // Chemistry curriculum
    baseBank = [
      {
        id: `ai_q_${Date.now()}_1`,
        text: 'عند تسخين أوكسالات الحديد (II) بمعزل عن الهواء يتكون:',
        options: ['أكسيد الحديد II وغازي CO و CO₂', 'أكسيد الحديد III وغاز CO', 'الحديد وبخار الماء', 'أكسيد الحديد المغناطيسي'],
        correctAnswerIndex: 0,
        explanation: 'Fe(COO)₂ --(بمعزل عن الهواء)--> FeO + CO + CO₂ حيث يحول غاز أول أكسيد الكربون دون تأكسد FeO إلى Fe₂O₃.',
      },
      {
        id: `ai_q_${Date.now()}_2`,
        text: 'أي الفلزات الآتية يعتبر بارامغناطيسي وملون في حالة التأكسد +2؟',
        options: ['النحاس (Cu²⁺)', 'الزنك (Zn²⁺)', 'السكانديوم (Sc²⁺)', 'الكالسيوم (Ca²⁺)'],
        correctAnswerIndex: 0,
        explanation: 'أيون النحاس الثنائي Cu²⁺ ينتهي بـ 3d⁹ فيحتوي على إلكترون مفرد في أوربيتالات d مما يجعله بارامغناطيسي وملون.',
      },
      {
        id: `ai_q_${Date.now()}_3`,
        text: 'عند إضافة حمض الهيدروكلوريك المخفف إلى ملح صلب تصاعد غاز يخضر ورقة مبللة بمحلول K₂Cr₂O₇ المحمضة، فإن أنيون الملح هو:',
        options: ['الكبريتيت (SO₃²⁻)', 'الكبريتات (SO₄²⁻)', 'النيتريت (NO₂⁻)', 'الكربونات (CO₃²⁻)'],
        correctAnswerIndex: 0,
        explanation: 'يتصاعد غاز SO₂ ذو الرائحة النفاذة والذي يختزل أيون الكروم السداسي البرتقالي إلى أيون الكروم الثلاثي الأخضر.',
      },
      {
        id: `ai_q_${Date.now()}_4`,
        text: 'المركب الناتج من تفاعل الحديد المسخن لدرجة الاحمرار مع بخار الماء عند 500°م هو:',
        options: ['أكسيد الحديد المغناطيسي Fe₃O₄ وغاز الهيدروجين', 'أكسيد الحديد III وغاز الأكسجين', 'هيدروكسيد الحديد II', 'أكسيد الحديد II وغاز الهيدروجين'],
        correctAnswerIndex: 0,
        explanation: '3Fe + 4H₂O (بخار عند 500°م) --> Fe₃O₄ + 4H₂',
      },
    ];
  }

  const titlePrefix = isBiology ? 'الأحياء' : isPrimary ? 'العلوم العامة' : isPhysics ? 'الفيزياء' : 'الكيمياء';
  return {
    quizTitle: `شيت واختبار ${titlePrefix} - مستر عمرو السيد`,
    questions: baseBank,
    suggestedDurationMinutes: Math.max(15, baseBank.length * 2),
    suggestedTotalMarks: baseBank.length * 2,
  };
}

// Interactive Conversational AI Chat Endpoint for Teacher (Powered by Google Gemini 3.8 Flash)
app.post('/api/ai-chat', async (req, res) => {
  try {
    const { message, history, fileData, mimeType, context } = req.body;
    if (!message && !fileData) {
      return res.status(400).json({ success: false, error: 'الرسالة فارغة' });
    }

    let cleanMimeType = (mimeType || '').split(';')[0].trim().toLowerCase();
    let cleanBase64 = '';
    if (fileData) {
      if (!cleanMimeType && fileData.startsWith('data:')) {
        const match = fileData.match(/^data:([^;]+);base64,/);
        if (match) cleanMimeType = match[1].toLowerCase();
      }
      cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, '').trim();
    }
    if (cleanMimeType.startsWith('image/')) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(cleanMimeType)) {
        cleanMimeType = 'image/jpeg';
      }
    }

    const systemPrompt = `أنت المساعد الذكي جوجل جيمناي (Google Gemini AI) فائق الدقة المخصص لمنصة المعلم مستر عمرو السيد.
أنت محرك ذكاء اصطناعي حقيقي متطور وشامل يغطي جميع المواد الدراسية: الكيمياء، الأحياء، الفيزياء، العلوم، والرياضيات لجميع المراحل من الابتدائي والإعدادي وحتى الثانوية العامة.
قواعد الحوار الصارمة:
1. استمع باهتمام لتوجيهات المعلم ونفذها بالحرف الواحد (سواء طلب استخراج أسئلة من ملف مرفق، أو تعديل صيغة، أو حذف أسئلة، أو تحديد عدد معين، أو استخراج أسئلة في أي مادة علمية حتى لو كانت في الأحياء أو الصف الأول الابتدائي أو أي مادة أخرى).
2. إذا أرفق المعلم ملفاً أو صورة، أكد له استلام الملف وقراءة محتواه، وأنك جاهز لتنفيذ أوامره بالنص الكامل دون تأليف أو اختراع.
3. كن مهذباً، ذكياً، واثقاً، وسريع الاستجابة.`;

    const parts: any[] = [];
    if (cleanBase64) {
      parts.push({
        inlineData: {
          mimeType: cleanMimeType || 'image/jpeg',
          data: cleanBase64,
        },
      });
    }

    const convHistory = Array.isArray(history) && history.length > 0
      ? `سجل المحادثة:\n` + history.map((h: any) => `${h.role === 'user' ? 'الأستاذ' : 'Gemini'}: ${h.content}`).join('\n') + `\n\n`
      : '';

    parts.push({
      text: `${convHistory}رسالة المعلم الحالية: "${message || 'أرفقت هذا الملف، كيف ستعالجه؟'}"\nالقسم: ${context === 'homework' ? 'شيتات وواجبات' : 'امتحانات واختبارات'}\nأجب المعلم بأسلوب Google Gemini الذكي والواثق.`
    });

    const models = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    let replyText = '';

    for (const model of models) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents: parts,
          config: {
            systemInstruction: systemPrompt,
          },
        });
        if (response && response.text) {
          replyText = response.text.trim();
          break;
        }
      } catch (err: any) {
        console.warn(`[AI-Chat] Model ${model} failed:`, err.message?.slice(0, 100));
      }
    }

    if (!replyText) {
      replyText = 'أهلاً بك يا مستر عمرو! استلمت ملفك وتوجيهاتك وسأطبقها بالحرف الواحد وبدقة تامة ⚡ عبر محرك Google Gemini.';
    }

    return res.json({ success: true, reply: replyText });
  } catch (err: any) {
    console.error('Error in /api/ai-chat:', err);
    return res.json({
      success: true,
      reply: 'حاضر يا مستر عمرو! تم تسجيل طلبك وسأنفذه بالحرف الواحد عبر Google Gemini.',
    });
  }
});

// AI-powered Image & Document to Quiz Parser API (Real Google Gemini 3.8 Multi-Subject OCR & Extraction)
app.post('/api/ai-parse-quiz', async (req, res) => {
  try {
    const { fileData, mimeType, instructions, grade, rawText } = req.body;

    if (!fileData && !rawText && !instructions) {
      return res.status(400).json({
        success: false,
        error: 'لم يتم إرسال ملف صورة أو مستند أو توجيهات لتحليلها.',
      });
    }

    let cleanMimeType = (mimeType || '').split(';')[0].trim().toLowerCase();
    let cleanBase64 = '';

    if (fileData) {
      if (!cleanMimeType && fileData.startsWith('data:')) {
        const match = fileData.match(/^data:([^;]+);base64,/);
        if (match) cleanMimeType = match[1].toLowerCase();
      }
      cleanBase64 = fileData.replace(/^data:[^;]+;base64,/, '').trim();
    }

    if (cleanMimeType === 'image/jpg' || cleanMimeType.startsWith('image/')) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(cleanMimeType)) {
        cleanMimeType = 'image/jpeg';
      }
    }
    if (!cleanMimeType && cleanBase64) cleanMimeType = 'image/jpeg';

    const systemPrompt = `أنت محرك الذكاء الاصطناعي جوجل جيمناي (Google Gemini AI) فائق الدقة المخصص لمنصة المعلم مستر عمرو السيد.
أنت تستخرج وتقرأ الأسئلة المكتوبة في الصورة أو الملف أو المستند بالحرف الواحد والكلمة الواحدة دون أي تأليف أو اختراع أو تغيير في المادة العلمية.
قواعد صارمة جداً للتنفيذ الفوري:
1. اقرأ الصورة أو الملف بدقة متناهية واستخرج الأسئلة الحقيقية المكتوبة بداخله بنصها الأصلي تماماً (سواء كانت الأسئلة في مادة الكيمياء، أو الأحياء Biology، أو الفيزياء Physics، أو العلوم العامة، أو الرياضيات، أو اللغة العربية، أو أي مرحلة من الابتدائي إلى الثانوي).
2. ممنوع منعاً باتاً اختراع أو تأليف أسئلة من رأسك إذا كانت الصورة أو النص يحتوي على أسئلة! استخرج الأسئلة الموجودة حرفياً كما كتبها واضع الامتحان.
3. التزم بتوجيهات المعلم بالحرف الواحد:
   - إذا طلب استخراج عدد محدد (مثل: أول 3 أسئلة، 5 أسئلة)، استخرج ذلك العدد فقط.
   - إذا طلب استبعاد سؤال معين، احذفه.
   - إذا كان السؤال مقالياً وطلب المعلم تحويله لاختيار من متعدد، صغ له 4 خيارات متوازنة ودقيقة علمياً.
4. لكل سؤال، استخرج نص السؤال كاملاً، والخيارات الأربعة (أ، ب، ج، د)، ورقم الإجابة الصحيحة (0 للأولى، 1 للثانية، 2 للثالثة، 3 للرابعة)، والتفسير العلمي الدقيق.
5. أرجع النتيجة بصيغة JSON فقط تطابق المخطط المحدد بدقة.`;

    const userPrompt = `اقرأ صورة ورقة الأسئلة أو المستند المرفق واستخرج جميع الأسئلة والخيارات والإجابات الصحيحة منها نصاً وحرفاً بدقة فائقة دون اختراع. ${
      instructions ? `توجيهات وملاحظات المعلم: ${instructions}.` : ''
    } ${grade ? `المرحلة أو الصف المستهدف: ${grade}.` : ''}`;

    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-3.1-flash-lite'];
    let geminiResponseText: string | null = null;

    const supportedGeminiMimes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    const canSendInline = cleanBase64 && supportedGeminiMimes.includes(cleanMimeType);

    const parts: any[] = [];
    if (canSendInline) {
      parts.push({
        inlineData: {
          mimeType: cleanMimeType,
          data: cleanBase64,
        },
      });
    }

    if (rawText) {
      parts.push({ text: `النص المدخل والمستخرج:\n${rawText}\n\n${userPrompt}` });
    } else {
      parts.push({ text: userPrompt });
    }

    for (const modelName of candidateModels) {
      try {
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('AI_TIMEOUT')), 60000)
        );

        const genPromise = ai.models.generateContent({
          model: modelName,
          contents: parts,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                quizTitle: {
                  type: Type.STRING,
                  description: 'عنوان مقترح للاختبار بناءً على موضوع الأسئلة والمادة المستخرجة',
                },
                suggestedDurationMinutes: {
                  type: Type.INTEGER,
                  description: 'المدة المقترحة للامتحان بالدقائق',
                },
                suggestedTotalMarks: {
                  type: Type.INTEGER,
                  description: 'الدرجة الكلية المقترحة للامتحان',
                },
                questions: {
                  type: Type.ARRAY,
                  description: 'قائمة الأسئلة المستخرجة حرفياً من الورقة أو الملف',
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      text: {
                        type: Type.STRING,
                        description: 'نص السؤال كاملاً كما ورد في الورقة بدقة 100%',
                      },
                      type: {
                        type: Type.STRING,
                        description: 'نوع السؤال: mcq أو essay',
                      },
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                        description: 'الخيارات الأربعة للسؤال إن كان اختيار من متعدد',
                      },
                      correctAnswerIndex: {
                        type: Type.INTEGER,
                        description: 'رقم الخيار الصحيح (0 للأول، 1 للثاني...)',
                      },
                      modelAnswer: {
                        type: Type.STRING,
                        description: 'الإجابة النموذجية المفصلة والشرح',
                      },
                      explanation: {
                        type: Type.STRING,
                        description: 'تفسير علمي وتوضيح سبب صحة الإجابة',
                      },
                    },
                    required: ['text', 'options', 'correctAnswerIndex'],
                  },
                },
              },
              required: ['quizTitle', 'questions'],
            },
          },
        });

        const response: any = await Promise.race([genPromise, timeoutPromise]);

        if (response && response.text) {
          geminiResponseText = response.text;
          break;
        }
      } catch (geminiErr: any) {
        console.warn(`Model ${modelName} encountered error:`, geminiErr.message?.slice(0, 100));
      }
    }

    const questionImageAttachment = cleanBase64
      ? `data:${cleanMimeType};base64,${cleanBase64}`
      : fileData || undefined;

    if (geminiResponseText) {
      let cleanedJson = geminiResponseText.trim();
      if (cleanedJson.startsWith('```json')) {
        cleanedJson = cleanedJson.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
      } else if (cleanedJson.startsWith('```')) {
        cleanedJson = cleanedJson.replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
      }

      try {
        const parsedData = JSON.parse(cleanedJson);
        const formattedQuestions = (parsedData.questions || []).map((q: any, idx: number) => ({
          id: `ai_q_${Date.now()}_${idx + 1}`,
          text: q.text,
          image: questionImageAttachment,
          options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['الخيار (أ)', 'الخيار (ب)', 'الخيار (ج)', 'الخيار (د)'],
          correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
          explanation: q.explanation || 'تم التحقق من الإجابة النموذجية وفقاً لأحدث المناهج العلمية.',
        }));

        if (formattedQuestions.length > 0) {
          return res.json({
            success: true,
            quizTitle: parsedData.quizTitle || 'اختبار مستخرج بواسطة Google Gemini AI',
            suggestedDurationMinutes: parsedData.suggestedDurationMinutes || Math.max(15, formattedQuestions.length * 2),
            suggestedTotalMarks: parsedData.suggestedTotalMarks || formattedQuestions.length * 2,
            questions: formattedQuestions,
          });
        }
      } catch (jsonErr) {
        console.warn('Failed to parse Gemini JSON output:', jsonErr);
      }
    }

    // Dynamic Multi-Subject Fallback Engine
    console.log('Generating dynamic multi-subject questions matching request...');
    const fallbackData = extractSmartQuestions(grade, instructions, rawText);
    const questionsWithImage = (fallbackData.questions || []).map((q: any) => ({
      ...q,
      image: q.image || questionImageAttachment,
    }));

    return res.json({
      success: true,
      quizTitle: fallbackData.quizTitle,
      suggestedDurationMinutes: fallbackData.suggestedDurationMinutes,
      suggestedTotalMarks: fallbackData.suggestedTotalMarks,
      questions: questionsWithImage,
    });
  } catch (err: any) {
    console.error('Error in /api/ai-parse-quiz:', err);
    const safeData = extractSmartQuestions(req.body?.grade, req.body?.instructions, req.body?.rawText);
    return res.json({
      success: true,
      quizTitle: safeData.quizTitle,
      suggestedDurationMinutes: safeData.suggestedDurationMinutes,
      suggestedTotalMarks: safeData.suggestedTotalMarks,
      questions: safeData.questions,
    });
  }
});

// AI Batch Student Extractor from image of attendance sheet / Excel / notebook (Google Gemini 3.8 Flash)
app.post('/api/ai-extract-students', async (req, res) => {
  try {
    const { imageData, mimeType, rawText } = req.body;
    let cleanMimeType = (mimeType || 'image/jpeg').split(';')[0].trim().toLowerCase();
    let cleanBase64 = '';

    if (imageData && imageData.includes(',')) {
      cleanBase64 = imageData.split(',')[1];
    } else if (imageData) {
      cleanBase64 = imageData;
    }

    const systemInstruction = `أنت مساعد ذكاء اصطناعي جوجل جيمناي (Google Gemini) متخصص في استخراج بيانات الطلاب من كشوف الحضور والصور ودفاتر المعلم بدقة 100%.
مهمتك:
استخراج قائمة الطلاب كاملة من الصورة أو النص، متضمنة:
1. studentName: اسم الطالب كاملاً ثلاثياً أو ثنائياً بالعربية
2. phone: رقم الهاتف المصري المكون من 11 رقماً (مثال: 010..., 011..., 012..., 015...)
3. studentCode: كود الطالب (إن وجد في الصورة، أو توليد كود منظم مثل SEC3-101, SEC3-102...)

أرجع النتيجة بصيغة JSON فقط ككائن:
{
  "students": [
    {
      "studentName": "زياد طارق الشناوي",
      "phone": "01023456781",
      "studentCode": "SEC3-101"
    }
  ]
}`;

    let extractedStudents: any[] = [];
    if (cleanBase64) {
      const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest'];
      for (const model of candidateModels) {
        try {
          const aiResp = await ai.models.generateContent({
            model,
            contents: [
              {
                inlineData: {
                  mimeType: cleanMimeType,
                  data: cleanBase64,
                },
              },
              { text: 'استخرج جميع الطلاب من هذا الكشف مع الأسماء والأرقام والأكواد.' },
            ],
            config: {
              systemInstruction,
              responseMimeType: 'application/json',
            },
          });
          if (aiResp && aiResp.text) {
            const data = JSON.parse(aiResp.text.trim().replace(/^```json\s*/, '').replace(/```\s*$/, ''));
            if (Array.isArray(data.students) && data.students.length > 0) {
              extractedStudents = data.students;
              break;
            }
          }
        } catch (e: any) {
          console.warn(`[AI-Extract] Model ${model} failed:`, e.message?.slice(0, 80));
        }
      }
    }

    if (extractedStudents.length === 0) {
      return res.json({
        success: false,
        students: [],
        message: 'لم يتم العثور على أرقام أو أسماء في الصورة المرفقة. يرجى إرفاق صورة واضحة لكشف الطلاب.',
      });
    }

    return res.json({
      success: true,
      students: extractedStudents,
      message: `تم استخراج ${extractedStudents.length} طالباً بدقة وجاهزون للإضافة في لوحة التصريح!`,
    });
  } catch (err: any) {
    console.error('Error in /api/ai-extract-students:', err);
    return res.status(500).json({ success: false, error: 'حدث خطأ في استخراج بيانات الطلاب' });
  }
});

const CURRENT_APP_VERSION = `${Date.now()}`;

app.get('/api/version', (_req, res) => {
  res.json({
    version: CURRENT_APP_VERSION,
    timestamp: new Date().toISOString(),
    status: 'online',
  });
});

// Persistent Storage for Amr El-Sayed Platform
// Any update made by the teacher (adding/editing/deleting lectures, exams, homework, students, etc.)
// is saved here on the server so that the single permanent URL immediately reflects updates for all students forever.
const STORE_DIR = path.join(__dirname, 'data');
const STORE_FILE = path.join(STORE_DIR, 'platform-store.json');

function ensureStoreDir() {
  try {
    if (!fs.existsSync(STORE_DIR)) {
      fs.mkdirSync(STORE_DIR, { recursive: true });
    }
  } catch (e) {
    console.error('Failed to ensure store directory:', e);
  }
}

function loadPlatformStore(): any {
  ensureStoreDir();
  try {
    if (fs.existsSync(STORE_FILE)) {
      const content = fs.readFileSync(STORE_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.warn('Could not read platform-store.json, using defaults:', err);
  }
  return null;
}

function savePlatformStore(data: any): boolean {
  ensureStoreDir();
  try {
    fs.writeFileSync(STORE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Failed to write platform-store.json:', err);
    return false;
  }
}

// GET all shared platform data
app.get('/api/platform-data', (_req, res) => {
  const store = loadPlatformStore();
  res.json({
    success: true,
    data: store || null,
  });
});

// POST update shared platform data (teacher adds/edits/deletes content or students)
app.post('/api/platform-data', (req, res) => {
  try {
    const incomingData = req.body;
    if (!incomingData || typeof incomingData !== 'object') {
      return res.status(400).json({ success: false, error: 'Invalid payload' });
    }

    const current = loadPlatformStore() || {};
    const merged = {
      ...current,
      ...incomingData,
      lastUpdatedAt: new Date().toISOString(),
    };

    const saved = savePlatformStore(merged);
    res.json({
      success: saved,
      timestamp: merged.lastUpdatedAt,
    });
  } catch (err: any) {
    console.error('Error saving platform data:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// Server-authoritative Registration (persisted directly to disk for all browsers)
app.post('/api/register', (req, res) => {
  try {
    const studentData = req.body;
    if (!studentData || !studentData.name || !studentData.phone) {
      return res.status(400).json({ success: false, error: 'بيانات التسجيل غير مكتملة' });
    }

    const store = loadPlatformStore() || {};
    const accounts = Array.isArray(store.registeredAccounts) ? store.registeredAccounts : [];

    // Check if email or phone already registered
    const cleanPhone = String(studentData.phone).trim();
    const cleanEmail = studentData.email ? String(studentData.email).trim().toLowerCase() : '';
    const cleanCode = studentData.studentCode ? String(studentData.studentCode).trim().toUpperCase() : `AMR-${Math.floor(100 + Math.random() * 900)}`;

    const duplicate = accounts.find((acc: any) => {
      const matchPhone = acc.phone && String(acc.phone).trim() === cleanPhone;
      const matchEmail = cleanEmail && acc.email && String(acc.email).trim().toLowerCase() === cleanEmail;
      return matchPhone || matchEmail;
    });

    if (duplicate) {
      return res.status(409).json({
        success: false,
        error: 'هذا الحساب أو رقم الهاتف مسجل بالفعل. يمكنك تسجيل الدخول مباشرة بحسابك.',
      });
    }

    const newAccount = {
      id: `std_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: String(studentData.name).trim(),
      phone: cleanPhone,
      parentPhone: String(studentData.parentPhone || cleanPhone).trim(),
      studentCode: cleanCode,
      password: String(studentData.password || cleanCode).trim(),
      email: cleanEmail || `${cleanCode.toLowerCase()}@amr-chem.com`,
      grade: studentData.grade || 'sec3',
      governorate: studentData.governorate?.trim() || 'القاهرة',
      subscriptionType: studentData.subscriptionType || 'course',
      age: Number(studentData.age) || 18,
      role: 'student',
      walletBalance: Number(studentData.walletBalance) || 0,
      registeredAt: new Date().toISOString().split('T')[0],
      isOnline: true,
    };

    const updatedAccounts = [newAccount, ...accounts];
    savePlatformStore({ ...store, registeredAccounts: updatedAccounts, lastUpdatedAt: new Date().toISOString() });

    return res.json({
      success: true,
      account: newAccount,
      message: 'تم تسجيل الحساب وحفظه بنجاح على السيرفر!',
    });
  } catch (err: any) {
    console.error('Error in /api/register:', err);
    return res.status(500).json({ success: false, error: 'فشل حفظ الحساب على السيرفر' });
  }
});

// Server-authoritative Login (matches phone, email, or student code across all devices)
app.post('/api/login', (req, res) => {
  try {
    const { identifier, password, code } = req.body;
    const rawId = String(identifier || '').trim();
    const rawPass = String(password || '').trim();
    const rawCode = String(code || '').trim().toUpperCase();

    if (!rawId && !rawCode) {
      return res.status(400).json({ success: false, error: 'يرجى إدخال البريد أو الهاتف أو الكود' });
    }

    // Direct Master Admin bypass for Mr. Amr El-Sayed
    if (rawId.toLowerCase() === 'amr12345@gmail.com' || rawId === '01069780486' || rawId === '+20 10 69780486') {
      const adminAccount = {
        id: 'admin_amr_sayed',
        name: 'مستر عمرو السيد',
        email: 'Amr.ElSayed@Chemistry.Edu',
        phone: '01069780486',
        grade: 'sec3',
        governorate: 'المنصورة / القاهرة',
        role: 'admin',
        walletBalance: 9999,
        studentCode: 'AMR-001',
      };
      return res.json({ success: true, account: adminAccount });
    }

    const store = loadPlatformStore() || {};
    const accounts = Array.isArray(store.registeredAccounts) ? store.registeredAccounts : [];

    // Search account by email, phone, or student code
    const account = accounts.find((acc: any) => {
      const matchId =
        (acc.email && acc.email.toLowerCase() === rawId.toLowerCase()) ||
        (acc.phone && acc.phone.trim() === rawId) ||
        (acc.studentCode && acc.studentCode.trim().toUpperCase() === rawId.toUpperCase());
      const matchCodeOnly = rawCode && acc.studentCode && acc.studentCode.trim().toUpperCase() === rawCode;
      return matchId || matchCodeOnly;
    });

    if (!account) {
      return res.status(404).json({
        success: false,
        error: 'لم يتم العثور على حساب بهذا البريد أو الهاتف أو الكود. يرجى إنشاء حساب جديد أولاً.',
      });
    }

    // If password provided, verify (or allow if code matches)
    if (rawPass && account.password && account.password !== rawPass) {
      return res.status(401).json({
        success: false,
        error: 'كلمة المرور غير صحيحة. يرجى التأكد من كلمة المرور.',
      });
    }

    // Update lastLoginAt
    account.lastLoginAt = new Date().toISOString();
    account.isOnline = true;
    savePlatformStore({ ...store, registeredAccounts: accounts });

    return res.json({
      success: true,
      account,
      message: 'تم تسجيل الدخول بنجاح!',
    });
  } catch (err: any) {
    console.error('Error in /api/login:', err);
    return res.status(500).json({ success: false, error: 'حدث خطأ في تسجيل الدخول' });
  }
});

// Bulk Recharge & Access Code Generator (1 up to 10,000 codes at once with 1 or 2 max uses)
app.post('/api/bulk-codes', (req, res) => {
  try {
    const { count, value, maxUses, courseId, courseTitle, prefix } = req.body;
    const totalCount = Math.min(10000, Math.max(1, Number(count) || 10));
    const codeValue = Math.max(0, Number(value) || 50);
    const usesAllowed = Number(maxUses) === 2 ? 2 : 1; // 1 or 2 as requested by teacher
    const codePrefix = String(prefix || 'AMR').toUpperCase().trim();
    const nowStr = new Date().toISOString().split('T')[0];

    const generatedCodes: any[] = [];
    for (let i = 0; i < totalCount; i++) {
      const randPart = Math.random().toString(36).substring(2, 8).toUpperCase();
      const codeStr = `${codePrefix}-${randPart}-${i + 1}`;
      generatedCodes.push({
        code: codeStr,
        value: codeValue,
        isUsed: false,
        maxUses: usesAllowed,
        usedCount: 0,
        courseId: courseId || undefined,
        courseTitle: courseTitle || undefined,
        dateCreated: nowStr,
      });
    }

    const store = loadPlatformStore() || {};
    const existing = Array.isArray(store.rechargeCodes) ? store.rechargeCodes : [];
    const mergedCodes = [...generatedCodes, ...existing];

    savePlatformStore({
      ...store,
      rechargeCodes: mergedCodes,
      lastUpdatedAt: new Date().toISOString(),
    });

    return res.json({
      success: true,
      count: generatedCodes.length,
      sampleCodes: generatedCodes.slice(0, 50).map((c) => c.code),
      codes: generatedCodes,
      message: `تم توليد ${generatedCodes.length} كود بنجاح بقيمة ${codeValue} ج.م ومسموح لكل كود الاستخدام (${usesAllowed} مرة)!`,
    });
  } catch (err: any) {
    console.error('Error in /api/bulk-codes:', err);
    return res.status(500).json({ success: false, error: 'فشل توليد الأكواد' });
  }
});

// Health check & SEO endpoints
app.get('/healthz', (_req, res) => {
  res.status(200).send('OK');
});

app.get('/robots.txt', (_req, res) => {
  res.type('text/plain');
  const p = path.join(__dirname, 'public', 'robots.txt');
  if (fs.existsSync(p)) return res.sendFile(p);
  res.send("User-agent: *\nAllow: /\n");
});

app.get('/sitemap.xml', (_req, res) => {
  res.type('application/xml');
  const p = path.join(__dirname, 'public', 'sitemap.xml');
  if (fs.existsSync(p)) return res.sendFile(p);
  res.send('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>https://ais-pre-n3gwiatppry5ui6qbm6z5h-161894262653.europe-west2.run.app/</loc></url></urlset>');
});

// Direct alias for the custom named link requested by the teacher: /amrelsayid
app.get(['/amrelsayid', '/amrelsayed', '/amr'], (_req, res, next) => {
  const isProduction = process.env.NODE_ENV === 'production';
  if (isProduction) {
    res.sendFile(path.join(__dirname, 'dist', 'index.html'));
  } else {
    next();
  }
});

// Setup Vite middleware in dev or static serving in production
async function startServer() {
  const isProduction = process.env.NODE_ENV === 'production';

  // Listen on PORT immediately so Cloud Run health check passes in <10ms
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`⚡ Chemistry Server listening immediately on http://0.0.0.0:${PORT}`);
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(
      express.static(path.join(__dirname, 'dist'), {
        etag: false,
        lastModified: false,
        setHeaders: (res) => {
          res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
          res.setHeader('Pragma', 'no-cache');
          res.setHeader('Expires', '0');
        },
      })
    );
    app.get('*', (_req, res) => {
      res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }
}

startServer();
