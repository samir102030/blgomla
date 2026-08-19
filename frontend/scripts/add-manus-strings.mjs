/**
 * Appends the Manus surface copy to the locale files.
 *
 * Text is inserted line-wise rather than by re-serialising the JSON: these
 * files are ~3600 keys and a stringify pass would rewrite every line, burying
 * the actual change in the diff. Existing keys are left alone.
 */
import { readFile, writeFile } from "node:fs/promises";

// English key → Arabic, taken verbatim from the Manus preview.
const STRINGS = {
  "Integrated smart solutions": "حلول ذكية متكاملة",
  "We secure your facility.": "نؤمّن منشأتك.",
  "And we connect": "ونربط",
  "your business.": "أعمالك.",
  "Surveillance cameras, professional networks, data and smart control solutions designed for your needs — from planning through to operation.":
    "كاميرات مراقبة، شبكات احترافية، داتا وحلول تحكم ذكية مصممة لاحتياجك؛ من التخطيط وحتى التشغيل.",
  "Request a free consultation": "اطلب استشارة مجانية",
  "Explore solutions": "استكشف الحلول",
  "Genuine warranty": "ضمان أصلي",
  "Professional installation": "تركيب احترافي",
  "Specialist support": "دعم متخصص",
  "Integrated tracks": "مسارات متكاملة",
  "One solution, from plan to operation.": "حل واحد، من الرؤية إلى التشغيل.",
  "Start from whichever point is closest to your project, then review the proposed system and the services behind it.":
    "اختر نقطة البداية الأقرب لمشروعك، ثم استعرض منظومة الحل المقترحة والخدمات التي تدعمها.",
  "Cameras & surveillance": "كاميرات ومراقبة",
  "Precise coverage, smart alerting, and central operation for every site.":
    "تغطية دقيقة وتنبيه ذكي وتشغيل مركزي للمواقع.",
  "Networks & infrastructure": "شبكات وبنية تحتية",
  "Practical networks designed and installed to scale as you grow.":
    "تصميم وتنفيذ شبكات عملية قابلة للتوسع والنمو.",
  "Smart solutions & data": "حلول ذكية وداتا",
  "Control, access, and data in one clear system.": "تحكم ودخول وبيانات في منظومة واحدة واضحة.",
  "Discover the solution": "اكتشف الحل",
  "By project type": "حسب نوع المشروع",
  "Solutions that fit every site.": "حلول تناسب كل موقع.",
  "View all packages": "عرض جميع الباقات",
  Offices: "مكاتب",
  "Retail stores": "متاجر",
  Villas: "فيلات",
  Warehouses: "مخازن",
  "How we work": "منهج العمل",
  "A central control point for a multi-area site": "نقطة تحكم مركزية لموقع متعدد المساحات",
  "A surveillance and network system with practical access and management across zones.":
    "منظومة مراقبة وربط شبكي بتوزيع عملي للوصول والإدارة.",
  Infrastructure: "بنية تحتية",
  "A stable business network, built to grow": "شبكة أعمال مستقرة وقابلة للنمو",
  "Orderly distribution of outlets and equipment, with clear management of the site.":
    "توزيع منظم للمخارج والمعدات وإدارة واضحة للموقع.",
  "Smart solution": "حل ذكي",
  "Secure access, simplified control": "وصول آمن وتحكم مبسّط",
  "Site entrances and operating alerts brought together in one interface.":
    "ربط مداخل الموقع وإشعارات التشغيل في واجهة واحدة.",
  // Site chrome
  "Free technical consultation": "استشارة فنية مجانية",
  "After-sales support": "دعم ما بعد البيع",
  "Request a quote": "اطلب عرض سعر",
  "Search for a solution, product, or project...": "ابحث عن حل، منتج، مشروع...",
  // Expanded home journey — sections 1–11 of the full design package.
  "Explore by solution": "استكشف حسب الحل",
  Surveillance: "مراقبة",
  Networks: "شبكات",
  "Control & access": "تحكم ودخول",
  "Data & storage": "داتا وتخزين",
  "Installation & maintenance": "تركيب وصيانة",
  "Start from a clear plan.": "ابدأ بخطة واضحة.",
  "Tell us your site type and we will map the starting point.":
    "أخبرنا بنوع موقعك وسنرسم نقطة البداية.",
  "You may be interested in": "قد يهمك",
  "Start from the track closest to your need.": "ابدأ من المسار الأقرب لاحتياجك.",
  "A quick way in that gathers the solutions, products, and services before you go into detail.":
    "بنية استكشاف سريعة تجمع عروض الحلول والمنتجات والخدمات قبل الانتقال إلى التفاصيل.",
  "Choose a solution area": "اختيار مجال الحل",
  "Smart solutions": "حلول ذكية",
  "Secure every corner. Watch every moment.": "أمّن كل زاوية. وتابع كل لحظة.",
  "Surveillance that scales from a single entry point to a full central system.":
    "حلول مراقبة متدرجة من نقطة دخول واحدة إلى منظومة مركزية كاملة.",
  "Discover surveillance": "اكتشف المراقبة",
  "A stable network that grows with your plans.": "شبكة ثابتة تتسع لخططك.",
  "Design, cabling, and operation for infrastructure that fits the site as it works today and as it expands tomorrow.":
    "تصميم وربط وتشغيل لبنية تحتية تناسب الموقع كما يعمل اليوم وكما سيتوسع غدًا.",
  "Discover networks": "اكتشف الشبكات",
  "Clearer control. Smarter operation.": "تحكم أوضح. وتشغيل أذكى.",
  "Access, entry, control, and data inside one operating experience that is easy to follow.":
    "وصول ودخول وتحكم وبيانات ضمن تجربة تشغيل واحدة وسهلة المتابعة.",
  "Discover smart solutions": "اكتشف الحلول الذكية",
  "A starting solution you can customise": "حل مبدئي قابل للتخصيص",
  "Implementation steps": "خطوات التنفيذ",
  "Assess your site and its operating requirements": "تقييم موقعك ومتطلبات التشغيل",
  "Choose the equipment and the matching solution": "اختيار المعدات والحل المتوافق",
  "Install, test, and hand over in order": "تركيب واختبار وتسليم منظم",
  "Most requested solutions": "الحلول الأكثر طلبًا",
  "Pick the area, then extend the system.": "اختر المجال، ثم وسّع المنظومة.",
  "View all solutions": "عرض جميع الحلول",
  "Site fit-out offers": "عروض تجهيز المواقع",
  "Start with a package, then tailor it to your site.": "ابدأ بحزمة، ثم خصّصها لموقعك.",
  "Instead of hunting through scattered equipment, pick a starting point built around the project type and leave the details to the solutions team.":
    "بدل البحث بين معدات متفرقة، اختر نقطة بداية مبنية على نوع المشروع واترك التفاصيل لفريق الحلول.",
  "View packages": "عرض الباقات",
  "Ready to install": "جاهز للتركيب",
  "New site setup package": "باقة تأسيس موقع جديد",
  "Surveillance, network, and distributed entry points on one path you can extend.":
    "مراقبة، شبكة، ونقاط دخول موزعة في مسار واحد قابل للزيادة.",
  Connectivity: "ربط",
  Access: "دخول",
  "Request a custom package": "اطلب باقة مخصصة",
  "For retail stores": "للمتاجر",
  "Network coverage and surveillance": "تغطية شبكة ومراقبة",
  "For offices": "للمكاتب",
  "Secure access and central operation": "وصول آمن وتشغيل مركزي",
  "For villas": "للفيلات",
  "Smart control that keeps up with you": "تحكم ذكي يواكب حياتك",
  "Ready-made tracks so you can decide faster.": "مسارات جاهزة لتفكر أسرع.",
  "Connected technologies": "تقنيات مترابطة",
  "Every layer supports the next.": "كل طبقة تدعم ما بعدها.",
  "A reference view of how sight, connection, and management meet in one solution, before the actual components are chosen.":
    "واجهة مرجعية لتوضيح كيف تلتقي الرؤية والاتصال والإدارة في حل واحد، قبل اختيار المكونات الفعلية.",
  Sight: "الرؤية",
  "Footage, monitoring, and considered coverage of the site.":
    "لقطات ومراقبة وتغطية مدروسة للموقع.",
  Connection: "الاتصال",
  "A clear, stable network that is easy to extend.": "شبكة واضحة، مستقرة، وسهلة التوسعة.",
  Management: "الإدارة",
  "Alerts, access, and central operation when you need it.":
    "تنبيهات ووصول وتشغيل مركزي عند الحاجة.",
  Data: "البيانات",
  "Orderly storage and continuity options for the business.":
    "تخزين منظم وخيارات استمرارية للعمل.",
  "Quick guide": "دليل سريع",
  "How do you choose the right surveillance system?": "كيف تختار نظام المراقبة المناسب؟",
  "Start from the site area, the coverage points, and the operating hours.":
    "ابدأ من مساحة الموقع، نقاط التغطية، وساعات التشغيل.",
  "Talk to a solutions expert": "تحدث مع خبير حلول",
  "After-sales services": "خدمات ما بعد البيع",
  "Support does not end at handover.": "الدعم لا ينتهي عند التسليم.",
  "From commissioning tests to expansion or adding new points.":
    "من اختبار التشغيل إلى التوسعة أو إضافة نقاط جديدة.",
  "Request technical help": "اطلب مساعدة فنية",
  "Visit and survey": "زيارة ومعاينة",
  "From the drawing to the site.": "من المخطط إلى الموقع.",
  "Send the area or the plan and we will help you order the steps.":
    "أرسل المساحة أو المخطط لنساعدك على ترتيب الخطوات.",
  "Arrange a survey": "رتب معاينة",
  "A practical step": "خطوة عملية",
  "Have a plan or a new site?": "لديك مخطط أو موقع جديد؟",
  "Start with a short technical consultation.": "ابدأ باستشارة فنية مختصرة.",
  "We set the priorities before choosing a product, so you end up with a system that fits rather than a random shopping list.":
    "نرتب الأولويات قبل اختيار المنتج، حتى تحصل على منظومة مناسبة بدل قائمة مشتريات عشوائية.",
  "Request an initial assessment": "اطلب تقييمًا مبدئيًا",
  "Orderly installation": "تركيب منظّم",
  "Clear execution, tidy equipment, and a handover you understand.":
    "تنفيذ واضح ومعدات مرتبة وتسليم مفهوم.",
  "Proven quality": "جودة معتمدة",
  "We pick components suited to the environment they run in.":
    "نختار مكونات مناسبة لبيئة الاستخدام.",
  "Support after go-live": "دعم بعد التشغيل",
  "A technical line to reach when you need to expand or follow up.":
    "تواصل فني عند الحاجة إلى التوسعة أو المتابعة.",
  Solutions: "الحلول",
  "Surveillance and network solutions and smart systems, specified to suit every site.":
    "حلول مراقبة وشبكات وأنظمة ذكية مصممة لتناسب احتياجات كل موقع.",

  // v3 of the package turned the hero into a six-slide solution carousel, one
  // slide per service the shop sells.
  "And we connect your business.": "ونربط أعمالك.",
  "Fire alarm & suppression": "أنظمة إنذار وإطفاء الحريق",
  "A faster response.": "استجابة أسرع.",
  "And higher safety.": "وسلامة أعلى.",
  "Early warning, detection points and safety equipment planned around the nature of the site and its evacuation routes.":
    "إنذار مبكر، نقاط كشف، وتجهيزات سلامة تُخطط لتناسب طبيعة الموقع ومسارات الإخلاء.",
  "Explore fire safety": "استكشف حلول الحريق",
  "Audio & sound systems": "صوتيات وSound System",
  "Clear sound.": "صوت واضح.",
  "In every space.": "في كل مساحة.",
  "Speakers, amplifiers and orderly paging for clear audio across offices, halls and retail floors.":
    "سماعات، مضخمات، ونداء داخلي منظم لتجربة صوتية واضحة في المكاتب والقاعات والمتاجر.",
  "Explore audio solutions": "استكشف حلول الصوت",
  "A network that holds steady.": "شبكة ثابتة.",
  "Behind everything you run.": "تدعم كل عملك.",
  "Design, cabling and management for an orderly business network — stable, and ready to scale with your site.":
    "تصميم وربط وإدارة لشبكة أعمال مرتبة، مستقرة وقابلة للتوسع مع متطلبات موقعك.",
  "Explore networking": "استكشف الشبكات",
  "Attendance & access control": "بصمة حضور وانصراف",
  "Orderly entry.": "دخول منظم.",
  "And clearer records.": "وبيانات أوضح.",
  "Fingerprint terminals and access control that let you follow attendance and manage entry from a single point of operation.":
    "أجهزة بصمة وتحكم بالدخول تساعدك على متابعة الحضور وإدارة الوصول من نقطة تشغيل واحدة.",
  "Explore attendance systems": "استكشف أنظمة البصمة",
  "Intercom & PBX": "إنتركم وسنترالات",
  "Secure communication.": "تواصل آمن.",
  "From the entrance to the back office.": "من المدخل للإدارة.",
  "Video intercom, IP phones and practical PBX systems that link reception, offices and entry points.":
    "إنتركم فيديو، هواتف IP وسنترالات عملية تربط الاستقبال والمكاتب ونقاط الدخول باحتراف.",
  "Explore communication solutions": "استكشف حلول الاتصال",
  "Available brands": "ماركات ومنتجات متاحة",
  // Shown instead of a brand list where the catalogue has none to show.
  "Brands selected to suit the project requirements": "العلامات المتاحة حسب متطلبات المشروع",
  "Solution slides": "شرائح الحلول",
  "Pause on hover, or pick any solution from the dots.":
    "مرر المؤشر لإيقاف السلايدر، أو اختر أي حل من نقاط التنقل.",
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

  // Splice in before the closing brace, giving the previous last entry a comma.
  const close = raw.lastIndexOf("}");
  const head = raw.slice(0, close).replace(/,?\s*$/, "");
  const updated = `${head},\n${additions.join(",\n")}\n}\n`;

  JSON.parse(updated); // fail loudly here rather than at runtime
  await writeFile(file, updated, "utf8");
  console.log(`${file}: +${additions.length} keys`);
}
