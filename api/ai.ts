import { GoogleGenAI, Type } from '@google/genai';

export const config = { maxDuration: 60 };

const PRIMARY = 'gemini-4-hydrogen';
const FALLBACK = 'gemini-3.1-flash-lite';

function getClient() {
  const k = (process.env.GEMINI_API_KEY || '').trim();
  if (!k || k === 'MY_GEMINI_API_KEY' || k === 'your_api_key_here') return null;
  return new GoogleGenAI({ apiKey: k });
}

function classify(e: any) {
  const raw = String(e?.message || e || '');
  const low = raw.toLowerCase();
  const st = Number(e?.status || e?.code || 0);
  if (low.includes('missing_key'))
    return { code: 'MISSING_KEY', http: 503, retry: false, msg: 'مفتاح GEMINI_API_KEY غير مضبوط في Vercel.' };
  if (st === 401 || st === 403 || low.includes('api key not valid') || low.includes('api_key_invalid') || low.includes('permission'))
    return { code: 'INVALID_KEY', http: 403, retry: false, msg: 'مفتاح Gemini غير صالح أو منتهي.' };
  if (st === 429 || low.includes('quota') || low.includes('resource_exhausted'))
    return { code: 'QUOTA_EXCEEDED', http: 429, retry: true, msg: 'تم تجاوز حد الطلبات مؤقتاً، حاول بعد قليل.' };
  if (st === 404 || low.includes('not_found'))
    return { code: 'MODEL_NOT_FOUND', http: 404, retry: false, msg: 'النموذج غير متاح.' };
  if (st >= 500 || low.includes('unavailable') || low.includes('overloaded') || low.includes('fetch failed'))
    return { code: 'TRANSIENT', http: 503, retry: true, msg: 'خوادم Gemini مشغولة مؤقتاً، حاول بعد لحظات.' };
  return { code: 'UNKNOWN', http: 500, retry: false, msg: raw || 'تعذر إكمال الطلب.' };
}

async function gen(client: GoogleGenAI, contents: any, config?: any) {
  let last: any = null;
  for (const model of [PRIMARY, FALLBACK]) {
    for (let a = 0; a < 2; a++) {
      try {
        const r: any = await client.models.generateContent({ model, contents, config });
        const text = (r?.text || '').trim();
        if (text) return { text, model, err: null as any };
        last = classify('empty response');
        break;
      } catch (e) {
        last = classify(e);
        if (last.code === 'INVALID_KEY') return { text: null, model: null, err: last };
        if (!last.retry) break;
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
  }
  return { text: null, model: null, err: last };
}

function cleanB64(s: string) {
  return String(s || '').replace(/^data:[^;]+;base64,/, '').trim();
}

function stripJson(t: string) {
  return t.trim().replace(/^```json\s*/, '').replace(/^```\s*/, '').replace(/```\s*$/, '').trim();
}

export default async function handler(req: any, res: any) {
  const action = String(req.query.action || '');
  try {
    const client = getClient();
    const b = req.body || {};

    // ---------- health ----------
    if (action === 'ai-health') {
      if (!client)
        return res.json({ configured: false, healthy: false, errorCode: 'MISSING_KEY', primaryModel: PRIMARY, fallbackModel: FALLBACK, message: 'مفتاح GEMINI_API_KEY غير مضبوط.' });
      if (req.query.probe !== '1' && req.query.probe !== 'true')
        return res.json({ configured: true, healthy: true, primaryModel: PRIMARY, fallbackModel: FALLBACK, message: 'مفتاح Gemini مُهيأ وجاهز.' });
      const p = await gen(client, 'Reply with only the word: OK');
      if (p.text)
        return res.json({ configured: true, healthy: true, activeModel: p.model, primaryModel: PRIMARY, fallbackModel: FALLBACK, message: `تم التحقق بنجاح! الاتصال بنموذج ${p.model} يعمل.` });
      return res.status(p.err?.http || 503).json({ configured: true, healthy: false, errorCode: p.err?.code, message: p.err?.msg });
    }

    // ---------- reset ----------
    if (action === 'ai-reset') {
      if (!client)
        return res.status(503).json({ configured: false, healthy: false, errorCode: 'MISSING_KEY', message: 'مفتاح GEMINI_API_KEY غير مضبوط في Vercel.' });
      const p = await gen(client, 'Reply with only: OK');
      if (p.text)
        return res.json({ configured: true, healthy: true, activeModel: p.model, primaryModel: PRIMARY, fallbackModel: FALLBACK, message: `⚡ تمت إعادة ضبط الطوارئ وتفعيل الاتصال بنموذج ${p.model} بنجاح!` });
      return res.status(p.err?.http || 503).json({ configured: true, healthy: false, errorCode: p.err?.code, message: p.err?.msg });
    }

    // ---------- chat ----------
    if (action === 'ai-chat') {
      const { message, history, fileData, mimeType, context } = b;
      if (!message && !fileData) return res.status(400).json({ success: false, error: 'الرسالة فارغة' });
      if (!client) {
        const e = classify('MISSING_KEY');
        return res.status(e.http).json({ success: false, source: 'fallback', errorCode: e.code, error: e.msg, reply: `⚠️ ${e.msg}` });
      }
      let mt = String(mimeType || '').split(';')[0].trim().toLowerCase();
      if (fileData && !mt && String(fileData).startsWith('data:')) {
        const m = String(fileData).match(/^data:([^;]+);base64,/);
        if (m) mt = m[1].toLowerCase();
      }
      if (mt.startsWith('image/') && !['image/jpeg', 'image/png', 'image/webp'].includes(mt)) mt = 'image/jpeg';
      const parts: any[] = [];
      if (fileData) parts.push({ inlineData: { mimeType: mt || 'image/jpeg', data: cleanB64(fileData) } });
      const conv = Array.isArray(history) && history.length
        ? 'سجل المحادثة:\n' + history.map((h: any) => `${h.role === 'user' ? 'الأستاذ' : 'Gemini'}: ${h.content}`).join('\n') + '\n\n'
        : '';
      parts.push({
        text: `${conv}رسالة المعلم الحالية: "${message || 'أرفقت هذا الملف، كيف ستعالجه؟'}"\nالقسم: ${context === 'homework' ? 'شيتات وواجبات' : 'امتحانات واختبارات'}\nأجب المعلم بأسلوب Google Gemini الذكي والواثق.`,
      });
      const r = await gen(client, parts, {
        systemInstruction:
          'أنت المساعد الذكي جوجل جيمناي المخصص لمنصة المعلم مستر عمرو السيد. تغطي جميع المواد الدراسية: الكيمياء، الأحياء، الفيزياء، العلوم، والرياضيات لجميع المراحل. نفّذ توجيهات المعلم بالحرف، وإذا أرفق ملفاً أكد استلامه وقراءته، وكن مهذباً وواثقاً وسريعاً.',
      });
      if (r.text) return res.json({ success: true, source: 'gemini', modelUsed: r.model, reply: r.text });
      return res.status(r.err?.http || 503).json({ success: false, source: 'fallback', errorCode: r.err?.code, error: r.err?.msg, reply: `⚠️ ${r.err?.msg}` });
    }

    // ---------- parse quiz ----------
    if (action === 'ai-parse-quiz') {
      const { fileData, mimeType, instructions, grade, rawText } = b;
      if (!fileData && !rawText && !instructions)
        return res.status(400).json({ success: false, error: 'لم يتم إرسال ملف أو نص أو توجيهات.' });
      if (!client) {
        const e = classify('MISSING_KEY');
        return res.status(e.http).json({ success: false, source: 'fallback', errorCode: e.code, error: e.msg, questions: [] });
      }
      let mt = String(mimeType || '').split(';')[0].trim().toLowerCase();
      const b64 = fileData ? cleanB64(fileData) : '';
      if (fileData && !mt && String(fileData).startsWith('data:')) {
        const m = String(fileData).match(/^data:([^;]+);base64,/);
        if (m) mt = m[1].toLowerCase();
      }
      if (mt.startsWith('image/') && !['image/jpeg', 'image/png', 'image/webp'].includes(mt)) mt = 'image/jpeg';
      if (!mt && b64) mt = 'image/jpeg';

      const systemPrompt = `أنت محرك جوجل جيمناي المخصص لمنصة مستر عمرو السيد. استخرج الأسئلة من الصورة أو الملف أو النص بدقة 100% حرفياً بدون تحريف.
1. حافظ على جميع الرموز والمعادلات والأرقام والأسس ووحدات القياس كما هي.
2. انقل نص السؤال والخيارات كما وردت تماماً.
3. التزم بتوجيهات المعلم (عدد الأسئلة، النوع).
4. السؤال المقالي: type="essay" مع modelAnswer. الاختياري: type="mcq" مع correctAnswerIndex (0-3) وexplanation.
5. إذا كانت الصورة غير واضحة أو فارغة، أرجع questions فارغة واكتب السبب في unreadableNotice.
6. أرجع JSON صالحاً فقط.`;
      const userPrompt = `اقرأ الملف المرفق واستخرج جميع الأسئلة والخيارات حرفياً. ${instructions ? `توجيهات المعلم: ${instructions}.` : ''} ${grade ? `الصف: ${grade}.` : ''}`;

      const canInline = b64 && ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(mt);
      const parts: any[] = [];
      if (canInline) parts.push({ inlineData: { mimeType: mt, data: b64 } });
      parts.push({ text: rawText ? `النص المرفق:\n${rawText}\n\n${userPrompt}` : userPrompt });

      const r = await gen(client, parts, {
        temperature: 0.1,
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            quizTitle: { type: Type.STRING },
            unreadableNotice: { type: Type.STRING },
            suggestedDurationMinutes: { type: Type.INTEGER },
            suggestedTotalMarks: { type: Type.INTEGER },
            questions: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  text: { type: Type.STRING },
                  type: { type: Type.STRING },
                  options: { type: Type.ARRAY, items: { type: Type.STRING } },
                  correctAnswerIndex: { type: Type.INTEGER },
                  modelAnswer: { type: Type.STRING },
                  explanation: { type: Type.STRING },
                },
                required: ['text', 'options', 'correctAnswerIndex'],
              },
            },
          },
          required: ['quizTitle', 'questions'],
        },
      });

      if (!r.text)
        return res.status(r.err?.http || 503).json({ success: false, source: 'fallback', errorCode: r.err?.code, error: `${r.err?.msg} لم يتم قراءة الملف، أعد المحاولة أو الصق النص مباشرة.`, questions: [] });

      let parsed: any;
      try {
        parsed = JSON.parse(stripJson(r.text));
      } catch {
        return res.status(502).json({ success: false, source: 'fallback', errorCode: 'BAD_JSON', error: 'رد غير مكتمل من Gemini، أعد المحاولة.', questions: [] });
      }
      if (parsed.unreadableNotice && (!Array.isArray(parsed.questions) || !parsed.questions.length))
        return res.status(422).json({ success: false, source: 'gemini', unreadableImage: true, errorCode: 'UNREADABLE_IMAGE', error: parsed.unreadableNotice, questions: [] });

      const attach = b64 ? `data:${mt};base64,${b64}` : fileData || undefined;
      const questions = (parsed.questions || []).map((q: any, i: number) => ({
        id: `ai_q_${Date.now()}_${i + 1}`,
        text: q.text,
        type: q.type === 'essay' ? 'essay' : 'mcq',
        points: q.type === 'essay' ? 2 : 1,
        image: attach,
        options: q.type === 'essay' ? [] : Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['الخيار (أ)', 'الخيار (ب)', 'الخيار (ج)', 'الخيار (د)'],
        correctAnswerIndex: typeof q.correctAnswerIndex === 'number' ? q.correctAnswerIndex : 0,
        modelAnswer: q.modelAnswer || undefined,
        explanation: q.explanation || 'تم التحقق من الإجابة النموذجية.',
      }));
      return res.json({
        success: true,
        source: 'gemini',
        modelUsed: r.model,
        quizTitle: parsed.quizTitle || 'اختبار مستخرج بواسطة Gemini',
        suggestedDurationMinutes: parsed.suggestedDurationMinutes || Math.max(15, questions.length * 2),
        suggestedTotalMarks: parsed.suggestedTotalMarks || questions.reduce((s: number, q: any) => s + (q.points || 1), 0),
        questions,
      });
    }

    // ---------- extract students ----------
    if (action === 'ai-extract-students') {
      const { imageData, mimeType, rawText } = b;
      if (!client) {
        const e = classify('MISSING_KEY');
        return res.status(e.http).json({ success: false, errorCode: e.code, error: e.msg, students: [] });
      }
      let mt = String(mimeType || 'image/jpeg').split(';')[0].trim().toLowerCase();
      let b64 = '';
      if (imageData && String(imageData).includes(',')) {
        if (!mimeType && String(imageData).startsWith('data:')) {
          const m = String(imageData).match(/^data:([^;]+);base64,/);
          if (m) mt = m[1].toLowerCase();
        }
        b64 = String(imageData).split(',')[1];
      } else if (imageData) b64 = imageData;

      const parts: any[] = [];
      if (b64) parts.push({ inlineData: { mimeType: mt || 'image/jpeg', data: b64 } });
      parts.push({ text: rawText ? `استخرج جميع الطلاب من هذا النص:\n${rawText}` : 'استخرج جميع الطلاب من هذا الكشف مع الأسماء والأرقام والأكواد.' });

      const r = await gen(client, parts, {
        systemInstruction: `استخرج قائمة الطلاب كاملة من الصورة أو النص: studentName (الاسم بالعربية)، phone (رقم مصري من 11 رقماً)، studentCode (الكود إن وجد أو ولّد مثل SEC3-101). أرجع JSON فقط: {"students":[{"studentName":"","phone":"","studentCode":""}]}`,
        responseMimeType: 'application/json',
      });
      let students: any[] = [];
      if (r.text) {
        try {
          const d = JSON.parse(stripJson(r.text));
          if (Array.isArray(d.students)) students = d.students;
        } catch {}
      }
      if (!students.length)
        return res.status(r.err?.http || 200).json({ success: false, errorCode: r.err?.code || 'NO_MATCH', error: r.err?.msg || 'لم يتم العثور على طلاب في الصورة.', students: [], message: r.err?.msg || 'أرفق صورة أوضح لكشف الطلاب.' });
      return res.json({ success: true, source: 'gemini', modelUsed: r.model, students, message: `تم استخراج ${students.length} طالباً بدقة!` });
    }

    return res.status(404).json({ success: false, error: 'مسار غير معروف' });
  } catch (e: any) {
    console.error('AI api error:', e);
    const c = classify(e);
    return res.status(c.http).json({ success: false, errorCode: c.code, error: c.msg });
  }
}
