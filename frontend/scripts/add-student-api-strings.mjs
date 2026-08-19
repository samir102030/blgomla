/**
 * Arabic for the messages the API writes.
 *
 * The portal shows what the server said, verbatim — that is the only way the
 * reason for a refusal reaches the person it happened to. On an Arabic-first
 * shop that meant an English sentence in the middle of an Arabic page, so the
 * pages now pass those strings through `t()` and the English text is the key.
 * Anything missing here still renders as the English the server sent, which is
 * the right failure mode: worse copy, never a blank box.
 *
 * Same line-wise append as `add-student-strings.mjs`, and re-running is safe.
 */
import { readFile, writeFile } from "node:fs/promises";

const STRINGS = {
  // ── Applying ──
  "The student programme is not open at the moment.": "برنامج الطلاب مش مفتوح حاليًا.",
  "Enter a valid university email address.": "اكتب بريد جامعي صحيح.",
  "That domain is not on the approved list. The programme is open to engineering and computer science faculty addresses.":
    "النطاق ده مش في القائمة المعتمدة. البرنامج مفتوح لعناوين كليات الهندسة وعلوم الحاسب.",
  "That university email is already registered to another account.":
    "البريد الجامعي ده مسجّل بالفعل على حساب تاني.",
  "This membership is not active. Contact support if you think that is a mistake.":
    "العضوية دي مش نشطة. كلّم الدعم لو شايف إن ده خطأ.",
  "You are already verified — your code is on the programme page.":
    "إنت موثّق بالفعل — كودك موجود في صفحة البرنامج.",
  "A confirmation link was just sent. Check the inbox, then try again in a couple of minutes.":
    "لينك التأكيد اتبعت من شوية. شوف بريدك، وحاول تاني بعد دقيقتين.",
  "Check your university inbox for the confirmation link.": "شوف بريدك الجامعي هتلاقي لينك التأكيد.",
  "We could not send the confirmation link just now. Try again in a moment, or contact support.":
    "مقدرناش نبعت لينك التأكيد دلوقتي. جرّب تاني بعد شوية، أو كلّم الدعم.",

  // ── Confirming ──
  "Missing confirmation token.": "لينك التأكيد ناقص.",
  "This confirmation link is invalid or has expired. Request a new one.":
    "لينك التأكيد ده غير صالح أو انتهت صلاحيته. اطلب واحد جديد.",
  "This membership is not active.": "العضوية دي مش نشطة.",
  "This faculty is no longer part of the programme.": "الكلية دي مابقتش ضمن البرنامج.",
  "The account behind this application no longer exists.": "الحساب صاحب الطلب ده مابقاش موجود.",
  "Your university email is confirmed and your code is on its way.":
    "تم تأكيد بريدك الجامعي والكود في طريقه ليك.",

  // ── Limits ──
  "Too many confirmation links requested for this account. Try again in an hour, or contact support.":
    "طلبت لينكات تأكيد كتير على الحساب ده. حاول تاني بعد ساعة، أو كلّم الدعم.",
  "Too many requests from this network. Please try again shortly.":
    "طلبات كتير من الشبكة دي. جرّب تاني بعد شوية.",
  "Too many attempts. Please try again in 15 minutes.": "محاولات كتير. جرّب تاني بعد ١٥ دقيقة.",

  // ── What the store says when the call never landed ──
  "Could not load the programme.": "مقدرناش نحمّل البرنامج.",
  "Could not submit the application.": "مقدرناش نسجّل الطلب.",
  "This link is no longer valid.": "اللينك ده مابقاش صالح.",
  "Check your university inbox.": "شوف بريدك الجامعي.",

  // ── Dashboard ──
  "Programme settings saved.": "تم حفظ إعدادات البرنامج.",
  "Domain added.": "تمت إضافة النطاق.",
  "Domain updated.": "تم تحديث النطاق.",
  "Domain removed.": "تم حذف النطاق.",
  "Domain not found.": "النطاق مش موجود.",
  "That domain is already on the list.": "النطاق ده موجود في القائمة بالفعل.",
  "Enter a valid mail domain, for example eng.cu.edu.eg":
    "اكتب نطاق بريد صحيح، مثلًا eng.cu.edu.eg",
  "Member approved and code sent.": "تمت الموافقة على العضو وإرسال الكود.",
  "Member not found.": "العضو مش موجود.",
  "Unknown status.": "حالة غير معروفة.",
  "Could not load settings.": "مقدرناش نحمّل الإعدادات.",
  "Could not save settings.": "مقدرناش نحفظ الإعدادات.",
  "Could not add the domain.": "مقدرناش نضيف النطاق.",
  "Could not update the domain.": "مقدرناش نحدّث النطاق.",
  "Could not remove the domain.": "مقدرناش نحذف النطاق.",
  "Could not load members.": "مقدرناش نحمّل الأعضاء.",
  "Could not update the member.": "مقدرناش نحدّث العضو.",
  "Could not load statistics.": "مقدرناش نحمّل الإحصائيات.",
  "Maintenance run failed.": "تشغيل الصيانة فشل.",
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
