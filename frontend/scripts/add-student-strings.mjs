/**
 * Appends the student-programme copy to the locale files.
 *
 * Same line-wise approach as `add-manus-strings.mjs`: these files run to
 * thousands of keys and a stringify pass would rewrite every line, burying the
 * actual change. Existing keys are left alone, so re-running is safe.
 */
import { readFile, writeFile } from "node:fs/promises";

// English key → Arabic.
const STRINGS = {
  // ── Portal ──
  "Student programme": "برنامج الطلاب",
  "Engineering and computer science students get a personal discount on electronics at Belgomla — verified with a faculty email.":
    "طلاب الهندسة وعلوم الحاسب بياخدوا خصم شخصي على الإلكترونيات في بلجملة — بالتحقق من بريد الكلية.",
  "Engineering & computer science": "هندسة وعلوم حاسب",
  "Built for the people": "معمول للناس",
  "who build things.": "اللي بتبني حاجات.",
  "Confirm a faculty email address and a personal discount code is yours — on the laptops, components, networking gear and storage you actually study with. The code renews; it is not a one-off voucher.":
    "أكّد بريد كليتك وهيبقى ليك كود خصم شخصي — على اللابتوبات والمكونات ومعدات الشبكات ووحدات التخزين اللي بتذاكر بيها فعلًا. الكود بيتجدد، مش قسيمة لمرة واحدة.",
  "Off electronics": "خصم على الإلكترونيات",
  "Orders per period": "طلبات في الفترة",
  "Day renewal cycle": "يوم دورة التجديد",
  "Approved faculties": "كليات معتمدة",
  "The programme is closed right now": "البرنامج مقفول حاليًا",
  "Applications are not open at the moment. Check back at the start of the next term, or ask support when it reopens.":
    "التقديم مش مفتوح دلوقتي. تابعنا مع بداية الترم الجاي، أو اسأل الدعم هيفتح إمتى.",
  "Contact support": "تواصل مع الدعم",
  "Sign in to apply": "سجّل دخول عشان تقدّم",
  "The discount is tied to your Belgomla account, so the code cannot be handed to anyone else. Sign in or create an account, then confirm your faculty email.":
    "الخصم مربوط بحسابك في بلجملة، فالكود مينفعش يتدّي لحد تاني. سجّل دخول أو اعمل حساب، وبعدين أكّد بريد كليتك.",
  "Sign in or register": "دخول أو إنشاء حساب",
  "Renew your membership": "جدّد عضويتك",
  "Confirm your faculty email": "أكّد بريد كليتك",
  "Use the address your faculty gave you. We send a confirmation link there — holding that mailbox is the proof of enrolment.":
    "استخدم البريد اللي كليتك أعطتهولك. بنبعت لينك تأكيد عليه — امتلاكك للبريد ده هو إثبات القيد.",
  "University email": "البريد الجامعي",
  "Sending…": "جاري الإرسال…",
  "Send confirmation link": "ابعت لينك التأكيد",
  "Check your university inbox": "شوف بريدك الجامعي",
  "We sent a confirmation link to": "بعتنا لينك تأكيد على",
  "The link is valid for one hour. Nothing else is needed from you here.":
    "اللينك صالح لمدة ساعة. مش محتاجين منك أي حاجة تانية هنا.",
  "Not there? Look in the junk folder — university mail servers are strict. You can send it again from the form below after a couple of minutes.":
    "مش لاقيه؟ بص في الرسائل غير المرغوبة — سيرفرات البريد الجامعي صارمة. تقدر تبعته تاني من الفورم تحت بعد دقيقتين.",
  "Resend, or use a different address": "إعادة الإرسال، أو استخدام بريد تاني",
  "Send again": "ابعت تاني",
  "Your student code": "كودك الطلابي",
  "Apply it at checkout. It is checked against your account, so it will not work for anybody else.":
    "استخدمه عند إتمام الطلب. بيتحقق منه مقابل حسابك، فمش هيشتغل مع حد تاني.",
  "Personal code": "كود شخصي",
  "Uses left": "استخدامات متبقية",
  "Renews every": "يتجدد كل",
  days: "يوم",
  Until: "حتى",
  "Shop electronics": "تسوّق الإلكترونيات",
  "My orders": "طلباتي",
  "Membership suspended": "العضوية موقوفة",
  "This membership is on hold. Contact support if you think that is a mistake.":
    "العضوية دي موقوفة. تواصل مع الدعم لو شايف إن ده خطأ.",
  "Who qualifies": "مين ينفع يقدّم",
  "Engineering and computer science faculties only, proven by a faculty email domain. A general university address cannot tell us which faculty you are in, so it is not accepted.":
    "كليات الهندسة وعلوم الحاسب بس، بإثبات نطاق بريد الكلية. البريد الجامعي العام مابيقولش إنت في أي كلية، فمش مقبول.",

  // ── Verification landing ──
  "Confirming your university email": "جاري تأكيد بريدك الجامعي",
  "Confirming…": "جاري التأكيد…",
  "You are in.": "تمام، إنت معانا.",
  "That link did not work.": "اللينك ده مااشتغلش.",
  "Checking your confirmation link…": "بنراجع لينك التأكيد…",
  "Your faculty email is confirmed. A copy of this code is on its way to your inbox.":
    "تم تأكيد بريد كليتك. نسخة من الكود في طريقها لبريدك.",
  "My membership": "عضويتي",
  "Confirmation links last an hour. Ask for a fresh one from the programme page.":
    "لينكات التأكيد صلاحيتها ساعة. اطلب واحد جديد من صفحة البرنامج.",
  "Back to the programme": "رجوع للبرنامج",

  // ── Dashboard ──
  "Programme settings saved.": "تم حفظ إعدادات البرنامج.",
  "Domain added.": "تمت إضافة النطاق.",
  "Why is this application rejected? The student sees this.": "سبب رفض الطلب؟ الطالب هيشوف النص ده.",
  "Member updated.": "تم تحديث العضو.",
  Verified: "موثّق",
  Suspended: "موقوف",
  Expired: "منتهي",
  "Codes issued": "أكواد صادرة",
  Redemptions: "مرات الاستخدام",
  "A discount for engineering and computer science students, proven by a faculty email address. Everything the programme does is set here.":
    "خصم لطلاب الهندسة وعلوم الحاسب، بإثبات بريد الكلية. كل حاجة بيعملها البرنامج بتتظبط من هنا.",
  "The offer": "العرض",
  "What a verified student gets, and how often it comes back.": "الطالب الموثّق بياخد إيه، وبيتجدد كل قد إيه.",
  "Programme open to applications": "البرنامج مفتوح للتقديم",
  "Discount type": "نوع الخصم",
  Percentage: "نسبة مئوية",
  "Fixed amount": "مبلغ ثابت",
  Value: "القيمة",
  "Maximum discount": "أقصى خصم",
  "Caps a percentage. Leave empty for no cap.": "بيحدّد سقف للنسبة. سيبه فاضي لو مفيش سقف.",
  "Minimum order": "أقل قيمة طلب",
  "Period length (days)": "طول الفترة (أيام)",
  "The code resets after this many days.": "الكود بيترجع من أول بعد عدد الأيام ده.",
  "Membership length (days)": "مدة العضوية (أيام)",
  "Save settings": "حفظ الإعدادات",
  "What the discount applies to": "الخصم بيطبق على إيه",
  "Pick departments. Every subcategory beneath one is included automatically. Selecting nothing means the whole catalogue.":
    "اختر الأقسام الرئيسية. كل قسم فرعي تحتها بيتحسب أوتوماتيك. لو ماخترتش حاجة يبقى الكتالوج كله.",
  "Categories are still loading.": "التصنيفات لسه بتحمّل.",
  "Approved faculty domains": "نطاقات الكليات المعتمدة",
  "A faculty domain is the whole proof of enrolment. A university-wide domain would admit every faculty, so add the faculty address, not the university one.":
    "نطاق الكلية هو كل إثبات القيد. نطاق الجامعة العام هيقبل كل الكليات، فضيف نطاق الكلية مش الجامعة.",
  Domain: "النطاق",
  "University (English)": "الجامعة (إنجليزي)",
  "University (Arabic)": "الجامعة (عربي)",
  Faculty: "الكلية",
  Engineering: "هندسة",
  "Computer science": "علوم حاسب",
  Other: "أخرى",
  "Add domain": "إضافة نطاق",
  Accepting: "بيقبل",
  "No domains yet — nobody can join until one is added.": "مفيش نطاقات — محدش هيقدر ينضم لحد ما تضيف واحد.",
  Members: "الأعضاء",
  "applications in total": "طلب إجمالًا",
  "All statuses": "كل الحالات",
  "Search email or university": "ابحث ببريد أو جامعة",
  "Renewals rolled and expiries applied.": "تم تدوير التجديدات وتطبيق انتهاء العضويات.",
  "Run renewals now": "شغّل التجديدات دلوقتي",
  Student: "الطالب",
  Code: "الكود",
  Approve: "موافقة",
  Suspend: "إيقاف",
  Reject: "رفض",
  "No applications yet.": "مفيش طلبات لسه.",

  // Status values reach t() as variables, so they need their own keys.
  pending: "قيد المراجعة",
  verified: "موثّق",
  rejected: "مرفوض",
  suspended: "موقوف",
  expired: "منتهي",
  "admin.studentProgram": "برنامج الطلاب",
};

for (const [file, useArabic] of [
  ["src/locales/ar.json", true],
  ["src/locales/en.json", false],
]) {
  const raw = await readFile(file, "utf8");
  const existing = JSON.parse(raw);

  const additions = Object.entries(STRINGS)
    .filter(([key]) => !(key in existing))
    .map(([key, ar]) => `  ${JSON.stringify(key)}: ${JSON.stringify(useArabic ? ar : key)}`);

  if (!additions.length) {
    console.log(`${file}: nothing to add`);
    continue;
  }

  const close = raw.lastIndexOf("}");
  const head = raw.slice(0, close).replace(/,?\s*$/, "");
  const updated = `${head},\n${additions.join(",\n")}\n}\n`;

  JSON.parse(updated); // fail here rather than at runtime
  await writeFile(file, updated, "utf8");
  console.log(`${file}: +${additions.length} keys`);
}
