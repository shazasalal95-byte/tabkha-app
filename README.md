# طبخة — دليل النشر المجاني (Supabase + Netlify)

## 1) قاعدة البيانات (Supabase) — مجاني
1. سجّلي بحساب مجاني على supabase.com وأنشئي مشروع جديد.
2. من القائمة الجانبية: SQL Editor → New query → الصقي محتوى ملف `schema.sql` كامل → Run.
3. من Settings → API: انسخي القيمتين:
   - Project URL → هي `VITE_SUPABASE_URL`
   - anon public key → هي `VITE_SUPABASE_ANON_KEY`

## 2) رفع الكود على GitHub
1. أنشئي حساب مجاني على github.com (إذا ما عندك).
2. أنشئي "New repository" باسم مثلاً `tabkha-app`.
3. ارفعي كل ملفات هاد المشروع لهداك الـ repository (من موقع GitHub فيه زر "uploading an existing file" لو ما بتعرفي أوامر Git).

## 3) النشر (Netlify) — مجاني
1. سجّلي بحساب مجاني على netlify.com (فيك تسجلي مباشرة بحساب GitHub تبعك).
2. "Add new site" → "Import an existing project" → اختاري الـ repository يلي رفعتيه.
3. Build command: `npm run build` — Publish directory: `dist` (هاي موجودة أصلاً بملف netlify.toml).
4. قبل ما تعملي Deploy: روحي على Site settings → Environment variables → ضيفي:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   (نفس القيم يلي نسختيهم من Supabase بالخطوة 1)
5. اضغطي Deploy site. بعد شوي رح ياخدك Netlify رابط مجاني مثل `tabkha.netlify.app` — هاد رابط تطبيقك الحقيقي.

## ملاحظة أمان
سياسات القاعدة بملف `schema.sql` مفتوحة للجميع (قراءة وكتابة) عشان تسهيل مرحلة التجربة الأولى.
هاد يعني أي حدا معه رابط الموقع يقدر يضيف بيانات. لما التطبيق يكبر ويصير في مستخدمين حقيقيين كتار،
لازم نرجع نشدد الصلاحيات (تسجيل دخول حقيقي لكل بيت طبخ).
