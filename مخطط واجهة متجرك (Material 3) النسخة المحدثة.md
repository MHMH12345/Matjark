# مخطط واجهة متجرك (Material 3): النسخة المحدثة

نسخة موحّدة تجمع «المخطط» و«ملحق (أ): المصادقة والجلسات وإدارة المستخدمين»، وتُسلَّم على 4 أجزاء. هذا هو **PART 1**: الأساس والتحديثات المفهومية (بلا شاشات تفصيلية).

## PART 1 — الأساس والتحديثات المفهومية

### 0. ما تحققت منه في الكود قبل الكتابة

**0.1 ما لم أجده في الملفات التي استلمتها**

- وثيقة «مخطط واجهة متجرك» المرفقة تنتهي عند القسم 8، ولا تحتوي على أي قسم 9 ولا على «ملحق (أ)». فلم أرَ 9.7 الأصلية ولا ReauthSheet في 9.1.
- لذلك كتبتُ هنا 9.7 و9.12 و9.13 **كتعريف كامل من الصفر**، ووضعتُ في رأس كل جدول متأثر عبارة الإلغاء المطلوبة. إن كان الملحق (أ) يحمل أسماء صلاحيات أو سلوكاً يخالف ما هنا فأرسله لأوحّده قبل PART 2.

**0.2 ما وجدته في الكود الفعلي**

| الملف | ما وجدته | الأثر على هذه الوثيقة |
| --- | --- | --- |
| `src/components/ui/` | 10 أغلفة: `MuiButton`, `MuiChip`, `MuiChipGroup`, `MuiDataGrid`, `MuiDialog`, `MuiIconButton`, `MuiSelect`, `MuiSnackbar`, `MuiSwitch`, `MuiTextField` | لا يوجد غلاف لـ BottomSheet ولا Card ولا Tabs ولا Badge ولا List. و`Menu` يُستورد مباشرة في `Sidebar.tsx` |
| `MuiButton` | `variant`: contained / outlined / text فقط، وألوان `secondary/success/error/warning` بقيم hex ثابتة | لا يوجد `tonal`، وهذا يخالف مبدأ «لا ألوان ثابتة» |
| `MuiTextField` و`MuiSelect` | لا خاصية `variant` (outlined / filled) | حقل البحث pill يحتاج خاصية جديدة |
| `MuiDialog` | `maxWidth` من sm إلى full، و`title` و`actions` | لا سلوك «شاشة كاملة على الموبايل» مدمج |
| `src/types/index.ts` | لا يوجد User ولا Role ولا Shift ولا Batch ولا AuditLog. `Invoice.cashierName` نص حر. `InvoiceStatus` يحوي `voided` فعلاً. المبالغ `number` عشرية | كل الواجهات الجديدة في القسم 5 إضافية |
| `Customer.balance` | تعليق النوع يقول «موجب = دائن للمتجر»، بينما `CustomersScreen` يلوّن الموجب كمستحق (عنبري) | **تناقض يجب حسمه في Phase 0** لأن تجاوز الحد الائتماني يعتمد على إشارة الرصيد |
| `StoreContext.tsx` | لا مستخدم ولا وردية. `checkoutInvoice` بلا `shiftId` أو `userId`. `refundInvoice(id)` كلي وبلا صلاحية. `deleteExpense` و`deleteProduct` حذف فعلي. `restoreFromDatabase` و`resetToSampleData` و`loadBenchmarkStressTest` مدمرة | تتعارض مع 9.13 وتُعالج في Checklist |
| `storage.ts` و`CashierScreen.tsx` | قاعدة واحدة في `localStorage` بمفتاح `matjark_store_db_v2_egp`، والفواتير المعلقة بمفتاح `matjark_pos_held_sales_v1` | سجل التدقيق لا يوضع في أي منهما (القسم 6) |
| `src/index.css` | رموز `--md-sys-color-*` موجودة نهارياً (`:root`) وليلياً (`.dark`). لا توجد أي رموز `--matjark-*` | رموز النجاح والتحذير (3.2) تُنشأ في Phase 0 |

**0.3 قرارات حاسمة للتعارضات بين النسخ**

| البند | النسخة السابقة | المعتمد الآن |
| --- | --- | --- |
| المرتجع الكامل والجزئي | ممنوع على الكاشير | مسموح **بموافقة مدير عبر PIN** |
| خصم أكبر من 10% | ممنوع على الكاشير | مسموح بموافقة مدير |
| تجاوز الحد الائتماني | في 5.6: «للمدير: خيار تجاوز بـ PIN» | مسموح بموافقة مدير، وتُوحَّد في 9.12 |
| حذف صنف بعد إضافته للسلة | حر | مسموح بموافقة مدير بعد فترة سماح (9.7) |
| ReauthSheet و OverrideSheet | مكوّنان منفصلان (افتراض) | **مكوّن واحد** `ReauthSheet` بخاصية `mode` (9.12) |
| «المتوقع في الدرج» | ظاهر دائماً | يظل ظاهراً في بطاقة الوردية، ويُخفى داخل Dialog التقفيل فقط (6.6.3) |

### 9.7 مصفوفة الصلاحيات

> **مُحدَّث في هذه النسخة، يُلغي ما سبق في 9.7.**

الرموز: ✓ مباشر · 🔒 بموافقة مدير عبر PIN · ✗ ممنوع · `*` ضمن السقف في الجدول الثاني، وما فوقه يُطلب مستوى أعلى.

| الإجراء (`actionKey`) | كاشير | مشرف | مدير | مالك | محاسب | Audit |
| --- | --- | --- | --- | --- | --- | --- |
| `sale.create` / `sale.hold` | ✓ | ✓ | ✓ | ✓ | ✗ | لا |
| `sale.discount.up_to_10` | ✓ | ✓ | ✓ | ✓ | ✗ | لا |
| `sale.discount.over_10` | 🔒 | ✓\* | ✓\* | ✓ | ✗ | **نعم** |
| `refund.partial` | 🔒 | ✓\* | ✓\* | ✓ | ✗ | **نعم** |
| `refund.full` | 🔒 | 🔒 | ✓\* | ✓ | ✗ | **نعم** |
| `credit.limit.exceed` | 🔒 | 🔒 | ✓\* | ✓ | ✗ | **نعم** |
| `cart.remove_after_add` | 🔒 | ✓ | ✓ | ✓ | ✗ | **نعم** |
| `invoice.void_open_shift` | 🔒 | 🔒 | ✓ (بشروط 9.13) | ✓ | ✗ | **نعم** |
| `receipt.reprint` | ✓ (ورديته فقط) | ✓ (اليوم) | ✓ | ✓ | ✓ قراءة | **نعم** |
| `drawer.cash_in` / `drawer.cash_out` | ✓ حتى الحد، 🔒 فوقه | ✓\* | ✓ | ✓ | ✗ | **نعم** |
| `shift.open` / `shift.close` (أعمى) | ✓ | ✓ | ✓ | ✓ | ✗ | **نعم** |
| `shift.reopen` | ✗ | ✗ | ✗ | ✓ | ✗ | **نعم** |
| `product.price_edit` / `product.archive` | ✗ | ✗ | ✓ | ✓ | ✗ | **نعم** |
| `stock.adjust` | ✗ | 🔒 | ✓ | ✓ | ✗ | **نعم** |
| `purchase.create` | ✗ | ✗ | ✓ | ✓ | ✓ | **نعم** |
| `reports.financial.view` | ✗ | ✗ | ✓ | ✓ | ✓ | لا |
| `tax.decision.approve` | ✗ | ✗ | ✗ | ✓ | ✓ | **نعم** |
| `user.manage` / `security.settings` | ✗ | ✗ | ✗ | ✓ | ✗ | **نعم** |
| `backup.export` | ✗ | ✗ | ✓ | ✓ | ✓ | **نعم** |
| `backup.restore` | ✗ | ✗ | ✗ | ✓ | ✗ | **نعم** |

**قرار فترة السماح لحذف السطر (`cart.remove_after_add`):** الحذف خلال 30 ثانية من إضافة السطر (تصحيح مسح خاطئ) مباشر ويُسجَّل بسطر خفيف، والحذف بعدها أو بعد عرض الإجمالي للعميل أو بعد الطباعة يحتاج موافقة. القيمة قابلة للضبط (`cartRemoveGraceSeconds`). هذا تحديد لي لأن الحرفية تجعل كل مسح خاطئ يحتاج PIN.

#### جدول حدود الموافقة

> **مُحدَّث في هذه النسخة، يُلغي ما سبق في 9.7.**

كل القيم افتراضات مبدئية للتأكيد، وتُضبط في الإعدادات > الأمان > سياسة الموافقات.

| الإجراء | سقف المشرف | سقف المدير | فوق المدير | Audit |
| --- | --- | --- | --- | --- |
| خصم أكبر من 10% | حتى 20% | حتى 50% | المالك | نعم |
| مرتجع جزئي | حتى 500 ج.م | حتى 5,000 ج.م | المالك | نعم |
| مرتجع كامل | لا يوافق | حتى 5,000 ج.م | المالك | نعم |
| تجاوز الحد الائتماني | لا يوافق | حتى 25% فوق الحد | المالك (وأي عميل متأخر أكثر من 60 يوماً) | نعم |
| حذف سطر بعد الإضافة | يوافق (بلا سقف مبلغ) | يوافق | لا ينطبق | نعم |
| حذف/إلغاء فاتورة في وردية مفتوحة | لا يوافق | يوافق بشروط 9.13 | المالك إن لم تتحقق الشروط | نعم |
| سحب/إيداع نقدي من الدرج | حتى 1,000 ج.م | أي مبلغ | لا ينطبق | نعم |

**أسئلة الحدود:**

| السؤال | القرار |
| --- | --- |
| هل يوجد سقف للمبلغ؟ | نعم، في الجدول أعلاه، وكل سقف له مستوى أعلى يتجاوزه |
| هل يستطيع المشرف الموافقة على بعضها؟ | نعم، ضمن سقفه فقط، وتتطلب صلاحية `override.manage` المفعَّلة له |
| ماذا لو الكاشير نفسه مدير؟ | لا يمر تلقائياً بلا أثر: إن كانت آخر إعادة مصادقة له خلال 5 دقائق يمر دون سؤال جديد، وإلا يُطلب PIN مرة واحدة. تُسجَّل الموافقة `selfApproved: true`. ولا يوافق مدير على إجراء **هو** طلبه فوق سقف المدير، بل يلزم مالك |
| هل يوجد حد أقصى لعدد Override في الوردية؟ | نعم. لكل كاشير: عند 5 موافقات ممنوحة تظهر علامة تنبيه في تقرير الوردية، وعند 15 يتوقف إلا بموافقة المالك |
| هل الموافقة تبقى صالحة؟ | لا. تُستعمل مرة واحدة فقط لإجراء واحد، وصلاحيتها 60 ثانية |

### 6.6 الوردية: التقفيل الأعمى (Blind Close)

> **مُحدَّث في هذه النسخة، يعدّل 6.6 السابق.**

**6.6.1 المبدأ:** من يقفل الوردية يعدّ الدرج ويُدخل المبلغ **قبل أن يرى المتوقع**. ينطبق ذلك على أي مستخدم يقفل، مدير أو كاشير.

**6.6.2 المراحل الثلاث**

| المرحلة | ما يظهر داخل Dialog التقفيل | الكاشير | المدير (خارج Dialog) | التقرير المطبوع | وجهة الفرق |
| --- | --- | --- | --- | --- | --- |
| **(أ) قبل إدخال المبلغ الفعلي** | اسم الكاشير، وقت الفتح، المدة، الرصيد الافتتاحي، **عدد** الفواتير، مجاميع الدفع غير النقدي (بطاقة، محفظة، آجل). حقل «المبلغ الفعلي بالدرج» وعدّاد الفئات 5 إلى 200 ج.م. **مخفي:** المتوقع، المبيعات النقدية، المرتجعات النقدية، مجاميع حركات الدرج | يرى المعروض فقط | يرى كل شيء في بطاقة الوردية، لكن Dialog التقفيل نفسه أعمى لأي مستخدم | لا يُطبع شيء قبل التأكيد | لا فرق بعد |
| **(ب) بعد الإدخال وقبل التأكيد** | المبلغ المُدخل بخط كبير مع تفصيل الفئات، وحقل ملاحظة اختياري، و`Switch` «طباعة التقرير». زر `filled` «تأكيد المبلغ» و`text` «تعديل» | يرى ما أدخله فقط، **بلا فرق** | لا يتغير | لا يُطبع | لا فرق بعد |
| **(ج) بعد التقفيل** | شاشة نتيجة: المتوقع والفعلي والفرق (مجمَّدة) وحالة الوردية «مقفلة» | يرى النتيجة كاملة بعد التأكيد | يرى كل شيء + سجل إعادة العدّ والملاحظة | تقرير كامل: المتوقع، الفعلي، الفرق، الملاحظة، اسم المقفِل | يُسجَّل كحركة `shift_variance` على نفس الوردية في `CashDrawerMovement`، ويظهر في الحسابات > ملخص كبند مستقل «فروق الدرج». ليس مصروفاً ولا إيراداً، ويراجعه المحاسب |

**Audit: نعم.** يُسجَّل: `shift.close.started` و`shift.close.confirmed` (المبلغ المُدخل، الفئات، عدد مرات العدّ) و`shift.close.variance` (المتوقع، الفعلي، الفرق، الملاحظة).

**قاعدة الفرق:** إن كان الفرق ضمن هامش التسامح (افتراضي 5 ج.م) تُقفل الوردية مباشرة. إن تجاوزه يُكشف الفرق للمقفِل، ويُسمح له بـ **إعادة عدّ واحدة فقط**، ثم تُلزمه ملاحظة قبل الإغلاق النهائي. كل عدّ يُسجَّل في audit، وبذلك لا يمكن ضبط الرقم على الفرق المعروف دون أثر.

**6.6.3 هل «المتوقع في الدرج» يظل ظاهراً في بطاقة الوردية اليومية؟**

المعتمد (افتراضك): **نعم يظل ظاهراً في البطاقة، ويُخفى فقط داخل Dialog التقفيل.**

**تحذير:** هذا يُضعف الغرض من الإغلاق الأعمى. الكاشير يستطيع ببساطة قراءة المتوقع من البطاقة قبل فتح Dialog ثم كتابته. للتخفيف أضفتُ إعداداً `blindCloseStrict` في الإعدادات > الأمان:

| القيمة | السلوك |
| --- | --- |
| `false` (الافتراضي المعتمد) | المتوقع ظاهر في البطاقة لكل الأدوار |
| `true` (موصى به للمحال التي بها أكثر من كاشير) | المتوقع **مخفي عن دور الكاشير والمشرف** طوال الوردية المفتوحة، ويظهر للمدير والمالك والمحاسب فقط |

**6.6.4 حالات الحافة**

| الحالة | السلوك | Audit |
| --- | --- | --- |
| أغلق الكاشير التطبيق قبل التأكيد | تبقى الوردية `open`، وتُحفظ مسودة تقفيل محلية (المبلغ والفئات والوقت). عند الفتح التالي يظهر شريط «تقفيل غير مكتمل» وزر «متابعة». المسودة لا تُعدّ تقفيلاً ولا تكشف أي فرق، وتنتهي بعد 12 ساعة | `shift.close.draft_saved` / `draft_discarded` |
| الوردية مفتوحة باسم كاشير والجهاز مع آخر | لا يقفلها إلا مدير أو مالك، بصفة «نيابة عن» | `shift.close.on_behalf_of` |
| اكتُشف خطأ بعد التأكيد | لا تعديل على الوردية. المدير يضيف «تسوية بعد التقفيل» (`post_close_adjustment`) بمبلغ وسبب إلزامي، والمالك إن تجاوز سقف المدير | `shift.adjustment.added` |
| من يعيد فتح وردية مقفولة | **المالك فقط**، بسبب إلزامي، بشرط عدم فتح وردية تالية على نفس الدرج ولا إقفال فترة محاسبية لاحقة. تُنشأ `revision` جديدة ولا تُمسح لقطة التقفيل الأصلية | `shift.reopened` |

### 9.12 موافقة المدير (Manager Override)

**9.12.1 المكوّنات الجديدة (كلها غير موجودة اليوم في `src/components/ui/`)**

| الاسم | Props المقترحة | أين يُستخدم | إنشاء في `src/components/ui` |
| --- | --- | --- | --- |
| `ReauthSheet` | `open`, `mode: 'session_unlock' \| 'sensitive_action' \| 'manager_override'`, `actionKey?`, `summary?: OverrideSummaryRow[]`, `requesterId`, `eligibleApproverIds?`, `maxAttempts?` (3), `lockSeconds?` (60), `lockedApproverId?`, `freshAuthWindowMs?` (300000), `onSelfApproved?()`, `onGranted(grant: OverrideGrant)`, `onCancel()` | الكاشير، الفواتير، العملاء (الحد الائتماني)، الوردية والدرج، الإعدادات | لا، يوضع في `src/components/auth/` لأنه يعتمد على منطق الصلاحيات |
| `MuiBottomSheet` | `open`, `onClose`, `title?`, `children`, `actions?`, `dismissible?` (true), `maxWidth?` (560) | كل نافذة سفلية (الدفع، الاختيار، التفاصيل) | **نعم** |
| `PinField` | `value`, `onChange`, `length` (4 إلى 6), `variant: 'boxes' \| 'dots'` (`dots` للقفل، 10.3), `error?`, `disabled?`, `autoFocus?`, `onComplete?`, `ariaLabel` | `ReauthSheet`، وشاشة الدخول (PART 2) | **نعم** |
| `PermissionGate` | `permission` (مفتاح)، `actionKey?`, `children`, `fallback?`, `onNeedOverride?(actionKey)` + hook `usePermission(key)` يعيد `'allow' \| 'override' \| 'deny'` | كل زر إجراء حساس | لا، في `src/components/auth/` |

**9.12.2 المشغّل:** كل إجراء له 🔒 في 9.7 للمستخدم الحالي. يقرأ `PermissionGate` النتيجة `'override'` فيفتح `ReauthSheet` بوضع `manager_override` قبل تنفيذ الإجراء، ولا يُنفَّذ شيء حتى تصل `onGranted`.

**9.12.3 بنية الـ Sheet من الأعلى للأسفل**

1. مقبض السحب.
2. العنوان «موافقة المدير» `title-large`، وتحته اسم الإجراء `body-medium`.
3. بطاقة `outlined` للقراءة فقط (الجدول 9.12.7): كل صف تسمية `body-small` على `on-surface-variant` وقيمة `title-medium`. لا يمكن تعديلها من هنا.
4. `Select` «المعتمِد»: يعرض فقط المستخدمين الذين يملكون `override.manage` ويقع الإجراء ضمن سقفهم. إن وُجد معتمد واحد يُختار تلقائياً.
5. `PinField` (4 إلى 6 خانات) مع نص مساعد «المحاولات المتبقية: 3».
6. `Button text` «استخدم كلمة المرور» يستبدل الحقل بـ `TextField` من نوع password.
7. أسفل الشاشة: `Button text` «إلغاء» و`Button filled` بحجم كبير 56dp «موافقة».

العرض: `BottomSheet` بعرض كامل على الموبايل، وبحد أقصى 560dp ومتمركز على الكمبيوتر.

**9.12.4 PIN الخاطئ**

| المحاولة | ما يحدث | Audit |
| --- | --- | --- |
| 1 و2 | اهتزاز خفيف للحقل، مسح الأرقام، «PIN غير صحيح، تبقى N محاولات» | `override.denied.pin_failed` (رقم المحاولة) |
| 3 | يُغلق الـ Sheet ويُلغى الإجراء. **الجلسة والسلة والفاتورة تبقى كما هي، ولا تسجيل خروج.** يُقفل مسار الموافقة على هذا الجهاز 60 ثانية (الزر يعرض «حاول بعد 60 ث») ويظهر `Snackbar` بلون error | `override.locked` |
| جولة ثانية (3 فشلات أخرى) | قفل 5 دقائق وعلامة `security.alert` تظهر في تقرير الوردية | `security.alert` |
| جولة ثالثة | يُطلب من **الكاشير** إعادة إدخال PIN الخاص به عند أي إجراء حساس تالٍ، وتظهر علامة في تقرير الوردية | `security.reauth_required` |

**قرار:** القفل على مستوى **الجهاز والمسار**، لا على حساب المعتمِد. لو قفلنا حساب المدير لاستطاع أي كاشير تعطيل المدير عمداً بتخمين PIN. وبالمثل لا نسجّل خروج الكاشير في منتصف بيع حتى لا نفقد السلة.

**9.12.5 مستخدم بلا صلاحية `override.manage`**

- لا يظهر في قائمة المعتمِدين. إن أدخل شخص PIN مستخدم لا يملك الصلاحية فالرسالة «هذا المستخدم لا يملك صلاحية الموافقة»، وتُحسب محاولة فاشلة (حتى لا يُستخدم للاستكشاف)، وتسجَّل `override.denied.no_permission`.
- إن اختار الطالب نفسه وهو لا يملكها، يُرفض. وإن كان يملكها فتنطبق قاعدة الموافقة الذاتية في 9.7.
- إن لم يوجد أي معتمِد مؤهل، تظهر «لا يوجد معتمِد لهذا الإجراء» ويبقى الإجراء محظوراً. **المالك مؤهل دائماً**.

**9.12.6 الإغلاق دون كسر الجلسة:** زر إلغاء، أو ✕، أو Esc، أو سحب لأسفل. كلها تُلغي الإجراء فقط بلا أي أثر جانبي: السلة والحقول المفتوحة تبقى، ويعود التركيز إلى الزر الذي فتح الـ Sheet. وتُغلق تلقائياً بعد 90 ثانية خمولاً. يُسجَّل `override.cancelled`.

**9.12.7 ما يُعرض في الـ Sheet لكل إجراء**

| الإجراء | الصفوف المعروضة (قراءة فقط) |
| --- | --- |
| `refund.full` | رقم الفاتورة، التاريخ، العميل، الإجمالي، طريقة الدفع الأصلية، المبلغ المسترد، طريقة الاسترداد، السبب، الكاشير الأصلي |
| `refund.partial` | نفس السابق مع الأصناف المرتجعة وكمياتها وصافي المسترد |
| `sale.discount.over_10` | الصنف أو الفاتورة، النسبة والمبلغ، السعر قبل وبعد، الهامش بعد الخصم، سقف المعتمِد |
| `credit.limit.exceed` | العميل، رصيده الحالي، الحد، قيمة الفاتورة، الرصيد بعدها، تاريخ آخر سداد |
| `cart.remove_after_add` | الصنف، الكمية، السعر، منذ متى أُضيف، عدد مرات الحذف في هذه الفاتورة |
| `invoice.void_open_shift` | رقم الفاتورة، الإجمالي، حالة الطباعة، طريقة الدفع، الوردية، السبب |
| `drawer.cash_in` / `cash_out` | النوع، المبلغ، فئة السبب، بند الملاحظة. **لا يُعرض رصيد الدرج المتوقع** (لتبقى الوردية عمياء) |
| `stock.adjust` | الصنف، الكمية قبل وبعد، سبب التسوية |

**9.12.8 سياسة «Override المعلّق»:** **لا يوجد في MVP.** القرار موثَّق: لا مزامنة بين الأجهزة، فلا طريق لوصول الطلب إلى جهاز المدير. عند غيابه يرى الكاشير «تعذّر الحصول على موافقة» مع خيارات: تعليق الفاتورة، أو إتمامها بدون الإجراء الحساس، أو المحاولة لاحقاً. تبقى الحالة `pending` محجوزة في النوع `OverrideRequest` لمرحلة المزامنة اللاحقة.

**9.12.9 العلاقة بـ ReauthSheet (9.1):** مكوّن **واحد**، يختلف بالخاصية `mode`:

| `mode` | من يُدخل PIN | الملخص | الصلاحية الناتجة |
| --- | --- | --- | --- |
| `session_unlock` | المستخدم نفسه | لا يوجد | يفتح الجلسة |
| `sensitive_action` | المستخدم نفسه | اختياري | يؤكد هوية الفاعل لمرة واحدة |
| `manager_override` | معتمِد آخر أو نفسه (9.7) | **إلزامي** | `OverrideGrant` لإجراء واحد، صالح 60 ثانية |

**Audit: نعم.** يُسجَّل لكل عملية: `requesterId`, `approverId`, `actionKey`, `targetType/targetId`, لقطة الملخص، النتيجة، رقم المحاولة، `deviceId`, `selfApproved`.

### 9.13 السجل غير القابل للتعديل (Immutable Ledger)

**9.13.1 القواعد الصريحة**

1. لا حذف ولا تعديل لفاتورة مكتملة أو سند صرف معتمد أو حركة درج مسجَّلة. تُمنع على مستوى دوال `StoreContext` لا في الواجهة فقط.
2. التصحيح يتم بإشعار دائن `CreditNote` مرتبط بالفاتورة الأصلية (`invoiceId` و`invoiceNumber`).
3. أرقام الفواتير تسلسلية بلا فجوات، والفاتورة الملغاة `voided` تحتفظ برقمها ولا يُعاد استخدامه.
4. المنتج والعميل والمورد الذين لهم حركات لا يُحذفون، بل يُؤرشفون (`archivedAt`).
5. المصروف المعتمد يُعكس بقيد معاكس (`reverseExpense`) ولا يُحذف.
6. تغيير سعر أو تكلفة صنف لاحقاً لا يمس الفواتير القديمة (لقطة الفاتورة).
7. الاستعادة وإعادة التهيئة عمليات مدمرة: للمالك فقط، بنسخة احتياطية تلقائية قبلها، وAudit. وتُخفى `loadBenchmarkStressTest` و`resetToSampleData` في الإصدار الإنتاجي.

**9.13.2 ظهور الفاتورة والمرتجع في قائمة واحدة (6.4)**

- تحت الفاتورة الأصلية صف فرعي مُزاح بأيقونة ↩ ورقم `CN-…` والمبلغ **بالسالب** بلون `error`.
- شارة الفاتورة الأصلية «مرتجعة جزئياً» أو «مرتجعة»، وعمود «الصافي» = الإجمالي − مجموع الإشعارات الدائنة.
- تبويب «مرتجعة» يعرض الإشعارات الدائنة نفسها مع رابط للفاتورة الأصلية.
- الموبايل: سطر إضافي في البطاقة «ما أُرجع: …».
- بطاقات KPI: صافي المبيعات = المبيعات − الإشعارات الدائنة (لا تُعرض المرتجعات وحدها كإيراد سالب).

**9.13.3 الإجابات الصريحة (أ إلى و)**

| السؤال | القرار | السبب | Audit |
| --- | --- | --- | --- |
| **(أ)** هل يمكن حذف فاتورة في وردية مفتوحة؟ | **لا حذف فعلي أبداً.** يُسمح بـ**إلغاء إداري** (`voided`) بشروط مجتمعة: الوردية ما زالت مفتوحة، `printCount = 0` ولم يُرسل إيصالها رقمياً، لم يُستلم عليها نقد (آجل أو غير نقدي، وغير النقدي يتطلب رقم مرجع لعكس العملية)، موافقة مدير، وسبب إلزامي. النتيجة: تبقى ظاهرة مشطوبة، وتعكس المخزون ورصيد العميل بحركات معاكسة | قبل الطباعة والنقد لم يخرج التزام خارجي. بعدهما يصير الحذف إخفاء لحركة ورقية أو نقدية، فيُعالج بإشعار دائن. وإن أُرسلت الفاتورة إلى ETA فلا إلغاء، إشعار دائن فقط | نعم |
| **(ب)** المدير غائب، هل يوجد طلب موافقة معلّق؟ | **لا** في MVP (9.12.8) | لا مزامنة بين الأجهزة | نعم (`override.cancelled`) |
| **(ج)** إعادة الطبع تعيد البيانات حرفياً؟ | **نعم**، من لقطة الفاتورة المجمَّدة (9.13.4) | الفاتورة وثيقة، لا تُعاد حسابها | نعم |
| **(د)** المرتجع يعيد المخزون للدفعة الأصلية أم لجديدة؟ | للأصلية إن وُجدت وكانت صلاحيتها سارية، وإلا لدفعة جديدة (9.13.5) | تتبع الصلاحية والتكلفة | نعم |
| **(هـ)** PIN خاطئ 3 مرات؟ | يُغلق الـ Sheet ويُلغى الإجراء ويُقفل المسار على الجهاز 60 ثانية، **والجلسة تبقى** (9.12.4) | لا فقدان لبيع جارٍ ولا تعطيل للمدير | نعم |
| **(و)** السحب والإيداع النقدي من الدرج يحتاجان PIN مدير؟ | حتى 200 ج.م للحركة الواحدة وبمجموع 500 ج.م في الوردية: بلا PIN لكن بسبب إلزامي. فوق ذلك PIN مدير (المشرف حتى 1,000 ج.م). والسحب للخزنة (`safe_drop`) فوق 200 ج.م يتطلب PIN دائماً | حركة بلا PIN قد تخفي عجزاً، فنقيّدها بسقف وسبب | نعم |

**9.13.4 إعادة طباعة الإيصال**

- **نفس البيانات حرفياً:** الأسطر والأسعار والضرائب وبيانات ETA وبيانات المتجر وقت البيع، من `receiptSnapshot` المجمَّد، لا من الإعدادات الحالية. اسم المتجر أو عنوانه لو تغيّرا لاحقاً يبقى القديم على النسخة (والنوع `Invoice` الحالي لا يحمل بيانات المتجر، فيُضاف `receiptSnapshot`).
- **علامة مائية** مائلة «نسخة» وسطر في الرأس.
- **التذييل:** «أُعيدت الطباعة بتاريخ {وقت} بواسطة {المستخدم}».
- يزيد `reprintCount`. **Audit: نعم.**

**9.13.5 المرتجع والدفعات**

1. لكل سطر مُرجَع نحدد الدفعات التي خرج منها (`batchAllocations` على سطر الفاتورة).
2. إن كانت الدفعة الأصلية موجودة وصلاحيتها تتجاوز `minShelfLifeDaysForRestock` (افتراضي 7 أيام) وسبب المرتجع ليس «تالف» تُعاد إليها الكمية.
3. وإلا تُنشأ **دفعة جديدة** بتاريخ اليوم و`sourceCreditNoteId` وبتكلفة الدفعة الأصلية، وبصلاحية الأصل إن كانت سارية، أو تُحال إلى الحجر (`quarantine`).
4. الأصناف غير المتتبَّعة بالدفعات: زيادة رصيد فقط.
5. المرتجع التالف لا يدخل المخزون القابل للبيع ويُسجَّل قيد هالك.

**Audit: نعم.** يُسجَّل لكل مرتجع الدفعات المتأثرة قبل وبعد.

**9.13.6 سياسة الاحتفاظ بـ audit\_log:** 5 سنوات افتراضياً (تُزاد ولا تُنقَص). لا حذف تلقائي: بعد المدة يُصدَّر JSONL مختوماً بتجزئة، ثم لا يُحذف إلا بإجراء صريح من المالك. التفصيل في القسم 6.

## 5. واجهات TypeScript المضافة إلى `src/types/index.ts`

**قواعد التوافق:** كلها **إضافية**. لا تُحذف ولا تُغيَّر أي واجهة موجودة. التواريخ `number` (epoch ms) كالموجود. المبالغ `ScaledMoney` والنِّسب `BasisPoints` المعرَّفان في مرحلة الضرائب، **ولا يُعاد تعريفهما هنا** (فلا ترحيل ثانٍ للمبالغ). المفاتيح من 9.7.

```ts
// ===== الصلاحيات (9.7) =====
// لماذا: قائمة مغلقة تمنع أخطاء الكتابة في actionKey وتُستخدم في PermissionGate وaudit_log.
export type PermissionKey =
  | 'sale.create' | 'sale.hold' | 'sale.discount.up_to_10' | 'sale.discount.over_10'
  | 'refund.partial' | 'refund.full' | 'credit.limit.exceed' | 'cart.remove_after_add'
  | 'invoice.void_open_shift' | 'receipt.reprint' | 'drawer.cash_in' | 'drawer.cash_out'
  | 'shift.open' | 'shift.close' | 'shift.reopen' | 'product.price_edit' | 'product.archive'
  | 'stock.adjust' | 'purchase.create' | 'reports.financial.view' | 'tax.decision.approve'
  | 'user.manage' | 'security.settings' | 'backup.export' | 'backup.restore' | 'override.manage'
  | 'sale.below_cost' | 'inventory.view' | 'invoices.view' | 'customers.view' | 'customers.manage'
  | 'accounts.view' | 'settings.view' | 'shift.view' | 'product.cost.view';

export type RoleKey = 'owner' | 'manager' | 'supervisor' | 'cashier' | 'accountant';

// لماذا: approvalTier يحدد أي سقف في جدول حدود الموافقة ينطبق (0 لا يوافق، 1 مشرف، 2 مدير، 3 مالك).
export interface Role {
  key: RoleKey;
  label: string;
  isSystem: boolean;
  approvalTier: 0 | 1 | 2 | 3;
}

export type PermissionEffect = 'allow' | 'override' | 'deny';

// لماذا: أقصى مبلغ أو نسبة يمكن لدور الموافقة عليها قبل التصعيد (9.7).
export interface OverrideCeiling {
  maxAmount?: ScaledMoney;
  maxPercentBp?: BasisPoints;
}

export interface Permission {
  key: PermissionKey;
  label: string;
  group: string;       // كاشير، مخزن، حسابات، أمان...
  sensitive: boolean;  // true يعني Audit دائماً
}

// لماذا: تعريف الدور لكل صلاحية (✓ / 🔒 / ✗ في المصفوفة) بدل تشفيرها في الكود.
export interface RolePermission {
  roleKey: RoleKey;
  permission: PermissionKey;
  effect: PermissionEffect;
  ceiling?: OverrideCeiling;
}

// لماذا: استثناء لمستخدم بعينه دون إنشاء دور جديد. يرتبط بـ User.
export interface UserPermissionOverride {
  id: string;
  userId: string;
  permission: PermissionKey;
  effect: PermissionEffect;
  grantedBy: string;
  reason: string;
  expiresAt?: number;
  createdAt: number;
}

// لماذا: لا مستخدمين في النظام اليوم (Invoice.cashierName نص حر). يحل محله userId تدريجياً.
export interface User {
  id: string;
  username: string;
  displayName: string;
  roleKey: RoleKey;
  pinHash: string;           // تجزئة + ملح، لا PIN خام أبداً
  pinSalt: string;
  kdf?: KdfParams;           // معاملات التجزئة (12.0.1)
  pinLength?: 4 | 5 | 6;     // عدد نقاط شاشة القفل (10.3)
  mustChangePassword?: boolean;
  quickPinEnabled?: boolean;
  failedLoginCount?: number;
  loginLockedUntil?: number;
  lastPasswordChangeAt?: number;
  avatarColorKey?: 'primary' | 'secondary' | 'tertiary' | 'error' | 'neutral';
  passwordHash?: string;
  passwordSalt?: string;
  isActive: boolean;
  lastLoginAt?: number;
  createdAt: number;
  createdBy: string;
  archivedAt?: number;       // لا حذف فعلي (9.13)
}

// ===== الوردية والدرج (6.6) =====
export type ShiftStatus = 'open' | 'closing' | 'closed';

// لماذا: ربط كل فاتورة وحركة درج بوردية. المتوقع يُحسب ويُخزَّن عند التأكيد فقط (إغلاق أعمى).
export interface Shift {
  id: string;
  shiftNumber: number;
  drawerId: string;
  deviceId: string;
  status: ShiftStatus;
  openedBy: string;
  openedAt: number;
  openingBalance: ScaledMoney;
  closedBy?: string;
  closedOnBehalfOf?: string;   // عند إقفال المدير نيابة عن كاشير
  closedAt?: number;
  countedCash?: ScaledMoney;
  expectedCash?: ScaledMoney;  // لا يُعبَّأ قبل التأكيد
  variance?: ScaledMoney;
  varianceNote?: string;
  recountCount: number;        // مسموح بواحدة فقط
  revision: number;            // يزيد عند إعادة الفتح، ولا تُمحى اللقطة الأصلية
  countMethod?: 'denominations' | 'total';   // حقول التقفيل (11.4)
  denominations?: DenominationCount[];
  varianceReason?: 'count_error' | 'unrecorded_expense' | 'unrecorded_refund' | 'unknown';
  openingMismatchNote?: string;
  reportId?: string;
  overrideCountByUser: Record<string, number>;
}

export type DrawerMovementKind =
  | 'opening' | 'cash_sale' | 'cash_refund' | 'expense'
  | 'cash_out' | 'cash_in' | 'safe_drop'
  | 'shift_variance' | 'post_close_adjustment' | 'closing';

// لماذا: سجل لا يُعدَّل لكل حركة نقدية، منه يُحسب المتوقع ويُراجَع الفرق.
export interface CashDrawerMovement {
  id: string;
  seq: number;
  shiftId: string;
  kind: DrawerMovementKind;
  amount: ScaledMoney;         // موجب = داخل الدرج
  reasonCode?: string;
  note?: string;
  refType?: 'invoice' | 'credit_note' | 'expense' | 'purchase';
  refId?: string;
  userId: string;
  approvedBy?: string;
  overrideGrantId?: string;
  createdAt: number;
}

// ===== المشتريات والدفعات =====
// لماذا: لا فاتورة شراء اليوم (المشتريات مصروف نوع inventory_purchase). هذا يربط المورد والمخزون.
export interface PurchaseInvoiceLine {
  id: string;
  productId: string;
  productName: string;
  quantity: number;
  bonusQuantity?: number;
  unitCost: ScaledMoney;
  taxRateBp: BasisPoints;
  batchNumber?: string;
  expiryDate?: string;         // ISO
}

export interface PurchaseInvoice {
  id: string;
  number: string;
  supplierId: string;
  supplierInvoiceNumber?: string;
  date: number;
  lines: PurchaseInvoiceLine[];
  subtotal: ScaledMoney;
  taxTotal: ScaledMoney;
  total: ScaledMoney;
  paid: ScaledMoney;
  paymentMethod: PaymentMethod;
  status: 'draft' | 'posted' | 'reversed';
  reversalOf?: string;         // الإلغاء بقيد معاكس لا حذف
  shiftId?: string;
  postedBy: string;
  createdAt: number;
}

// لماذا: تتبع الصلاحية وإعادة المرتجع للدفعة الأصلية (9.13.5). يرتبط بـ Product.
export interface ProductBatch {
  id: string;
  productId: string;
  batchNumber: string;
  receivedAt: number;
  expiryDate?: string;
  quantityReceived: number;
  quantityRemaining: number;
  unitCost: ScaledMoney;
  sourceType: 'purchase' | 'opening' | 'credit_note' | 'adjustment';
  sourceId?: string;
  status: 'active' | 'quarantine' | 'expired' | 'depleted';
}

// ===== التدقيق والموافقات =====
export type AuditCategory =
  | 'auth' | 'override' | 'sale' | 'refund' | 'void' | 'drawer' | 'shift'
  | 'inventory' | 'purchase' | 'settings' | 'security' | 'backup' | 'tax';

// لماذا: سجل لا يُعدَّل ومتسلسل بالتجزئة (القسم 6). يُخزَّن في IndexedDB لا localStorage.
export interface AuditLogEntry {
  id: string;
  seq: number;                 // متزايد بلا فجوات
  createdAt: number;
  userId: string;
  userNameSnapshot: string;
  roleSnapshot: RoleKey;
  deviceId: string;
  sessionId: string;
  actionKey: string;           // مثل override.denied.pin_failed
  category: AuditCategory;
  severity: 'info' | 'warning' | 'critical';
  result: 'success' | 'denied' | 'failed' | 'cancelled';
  targetType?: string;
  targetId?: string;
  shiftId?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  reason?: string;
  approvedBy?: string;
  selfApproved?: boolean;
  overrideGrantId?: string;
  appVersion: string;
  prevHash: string;
  hash: string;
}

export interface OverrideSummaryRow {
  label: string;
  value: string;
}

// لماذا: طلب الموافقة (في الذاكرة في MVP، ويُسجَّل أثره في audit_log). pending محجوزة للمزامنة لاحقاً.
export interface OverrideRequest {
  id: string;
  actionKey: PermissionKey;
  requesterId: string;
  targetType: string;
  targetId?: string;
  summary: OverrideSummaryRow[];
  status: 'pending' | 'granted' | 'denied' | 'cancelled' | 'expired';
  approverId?: string;
  selfApproved: boolean;
  attempts: number;
  createdAt: number;
  resolvedAt?: number;
  grantId?: string;
}

// لماذا: إذن موافقة لإجراء واحد، ينتهي بعد 60 ثانية ولا يُستخدم مرتين.
export interface OverrideGrant {
  id: string;
  requestId: string;
  approverId: string;
  actionKey: PermissionKey;
  targetId?: string;
  issuedAt: number;
  expiresAt: number;
  consumedAt?: number;
}

// ===== الإشعار الدائن (9.13) =====
// لماذا: التصحيح الوحيد المسموح لفاتورة مكتملة. هذا التعريف هو نفسه CreditNote في مرحلة الضرائب (دمج في تعريف واحد).
export interface CreditNoteLine {
  id: string;
  productId: string;
  quantity: number;
  refundNet: ScaledMoney;
  refundTax: ScaledMoney;
  reasonCode: 'defective' | 'wrong_item' | 'changed_mind' | 'pricing_error' | 'other';
  batchAllocations: { batchId: string; quantity: number }[];
  restock: 'to_original_batch' | 'new_batch' | 'quarantine' | 'none';
}

export interface CreditNote {
  id: string;
  number: string;              // CN-...
  invoiceId: string;
  invoiceNumber: string;
  createdAt: number;
  shiftId?: string;
  userId: string;
  approvedBy?: string;
  overrideGrantId?: string;
  lines: CreditNoteLine[];
  totalRefund: ScaledMoney;
  refundMethod: 'cash' | 'original_method' | 'customer_balance' | 'exchange'; // exchange = رصيد للعميل يُستخدم في فاتورة جديدة (12.4.4)
  reason: string;
  rateRule: 'original' | 'effective_at_return';
  decisionId?: string;         // إلزامي لو rateRule = effective_at_return
}

// ===== حقول إضافية على Invoice (اختيارية، فلا تكسر الموجود) =====
// لماذا: إثبات الوردية والمستخدم، وإعادة الطبع الحرفية، وإلغاء إداري قبل الطباعة.
export interface InvoiceLedgerFields {
  shiftId?: string;
  userId?: string;
  printCount?: number;
  reprintCount?: number;
  receiptSnapshot?: Record<string, unknown>;  // بيانات المتجر والأسطر وقت البيع
  voidedAt?: number;
  voidedBy?: string;
  voidReason?: string;
  paymentReversalRef?: string;  // مرجع عكس العملية لغير النقدي
  etaSubmitted?: boolean;       // true يمنع الإلغاء، إشعار دائن فقط
}

// ===== سياسة الأمان في StoreSettings =====
// لماذا: كل الأرقام الافتراضية في 9.7 و6.6 قابلة للضبط من الإعدادات > الأمان.
export interface SecurityPolicySettings {
  cartRemoveGraceSeconds: number;      // 30
  blindCloseStrict: boolean;           // false
  varianceToleranceCents: ScaledMoney; // 5 ج.م
  drawerFreeLimit: ScaledMoney;        // 200 ج.م للحركة
  drawerFreeShiftTotal: ScaledMoney;   // 500 ج.م للوردية
  overrideWarnPerShift: number;        // 5
  overrideHardCapPerShift: number;     // 15
  minShelfLifeDaysForRestock: number;  // 7
  auditRetentionYears: number;         // 5
  ceilings: Record<string, Record<'supervisor' | 'manager', OverrideCeiling>>;
}
```

**تذكير:** `Invoice` يصبح `Invoice extends InvoiceLedgerFields`، و`StoreSettings` يضيف الحقل الاختياري `security?: SecurityPolicySettings`، فلا يتغير شكل أي حقل قائم.

## 6. هيكل audit\_log الموسّع

**التخزين:** قاعدة IndexedDB مستقلة `matjark_audit`، بمخزن `audit_log` **للإضافة فقط** (لا `put` ولا `delete` إلا دالة الأرشفة الخاصة بالمالك). لا يوضع في `localStorage` ولا في ملف `matjark_store_db_v2_egp`، لأن حدّه نحو 5MB وكل حفظ يعيد كتابة القاعدة كلها.

**6.1 الحقول:** كما في `AuditLogEntry` (القسم 5). تسلسل التجزئة: `hash = SHA-256(prevHash + JSON مُرتَّب المفاتيح للسجل بدون hash)` عبر `SubtleCrypto`، وأي كسر في السلسلة يُظهره زر «تحقق من سلامة السجل».

**6.2 الفهرسة المقترحة**

| الفهرس | الغرض |
| --- | --- |
| `seq` (فريد) | الترتيب والتحقق من عدم وجود فجوات |
| `[userId, createdAt]` | نشاط مستخدم |
| `[actionKey, createdAt]` | كل مرات إجراء بعينه |
| `[deviceId, createdAt]` | مصدر العملية |
| `[targetType, targetId]` | تاريخ كيان (فاتورة، وردية) |
| `shiftId` | تقرير الوردية |
| `createdAt` | الفلترة بالتاريخ |

**6.3 سياسة الاحتفاظ:** 5 سنوات (`auditRetentionYears`، تُزاد ولا تُنقَص). **أرشفة لا حذف تلقائي:** بعد المدة يُصدَّر ما تجاوزها إلى JSONL مختوم بتجزئة السجل الأخير، ثم لا يُحذف من القاعدة إلا بإجراء صريح من المالك مع Audit لعملية الأرشفة نفسها.

**6.4 التصدير مع النسخة الاحتياطية**

- `audit_log.jsonl`: سجل في كل سطر، UTF-8، بالترتيب التصاعدي لـ `seq`.
- `audit_manifest.json`: العدد، أول وآخر `seq`، تجزئة آخر سجل، وقت التصدير، المستخدم.
- CSV فقط للعرض البشري على نتيجة فلتر (لا يصلح للاستعادة).
- الاستعادة تتحقق من سلسلة التجزئة، وتُرفض النسخة المكسورة إلا بقرار المالك.

**6.5 العرض في الإعدادات > الأمان > سجل التدقيق** (مالك فقط، والمحاسب قراءة)

1. `Top App Bar`: العنوان يميناً، `IconButton` «تصدير» يساراً.
2. شريط فلاتر `Chips` قابل للتمرير: المستخدم، الفئة (`AuditCategory`)، النتيجة، الجهاز، وشريحة «التاريخ» تفتح منتقي من/إلى.
3. حقل بحث `filled` pill بالرقم المرجعي أو `actionKey`.
4. `MuiDataGrid`: الوقت، المستخدم، الإجراء، الهدف، النتيجة (شارة)، الجهاز. الصف ذو `severity: critical` بخلفية `error-container`.
5. الضغط على صف يفتح لوحة تفاصيل (`BottomSheet` على الموبايل): كل الحقول، وقبل وبعد جنباً إلى جنب.
6. الأسفل: `Button outlined` «تحقق من سلامة السجل»، و`Button text` «أرشفة السجلات القديمة» (مالك).

**Audit لعرض السجل وتصديره: نعم** (`audit.viewed`, `audit.exported`).

## 7. خارطة التنفيذ المرحلية المحدَّثة

#### 7.0 المرحلة أ: تصحيح الأخطاء الحسابية في الكود الحالي (قبل Phase 0)

أخطاء الفحص الأول تمس **فلوساً حقيقية من أول فاتورة**، ولا تعتمد على الدخول ولا الصلاحيات ولا الأنواع الجديدة. لذلك تُصلَّح أولاً، في الكود الحالي، بأرقام عشرية عادية (قبل `ScaledMoney`). هذه المرحلة **تصحح أسطراً قائمة في مكانها** ولا تدخل تحت قاعدة «إضافات فقط»، دون تغيير توقيع أي دالة. كل الأسطر أدناه تحققت منها في الكود الفعلي.

| الخطوة | الموضع (من الكود الفعلي) | الخطأ | الإصلاح | اختبار القبول |
| --- | --- | --- | --- | --- |
| **أ.1 ترقيم الفواتير** | `StoreContext.tsx` سطر 329 (`INV-${Date.now().toString().slice(-6)}`) وسطر 361 (`id`) | آخر 6 أرقام من الوقت تتكرر كل نحو 16.7 دقيقة، فقد تحمل فاتورتان الرقم نفسه | عدّاد تسلسلي محفوظ في القاعدة، صيغته `INV-YYYY-NNNNNN` (عدّاد لكل سنة). الأرقام القديمة تبقى كما هي ولا يُعاد استخدامها. والـ `id` يضيف لاحقة العدّاد | 1,000 عملية دفع متتالية تعطي أرقاماً فريدة بلا فجوات. وإعادة تحميل الصفحة تكمل العدّ. وفاتورة قديمة لا تتأثر |
| **أ.2 نسبة الضريبة الصفرية** | `StoreContext.tsx` سطر 200 وسطر 335، و`CashierScreen.tsx` سطر 847 (`item.taxRate \|\| defaultTaxRate \|\| 0.14`) | القيمة `0` تُعامل كأنها غير معرّفة فيُطبَّق 14% على الصنف المعفى | استبدال `\|\|` بـ `??` في المواضع الثلاثة. والتحقق أن نموذج المنتج يحفظ `0` كقيمة لا `undefined`. وفي `AccountingScreen.tsx` سطر 107 القيمة الثابتة `15` تصير النسبة الافتراضية من الإعدادات | صنف `taxRate = 0` والضريبة مفعلة: ضريبة السطر صفر. وصنف بلا نسبة: 14% كالمعتاد |
| **أ.3 الإيراد مع الخصم** | `AccountingScreen.tsx` سطر 49 و`utils/currency.ts` سطر 189 (`grossRevenue += inv.subtotal`) | `Invoice.subtotal` قبل الخصم، بينما `InvoiceItem.subtotal` بعده، فيتضخم الإيراد عند أي خصم | الإيراد = مجموع `item.subtotal` للأسطر. لا يتغير شيء عند غياب الخصومات (لا واجهة خصم اليوم، فالخطأ كامن) | فاتورة بخصم سطر: الإيراد يساوي الصافي بعد الخصم، وبدونه لا فرق عن السابق |
| **أ.4 العد المزدوج للمشتريات** | `AccountingScreen.tsx` سطر 61 إلى 63 و`currency.ts` (`totalExpenses += e.amount`) | مصروف التصنيف `inventory_purchase` يدخل في المصروفات وتكلفته تدخل أيضاً في `costOfGoodsSold` عند البيع | استبعاد التصنيف `inventory_purchase` من `totalExpenses` فقط (وتبقى ضريبته في ضريبة المدخلات)، مع عرضه بنداً معلوماتياً «مشتريات بضاعة» | مصروف شراء بضاعة 1,000 ج.م لا يخفض صافي الربح، والتكلفة لا تتغير |
| **أ.5 فشل الحفظ الصامت** | `utils/storage.ts` سطر 454 و455 (`catch` ثم `console.warn`) | عند امتلاء `localStorage` أو فشل الكتابة لا يعلم المستخدم، ويظن أن بياناته حُفظت | رد نداء `onSaveError` يسجّله `StoreContext` ويعرض `Snackbar` دائماً «تعذّر حفظ البيانات، صدّر نسخة احتياطية الآن». وحفظ فوري عند `visibilitychange` و`pagehide` إن كان مؤقت الـ 300ms معلّقاً | محاكاة خطأ كتابة تظهر الرسالة مرة واحدة بلا انهيار. وتعديل ثم التبديل لتبويب آخر خلال 300ms لا يفقد التعديل |
| **أ.6 ثلاثة إصلاحات صغيرة** | `CashierScreen.tsx` سطر 171 و`StoreContext.tsx` (دالة `checkoutInvoice`) و`ReportsScreen.tsx` سطر 86 | (أ) `selectedCustomerId` لا يُصفَّر بعد البيع. (ب) الدفع يقص المخزون عند الصفر بصمت بدل رفض البيع. (ج) `dayStart + 86400000` يخطئ في أيام التوقيت الصيفي (23 أو 25 ساعة) | (أ) تصفير العميل عند نجاح الدفع. (ب) فحص المخزون الحي داخل `checkoutInvoice` وإيقاف البيع مع `toast` خطأ إلا إن سمحت الإعدادات بالمخزون السالب (إعداد جديد افتراضيه `false`). (ج) بداية اليوم التالي بالتقويم المحلي | (أ) فاتورتان متتاليتان: الثانية بلا عميل. (ب) بيع 5 والمخزون 3: لا فاتورة ولا خصم من المخزون. (ج) يوم تغيير التوقيت يُحسب بحدوده الصحيحة |

**تصحيح لتقريري الأول:** لم أجد ترقيماً `EXP-` للمصروفات في الكود (المعرّف `exp-${Date.now()}` فقط)، فالتكرار المؤثر فعلياً هو في الفواتير. و`partially_refunded` لا يدخل مجاميع الإيراد لأن الشرط `status === 'completed'`، وهذا سلوك مقصود لا يُغيَّر في هذه المرحلة.

**خارج المرحلة أ عمداً:** الحذف الفعلي للمصروف والمنتج (`deleteExpense` و`deleteProduct`)، والمرتجع الجزئي، والوردية، وكل ما يلزمه نموذج بيانات جديد. تلك في المراحل 1 إلى 4.

| المرحلة | الملفات | مخاطر على `StoreContext` | معايير Done |
| --- | --- | --- | --- |
| **Phase 0** الأساس + المصادقة + audit\_log + Types | **إنشاء:** `src/storage/idb.ts`، `src/utils/audit.ts`، `src/utils/permissions.ts`، `src/utils/kdf.ts`، `src/utils/secureContextGuard.ts`، `src/context/AuthContext.tsx`، `src/components/ui/MuiBottomSheet.tsx`، `PinField.tsx`، `src/components/auth/ReauthSheet.tsx` و`PermissionGate.tsx`. **تعديل:** `types/index.ts` (الملحق أ)، `utils/storage.ts` (ترحيل إصدار القاعدة)، `index.css` (رموز `--matjark-success/warning`)، `MuiButton.tsx` (إضافة `tonal` وإزالة قيم hex)، `vite.config.ts` (إضافة `vite-plugin-mkcert`، تطوير فقط) | تغيير شكل `AppDatabase` يكسر `loadDatabase` و`restoreFromDatabase`. الفواتير القديمة بلا `shiftId`. إشارة `Customer.balance` | التطبيق يعمل كما كان بمستخدم مالك واحد. الدخول يُسجَّل في audit. نسخة قديمة تُستعاد دون فقد. الترجمة تحت `strict`. إشارة `Customer.balance` موثّقة ومتسقة بين النوع والشاشة |
| **Phase 1** الكاشير + Manager Override | **تعديل:** `CashierScreen.tsx` (`PermissionGate` على الخصم وحذف السطر وتجاوز الحد)، `StoreContext.tsx` (`checkoutInvoice` يقبل `userId` اختيارياً، وتحقق الخصم). **إنشاء:** `OverrideService` في `src/utils/overrides.ts` | الفواتير المعلقة بمفتاح `matjark_pos_held_sales_v1` قد تحمل لقطات قديمة. دالة `updateCartDiscount` غير موصولة اليوم | PIN خاطئ 3 مرات يغلق الـ Sheet بلا فقد للسلة. الموافقة لا تُستخدم مرتين. موافقة المدير الذاتية تُسجَّل. حذف سطر خلال 30 ثانية حر |
| **Phase 2** الوردية + Blind Close + CashDrawerMovement | **إنشاء:** `ShiftContext.tsx`، `ShiftScreen.tsx`، `OpenShiftSheet`، `CloseShiftDialog`، `DrawerMovementSheet`. **تعديل:** `checkoutInvoice` يربط `shiftId`، وتقرير الوردية المطبوع | إلزام وردية مفتوحة قد يوقف البيع. الحل: علَم `requireOpenShift` معطل افتراضياً حتى الاختبار | إغلاق أعمى لا يكشف المتوقع. إعادة عدّ واحدة. مسودة تبقى بعد إغلاق التطبيق. المتوقع يطابق الحركات يدوياً. الفرق يظهر في الحسابات |
| **Phase 3** المخزن + الفواتير + Immutable Ledger | **إنشاء:** `ProductBatch`، `PurchaseInvoice`، شاشات الدفعات والمشتريات، `createCreditNote`، `voidInvoice`، `reverseExpense`، عدّاد ترقيم تسلسلي. **تعديل:** استبدال `refundInvoice` و`deleteExpense`، وأرشفة المنتج بدل `deleteProduct` | استبدال `refundInvoice` يمس `InvoicesScreen`. ترحيل الفواتير القديمة لتحمل `receiptSnapshot`. تعارض `CreditNote` مع تعريف الضرائب | لا مسار في الكود يحذف فاتورة أو مصروفاً. مرتجع جزئي يعيد للدفعة الصحيحة. إعادة الطبع مطابقة حرفياً للأصل مع علامة «نسخة» |
| **Phase 4** الحسابات + الإعدادات + التقارير | **تعديل:** `AccountingScreen` (فلتر التاريخ، فروق الدرج)، `SettingsScreen` (الأمان وسجل التدقيق والنسخ)، تقارير بالفترة. **إنشاء:** مصدّر JSONL | الاعتماد على `computeAccountingMetrics` غير المستخدمة اليوم | تصدير واستعادة مع التحقق من السلسلة. الحسابات تعرض صافي المبيعات بعد الإشعارات الدائنة. كل القيم الافتراضية للأمان قابلة للضبط |

**ملاحظة ترتيب:** أنواع الضرائب (مرحلتها الأولى) تُدمج مع أنواع هذه الوثيقة في Phase 0 في ملف واحد، لأن `CreditNote` و`ScaledMoney` يظهران في الاثنتين.

## Checklist للتنفيذ (PART 1)

**يُنشأ**

- [ ] `src/storage/idb.ts`، `src/utils/audit.ts`، `src/utils/permissions.ts`، `src/utils/overrides.ts`، `src/utils/kdf.ts`، `src/utils/secureContextGuard.ts`
- [ ] `src/context/AuthContext.tsx`
- [ ] `src/components/ui/MuiBottomSheet.tsx`، `src/components/ui/PinField.tsx`
- [ ] `src/components/auth/ReauthSheet.tsx`، `src/components/auth/PermissionGate.tsx`

**يُعدَّل**

- [ ] `src/types/index.ts`: الملف المدموج كاملاً من الملحق (أ): الفهرس أ.1، والأنواع أ.3، والتركيب أ.4
- [ ] `src/index.css`: رموز `--matjark-success/warning` بالقيمتين النهارية والليلية
- [ ] `src/components/ui/MuiButton.tsx`: إضافة `tonal`، وإزالة الألوان الثابتة
- [ ] `src/utils/storage.ts`: ترحيل الإصدار مع مستخدم مالك افتراضي
- [ ] `src/context/StoreContext.tsx`: **إضافات فقط** (`currentUser`، `can()`، `userId` اختياري)، لا تغيير في توقيعات الدوال الحالية في هذا الجزء

**يُحذف أو يُخفى (في مراحله اللاحقة)**

- [ ] `deleteExpense` و`deleteProduct` الفعليان يُستبدلان بالعكس والأرشفة (Phase 3)
- [ ] `refundInvoice(id)` الكلي يُستبدل بـ `createCreditNote` (Phase 3)
- [ ] `loadBenchmarkStressTest` و`resetToSampleData` تُخفيان في الإصدار الإنتاجي
- [ ] `Navbar.tsx` غير المستخدم يُحذف بعد التأكد

**يُختبر**

- [ ] التطبيق بعد ترحيل القاعدة يعمل بلا تغيير ظاهر
- [ ] المصفوفة 9.7: كل خلية 🔒 تفتح `ReauthSheet`، وكل ✗ مخفي أو معطل
- [ ] PIN خاطئ 3 مرات: يُلغى الإجراء، تبقى الجلسة والسلة، قفل 60 ثانية
- [ ] الموافقة تُستهلك مرة واحدة وتنتهي بعد 60 ثانية
- [ ] سجل التدقيق: تسلسل `seq` بلا فجوات، وسلسلة التجزئة سليمة
- [ ] إشارة `Customer.balance` موحَّدة قبل ربط الحد الائتماني

**PART 1 جاهز — أكمل إلى PART 2؟**

---

## PART 2 — شاشات المصادقة الأربع

يعتمد على PART 1 (الأنواع في القسم 5، و9.12 الموافقة، و9.13 السجل). لا أعيد كتابتها، بل أشير إليها. الأقسام مرقّمة 10.1 إلى 10.7.

### 10.0 ما تحققت منه في الكود، وتعديلات على PART 1

**في الكود الفعلي:**

- `App.tsx` لا يحوي أي بوابة دخول. `StoreProvider` ثم `MainAppContent` مباشرة، والتنقل بشروط `activeTab === '...'` **بلا router**، فلا يوجد «مسار مباشر» لصفحة ممنوعة (يؤثر على NoAccess في 10.7).
- `Sidebar.tsx` يبني عناصره برمجياً بـ `createNavigationRail`، وفيه بالفعل عنصر `profile` («الملف الشخصي») وعنصر `theme`، ولا عنصر للعملاء. الـ `Menu` يُستورد من `material/react`.
- لا توجد أي مفاهيم دخول أو قفل أو كلمة مرور في الكود.

**تعديلات على PART 1 (طُبِّقت كلها في القسم 5 من PART 1):**

| التعديل | السبب |
| --- | --- |
| إضافة مفاتيح عرض إلى `PermissionKey`: `inventory.view`, `invoices.view`, `customers.view`, `accounts.view`, `settings.view`, `shift.view`, `product.cost.view` | المصفوفة 9.7 غطّت الإجراءات فقط، ولا تكفي لتصفية الوجهات (10.6) ولا لإخفاء التكلفة عن الكاشير |
| إضافة خصائص `lockedApproverId?` و`freshAuthWindowMs?` و`onSelfApproved?` إلى `ReauthSheet` | حالة المدير الذي يوافق على نفسه (10.4) |
| إضافة `variant: 'boxes' \| 'dots'` إلى `PinField` | شاشة القفل تعرض نقاطاً، فلا حاجة لمكوّن جديد |
| حقول الدخول على `User` (انظر الواجهات أدناه) | `mustChangePassword` والقفل وطول PIN لم تكن في PART 1 |

**حد معروف يجب أن يُكتب للمالك:** بيانات المتجر اليوم في `localStorage` غير مشفّرة. الدخول هنا **ضبط وصول بين المستخدمين الأمناء ومنع للأخطاء**، وليس حماية من شخص يملك الجهاز ويفتح أدوات المتصفح. التشفير الحقيقي مرحلة لاحقة مع IndexedDB.

**واجهات إضافية في `src/types/index.ts`** (تُضاف لما في PART 1):

```ts
// ملاحظة: هذه الحقول دُمجت فعلاً في User (PART 1، القسم 5). التعريف هنا للمرجع فقط.
export interface UserAuthFields {
  pinLength?: 4 | 5 | 6;           // لعرض عدد النقاط في شاشة القفل
  mustChangePassword?: boolean;     // true بعد إعادة تعيين المدير
  quickPinEnabled?: boolean;        // دخول سريع على هذا الجهاز
  failedLoginCount?: number;
  loginLockedUntil?: number;
  lastPasswordChangeAt?: number;
  avatarColorKey?: 'primary' | 'secondary' | 'tertiary' | 'error' | 'neutral';
}

// لماذا: الجلسة على مستوى المستخدم بينما الوردية على مستوى الجهاز (10.3).
export interface AuthSession {
  id: string;
  userId: string;
  deviceId: string;
  startedAt: number;
  lastActivityAt: number;
  lockedAt?: number;
  lastFreshAuthAt: number;          // لقاعدة الدقائق الخمس في 9.7
  endedAt?: number;
}

// لماذا: مفتاح الاسترداد لا يُخزَّن خاماً أبداً، بل تجزئة بطيئة فقط.
export interface RecoveryKeyRecord {
  userId: string;                   // المالك فقط
  hash: string;
  salt: string;
  kdf: KdfParams;               // PBKDF2-SHA256
  createdAt: number;
  rotatedAt?: number;
  usedAt?: number;                  // بعد الاستخدام يُنشأ مفتاح جديد فوراً
}

// لماذا: عدّاد محاولات الدخول لأي اسم (حتى غير الموجود) حتى لا يُكشف وجود الحسابات.
export interface LoginAttemptState {
  key: string;                      // اسم المستخدم مُطبَّعاً
  deviceId: string;
  failedCount: number;
  lockedUntil?: number;
  lastFailedAt: number;
}

// لماذا: مسودة الإعداد الأول. لا تحوي كلمة مرور ولا PIN ولا مفتاح استرداد أبداً.
export interface OnboardingDraft {
  version: 1;
  mode: 'fresh' | 'upgrade';
  stepIndex: 0 | 1 | 2 | 3 | 4;
  store?: Partial<StoreSettings>;
  tax?: { enableTax: boolean; vatStatus: 'registered' | 'unregistered'; incomeTaxRegime: 'general' | 'simplified_6_2025'; pricesIncludeTax: boolean };
  owner?: { displayName: string; username: string };
  savedAt: number;
}
```

### 10.1 شاشة الإعداد لأول مرة (Onboarding)

**متى تظهر:** لا يوجد أي مستخدم في القاعدة وعلَم `onboardingCompletedAt` فارغ. وجد حالتان:

| الوضع | الشرط | الفرق |
| --- | --- | --- |
| `fresh` | لا بيانات ولا مستخدمين | كل الخطوات الخمس فارغة |
| `upgrade` | بيانات موجودة من النسخة القديمة (منتجات وفواتير) بلا مستخدمين | **لا يُمسح شيء.** الخطوتان 2 و3 مملوءتان من `StoreSettings` الحالية ويمكن تخطيهما، والخطوة 4 إلزامية |

وضع `upgrade` ضروري لأن المتاجر القائمة لديها بيانات حقيقية، ولا يجوز أن يبدو الإعداد كأنه سيستبدلها.

**10.1.1 التخطيط**

| العرض | البنية |
| --- | --- |
| **Desktop (840dp فأكثر)** | لوحتان داخل `AuthScaffold`: لوحة **اليمين** (البداية) بعرض 320dp على `surface-container` فيها الشعار و`StepIndicator` عمودي. لوحة **اليسار** على `surface` يتوسطها المحتوى بعرض أقصى 560dp، وتذييل ثابت أسفلها فيه الأزرار |
| **Tablet (600 إلى 839dp)** | عمود واحد بعرض 560dp متمركز، و`StepIndicator` أفقي بعناوين فوق المحتوى |
| **Mobile (أقل من 600dp)** | شاشة كاملة بعمود واحد، حشوة 24dp. أعلى الشاشة `StepIndicator` مضغوط («الخطوة 2 من 5» وشريط `Progress` خطي 4dp). تذييل ثابت بعرض كامل فوق لوحة المفاتيح |

**أزرار التذييل في كل الخطوات:** `Button filled` بحجم كبير 56dp «التالي» (آخر خطوة: «إنهاء الإعداد»)، وتحته أو بجانبه على Desktop `Button text` «السابق» (مخفي في الخطوة الأولى). لا زر ثالث بارز.

**10.1.2 الخطوات الخمس**

| # | الخطوة | المحتوى (من الأعلى للأسفل) |
| --- | --- | --- |
| 1 | **الترحيب** | الشعار 72dp، العنوان «مرحباً بك في متجرك» `headline-small`، سطران عن الإعداد (يستغرق دقيقتين، يمكن تعديل كل شيء لاحقاً). `Button filled` «ابدأ». `Button outlined` «استعادة من نسخة احتياطية» (10.1.4) في وضع `fresh` فقط. وضع `upgrade`: يظهر بدلاً منه شريط معلومات `tertiary-container` «وجدنا بيانات سابقة. لن تُمسح» |
| 2 | **المتجر** | `MuiTextField` اسم المتجر (إلزامي)، الاسم بالإنجليزية، الفرع، العنوان، الهاتف، السجل التجاري، الرقم الضريبي. الأخيران اختياريان وتحتهما نص مساعد «يمكن إضافتهما لاحقاً» |
| 3 | **الضريبة والعملة** | العملة جنيه مصري للقراءة فقط (ج.م). `MuiSwitch` «تفعيل الضريبة». `MuiSelect` «حالة التسجيل في القيمة المضافة»: غير مسجل / مسجل. `MuiSelect` «نظام ضريبة الدخل»: العام / المبسط (القانون 6 لسنة 2025). `MuiSwitch` «الأسعار شاملة الضريبة». زر `text` «لا أعرف، سأحدد لاحقاً» يضبط `غير مسجل` ويضع علامة `taxSetupPending`. هذه هي المحاور الثلاثة المستقلة من خطة الضرائب، والاختيار الأول يُسجَّل كأول `TaxDecisionRecord` باسم المالك |
| 4 | **حساب المدير** | الاسم الظاهر، اسم المستخدم (3 إلى 20 حرفاً لاتينياً صغيراً وأرقاماً و`_`)، `PasswordField` كلمة المرور (8 أحرف فأكثر) مع مؤشر قوة `Progress` وتأكيدها، `PinField` الـ PIN (4 إلى 6 أرقام) وتأكيده. يُرفض PIN المكرر (`1111`) والمتسلسل (`1234`). الدور الناتج `owner`، وعنوان الخطوة «المدير (المالك)» |
| 5 | **المراجعة** | بطاقة `outlined` لكل خطوة تلخّص إدخالاتها، وفي رأس كل بطاقة `Button text` «تعديل» يقفز للخطوة. كلمة المرور والـ PIN لا تظهران (نقاط فقط). `Button filled` «إنهاء الإعداد» |

**عند «إنهاء الإعداد»:** معاملة واحدة ذرّية تكتب: الإعدادات، المستخدم المالك (تجزئة مع ملح)، `RecoveryKeyRecord`، وأول سجل audit (`seq = 1`، `auth.onboarding.completed`). إن انقطعت العملية لا يُكتب شيء وتبقى المسودة. بعدها يظهر `RecoveryKeyDialog` ثم يدخل المستخدم التطبيق مسجَّلاً.

**10.1.3 `StepIndicator`: الحالات**

| الحالة | الدائرة (24dp) | الرابط | العنوان |
| --- | --- | --- | --- |
| **مكتملة** | تعبئة `primary` وعلامة ✓ بلون `on-primary` | خط 2dp بلون `primary` | `title-small` على `on-surface`، قابلة للضغط للرجوع (تأثير hover بطبقة 8% من `primary`) |
| **حالية** | تعبئة `primary-container` ورقم `on-primary-container` وحلقة 2dp بلون `primary` | رمادي `outline-variant` | `title-small` عريض على `on-surface` |
| **قادمة** | تعبئة `surface-container-highest` ورقم `on-surface-variant` | `outline-variant` | `title-small` على `on-surface-variant`، غير قابلة للضغط (`aria-disabled`) |
| **خطأ** | تعبئة `error-container` وعلامة `!` بلون `on-error-container` | كالسابق | بلون `error` (عند محاولة التقدم بحقول ناقصة) |

على الموبايل المضغوط: النقاط الخمس 8dp، والحالية ممتدة 24dp×8dp.

**10.1.4 `RecoveryKeyDialog`**

- **متى يظهر:** (1) مباشرة بعد إنهاء الإعداد، (2) بعد استخدام المفتاح لاستعادة الدخول (يُولَّد مفتاح جديد فوراً)، (3) من الإعدادات > الأمان > «إعادة توليد مفتاح الاسترداد» (مالك فقط بعد إعادة إدخال كلمة المرور، ويبطل القديم).
- **المحتوى من الأعلى للأسفل:** العنوان «مفتاح الاسترداد»؛ بطاقة `tertiary-container` تحذيرية «يظهر مرة واحدة فقط. بدونه وبدون كلمة المرور لن تستطيع الدخول»؛ المفتاح بصيغة `XXXX-XXXX-XXXX-XXXX-XXXX-XXXX` (24 رمزاً Base32 بلا الحروف الملتبسة O و0 وI و1) بخط أحادي `title-large` ومحاذاة LTR؛ صف أزرار: `Button tonal` «نسخ»، `Button outlined` «طباعة»، `Button outlined` «حفظ كملف»؛ `MuiTextField` «اكتب آخر 4 رموز للتأكيد»؛ `MuiSwitch` «حفظته في مكان آمن». التذييل: `Button filled` «متابعة» (معطل حتى يتحقق الشرطان). لا يُغلق بالضغط خارجه ولا بـ Esc.
- **كيف يُخزَّن:** لا يُخزَّن المفتاح نفسه أبداً. تُخزَّن تجزئة PBKDF2-SHA256 (مع ملح عشوائي وعدد تكرارات لا يقل عن 210,000) في `RecoveryKeyRecord`. يُعرض النص الخام من الذاكرة فقط ويُمحى بعد إغلاق الـ Dialog.
- **كيف يُستخدم لاحقاً:** من «نسيت كلمة المرور» في شاشة الدخول (10.2). يُدخل المفتاح وكلمة مرور جديدة، فتُتحقق التجزئة، وتُغيَّر كلمة المرور، ويُبطل المفتاح ويُولَّد جديد. ثلاث محاولات خاطئة تُقفل المسار 15 دقيقة وتُسجَّل `auth.recovery.failed` بخطورة `critical`.

**10.1.5 زر «استعادة من نسخة احتياطية»**

- **متى يظهر:** الخطوة الأولى، وضع `fresh` فقط (لا بيانات ولا مستخدمين). لا يظهر في `upgrade` ولا بعد الإعداد.
- **ماذا يفعل:** يفتح منتقي ملفات (`.json` من `exportBackup`). يتحقق من الإصدار والبنية وسلسلة تجزئة audit (6.4). يعرض `Dialog` بالأعداد (منتجات، فواتير، عملاء، مستخدمون) وزر `filled` «استعادة».
- **أثره على بقية الخطوات:**

| محتوى النسخة | النتيجة |
| --- | --- |
| فيها مستخدمون | يُتخطى الإعداد كله ويُذهب إلى شاشة الدخول |
| بلا مستخدمين (قبل المصادقة) | يتحول الوضع إلى `upgrade`: الخطوتان 2 و3 مملوءتان بشارة «من النسخة الاحتياطية»، والخطوة 4 إلزامية |
| ملف تالف أو سلسلة مكسورة | `Snackbar` خطأ، وتبقى الشاشة كما هي |

**10.1.6 إغلاق التطبيق في المنتصف**

- تُحفظ مسودة `OnboardingDraft` في `localStorage` بمفتاح `matjark_onboarding_draft_v1` عند كل انتقال بين الخطوات وعند ترك الحقل (`blur`). **لا تحوي كلمة مرور ولا PIN ولا مفتاحاً أبداً**، فيعود حقلاها فارغين.
- عند التشغيل التالي: تُستأنف المسودة على نفس الخطوة مع `Snackbar` «استُعيد ما أدخلته».
- **تُمسح المسودة** عند: إنهاء الإعداد بنجاح، أو ضغط «ابدأ من جديد» (`Button text` في ⋮ بالأعلى، مع تأكيد)، أو مرور 7 أيام، أو نجاح الاستعادة من نسخة احتياطية.
- **Audit:** نعم (`auth.onboarding.started`, `auth.onboarding.completed`, `auth.onboarding.draft_discarded`).

### 10.2 شاشة تسجيل الدخول (Login)

**10.2.1 التخطيط**

| العرض | البنية |
| --- | --- |
| **Desktop** | خلفية `surface-container-low` كاملة، وفي المنتصف `Card filled` بعرض 420dp وحواف 28dp وحشوة 32dp. أعلى البطاقة شعار المتجر 56dp واسمه `title-large` من الإعدادات، وتحتهما «تسجيل الدخول» `body-medium`. أسفل الشاشة رقم الإصدار `label-small` |
| **Mobile** | بلا بطاقة: شاشة كاملة على `surface` بحشوة 24dp، الشعار 64dp في الأعلى، والنموذج تحته، والإصدار أسفل الشاشة |

**من الأعلى للأسفل داخل النموذج:**

1. `MuiTextField` «اسم المستخدم»: `autoComplete="username"`، بلا تكبير تلقائي للحروف، المحتوى LTR ومحاذاة للنهاية.
2. `PasswordField` «كلمة المرور» مع زر إظهار/إخفاء، وتحذير `Caps Lock` بلون `tertiary`.
3. `MuiSwitch` «تذكرني على هذا الجهاز».
4. `Button filled` بحجم كبير 56dp وعرض كامل «دخول».
5. `Button text` «نسيت كلمة المرور؟» (متمركز).
6. فاصل «أو»، ثم `Button tonal` «دخول سريع بـ PIN» (يظهر فقط إن وُجد مستخدمون مفعَّل لهم الدخول السريع على الجهاز).

**معنى «تذكرني»:** يحفظ **اسم المستخدم فقط** على هذا الجهاز ويفعّل له الدخول السريع بـ PIN بعد أول دخول ناجح بكلمة المرور. **لا يُبقي الجلسة بعد إغلاق التطبيق.** القرار مقصود: الدخول التلقائي على جهاز بيع مشترك ثغرة.

**الدخول السريع:** يعرض صفاً من `UserAvatar` بحجم 56dp للمستخدمين المحفوظين على الجهاز. الضغط على أحدهم ينقل إلى شاشة PIN (نفس تخطيط 10.3) مع رابط «مستخدم آخر». ويمكن للمالك إخفاء هذا الصف تماماً من الإعدادات > الأمان (`showRememberedUsers`، الافتراضي مفعّل لأنه لا يكشف إلا من فعّله بنفسه).

**10.2.2 السلوك**

| الموضوع | القرار |
| --- | --- |
| **Enter** | في حقل اسم المستخدم ينقل التركيز إلى كلمة المرور. وفي كلمة المرور يرسل النموذج |
| **التحقق الفوري** | عند فقدان التركيز: «مطلوب» للحقل الفارغ فقط. **لا يوجد تحقق من وجود الاسم** في أي لحظة. وتُمسح رسالة الخطأ عند أول حرف جديد |
| **عدم كشف الأسماء** | رسالة واحدة لكل أنواع الفشل: «اسم المستخدم أو كلمة المرور غير صحيحة». تشمل: اسم غير موجود، كلمة خطأ، حساب موقوف أو مؤرشف. زمن الرد ثابت (لا أقل من 400ms) ليتساوى الحساب الموجود وغير الموجود |
| **أثناء التحقق** | الزر معطل بنص «جارٍ التحقق…»، و`Progress` خطي أعلى البطاقة، والحقول للقراءة فقط |
| **نجاح الدخول** | `AuthSession` جديدة، وإعادة `activeTab` إلى أول وجهة مسموحة (10.6)، وقد يلحقها فتح وردية (10.2.4) |

**10.2.3 الحالات**

| الحالة | العرض | Audit |
| --- | --- | --- |
| **خطأ اعتماد** | `Banner` بلون `error-container` أعلى النموذج بالرسالة العامة، مع هزة خفيفة للبطاقة. تبقى قيمة اسم المستخدم وتُمسح كلمة المرور | `auth.login.failed` (الاسم المُدخل مقتطعاً 64 حرفاً، الجهاز) |
| **قفل المحاولات** | بعد 5 فشلات على نفس الاسم المُدخل (حتى لو لم يكن موجوداً): قفل دقيقة، ثم 5 دقائق عند 10، ثم 15 دقيقة (السقف) عند 15. يظهر عدّاد تنازلي «حاول بعد 00:45» وتُعطَّل الحقول. **لا يُعرض عدد المحاولات المتبقية** قبل القفل لأن ذلك يكشف وجود الحساب | `auth.login.locked` |
| **نسيت كلمة المرور** | `Dialog` بعنوان «استعادة الدخول». للمالك: اسم المستخدم + مفتاح الاسترداد (حقل مجمَّع بتنسيق تلقائي) + كلمة مرور جديدة وتأكيدها، وبعد النجاح يظهر `RecoveryKeyDialog` بمفتاح جديد. لغير المالك: نص «اطلب من المدير إعادة تعيين كلمة مرورك» فقط، بلا مسار ذاتي (لا بريد ولا شبكة) | `auth.recovery.*` |
| **`mustChangePassword`** | بعد نجاح الاعتماد مباشرة: `Dialog` **إلزامي** بعرض sm لا يُغلق بـ Esc ولا بالضغط خارجه ولا بزر ✕. الحقول: كلمة مرور جديدة (لا تساوي المؤقتة) وتأكيدها ومؤشر قوة. الزر الوحيد `filled` «حفظ والمتابعة»، ومعه `Button text` «تسجيل الخروج» كمخرج وحيد | `auth.password.changed` |

**10.2.4 الاستثناء: كاشير بلا وردية مفتوحة**

- بعد الدخول، إذا كان الدور يملك `shift.open` ولا توجد وردية مفتوحة **على هذا الجهاز**، يفتح `BottomSheet` «فتح وردية» فوق شاشة الكاشير تلقائياً: حقل «الرصيد الافتتاحي» (يقترح رصيد آخر تقفيل)، و`Button filled` «فتح الوردية»، و`Button text` «لاحقاً». التفاصيل الكاملة للـ Sheet في PART 3.
- «لاحقاً» مسموح: يدخل التطبيق، ويظهر شريط ثابت في الكاشير «لا توجد وردية مفتوحة» بزر `tonal` «فتح». وإن كان `requireOpenShift` مفعلاً يُعطَّل زر «إتمام الدفع» بنص مساعد «افتح وردية أولاً».
- المدير والمالك: لا يفتح الـ Sheet تلقائياً، وتكفي شارة الوردية في الشريط العلوي.

### 10.3 شاشة القفل السريع (Lock Screen)

**10.3.1 التخطيط:** خلفية `surface` كاملة، **بلا scrim**، فلا يظهر خلفها أي محتوى. عمود واحد متمركز عمودياً بعرض أقصى 360dp، من الأعلى للأسفل:

1. `UserAvatar` بحجم 72dp (تعبئة tonal بحرف الاسم، أو صورة).
2. الاسم `title-large`، وتحته الدور `label-medium` على `on-surface-variant`.
3. نقاط PIN: `PinField` بـ `variant='dots'`، عددها = `pinLength` للمستخدم، بقطر 14dp وتباعد 16dp. فارغة بحد `outline`، ممتلئة بـ `primary`.
4. سطر رسالة بارتفاع ثابت 20dp (كي لا تقفز الشاشة): «أدخل PIN» أو خطأ بلون `error` أو عدّاد القفل.
5. `PinPad`.
6. صف أزرار `Button text`: «تبديل المستخدم» و«تسجيل الخروج».

**10.3.2 `PinPad` بالتفصيل**

| الجانب | المواصفة |
| --- | --- |
| الشبكة | 3×4. الصفوف: 1 2 3 / 4 5 6 / 7 8 9 / ⌫ 0 (فراغ) |
| الأبعاد | الأزرار دوائر 72dp، المسافة 16dp، فيكون العرض الكلي 248dp. ويصغر إلى 64dp على ارتفاع أقل من 640dp |
| الاتجاه | **LTR داخلياً** بغض النظر عن RTL للصفحة (ترتيب لوحة هاتف 1 2 3 من اليسار)، بلا تعكيس للأرقام |
| الشكل | تعبئة `surface-container-high`، رقم `headline-small` بلون `on-surface` |
| الضغط | طبقة حالة 12% من `on-surface` وتصغير 0.96 لمدة 80ms، وحالة hover 8% للماوس |
| اللمس الاهتزازي | `navigator.vibrate(10)` عند كل ضغطة إن كان متاحاً ومفعّلاً (`hapticsEnabled`) |
| ⌫ | `IconButton` بلا تعبئة، ضغطة تمسح رقماً، وضغطة مطوّلة (500ms) تمسح الكل |
| الإرسال | **تلقائي عند اكتمال الطول**، بلا زر تأكيد. أثناء التحقق (نحو 150 إلى 300ms) تتوقف الأزرار ويظهر مؤشر دائري صغير بدل النقاط |
| الخطأ | اهتزاز النقاط 300ms ولونها `error` ثم مسحها، واهتزاز جهاز `[40,40,40]`، والأزرار معطلة 300ms |
| لوحة المفاتيح الفعلية | الأرقام تُدخل، `Backspace` يمسح، `Esc` يمسح الكل، `Enter` يتجاهَل |
| معطل (أثناء القفل الزمني) | شفافية 0.38 |

**10.3.3 متى تُفتح الشاشة**

| المحفّز | القرار |
| --- | --- |
| **خمول** | 5 دقائق افتراضياً (`idleLockMinutes` من 1 إلى 30، ولا خيار «أبداً»). الخمول = غياب لمس أو ماوس أو لوحة مفاتيح |
| **قفل يدوي** | من `UserMenu` أو اختصار Ctrl+L |
| **العودة من الخلفية** | إذا غابت النافذة أكثر من 60 ثانية (`backgroundLockSeconds`) |
| **تبديل المستخدم** | يقفل الجلسة الحالية ثم يعرض اختيار المستخدم |
| **فشل PIN متكرر** | 5 أرقام خاطئة: قفل 30 ثانية. 10: قفل 5 دقائق. 15: **يُعطَّل PIN** على هذا الجهاز لهذا المستخدم، وتتحول الشاشة إلى Login بكلمة المرور |
| **بدء التطبيق** | تُعرض Login (أو شاشة PIN للمستخدمين المحفوظين)، فالجلسات لا تبقى بعد الإغلاق |

**عدّادات PIN في القفل منفصلة** عن عدّادات الموافقة في 9.12.4.

**10.3.4 الاستثناءات: عمليات حرجة**

| العملية | السلوك |
| --- | --- |
| `BottomSheet` الدفع مفتوح | يتوقف مؤقت الخمول وفحص الخلفية. سقف 10 دقائق، وبعدها يُغلق الـ Sheet (السلة سليمة) ثم يُقفل. **لا يُقفل أثناء المعالجة** من الضغط على «تأكيد الدفع» حتى شاشة النجاح |
| `Dialog` تقفيل الوردية مفتوح | يتوقف المؤقت بنفس السقف. عند انتهائه تُحفظ مسودة التقفيل (6.6.4) ثم يُقفل |
| `ReauthSheet` مفتوح | له مؤقته الخاص 90 ثانية (9.12.6) |
| طباعة جارية | يتوقف المؤقت حتى انتهائها |
| قفل يدوي أو تبديل مستخدم وقت عملية حرجة | يُمنع بـ `Snackbar` «أكمل العملية أولاً» |

**10.3.5 تبديل المستخدم والسلة**

- **سلة فارغة:** يتبدل المستخدم مباشرة.
- **سلة غير فارغة:** `Dialog` «تعليق السلة؟» بنص «في السلة N أصناف بإجمالي X. ستُعلَّق باسمك ويمكن استرجاعها». زران فقط: `Button filled` «تعليق وتبديل»، و`Button text` «إلغاء». **لا خيار «متابعة بالسلة»** لأن المبيعات ستُنسب للكاشير الخطأ.
- بعد التعليق: `Snackbar` «عُلّقت الفاتورة H-… باسمك» لمدة 3 ثوانٍ قبل ظهور شاشة القفل.
- الفواتير المعلقة على مستوى **الجهاز** وتحمل `heldBy`. أي مستخدم يستطيع استرجاعها، وتُسجَّل `sale.resumed_other_user` في audit.

**10.3.6 العلاقة بالوردية: الوردية للجهاز والجلسة للمستخدم**

| السيناريو | ما يحدث |
| --- | --- |
| قفل المستخدم نفسه | الوردية تبقى مفتوحة بلا أي تغيير |
| تبديل لمستخدم ثانٍ على وردية مفتوحة | تبقى نفس الوردية (`shared_drawer`، الافتراضي). مبيعاته تحمل `userId` الجديد و`shiftId` الأصلي |
| سياسة `per_user_drawer` (اختيارية) | عند التبديل يظهر `Dialog` «تسليم الوردية»: «الوردية الحالية باسم {أ}» بخيارين: `filled` «تقفيل وفتح وردية جديدة» (تقفيل أعمى بـ 6.6 ثم فتح)، و`text` «إلغاء» |
| تسجيل خروج بوردية مفتوحة | مسموح مع تنبيه «لديك وردية مفتوحة». تبقى مفتوحة ويقفلها المدير أو المالك نيابة (6.6.4) |
| إيقاف مستخدم صاحب وردية مفتوحة | **ممنوع** حتى تُقفل الوردية |

**المسؤولية عن العجز:** صاحب الوردية (`openedBy`) هو المسؤول عن العدّ عند التقفيل، حتى لو باع آخرون فيها. لذلك أوصي المحلات متعددة الكاشير بـ `per_user_drawer` أو بدرج منفصل لكل كاشير.

### 10.4 موافقة المدير (`ReauthSheet` بوضع `manager_override`): تفاصيل الواجهة

السلوك والأنواع والقفل في 9.12 من PART 1، ولا أعيدها. هذا القسم يضيف **حالات العناصر ومواضع الاستدعاء**.

**10.4.1 حالات عناصر الـ Sheet**

| العنصر | عادي | تركيز | خطأ | معطل أو قيد التحقق |
| --- | --- | --- | --- | --- |
| بطاقة الملخص | `outlined`، للقراءة فقط | لا يُركَّز عليها | لا تتغير | تبقى ظاهرة |
| `Select` المعتمِد | اسم أول معتمِد متاح | حلقة `primary` | «اختر معتمِداً» | معطل إن كان `lockedApproverId` محدداً |
| `PinField` | خانات فارغة | الأولى مركّزة تلقائياً | اهتزاز 300ms، لون `error`، «PIN غير صحيح، تبقى N محاولات» | معطل أثناء التحقق وأثناء القفل الزمني |
| زر «موافقة» | `filled` كبير 56dp، معطل حتى اكتمال الطول | حلقة تركيز | لا يتغير | مؤشر دائري 20dp بدل النص أثناء التحقق |
| زر «إلغاء» | `text` | حلقة تركيز | لا يتغير | يبقى فعالاً دائماً (مخرج الطوارئ) |

**رسائل ثابتة:** القفل: «محاولات كثيرة. حاول بعد 00:60» بعدّاد تنازلي. لا معتمِد: «لا يوجد معتمِد لهذا الإجراء». نجاح: وميض خفيف 300ms على `--matjark-success-container` ثم يُغلق الـ Sheet ويُنفَّذ الإجراء.

**إتاحة الوصول:** حبس التركيز داخل الـ Sheet، و`aria-live="polite"` لرسائل الخطأ والعدّاد، وإرجاع التركيز للزر المُستدعي عند الإغلاق.

**10.4.2 حالات المستخدم**

| الحالة | السلوك |
| --- | --- |
| **المستخدم مدير أو مالك وإعادة مصادقته حديثة** (أقل من 5 دقائق) | لا يظهر الـ Sheet. يُنفَّذ الإجراء فوراً مع `Snackbar` «تمت الموافقة (مدير)»، وتُسجَّل `selfApproved: true` |
| **مدير وإعادة المصادقة قديمة** | يظهر الـ Sheet والمعتمِد **ثابت على نفسه** (`lockedApproverId`) ولا يُطلب منه إلا PIN |
| **مدير يتجاوز سقفه** | الـ Sheet يعرض «يتطلب موافقة المالك» ويصير المعتمِد المسموح مالكاً فقط |
| **PIN خاطئ 3 مرات** | يُغلق الـ Sheet ويُلغى الإجراء، والجلسة والسلة سليمتان، والقفل 60 ثانية على الجهاز (9.12.4) |
| **إلغاء** | يرجع الكاشير إلى نفس الشاشة بلا أثر جانبي (9.12.6) |

**10.4.3 أين يظهر الزر المُستدعي في شاشة الكاشير**

| المستوى | الإجراء | الموضع | الشكل |
| --- | --- | --- | --- |
| **الصنف** | حذف سطر بعد المهلة | السحب لحذف سطر السلة، وزر الحذف في `Menu` السطر | الخلفية `error-container` مع أيقونة قفل 16dp |
| **الصنف** | خصم أكبر من 10% | عنصر «مبلغ/نسبة» في `Menu` «خصم» تحت اسم الصنف | أيقونة قفل في نهاية العنصر ونص مساعد «بموافقة مدير» |
| **السلة** | خصم على الفاتورة | زر `text` «خصم على الفاتورة» فوق الإجماليات | نفس العلامة إذا تجاوز المدخل 10% |
| **السلة** | تجاوز الحد الائتماني | داخل `BottomSheet` الدفع (طريقة «آجل»): تحت بطاقة العميل الحمراء | `Button outlined` «تجاوز بموافقة مدير» بأيقونة قفل، ويحل محل «تأكيد الدفع» المعطل |
| **الفاتورة** | مرتجع كامل أو جزئي | تذييل تفاصيل الفاتورة في شاشة الفواتير | `Button outlined` «مرتجع» بأيقونة قفل للكاشير |
| **الفاتورة** | إلغاء إداري | ⋮ في صف الفاتورة (فقط ضمن شروط 9.13.3) | عنصر قائمة بأيقونة قفل |
| **الدرج** | سحب أو إيداع نقدي فوق الحد | داخل `BottomSheet` حركة الدرج | `Button filled` «تأكيد» يتحول إلى «موافقة مدير» عند تجاوز الحد |

**قاعدة العلامة:** تتحكم فيها `PermissionGate`. النتيجة `'allow'` تعرض الزر عادياً، و`'override'` تضيف أيقونة قفل 16dp وتفتح الـ Sheet عند الضغط، و`'deny'` تخفي الزر (أو تعطله إن كان جزءاً من جدول لا يجوز أن يتغير شكله).

### 10.5 المكوّنات الجديدة والمعدَّلة

| المكوّن | Props كاملة | أين يُستخدم | الحالات | إنشاء في `src/components/ui` |
| --- | --- | --- | --- | --- |
| `AuthScaffold` | `variant: 'card' \| 'fullscreen' \| 'split'`, `title?`, `subtitle?`, `logo?`, `storeName?`, `aside?` (لوحة Onboarding)، `banner?` (خطأ أو معلومة)، `footer?`, `busy?`, `maxWidth?: 420 \| 560`, `children` | الدخول، الإعداد، القفل، NoAccess | عادي، `busy` (Progress خطي أعلى البطاقة)، `banner` ظاهر | **لا**: `src/components/auth/` |
| `StepIndicator` | `steps: {id, label, description?}[]`, `currentIndex`, `completedIds: string[]`, `errorIds?: string[]`, `orientation: 'vertical' \| 'horizontal' \| 'compact'`, `onStepClick?(index)`, `allowBackNavigation?` (true) | الإعداد | مكتملة، حالية، قادمة، خطأ، hover للمكتملة، معطلة للقادمة (10.1.3) | **نعم** |
| `RecoveryKeyDialog` | `open`, `recoveryKey: string`, `mode: 'onboarding' \| 'regenerate' \| 'recovery_used'`, `requireTypedConfirmation?` (true), `onCopy?`, `onDownload?`, `onPrint?`, `onConfirmed()` | نهاية الإعداد، الاستعادة، الإعدادات > الأمان | افتراضي («متابعة» معطل)، تم النسخ (الزر ✓ لثانيتين)، خطأ تأكيد (لا تطابق آخر 4 رموز)، جاهز | لا: `components/auth/` |
| `UserAvatar` | `name`, `imageUrl?`, `size: 32 \| 40 \| 56 \| 72`, `colorKey?` (تُشتق من `userId`)، `status?: 'locked' \| 'shift_open'`, `selected?`, `onClick?`, `disabled?` | الدخول السريع، القفل، `UserMenu`، قوائم المستخدمين | عادي، hover (طبقة 8%)، تركيز (حلقة)، محدد (حلقة 2dp `primary`)، معطل (مؤرشف، 0.38) | **نعم** |
| `PinPad` | `onDigit(d: number)`, `onBackspace()`, `onClearAll?()`, `disabled?`, `size?: 64 \| 72`, `hapticsEnabled?`, `keyboardEnabled?` (true), `labels?` | القفل، الدخول السريع، `ReauthSheet` على اللمس | افتراضي، hover، ضغط (12% وتصغير)، معطل (0.38)، خطأ (أزرار معطلة 300ms) | **نعم** |
| `PasswordField` | `label`, `value`, `onChange`, `autoComplete: 'current-password' \| 'new-password'`, `error?`, `helperText?`, `showStrength?`, `capsLockWarning?` (true), `minLength?`, `onSubmit?` | الدخول، الإعداد، `mustChangePassword`، الاستعادة | افتراضي، تركيز، خطأ، معطل، مكشوف | **نعم**، يغلّف `MuiTextField` |
| `PermissionGate` (من PART 1) | يضاف: `display?: 'hide' \| 'disable' \| 'lock_badge'`, `lockLabel?` | كل زر حساس | `allow`، `override` (أيقونة قفل)، `deny` (إخفاء أو تعطيل) | لا |
| `ReauthSheet` (**نفس** `OverrideSheet`) | يضاف إلى PART 1: `lockedApproverId?`, `freshAuthWindowMs?` (300000), `onSelfApproved?()` | الموافقات، فتح الجلسة | حالات 10.4.1 | لا |
| `NoAccess` | `requiredPermission?: PermissionKey`, `pageLabel?`, `onGoHome()`, `onSwitchUser?()` | `MainAppContent` عند وجهة ممنوعة | افتراضي، مع زر تبديل المستخدم | لا: `components/auth/` |
| `UserMenu` | `user: User`, `onLock()`, `onSwitchUser()`, `onProfile()`, `onLogout()`, `placement: 'rail' \| 'topbar'`, `compact?` | الـ Rail وشريط الأعلى | مغلق، مفتوح، عنصر معطل أثناء عملية حرجة (10.3.4) | لا |

### 10.6 ربط المصادقة بالتنقل

**10.6.1 `UserMenu`**

- **Desktop:** يستبدل عنصر `profile` الموجود اليوم في `Sidebar.tsx`. في أسفل الـ `NavigationRail` (فوق الإعدادات): `UserAvatar` بحجم 40dp يفتح `Menu` ملتصقاً بالحافة. محتوى القائمة: رأس (الاسم والدور)، «قفل الشاشة» (Ctrl+L)، «تبديل المستخدم»، «الملف الشخصي» (تغيير كلمة المرور والـ PIN)، فاصل، «تسجيل الخروج».
- **Mobile:** `UserAvatar` بحجم 32dp **مستقل في نهاية الـ Top App Bar**، وليس داخل ⋮. لأن القفل وتبديل المستخدم متكرران في الكاشير ويلزم الوصول لهما بلمسة واحدة. ويبقى ⋮ لإجراءات الصفحة.
- في الكاشير على الموبايل (شريط مزدحم) ينتقل زر الوضع الليلي إلى داخل `UserMenu`.
- مؤشر `shift_open` صغير (نقطة `--matjark-success`) على الأفاتار يوضح أن لهذا المستخدم وردية مفتوحة.

**10.6.2 تصفية الوجهات حسب الصلاحية**

تظهر الوجهة إن كان للمستخدم مفتاح العرض الخاص بها بقيمة `allow` أو `override`.

| الوجهة | مفتاح الظهور | كاشير | مشرف | مدير | مالك | محاسب |
| --- | --- | --- | --- | --- | --- | --- |
| الكاشير | `sale.create` | ✓ | ✓ | ✓ | ✓ | — |
| المخزن | `inventory.view` | قراءة بلا التكلفة | قراءة بلا التكلفة | ✓ | ✓ | قراءة كاملة |
| المشتريات | `purchase.create` أو عرضه | — | — | ✓ | ✓ | ✓ |
| العملاء | `customers.view` | ✓ | ✓ | ✓ | ✓ | قراءة |
| الفواتير | `invoices.view` | وردية المستخدم فقط | اليوم | ✓ | ✓ | قراءة |
| الحسابات | `accounts.view` | — | — | ✓ | ✓ | ✓ |
| الوردية | `shift.view` | ✓ | ✓ | ✓ | ✓ | قراءة السجل |
| الإعدادات | `settings.view` | — | — | بلا الأمان والمستخدمين | ✓ | الضريبة فقط |

- **إخفاء التكلفة والهامش:** أعمدة سعر الشراء والهامش في المخزن والتقارير تُخفى عمن لا يملك `product.cost.view`.
- **`NavigationBar` على الموبايل:** تُطبَّق نفس القاعدة على عناصره الخمسة. إذا بقي أقل من 3 وجهات يُلغى الشريط السفلي وتُعرض الوجهات في قائمة واحدة. وإذا كان «المزيد» فارغاً فلا يظهر.
- **حارس `activeTab`:** يُغلَّف `setActiveTab` في `StoreContext` بفحص الصلاحية، وعند كل دخول أو تبديل مستخدم يُعاد `activeTab` إلى أول وجهة مسموحة (بدل بقاء وجهة المستخدم السابق).

### 10.7 الحالات الفارغة والتحميل والأخطاء

**10.7.1 شاشة `NoAccess`**

- **المحتوى:** أيقونة `lock` 48dp بلون `on-surface-variant`، العنوان «لا تملك صلاحية هذه الصفحة» `title-large`، سطر باسم الصفحة والصلاحية المطلوبة بلغة بشرية، ثم `Button filled` «العودة إلى {أول وجهة مسموحة}» و`Button text` «تبديل المستخدم».
- **متى تظهر:** لا يوجد router اليوم، فلا «مسار مباشر». تظهر عندما تشير `activeTab` إلى وجهة ممنوعة: بعد تبديل مستخدم، أو تغيير المالك لدور مستخدم أثناء جلسته، أو بعد استعادة نسخة، أو استدعاء برمجي لـ `setActiveTab` (مثل رابط داخل إشعار). وعند إضافة router لاحقاً تؤدي نفس الدور مع حالة 403.
- **Audit:** نعم (`auth.access.denied`، خطورة info، مرة واحدة لكل صفحة كل دقيقة).

**10.7.2 التحميل**

- **التحقق من كلمة المرور أو الـ PIN:** تجزئة PBKDF2 تأخذ نحو 150 إلى 300ms. يظهر `Progress` خطي في أعلى البطاقة والزر بنص «جارٍ التحقق…»، وأدنى زمن عرض 400ms (لتساوي الزمن، 10.2.2). إن تجاوز ثانيتين على جهاز بطيء يظهر نص مساعد «قد يستغرق هذا بضع ثوانٍ».
- **بدء التطبيق:** شاشة بالشعار و`Progress` أثناء فتح IndexedDB والترحيل. إن طال الترحيل أكثر من 3 ثوانٍ يظهر نص «جارٍ تجهيز بياناتك…».

**10.7.3 الأخطاء: لا أخطاء شبكة**

النظام **offline-first**. لا شيء في مسارات المصادقة يستخدم الشبكة (لا بريد ولا خادم تحقق). لذلك **لا توجد حالات «تعذّر الاتصال»** في هذه الشاشات. الأخطاء الممكنة محلية فقط:

| الخطأ | السبب | المعالجة |
| --- | --- | --- |
| تعذّر فتح التخزين | وضع تصفح خاص أو امتلاء أو منع | شاشة `AuthScaffold` تمنع الدخول برسالة واضحة وزرّي «إعادة المحاولة» و«تصدير ما أمكن» |
| `crypto.subtle` غير متاح | الصفحة على `http` غير آمن بغير `localhost` | **الحماية:** حارس البدء (12.0.4) يمنع الدخول برسالة «افتح التطبيق عبر https أو localhost»، ولا بدائل للتجزئة. في التطوير يتولى ذلك `vite-plugin-mkcert` |
| سلسلة audit مكسورة عند الإقلاع | تلف أو تعديل خارجي | لافتة تحذير `error-container` للمالك بعد الدخول (غير مانعة) + سجل `security.audit_chain_broken` |
| ملف نسخة احتياطية غير صالح | تنسيق أو إصدار | `Snackbar` خطأ في 10.1.5 |

## Checklist للتنفيذ (PART 2)

**يُنشأ**

- [ ] `src/components/auth/`: `AuthScaffold.tsx`، `RecoveryKeyDialog.tsx`، `NoAccess.tsx`، `UserMenu.tsx`، `OnboardingScreen.tsx`، `LoginScreen.tsx`، `LockScreen.tsx`
- [ ] `src/components/ui/`: `StepIndicator.tsx`، `UserAvatar.tsx`، `PinPad.tsx`، `PasswordField.tsx`
- [ ] `src/utils/crypto.ts` (PBKDF2 وتوليد مفتاح الاسترداد وتجزئة PIN)، `src/utils/idleLock.ts` (hook الخمول)، `src/utils/onboardingDraft.ts`

**يُعدَّل**

- [ ] `src/App.tsx`: بوابة دخول ثلاثية قبل `MainAppContent` (Onboarding ثم Login ثم القفل كطبقة فوق التطبيق)
- [ ] `src/components/layout/Sidebar.tsx`: عنصر `profile` يصبح `UserMenu`، وتصفية العناصر بالصلاحية
- [ ] `src/context/StoreContext.tsx` (إضافات فقط): حارس `setActiveTab`، إعادة ضبط `activeTab` عند الدخول
- [ ] `src/components/pos/CashierScreen.tsx`: `PermissionGate` على مواضع 10.4.3
- [ ] `src/types/index.ts`: مدموج في الملحق (أ)، ومعه واجهات 10.0 ومفاتيح العرض في `PermissionKey`
- [ ] `PinField` (`variant='dots'`) و`ReauthSheet` (الخصائص الثلاث) من PART 1

**يُحذف**

- [ ] السلوك الحالي لعنصر `profile` في `Sidebar` بعد استبداله

**يُختبر**

- [ ] وضع `upgrade`: متجر قائم بمنتجات وفواتير لا يفقد أي بيانات عند الإعداد
- [ ] إغلاق التطبيق في الخطوة 3 ثم فتحه: تُستأنف المسودة وتكون كلمة المرور فارغة
- [ ] الرسالة العامة نفسها وبنفس الزمن لاسم موجود وغير موجود وموقوف
- [ ] القفل التصاعدي (1 ثم 5 ثم 15 دقيقة) لا يكشف وجود الحساب
- [ ] `mustChangePassword` لا يُغلق بأي وسيلة
- [ ] مفتاح الاسترداد: يُعرض مرة واحدة، والقديم يبطل بعد الاستخدام
- [ ] القفل لا يعمل أثناء معالجة الدفع، ويحفظ مسودة التقفيل
- [ ] تبديل مستخدم بسلة غير فارغة يعلّقها ولا ينقلها لمستخدم آخر
- [ ] كل وجهة ممنوعة تعرض `NoAccess`، وأعمدة التكلفة مخفية عن الكاشير
- [ ] التطبيق على `http` غير آمن يعرض رسالة التشخيص بدل الانهيار

**PART 2 جاهز — أكمل إلى PART 3؟**

---

## PART 3 — الكاشير والوردية (مع Blind Close)

يبني على PART 1 (الأنواع، 6.6، 9.12، 9.13) وPART 2 (الدخول، القفل، `PermissionGate`، `UserMenu`). **لا أعيد** تخطيط الكاشير الأساسي الوارد في المخطط الأول (الأقسام 5.1 إلى 5.7: الشبكة، كرت المنتج، السلة، شريط الدفع)، بل أحدّد ما **يتغير** فيه بسبب المصادقة والوردية والصلاحيات وما اكتُشف في الكود. الأقسام 11.0 إلى 11.8.

### 11.0 ما تحققت منه في الكود

| الموضع | ما وجدته | الأثر |
| --- | --- | --- |
| `CashierScreen.tsx` سطر 392 و422 | استعمال `window.confirm` مرتين (حذف كل المعلقات، وحذف المعلقة المفتوحة) | يُستبدل بـ `Dialog` |
| سطر 70 و76 و199 | `matjark_pos_held_sales_v1` بـ `localStorage`، وتُحفظ فيها أسطر السلة كاملة بكائن المنتج | تُستبدل بنوع `HeldSale` خفيف (11.4) |
| سطر 171 | `selectedCustomerId` حالة محلية لا تُصفَّر بعد البيع | يُصفَّر عند نجاح الدفع (11.2.4) |
| سطر 551 | قائمة السلة تُبنى بـ `createList` من جديد عند كل تغيير | تبقى كما هي في هذا الجزء، ويُنصح بتحسينها لاحقاً |
| سطر 588 إلى 598 | `amountPaid: Number(paidAmount) \|\| grandTotal`، وطريقة الدفع في `selectedPayment` | الدفع الجزئي والمختلط غير ممكنين. يُستبدل بـ `PaymentSplit[]` |
| سطر 964 إلى 1047 | نافذة الدفع `MBottomSheet` مستوردة مباشرة من `material/react` | تبقى `BottomSheet`، لكن يغلّفها `MuiBottomSheet` الجديد من PART 1 |
| `ThermalReceipt.tsx` | تأخذ `(invoice, settings)` فتقرأ اسم المتجر وغيره من **الإعدادات الحالية**، وتعيد تنسيق التاريخ بـ `ar-EG` (أرقام هندية) وتطبع بـ `window.print()` دون عدّاد | لا تحقق «إعادة الطبع الحرفية» (9.13.4): تحتاج `receiptSnapshot` وأرقاماً لاتينية وعدّاد طباعة |

**تذكير مهم من التقرير الأول:** الدفع اليوم لا يعيد التحقق من المخزون الحي، ولا يوجد أي واجهة خصم، ولا وردية. هذه الثلاثة تُعالج هنا.

### 11.1 الكاشير: ما يتغير في الهيكل

**11.1.1 الـ Top App Bar** (يحل محل 5.2 في المخطط الأول)

| الموضع | العنصر |
| --- | --- |
| **يمين (بداية)** | موبايل: زر القائمة ☰. كمبيوتر: عنوان «الكاشير». بجواره `ShiftBadge` (11.3.1) |
| **منتصف (كمبيوتر)** | حقل البحث `filled` pill (480dp) كما في 5.2 |
| **يسار (نهاية)** من اليمين لليسار | مسح الباركود، الفواتير المعلقة مع `Badge` رقمي، `UserAvatar` (يفتح `UserMenu`، 10.6)، ثم ⋮ |

يتغير عن 5.2: زر الوضع الليلي ينتقل إلى `UserMenu` على الموبايل، ولا يبقى في الشريط.

**11.1.2 شريط حالة الوردية:** يظهر تحت الـ Top App Bar عند عدم وجود وردية مفتوحة على هذا الجهاز فقط: شريط 48dp على `error-container` بنص «لا توجد وردية مفتوحة» وزر `Button tonal` «فتح وردية» (يفتح `OpenShiftSheet`). ويختفي فور فتحها. **إضافة السلة تبقى مسموحة** حتى يُحضّر الكاشير الفاتورة، ويتعطل فقط زر «إتمام الدفع» عند تفعيل `requireOpenShift` (نصه المساعد «افتح وردية أولاً»).

**11.1.3 كرت المنتج:** كما في 5.4 بلا تغيير في الهيكل. تغيير واحد: يُقرأ المخزون والسعر من القاعدة **الحية** لا من نسخة السلة، وعند اختلاف السعر عن لقطة السطر (11.2.3) يظهر على السطر وسم «تغيّر السعر».

**11.1.4 سطر السلة** (يضيف إلى 5.5)

- **الحذف:** السحب أو زر الحذف يمر عبر `PermissionGate` بالمفتاح `cart.remove_after_add` (مهلة 30 ثانية حرة، ثم موافقة).
- **الخصم السريع** (غير موجود في الكود اليوم): زر `text` صغير «خصم» تحت اسم الصنف يفتح `Menu` بعناصر: 5%، 10%، «نسبة مخصصة…»، «مبلغ ثابت…»، «إزالة الخصم». العنصران المخصصان يفتحان `DiscountSheet` (11.1.5). ما يزيد عن 10% يحمل أيقونة قفل ويمر بـ 9.12.
- **تحذير المخزون:** `Chip` صغير بلون `--matjark-warning-container` «متاح N فقط» عند تجاوز الكمية للمخزون الحي. لا يمنع الإضافة بالكامل عند تفعيل البيع بالسالب في الإعدادات، وإلا يمنعها.
- **عرض الخصم:** سطر تحت السعر بلون `--matjark-success` «خصم −5.00 ج.م».

**11.1.5 `DiscountSheet`** (`BottomSheet`، جديدة)

من الأعلى للأسفل:

1. العنوان «خصم على {اسم الصنف}» أو «خصم على الفاتورة».
2. `md-button-group` متصل بخيارين: «نسبة %» و«مبلغ ج.م».
3. حقل القيمة `MuiTextField` بخط كبير ولوحة رقمية.
4. بطاقة `tonal` للمعاينة (للقراءة فقط): السعر قبل، السعر بعد، **الهامش بعد الخصم** (أحمر إن نزل عن التكلفة)، وسقف الاعتماد المتاح للمستخدم.
5. حقل «السبب» اختياري `Select` (عميل دائم، عيب بسيط، مطابقة سعر منافس، أخرى).
6. `Button text` «إلغاء» و`Button filled` «تطبيق». إن تجاوز الخصم 10% يتحول الزر إلى «موافقة مدير» بأيقونة قفل.

**قاعدة تحت التكلفة:** الخصم الذي يهبط بصافي السعر قبل الضريبة عن صافي التكلفة (قاعدة حماية الهامش في خطة الضرائب) يتطلب إجراءً مستقلاً `sale.below_cost` بنفس آلية الموافقة، **حتى لو كان تحت 10%**. وهو مفتاح جديد يُضاف إلى `PermissionKey` (11.4).

**الخصم على الفاتورة** يُوزَّع نسبياً على الأسطر **لكل مجموعة ضريبية على حدة** (طريقة `largest_remainder` من خطة الضرائب)، ويظهر في الإجماليات سطر «الخصم» مع ملخص «موزع على N صنف».

### 11.2 نافذة الدفع (تعديلات على 5.6)

النافذة تبقى `BottomSheet` بعرض أقصى 560dp. التغييرات:

**11.2.1 طريقة الدفع:** `md-button-group` متصل (بدل الـ Chips): **نقدي · بطاقة · محفظة · تحويل · آجل**. «آجل» معطلة بلا عميل (نص مساعد «اختر عميلاً أولاً»). تحت المجموعة `Button text` «تقسيم الدفع».

**11.2.2 تقسيم الدفع (`PaymentSplit[]`):** يظهر صف لكل طريقة: `Select` الطريقة + مبلغ، حتى 3 صفوف. شريط ملخص `tonal` تحتها: «المدفوع X من Y»، ويتحول لون `--matjark-success` عند التطابق. يُمنع التأكيد إن لم يتطابق المجموع مع الإجمالي، **إلا** عند وجود صف «آجل» فيُقبل الباقي كدين على العميل (وبشرط الحد الائتماني). ويُسجَّل كل صف كحركة مستقلة، والنقدي منها فقط يدخل حركات الدرج.

**11.2.3 قبل التأكيد: إعادة التحقق الذرّي** (إصلاح ثغرة التقرير الأول)

عند ضغط «تأكيد الدفع» تُقارن السلة بالقاعدة الحية. إن اختلف سعر أو مخزون أي صنف يظهر `Dialog` «تغيّرت بعض الأصناف» يسرد كل صنف (قبل ← بعد)، وبزرين: `filled` «تحديث السلة والمتابعة» و`text` «رجوع». ولا يُنشأ شيء قبل الموافقة. والتأكيد نفسه معاملة واحدة تكتب: الفاتورة، حركة المخزون، حركة الدرج، `receiptSnapshot`، سجل audit.

**11.2.4 شاشة النجاح** (تحل محل ما في 5.6 البند 9)

- أيقونة ✓ بلون `--matjark-success`، رقم الفاتورة `title-large`، الإجمالي، و**الباقي** بخط `headline-medium` (للنقدي).
- شارة الإيصال الإلكتروني إن كان `etaCompliance.enabled`: «قيد الإرسال» أو «أُرسل» أو «سيُعاد إرساله» (الإرسال خلفي، والشاشة لا تنتظره، فلا خطأ شبكة يظهر هنا).
- الأزرار: `Button filled` «فاتورة جديدة»، `Button outlined` «طباعة»، `Button text` «إرسال واتساب» (إن توفر رقم العميل).
- عند «فاتورة جديدة» أو الإغلاق: تُصفَّر **السلة والعميل المحدد والخصومات والمبلغ المستلم** (كان `selectedCustomerId` يبقى).

**11.2.5 الاستثناءات**

| الحالة | السلوك |
| --- | --- |
| الدفع النقدي بأقل من المستحق | يُرفض بنص «المبلغ أقل من المستحق»، ولا يتحول تلقائياً إلى آجل |
| بطاقة أو محفظة أو تحويل | حقل «رقم مرجعي» اختياري، ولا باقي. وإلزامي إن كان `pos.requireReference` مفعلاً |
| الدفع النقدي بلا وردية | يُعطَّل (11.1.2) |
| الوردية مفتوحة من أكثر من 16 ساعة | تحذير غير مانع في شريط الحالة «الوردية مفتوحة منذ 18 س، يُنصح بالتقفيل» |
| قفل الشاشة أثناء الدفع | لا يُقفل (10.3.4) |

**Audit: نعم.** `sale.completed` (رقم الفاتورة، الإجمالي، الدفعات، الوردية)، و`sale.price_drift_accepted` عند قبول تحديث السلة.

### 11.2.6 الفواتير المعلقة (`HeldSalesSheet`)

`BottomSheet` من زر المعلقات في الشريط العلوي:

- **الرأس:** «الفواتير المعلقة (N)» و`IconButton` إغلاق.
- **القائمة:** `ListItem` لكل فاتورة: في البداية `UserAvatar` 32dp لمن علّقها، السطر الأول «H-12 · عدد الأصناف · الإجمالي»، السطر الثاني «منذ كذا · اسم العميل إن وُجد». في النهاية `IconButton` استرجاع و⋮ (حذف).
- **الاسترجاع:** إن كانت السلة الحالية غير فارغة يظهر `Dialog` «استبدال السلة أم تعليقها أولاً؟». يعيد التحقق من الأسعار والمخزون مع وسوم «تغيّر السعر» عند الفرق.
- **الحذف:** `Dialog` تأكيد (بدل `window.confirm`). صاحب التعليق أو المدير فقط، ويُسجَّل `sale.hold_deleted`. «حذف الكل» للمدير فقط.
- **السقف:** 20 معلقة لكل جهاز، وتحذير عند التي مر عليها أكثر من 24 ساعة (لا حذف تلقائي).
- الاسترجاع من مستخدم آخر مسموح ويُسجَّل `sale.resumed_other_user` (10.3.5).

### 11.2.7 الإيصال (`ThermalReceipt`)

تتغير من `(invoice, settings)` إلى `(invoice, mode)`:

- **`mode: 'original' \| 'copy'`.** النسخة الأصلية والمعاد طبعها تُقرآن من `invoice.receiptSnapshot` فقط (9.13.4).
- في `copy`: علامة «نسخة» المائلة، وتذييل «أُعيدت الطباعة بتاريخ … بواسطة …»، ويزيد `reprintCount`.
- الأرقام والتواريخ **لاتينية** (`ar-EG-u-nu-latn`) تطابقاً مع قاعدة 3.5 في المخطط الأول.
- يُسجَّل `printCount` عند كل طباعة، فالإلغاء الإداري (9.13.3) يعتمد عليه.
- QR الحالي وهمي (انظر التقرير الأول)، فلا يُطبع على إيصال نهائي قبل استبداله بـ QR حقيقي من منظومة ETA.

### 11.3 الوردية

تفاصيل الإغلاق الأعمى هنا تنفّذ 6.6 من PART 1 (المراحل الثلاث، وحالات الحافة، وعدم تعديل الوردية بعد التأكيد). لا أكرر الجداول، بل أحدد شكل الشاشات.

**11.3.1 `ShiftBadge`** (في الشريط العلوي للكاشير وفي الـ Rail)

| الحالة | الشكل |
| --- | --- |
| مفتوحة باسم المستخدم | نقطة 8dp بلون `--matjark-success` + «وردية #12» `label-medium` + المدة «3س 20د» |
| مفتوحة باسم مستخدم آخر | نقطة `secondary` + «وردية #12 (أحمد)» |
| لا توجد وردية | نقطة `error` + «لا وردية»، والضغط يفتح `OpenShiftSheet` |
| تقفيل غير مكتمل | نقطة `--matjark-warning` + «تقفيل غير مكتمل» (مسودة، 6.6.4) |
| مفتوحة منذ أكثر من 16 ساعة | شارة `--matjark-warning-container` «منذ 18 س» (حد قابل للضبط) |

الضغط على الشارة يفتح شاشة الوردية. وهي لا تعرض أي مبلغ مطلقاً.

**11.3.2 شاشة الوردية**

قالب الشاشة الإدارية من المخطط الأول (6): `Top App Bar` ثم `Tabs` ثم المحتوى. التبويبات: **الحالية · السجل**.

**تبويب الحالية (وردية مفتوحة)**

1. **بطاقة الوردية الرئيسية** `Card tonal` على `primary-container`، ارتفاع 128dp: اسم صاحب الوردية ووقت الفتح والمدة (`body-medium`)، وفي النهاية الرقم الأهم **«المتوقع في الدرج»** بـ `headline-medium` عريضاً.
   - يظهر الرقم لكل الأدوار عند `blindCloseStrict = false` (الافتراضي، 6.6.3).
   - عند `true` يُستبدل لدور الكاشير والمشرف بـ «عدد الفواتير» و«الإجمالي غير النقدي»، ويبقى الرقم للمدير والمالك والمحاسب.
2. **صف KPI** (4 على الكمبيوتر، 2×2 على الموبايل) بـ `Card tonal`: مبيعات نقدية (`primary`)، بطاقة ومحفظة (`secondary`)، آجل (`--matjark-warning-container`)، مرتجعات (`error-container`). تُخفى النقدية والمرتجعات النقدية عند `blindCloseStrict` للكاشير والمشرف.
3. **حركات الدرج:** `List` بآخر 10 حركات: أيقونة نوع الحركة، اسم السبب، المستخدم، الوقت، والمبلغ بإشارة ± (الخروج بلون `error`). زر `text` «عرض الكل».
4. **الإجراءات:** `Button tonal` «حركة درج» (يفتح `DrawerMovementSheet`)، و`Button filled` «تقفيل الوردية». على الموبايل شريط سفلي ثابت بالزرين بعرض كامل مقسوم. وللمدير زر `outlined` إضافي «تقرير مؤقت (X)»، يطبع المتوقع بلا إغلاق ولا يُتاح للكاشير لأنه يكشف الرقم.

**تبويب الحالية (لا وردية):** حالة فارغة بأيقونة، العنوان «لا توجد وردية مفتوحة»، وزر `filled` «فتح وردية».

**تبويب السجل:** `MuiDataGrid`، الأعمدة من اليمين: رقم الوردية، الكاشير، وقت الفتح، وقت الإغلاق، المبيعات (نهاية)، الفرق (شارة: «مطابق» `success`، «عجز» `error`، «زيادة» `warning`)، الحالة، إجراءات (طباعة نسخة، ⋮). على الموبايل بطاقة `outlined` من 3 أسطر. الضغط على صف يفتح لوحة تفاصيل 420dp (`BottomSheet` ممدود على الموبايل) فيها ملخص التقرير، وحركات الوردية، وقائمة الموافقات التي مُنحت، ورابط «عرض في سجل التدقيق». ويضم التذييل: `Button outlined` «طباعة نسخة»، و`Button tonal` «إضافة تسوية» (مدير)، و`Button outlined` بلون `error` «إعادة فتح» (مالك).

**11.3.3 `OpenShiftSheet`** (`BottomSheet`، 560dp)

من الأعلى للأسفل:

1. العنوان «فتح وردية».
2. `Select` «الدرج» (يظهر فقط إن وُجد أكثر من درج، وإلا يُخفى).
3. حقل «الرصيد الافتتاحي» `MuiTextField` بخط كبير ولوحة رقمية، وتحته `Chip` assist «آخر تقفيل: 1,250.00 ج.م» يملأ الحقل بضغطة.
4. **ضابط التسليم:** إذا اختلف الرقم المُدخل عن `countedCash` لآخر تقفيل بأكثر من `varianceToleranceCents` يظهر تحت الحقل نص `--matjark-warning` «يختلف عن آخر تقفيل بمقدار X»، ويصبح حقل **«سبب الفرق»** إلزامياً. ويُسجَّل `shift.opening_mismatch`.
5. `Button text` «لاحقاً» و`Button filled` كبير 56dp «فتح الوردية».

**الاستثناءات:** إن وُجدت وردية مفتوحة لمستخدم آخر على الجهاز يُمنع الفتح ويظهر `Dialog` «توجد وردية مفتوحة باسم {أ}» بخيار «الانضمام إليها» (`shared_drawer`) أو «تسليم الوردية» (10.3.6). الصلاحية `shift.open`.

**11.3.4 `DrawerMovementSheet`** (`BottomSheet`)

1. `md-button-group` متصل بـ 4 خيارات: **سحب · إيداع · إلى الخزنة · مصروف**.
2. حقل المبلغ (خط كبير).
3. `Select` «السبب» تتغير قائمته بحسب النوع: سحب (سحب مالك، دفع مورد، تغيير فكّة، أخرى)، إيداع (فكّة من الخزنة، أخرى)، إلى الخزنة (تفريغ فائض)، مصروف (قائمة تصنيفات المصروفات، وتُنشئ `Expense` مرتبطاً بالحركة).
4. حقل «ملاحظة»: إلزامي إن كان السبب «أخرى».
5. سطر مساعد `body-small`: «المتاح بلا موافقة: X ج.م» (المتبقي من حد الوردية 500 ج.م، وحد الحركة 200 ج.م). **لا يُعرض رصيد الدرج المتوقع** أبداً هنا.
6. `Button text` «إلغاء» و`Button filled` «تسجيل». إن تجاوز المبلغ الحد يتحول الزر إلى «موافقة مدير» بأيقونة قفل (9.12). والمصروف يمر بصلاحية `purchase.create` أو صلاحية المصروف بحسب التصنيف.

لا تراجع عن حركة مسجّلة (9.13): التصحيح بحركة معاكسة بسبب مكتوب. **Audit: نعم.**

**11.3.5 `CloseShiftDialog`: التقفيل الأعمى**

`Dialog` بشاشة كاملة على الموبايل وبعرض 560dp على الكمبيوتر، برأس فيه `StepIndicator` مضغوط بثلاث خطوات: **العدّ ← المراجعة ← النتيجة**. لا يُغلق بالضغط خارجه بعد الخطوة الثانية.

**الخطوة 1: العدّ (المرحلة أ)**

- بطاقة `tonal` للقراءة فقط: الكاشير، المدة، الرصيد الافتتاحي، **عدد** الفواتير، ومجاميع الدفع غير النقدي بسطر لكل طريقة. لا يوجد أي رقم نقدي ولا المتوقع (6.6.2).
- `MuiSwitch` «إدخال المبلغ الكلي مباشرة»: افتراضياً مفعّل على الموبايل، ومعطّل (فيعرض العدّاد) على الكمبيوتر. القيمة المحفوظة (`countMethod`) تختلف: `denominations` أو `total`.
- العدّاد (11.3.6) أو حقل «المبلغ الفعلي بالدرج».
- `Button text` «إلغاء» و`Button filled` «التالي» (معطل عند المبلغ الفارغ).

**الخطوة 2: المراجعة (المرحلة ب)**

- المبلغ المُدخل بخط `display-small` وتحته ملخص الفئات.
- `MuiTextField` «ملاحظة» اختياري، و`MuiSwitch` «طباعة تقرير الوردية».
- سطر مساعد ثابت: «لن يظهر الفرق إلا بعد التأكيد».
- `Button text` «تعديل» و`Button filled` «تأكيد وتقفيل».

**الخطوة 3: النتيجة (المرحلة ج)**

| السيناريو | ما يعرضه |
| --- | --- |
| الفرق ضمن التسامح (افتراضي 5 ج.م) | بطاقة نجاح `--matjark-success-container`: المتوقع، الفعلي، الفرق، الحالة «مقفلة». `Button filled` «تم» و`Button outlined` «طباعة» |
| فرق يتجاوز التسامح، والمحاولة الأولى | بطاقة `warning`: «يوجد فرق X (عجز أو زيادة)»، مع **المتوقع والفعلي** الآن فقط. زران: `Button outlined` «إعادة العدّ» (يرجع للخطوة 1 مع الاحتفاظ بالأرقام السابقة وعلامة «محاولة 2 من 2»)، و`Button filled` «اعتماد مع ملاحظة» |
| بعد إعادة العدّ ولا يزال الفرق | زر واحد `filled` «اعتماد مع ملاحظة»، فلا عدّ ثالث (6.6.2) |
| «اعتماد مع ملاحظة» | حقلان إلزاميان: `Select` السبب (خطأ في العدّ، مصروف غير مسجل، مرتجع غير مسجل، غير معروف) و`MuiTextField` ملاحظة لا تقل عن 10 أحرف. ثم يُغلق ويُجمَّد |

بعد التأكيد النهائي لا يعدّله أحد. يتحول التطبيق إلى حالة «لا وردية».

**11.3.6 `DenominationCounter`**

- صفوف تنازلية بالفئات المصرية: **200 · 100 · 50 · 20 · 10 · 5 · 1 جنيه، و50 قرشاً، و25 قرشاً**.
- كل صف: تسمية الفئة `title-medium` في البداية، `IconButton` tonal «−» 40dp، حقل كمية رقمي بعرض 56dp، `IconButton` tonal «+» 40dp، والمجموع الفرعي `body-medium` في النهاية بأرقام لاتينية.
- في الأعلى (ثابت عند التمرير): «المبلغ المعدود» بـ `headline-small`.
- الحقل يقبل الكتابة المباشرة، والتنقل بـ Tab بين الكميات.
- يرفض السالب وأكثر من 9,999 قطعة للفئة.

**11.3.7 تقرير الوردية المطبوع** (80mm، أرقام لاتينية، يُسمّى `ShiftReportReceipt`)

من الأعلى للأسفل: اسم المتجر، «تقرير وردية»، رقم الوردية، الكاشير، وقتا الفتح والإغلاق والمدة. ثم أقسام: **المبيعات** (عدد الفواتير والإجمالي وحسب طريقة الدفع)، **المرتجعات** (عدد الإشعارات الدائنة والإجمالي)، **الخصومات** (إجمالي الخصم)، **حركات الدرج** (سحب وإيداع وإلى الخزنة ومصروفات)، **الدرج** (الافتتاحي، + مبيعات نقدية، − مرتجعات نقدية، ± حركات، = المتوقع)، **الفعلي**، **الفرق** والملاحظة، **الموافقات** (عدد مرات Override وأنواعها ومن وافق)، ثم سطرا توقيع (الكاشير والمدير)، وتذييل «طُبع بواسطة {مستخدم} {وقت}». وفي النسخة المعاد طبعها علامة «نسخة» (9.13.4).

**11.3.8 التسوية بعد التقفيل وإعادة الفتح**

- **تسوية بعد التقفيل** (مدير): من لوحة تفاصيل الوردية `Dialog`: حقل المبلغ (موجب أو سالب)، `Select` السبب، ملاحظة إلزامية. تُسجَّل كحركة `post_close_adjustment` ولا تغيّر لقطة التقفيل. فوق سقف المدير: موافقة المالك.
- **إعادة الفتح** (مالك فقط): `Dialog` فيه `Select` السبب وملاحظة، وبطاقة `tertiary-container` «سيُنشأ تعديل رقم N ولن تُمحى لقطة التقفيل الأصلية»، و`MuiSwitch` «أفهم ذلك». الزر `filled` بلون `error` «إعادة الفتح». الشروط: لا وردية تالية على الدرج، ولا فترة محاسبية مقفلة.

**11.3.9 حالات الحافة**

| الحالة | السلوك |
| --- | --- |
| سلة غير فارغة أو معلقات عند التقفيل | تحذير «لديك N فواتير معلقة». الخيارات: متابعة (تبقى على الجهاز، وتُسجَّل في التقرير)، أو فتح قائمة المعلقات. السلة النشطة يجب تعليقها أو تفريغها أولاً |
| ساعة الجهاز رجعت للخلف (وقت الإغلاق قبل الفتح) | يُمنع التقفيل برسالة «تحقق من ساعة الجهاز» ويُسجَّل `shift.clock_anomaly` |
| تبويبان للتطبيق على نفس الجهاز | `Web Locks` تسمح بتبويب واحد نشط للبيع. الثاني يُفتح للقراءة فقط بشريط «التطبيق مفتوح في نافذة أخرى» (تفادياً لتضارب القاعدة المرصود في التقرير الأول) |
| انقطاع الكهرباء أثناء الوردية | تبقى مفتوحة عند التشغيل التالي بلا فقد، وتظهر لافتة «تحقق من الفواتير الأخيرة» إن كان آخر حفظ غير مكتمل |
| التقفيل بواسطة مدير نيابة | شريط أعلى الـ Dialog «تقفل نيابة عن {أ}»، ويُسجَّل `closedOnBehalfOf` |
| طباعة فشلت بعد التقفيل | التقفيل ثابت. يبقى زر «طباعة» في لوحة التفاصيل |

### 11.4 واجهات TypeScript المضافة

كلها إضافية لما في PART 1 و2. المبالغ `ScaledMoney` والنسب `BasisPoints` والتواريخ epoch ms.

```ts
// ملاحظة: 'sale.below_cost' مضاف فعلاً إلى PermissionKey في PART 1 (11.1.5).
// export type PermissionKey = ... | 'sale.below_cost';

// لماذا: ملخص أسباب حركات الدرج لقوائم Select وتقرير الوردية.
export type DrawerReasonCode =
  | 'owner_withdrawal' | 'supplier_payment' | 'change_float' | 'safe_drop'
  | 'float_from_safe' | 'expense' | 'customer_collection' | 'other';

// لماذا: عدّاد الفئات في التقفيل الأعمى (11.3.6). فئة وكمية، ويُحسب منها المجموع.
export interface DenominationCount {
  denomination: ScaledMoney;     // 200 ج.م إلى 25 قرشاً
  quantity: number;
}

// لماذا: مسودة التقفيل التي تبقى بعد إغلاق التطبيق (6.6.4). لا تكشف الفرق ولا تُعد تقفيلاً.
export interface ShiftCloseDraft {
  shiftId: string;
  userId: string;
  countMethod: 'denominations' | 'total';
  denominations?: DenominationCount[];
  countedCash?: ScaledMoney;
  note?: string;
  attempt: 1 | 2;
  savedAt: number;               // تنتهي بعد 12 ساعة
}

// ملاحظة: هذه الحقول دُمجت فعلاً في Shift (PART 1، القسم 5). التعريف هنا للمرجع فقط.
export interface ShiftCloseFields {
  countMethod?: 'denominations' | 'total';
  denominations?: DenominationCount[];
  varianceReason?: 'count_error' | 'unrecorded_expense' | 'unrecorded_refund' | 'unknown';
  openingMismatchNote?: string;  // سبب اختلاف الافتتاحي عن آخر تقفيل (11.3.3)
  reportId?: string;
}

// لماذا: لقطة مجمَّدة لتقرير الوردية تُطبع منها النسخ الأصلية والمعادة بلا إعادة حساب.
export interface ShiftReport {
  id: string;
  shiftId: string;
  revision: number;
  generatedAt: number;
  generatedBy: string;
  invoiceCount: number;
  salesByMethod: Record<PaymentMethod, ScaledMoney>;
  refundsTotal: ScaledMoney;
  creditNoteCount: number;
  discountsTotal: ScaledMoney;
  movements: { kind: DrawerMovementKind; total: ScaledMoney }[];
  openingBalance: ScaledMoney;
  expectedCash: ScaledMoney;
  countedCash: ScaledMoney;
  variance: ScaledMoney;
  varianceNote?: string;
  overrides: { actionKey: string; approverId: string; at: number }[];
}

// لماذا: سطر خفيف للمعلقة (بدل كائن Product كامل بصورته base64 المخزّن اليوم).
export interface HeldSaleLine {
  productId: string;
  unitId?: string;
  quantity: number;
  unitPriceAtHold: ScaledMoney;  // للمقارنة عند الاسترجاع (وسم تغيّر السعر)
  discountAmount?: ScaledMoney;
}

// لماذا: الفاتورة المعلقة على مستوى الجهاز، وتحمل صاحبها (10.3.5).
export interface HeldSale {
  id: string;
  number: string;                // H-12
  deviceId: string;
  heldBy: string;
  createdAt: number;
  shiftId?: string;
  customerId?: string;
  invoiceDiscount?: { kind: 'percent' | 'amount'; value: number; reason?: string };
  note?: string;
  lines: HeldSaleLine[];
}

// لماذا: الدفع المقسَّم (11.2.2). النقدي منه فقط يدخل حركات الدرج.
export interface PaymentSplit {
  method: PaymentMethod;
  amount: ScaledMoney;
  reference?: string;
}

// لماذا: حقل اختياري على Invoice يحل محل paymentMethod الوحيد دون كسره.
export interface InvoicePaymentFields {
  payments?: PaymentSplit[];
  changeGiven?: ScaledMoney;
}

// لماذا: سياسة الكاشير والوردية القابلة للضبط (الإعدادات > نقطة البيع).
export interface PosPolicySettings {
  requireOpenShift: boolean;         // false افتراضياً حتى اكتمال الاختبار
  requireReference: boolean;         // رقم مرجعي إلزامي لغير النقدي
  shiftPolicy: 'shared_drawer' | 'per_user_drawer';
  longShiftHours: number;            // 16
  maxHeldPerDevice: number;          // 20
  allowNegativeStock: boolean;
  returnWindowDays: number;          // 14 (12.4.4)
}
```

**تذكير:** `Invoice extends InvoiceLedgerFields, InvoicePaymentFields`، و`Shift` يحمل حقول التقفيل مباشرة (دُمجت في PART 1، القسم 5)، و`StoreSettings` يضيف `pos?: PosPolicySettings`.

### 11.5 المكوّنات الجديدة

| المكوّن | Props | أين يُستخدم | إنشاء في `src/components/ui` |
| --- | --- | --- | --- |
| `MuiButtonGroup` | `value`, `onChange`, `options: {value, label, icon?, disabled?}[]`, `variant: 'connected' \| 'standard'`, `size?`, `fullWidth?` | طريقة الدفع، نوع الخصم، نوع حركة الدرج | **نعم** (غلاف `md-button-group`) |
| `ShiftBadge` | `shift?: Shift`, `currentUserId`, `onClick()`, `compact?` | الكاشير، الـ Rail، الوردية | لا: `components/shift/` |
| `OpenShiftSheet` | `open`, `lastClosingCash?`, `drawers?`, `onSubmit(input)`, `onClose()` | الكاشير، الوردية | لا: `components/shift/` |
| `DrawerMovementSheet` | `open`, `shiftId`, `freeLimitRemaining`, `onSubmit(movement)`, `onNeedOverride(movement)`, `onClose()` | شاشة الوردية، الكاشير | لا |
| `CloseShiftDialog` | `open`, `shift`, `nonCashTotals`, `invoiceCount`, `draft?`, `onSaveDraft(d)`, `onConfirm(result)`, `onClose()`, `closingOnBehalfOf?` | شاشة الوردية | لا |
| `DenominationCounter` | `value: DenominationCount[]`, `onChange`, `denominations?` (الافتراضي المصري)، `disabled?` | `CloseShiftDialog` | **نعم** |
| `ShiftReportReceipt` | `report: ShiftReport`, `settingsSnapshot`, `mode: 'original' \| 'copy'` | الطباعة من الوردية | لا |
| `DiscountSheet` | `open`, `scope: 'line' \| 'invoice'`, `basePrice`, `unitCost`, `currentDiscount?`, `userCeiling`, `onApply(discount)`, `onNeedOverride(discount)`, `onClose()` | الكاشير | لا: `components/pos/` |
| `HeldSalesSheet` | `open`, `held: HeldSale[]`, `currentUserId`, `onResume(id)`, `onDelete(id)`, `onDeleteAll()`, `onClose()` | الكاشير | لا: `components/pos/` |
| `PaymentSplitRows` | `rows: PaymentSplit[]`, `onChange`, `total`, `allowCredit`, `customer?` | نافذة الدفع | لا |

حالات كل مكوّن (default / hover / disabled / error) تتبع قواعد 4.1 إلى 4.3 في المخطط الأول: الأزرار المعطلة بشفافية 0.38، والحقول الخاطئة بحد `error` ونص مساعد، والتركيز بحلقة `primary`.

### 11.6 جدول Audit للجزء الثالث

| `actionKey` | ما يُسجَّل | الخطورة |
| --- | --- | --- |
| `sale.completed` | رقم الفاتورة، الإجمالي، الدفعات، الوردية، المستخدم | info |
| `sale.price_drift_accepted` | الأصناف قبل وبعد | info |
| `sale.discount.applied` | النطاق (صنف أو فاتورة)، القيمة، السبب، الموافقة | info (warning فوق 10%) |
| `sale.below_cost` | الصنف، السعر والتكلفة، المعتمِد | warning |
| `sale.hold_created` / `hold_deleted` / `resumed_other_user` | رقم المعلقة، صاحبها، من استرجعها | info |
| `receipt.printed` / `receipt.reprint` | رقم الفاتورة، `printCount` و`reprintCount` | info |
| `shift.opened` / `shift.opening_mismatch` | الرصيد، الفرق عن آخر تقفيل، السبب | info / warning |
| `drawer.movement` | النوع، المبلغ، السبب، المعتمِد | info (warning عند تجاوز الحد) |
| `shift.close.*` | (6.6): مسودة، تأكيد، فرق، إعادة عدّ | info / warning |
| `shift.adjustment.added` / `shift.reopened` | المبلغ، السبب، المالك | critical |
| `shift.clock_anomaly` | وقتا الفتح والإغلاق | critical |

### 11.7 مخاطر التنفيذ على `StoreContext`

| الخطر | الاحتراز |
| --- | --- |
| تغيير توقيع `checkoutInvoice` يكسر `CashierScreen` | يضاف وسيط ثانٍ اختياري `options?: { shiftId, userId, payments, receiptSnapshot }` ولا يتغير الأول. الاستدعاءات القديمة تعمل |
| الدفع الذرّي (11.2.3) يمس حالة السلة والمخزون معاً | يُنفَّذ داخل `setDb` واحد بدالة نقية، وتُنقل آثار الحفظ والـ audit خارج المحدّث (المشكلة المرصودة في التقرير الأول) |
| ترحيل المعلقات من `matjark_pos_held_sales_v1` | محوّل لمرة واحدة يقرأ الشكل القديم ويكتب `HeldSale`، مع الإبقاء على القديم نسخة احتياطية حتى التأكد |
| إلزام وردية مفتوحة | علَم `requireOpenShift` معطل افتراضياً (Phase 2 في 7) |
| تحويل `amountPaid` الوحيد إلى `payments[]` | يُشتق `amountPaid` و`paymentMethod` القديمان من `payments[]` للتوافق مع الشاشات الأخرى |
| `ThermalReceipt` يقرأ الإعدادات الحالية | لا تُعدَّل إلا بعد توفر `receiptSnapshot` في كل الفواتير الجديدة، وللقديمة يبقى المسار الحالي (11.2.7) |

## Checklist للتنفيذ (PART 3)

**يُنشأ**

- [ ] `src/components/shift/`: `ShiftBadge`، `OpenShiftSheet`، `DrawerMovementSheet`، `CloseShiftDialog`، `ShiftReportReceipt`، `ShiftScreen`
- [ ] `src/components/pos/`: `DiscountSheet`، `HeldSalesSheet`، `PaymentSplitRows`
- [ ] `src/components/ui/`: `MuiButtonGroup`، `DenominationCounter`
- [ ] `src/context/ShiftContext.tsx` (من Phase 2) و`src/utils/heldSales.ts` (المحوّل والتخزين الخفيف)
- [ ] `src/utils/shiftMath.ts`: حساب المتوقع من الحركات (دالة نقية)

**يُعدَّل**

- [ ] `CashierScreen.tsx`: الشريط العلوي، شريط الوردية، `DiscountSheet`، نافذة الدفع (المجموعة والتقسيم والتحقق الذرّي وشاشة النجاح)، استبدال `window.confirm`، تصفير العميل بعد الدفع
- [ ] `ThermalReceipt.tsx`: `(invoice, mode)`، `receiptSnapshot`، أرقام لاتينية، `printCount`
- [ ] `StoreContext.tsx` (إضافات): `checkoutInvoice(…, options?)`، دوال الوردية والحركات، `HeldSale`
- [ ] `src/types/index.ts`: مدموج في الملحق (أ)، ومعه واجهات 11.4 ومفتاح `sale.below_cost`
- [ ] `Sidebar.tsx`: وجهة «الوردية» حسب `shift.view`

**يُحذف**

- [ ] `window.confirm` في الكاشير (سطر 392 و422)
- [ ] مفتاح `matjark_pos_held_sales_v1` بعد نجاح الترحيل واختباره

**يُختبر**

- [ ] تغيير سعر أو مخزون صنف أثناء وجوده في السلة: يظهر `Dialog` المقارنة ولا تُنشأ فاتورة قبل الموافقة
- [ ] دفع مقسّم نقدي وبطاقة: حركة درج واحدة بقيمة النقدي فقط
- [ ] آجل فوق الحد: زر «تجاوز بموافقة مدير» وحده يتجاوز
- [ ] خصم 11% و10% وتحت التكلفة: سلوك الموافقة لكل منها
- [ ] إغلاق أعمى: لا يظهر المتوقع قبل التأكيد، وإعادة عدّ مرة واحدة فقط، ومسودة تبقى بعد إغلاق التطبيق
- [ ] مجموع الفئات يطابق الحقل الكلي، والفرق يُسجَّل كـ `shift_variance`
- [ ] اختلاف الافتتاحي عن آخر تقفيل يطلب سبباً
- [ ] إعادة الطبع مطابقة حرفياً للأصل مع علامة «نسخة»، و`printCount` يمنع الإلغاء الإداري بعد الطباعة
- [ ] تبويبان على نفس الجهاز: الثاني للقراءة فقط
- [ ] كل الأرقام لاتينية في الشاشات والإيصال والتقرير

**PART 3 جاهز — أكمل إلى PART 4؟**

---

## PART 4 — باقي الشاشات الموحدة

يبني على الأجزاء الثلاثة السابقة. لا أعيد المخطط الأول (الأقسام 6.1 إلى 6.7: المخزن، المشتريات، العملاء، الفواتير، الحسابات، الإعدادات) بل أحدّد **ما يتغير** فيها بسبب الصلاحيات والوردية والسجل غير القابل للتعديل والمحاور الضريبية، وأضيف ما كان ينقصها. الأقسام 12.0 إلى 12.9. وفي آخر الجزء سجل بالتحديثات المطبّقة على الأجزاء 1 إلى 3.

### 12.0 التشغيل على HTTPS في التطوير (mkcert)

**القرار:** التطوير على HTTPS عبر `vite-plugin-mkcert`، فالسياق آمن (`isSecureContext = true`) وتتوفر واجهات WebCrypto والحافظة والكاميرا وWeb Locks. **لا بدائل لها:** لا مكتبة تجزئة خارجية ولا مولّد معرّفات خاص ولا عقد إيجار بين التبويبات، وتُستعمل الواجهات الأصلية مباشرة. ما زال سكربت `dev` الحالي `vite --port=3000 --host=0.0.0.0` يخدم الشبكة المحلية، والبروتوكول يتغير بإضافة `mkcert`.

**12.0.1 ما يعتمد عليه المخطط الآن**

| الواجهة | الاستخدام | القرار |
| --- | --- | --- |
| `crypto.subtle` | تجزئة كلمة المرور وPIN ومفتاح الاسترداد، وسلسلة التجزئة في audit | **PBKDF2-SHA256 وSHA-256 الأصليان**، بلا مكتبة إضافية. WebCrypto لا يوفر scrypt، ويبقى `KdfParams` (12.7) مفتوحاً لخوارزمية أقوى لاحقاً |
| `crypto.randomUUID()` | المعرّفات | تُستخدم مباشرة |
| Web Locks | تبويب واحد نشط للبيع (11.3.9) | تُستخدم كما في PART 3 |
| `navigator.clipboard` | زر «نسخ» في مفتاح الاسترداد | تُستخدم مباشرة |
| `getUserMedia` | مسح الباركود بالكاميرا | يبقى زر الكاميرا ظاهراً |
| `navigator.storage.persist()` | طلب حماية التخزين من المسح التلقائي | يُستدعى عند الإعداد الأول. قد يرفضه المتصفح، وتظهر النتيجة في الإعدادات > النظام |
| Service Worker وPWA | تشغيل دون خادم | ممكن لاحقاً، خارج هذا المخطط |

**12.0.2 إعداد `mkcert` (حسب توثيق الإضافة)**

- تُضاف `mkcert()` إلى `plugins` في `vite.config.ts` (مكتبة تطوير فقط). في Vite 5 فأحدث لا حاجة لـ `server.https: true`.
- الشهادة تُولَّد افتراضياً لـ `localhost` وعناوين IP المحلية. الخيار `hosts` لأي أسماء أخرى، و`force` لإعادة التوليد، و`mkcertPath` إن كانت الشبكة مقيدة (أول تشغيل ينزّل ملف mkcert).
- **الأجهزة الأخرى** (موبايل أو تابلت على الشبكة): تُثبَّت الجهة المصدِّرة `rootCA.pem` (المجلد الذي يطبعه `mkcert -CAROOT`) على كل جهاز، وفي iOS يلزم أيضاً تفعيل الثقة الكاملة للملف. بدون ذلك يظهر تحذير شهادة، وقد يفشل ما يشترط شهادة موثوقة.
- لم أشغّل هذا الإعداد بنفسي. تحقق من أن `window.isSecureContext` ترجع `true` على كل جهاز اختبار.

**12.0.3 المسح بقارئ باركود (HID)**

مكوّن `ScannerListener` غير مرئي يلتقط ضغطات المفاتيح على مستوى النافذة: تسلسل أحرف تفصل بينها أقل من 35ms وينتهي بـ Enter وبطول 6 فأكثر يُعامل **باركوداً** لا كتابة يدوية، فيُضاف الصنف حتى لو لم يكن حقل البحث مركّزاً. لا يعترض الكتابة داخل حقول النصوص ما لم يكن التسلسل بهذه السرعة. لا يعتمد على السياق الآمن، ويخدم الكاشير واستلام المشتريات والجرد إلى جانب مسح الكاميرا.

**12.0.4 حارس البدء والبيانات**

- **حارس السياق الآمن:** عند `window.isSecureContext === false` تظهر شاشة `AuthScaffold` مانعة بنص «افتح التطبيق عبر https أو localhost» مع العنوان الحالي، بدل انهيار صامت في التجزئة (لا توجد بدائل). لا يحتاج Audit.
- **البيانات مرتبطة بالأصل (origin):** `https://localhost:3000` غير `https://192.168.1.10:3000` وغير منفذ آخر، وكل أصل قاعدة منفصلة. تغيير العنوان يفتح قاعدة فارغة ويبدو أن البيانات ضاعت. يبقى عرض الأصل الحالي في الإعدادات > النظام ورسالة بدء عند اختلافه، ويحفظ `BackupManifest` حقل `originAtExport`.
- **النسخ الاحتياطي:** يبقى تذكير التصدير عند كل تقفيل وردية (زر `tonal` «حفظ نسخة الآن»)، لأن `persist()` قد لا يُمنح.

**12.0.5 قبل الإنتاج (مؤجل بقرارك)**

`mkcert` للتطوير فقط. عند النشر لدى عميل تُحسم لاحقاً إحدى الطرق: تشغيل التطبيق على `localhost` في جهاز الكاشير نفسه (سياق آمن بلا شهادة)، أو شهادة محلية موثوقة على كل جهاز، أو نطاق بشهادة حقيقية. لا يُبنى في التطبيق ما يفترض غير ذلك، وحارس 12.0.4 يضمن فشلاً واضحاً.

**12.0.6 تعديلات على الأجزاء السابقة بسبب هذا القسم**

| الموضع | التعديل |
| --- | --- |
| PART 1، 6.1 و6.4 (سلسلة التجزئة) | SHA-256 عبر `crypto.subtle.digest`، وهي غير متزامنة فتصير دالة الإضافة `async` |
| PART 2، `RecoveryKeyRecord` | `kdf: KdfParams` (PBKDF2) بدل `iterations: number` (12.7) |
| PART 2، 10.7.3 | يُستبدل صف «`crypto.subtle` غير متاح» بحارس البدء (12.0.4) |
| PART 3، 11.3.9 و11.1.1 | لا تغيير: Web Locks وزر الكاميرا يبقيان |

### 12.1 المخزن

التبويبات كما في 6.1: **المنتجات · الدفعات والصلاحية · حارس الأسعار · الحركات والجرد**. يتغير الآتي:

**12.1.1 المنتجات**

- **التكلفة والهامش:** عمودا سعر الشراء والهامش وبطاقة «قيمة المخزون» تظهر فقط لمن يملك `product.cost.view`. وللكاشير والمشرف يظهر المخزن للقراءة بلا هذه الأعمدة.
- **الحذف يصير أرشفة:** ⋮ في الصف: «أرشفة» بدل «حذف»، ويفتح `Dialog` يشرح «سيختفي من الكاشير ويبقى في الفواتير القديمة». للمنتجات ذات الحركات لا يوجد حذف نهائي (9.13.1). المنتجات المؤرشفة تظهر بفلتر `Chip` «المؤرشفة» مع زر «استرجاع».
- **الصلاحيات:** تعديل السعر والتكلفة `product.price_edit` (مدير ومالك)، والأرشفة `product.archive`، وتعديل الكمية `stock.adjust` (المشرف 🔒). تُسجَّل كل قيمة قبل وبعد في audit.
- **نموذج المنتج** (`Dialog` شاشة كاملة على الموبايل) بالأقسام من 6.1، مع إضافات: `Select` «التصنيف الضريبي» من القوالب الستة (`exempt, zero_rated, vat_14, schedule_only, composite, medical_5`، **بلا `out_of_scope`** كما قرّرنا)، و`MuiSwitch` «مستثنى من المعدل المخفض» لـ `medical_5`، و`MuiSwitch` «تتبع الصلاحية والدفعات» (يُظهر حقل «الحد الأدنى للصلاحية عند الاسترجاع»). التحقق الفوري: **الباركود فريد** (خطأ تحت الحقل باسم الصنف المتعارض)، والسعر والكمية رقمان غير سالبين.
- **الصور:** تُضغط (الموجود `imageCompressor`) وتبقى في السجل حتى الانتقال إلى IndexedDB، مع سقف 100KB للصورة ومؤشر استهلاك التخزين في الإعدادات.
- **مسح الباركود** بالقارئ (12.0.3) داخل حقل الباركود وحقل البحث.

**12.1.2 الدفعات والصلاحية**

- `List` مجمعة بالصنف: كل `ListItem` دفعة (رقم الدفعة، الكمية المتبقية، تاريخ الانتهاء). شارة الصلاحية: `error` أقل من 7 أيام، و`--matjark-warning` أقل من 30، وإلا عادية. الدفعات في الحجر `quarantine` بشارة `secondary`.
- الفلتر العلوي `Chips`: الكل، تنتهي قريباً، منتهية، حجر.
- الإجراء على الدفعة القريبة: `Chip` assist «اعمل عرضاً» يفتح `DiscountSheet` مسبقاً بسبب «تصريف».
- **لا حذف لدفعة**. المنتهية تُنقل لحالة `expired` وتُخرج من المخزون القابل للبيع بقيد هالك (تسوية مسجلة).

**12.1.3 حارس الأسعار**

كما في 6.1، مع قيد واحد: «إعادة تسعير جماعي» يتطلب `product.price_edit`، ويعرض معاينة قبل وبعد بالهامش، ويُسجَّل كل صنف متأثر في audit كسجل واحد مجمّع (`inventory.bulk_reprice`) بقائمة الأصناف.

**12.1.4 الحركات والجرد**

- **الحركات:** `List` لا تُعدَّل (بيع، استلام، تسوية، هالك، مرتجع). ⋮ لا يحوي حذفاً.
- **الجرد (`StockCountDialog`)**، شاشة كاملة، بنفس مبدأ الإغلاق الأعمى:
  1. «بدء جرد» (`stock.adjust`): اختيار النطاق (كل المخزن أو تصنيف) و`MuiSwitch` «إخفاء الكمية الحالية» (مفعّل افتراضياً).
  2. شاشة العدّ: حقل مسح/بحث، وقائمة الأصناف المعدودة بـ `ListItem` (الاسم والكمية المعدودة مع `−` و`+`). لا تظهر كمية النظام.
  3. المراجعة: جدول الفروق (الصنف، النظام، المعدود، الفرق، قيمة الفرق بسعر التكلفة) مع تلوين العجز والزيادة. إن كان الفرق في صنف متتبَّع بالدفعات يُطلب تحديد الدفعة.
  4. الاعتماد: `Button filled` «اعتماد التسويات». يولّد `AdjustmentEntry` لكل صنف بسبب «جرد» (لا تعديل مباشر للكمية). فوق سقف المبلغ يحتاج موافقة (9.7).
  5. تقرير جرد مطبوع/PDF.
- **Audit: نعم** (`inventory.count.started`, `inventory.count.approved` بالأرقام المجمعة، وكل تسوية).

### 12.2 المشتريات والموردون

التبويبات: **فواتير الشراء · الموردون**. شاشة الموردين **تنتقل إلى هنا** من `CustomersScreen` (فيها اليوم تبويب فرعي `activeSubTab` للعملاء والموردين)، فتبقى شاشة العملاء للعملاء فقط.

**12.2.1 فواتير الشراء:** القالب والأعمدة من 6.2. التفاصيل الجديدة:

- **`PurchaseInvoiceDialog`** (شاشة كاملة على الموبايل، 720dp على الكمبيوتر)، بتمرير واحد من الأعلى للأسفل:
  1. رأس: `Select` المورد (مع «+ مورد جديد»)، التاريخ، رقم فاتورة المورد، `Select` طريقة الدفع.
  2. قائمة الأسطر: بحث أو مسح بقارئ (12.0.3)، ثم لكل سطر الكمية والكمية المجانية (بونص) وتكلفة الوحدة. إن كان الصنف متتبَّع الصلاحية يظهر حقلا رقم الدفعة وتاريخ الانتهاء. حقل «الضريبة» يُحسب من قالب الصنف، **وعند `vatStatus = unregistered` يتحول إلى نص «تُضاف للتكلفة»** (لا مدخلات قابلة للخصم).
  3. تذييل ثابت: المجموع، الضريبة، الإجمالي، المدفوع، المتبقي على المورد.
  4. الأزرار: `Button text` «حفظ كمسودة» و`Button filled` «اعتماد الفاتورة» (`purchase.create`).
- **عند الاعتماد** (معاملة واحدة): `ProductBatch` لكل سطر متتبَّع، حركة مخزون، تحديث متوسط التكلفة (البونص يخفض المتوسط بالمعادلة المعتمدة في خطة الضرائب)، رصيد المورد بالمتبقي، وإن دُفع نقداً **من الدرج** فحركة `cash_out` بسبب `supplier_payment` مرتبطة بالفاتورة (وتخضع لحد 200 ج.م وموافقة المدير فوقه، 9.13.3 و).
- **لا تعديل ولا حذف بعد الاعتماد** (9.13.1): التصحيح بـ«عكس الفاتورة» (فاتورة شراء بـ `reversalOf`)، ويُمنع جزئياً أو كلياً إن كانت دفعاتها قد بيع منها، مع نص يوضح الكمية المتبقية القابلة للعكس.
- **`Audit: نعم`:** `purchase.posted` و`purchase.reversed` (المورد، الإجمالي، الدفعات).

**12.2.2 الموردون:** الأعمدة: المورد، الهاتف، **الرصيد المستحق** (`error`)، آخر شراء، إجراءات (سداد، كشف حساب، ⋮). نموذج المورد `Dialog` من 6.3 مع: `Select` «نمط فواتير الأمانة» (`consignmentBillingMode`) **مرئي للمالك والمحاسب فقط** ويتطلب قرار `TaxDecisionRecord`، ومفتاح «طرف مرتبط» `@unverified` في قسم متقدم مطوي. **سداد المورد** `BottomSheet`: المبلغ، طريقة الدفع (النقدي من الدرج يمر بحدود الدرج)، المرجع. يُسجَّل بقيد لا يُحذف.

### 12.3 العملاء والآجل

التبويبات: **الكل · عليهم مديونية · أنشطة هذا الشهر**.

**12.3.1 اصطلاح الرصيد (حسم تناقض مرصود في PART 1):** `Customer.balance` **موجب = دين على العميل (مستحق للمتجر)**، وسالب = رصيد دائن للعميل. هذا ما تعرضه `CustomersScreen` فعلاً (الموجب بلون تحذير)، ويُصحَّح **تعليق النوع** المعاكس. ولا يُعدَّل الرصيد مباشرة: يُشتق من `CustomerLedgerEntry` (12.7).

**12.3.2 القائمة:** الأعمدة من اليمين: العميل (اسم + هاتف)، آخر شراء، إجمالي المشتريات، **الحد الائتماني**، الرصيد (`error` للموجب)، شريحة التقادم (0 إلى 30 / 31 إلى 60 / أكثر من 60 يوماً بلون يتدرج)، إجراءات (اتصال، واتساب، ⋮). على الموبايل `ListItem` بصورة رمزية دائرية، والرصيد في النهاية.

**12.3.3 لوحة العميل** (420dp، أو `BottomSheet` ممدود على الموبايل)

1. الرأس: الاسم، **الرصيد** بـ `headline-small`، وتحته `Progress` للحد الائتماني: عادي، ثم `--matjark-warning` عند 80%، ثم `error` فوق 100%.
2. صف أزرار: `Button filled` «تسجيل دفعة»، `Button outlined` «كشف حساب» (طباعة أو نص جاهز لـ `wa.me`).
3. `Tabs` صغيرة: **الفواتير · الدفعات · الحركات**، و`List` بالحركات من السجل.
4. تعديل الحد الائتماني: `customers.manage` (مدير ومالك) وتُسجَّل القيمة قبل وبعد.

**12.3.4 `CustomerPaymentSheet`** (`BottomSheet`)

- المبلغ بخط كبير، وتحته `Chip`ات assist: «الرصيد كاملاً»، «نصفه».
- `MuiButtonGroup` لطريقة السداد (نقدي، بطاقة، محفظة، تحويل)، وحقل المرجع.
- **النقدي يتطلب وردية مفتوحة** (يدخل الدرج بحركة `cash_in` بسبب `customer_collection`، ويخضع لحدود الدرج).
- التخصيص **الأقدم أولاً** على الفواتير المفتوحة. وما زاد على الدين يصير رصيداً دائناً ويُنبَّه عليه «رصيد دائن للعميل X».
- `Button filled` «تأكيد» ثم سند قبض مطبوع بترقيم `RC-` وعلامة «نسخة» عند إعادة الطباعة.
- لا حذف لدفعة مسجلة: التصحيح بقيد عكسي بسبب مكتوب (مدير).

**12.3.5 البيع الآجل:** يُحجب «آجل» في الكاشير لعميل متأخر أكثر من 60 يوماً إلا بموافقة **المالك** (جدول حدود 9.7)، ويُعرض سبب الحجب في بطاقة العميل داخل نافذة الدفع. **Audit: نعم** (`customer.payment.recorded`, `customer.limit.changed`, `credit.limit.exceed`).

### 12.4 الفواتير والمرتجعات

التبويبات: **الكل · مكتملة · مرتجعة** (قائمة موحدة تعرض الأصلي والإشعار الدائن معاً بحسب 9.13.2).

**12.4.1 الشريط والبطاقات:** KPI: عدد الفواتير، **صافي المبيعات** (المبيعات − الإشعارات الدائنة)، المرتجعات، متوسط الفاتورة. شريط الأدوات: بحث (رقم الفاتورة أو العميل)، `DateRangeChips` (اليوم، أمس، 7 أيام، الشهر، مخصص)، `Select` طريقة الدفع، وللمدير `Select` الكاشير والوردية.

**12.4.2 الإجراءات حسب الحالة والصلاحية**

| الإجراء | يظهر متى | الصلاحية | إن لم تتحقق الشروط |
| --- | --- | --- | --- |
| طباعة نسخة | دائماً | `receipt.reprint` | — |
| مرتجع | `completed` أو `partially_refunded` وبها كمية متبقية | `refund.*` 🔒 للكاشير | معطل بنص «لا كمية متبقية» |
| إلغاء إداري | وردية مفتوحة، `printCount = 0`، بلا نقد، غير مُرسلة لـ ETA (9.13.3) | `invoice.void_open_shift` | معطل ونص سبب الرفض تحت الزر |
| إعادة إرسال ETA | الحالة «فشل» | `tax.decision.approve` أو مدير | مخفي إن لم يكن الإرسال مفعلاً |

**12.4.3 لوحة تفاصيل الفاتورة** (420dp، أو `BottomSheet` ممدود): الرأس (الرقم، الوقت، الكاشير، الوردية، العميل)، `List` الأسطر (كمية × سعر، الخصم، الضريبة)، الإجماليات، **الدفعات** (`PaymentSplit` بسطر لكل طريقة)، شارات (`printCount` و`reprintCount`، وحالة ETA)، قائمة **الإشعارات الدائنة** المرتبطة بصفوف فرعية، وروابط «عرض في سجل التدقيق».

**12.4.4 `CreditNoteDialog`** (شاشة كاملة على الموبايل، 640dp على الكمبيوتر)

من الأعلى للأسفل:

1. شريط معلومات الفاتورة الأصلية (الرقم، التاريخ، العميل) للقراءة فقط.
2. قائمة الأسطر: لكل سطر **`stepper`** للكمية المرتجعة (الحد الأقصى = المباع − ما أُرجع سابقاً)، و`Select` السبب (تالف، صنف خاطئ، تغيير رأي، خطأ تسعير، أخرى)، وسطر `body-small` يعرض **وجهة الإرجاع للمخزن** تلقائياً: «دفعة أصلية» أو «دفعة جديدة» أو «حجر» أو «لا يعاد» (9.13.5)، وصافي المسترد للسطر. لصنف داخل عرض يُحسب الصافي المدفوع فعلاً (خطة الضرائب).
3. `Select` «طريقة الاسترداد»: نقداً من الدرج (يتطلب وردية مفتوحة، ويُسجَّل `cash_refund`)، إلى طريقة الدفع الأصلية (لغير النقدي يلزم **مرجع العكس** `paymentReversalRef`)، رصيد للعميل (يخفض دينه أو ينشئ رصيداً دائناً)، «بدل» (يُسجَّل رصيداً للعميل ويُستخدم في فاتورة جديدة، ولا شاشة بدل مستقلة).
4. **قاعدة السعر:** افتراضياً `original`. وخيار «سعر يوم الإرجاع» مخفي إلا للمحاسب والمالك ويتطلب `TaxDecisionRecord`.
5. إجمالي المسترد يتحدث لحظياً بخط `headline-small`، وحقل ملاحظة.
6. التذييل: `Button text` «إلغاء» و`Button filled` بلون `error` «تأكيد المرتجع». يمر بـ `PermissionGate` (9.7) فيفتح `ReauthSheet` للكاشير. بعد النجاح: إيصال إشعار دائن مطبوع `CN-` وعلامة في قائمة الفواتير.

**نافذة الإرجاع:** يُحدَّد `returnWindowDays` في الإعدادات (افتراضي 14 يوماً، قيمة مقترحة مني). بعدها يحتاج المرتجع موافقة المدير حتى لو كان المستخدم مديراً بلا موافقة ذاتية. **Audit: نعم** (`refund.credit_note.created`: الفاتورة، الأسطر، الدفعات المتأثرة، طريقة الاسترداد، المعتمِد).

### 12.5 الحسابات

التبويبات: **ملخص · المصروفات · التقارير**. الوصول `accounts.view`، والأرقام التي تكشف الربحية تتطلب `reports.financial.view`.

**12.5.1 شريط الفترة:** `DateRangeChips` أسفل الـ Top App Bar: اليوم · أمس · 7 أيام · هذا الشهر · الشهر الماضي · مخصص (يفتح منتقي من/إلى). يحكم التبويبات الثلاثة. **حدود اليوم تُحسب بالتقويم المحلي** (بداية اليوم التالي) لا بإضافة `86400000` مللي ثانية، لأن أيام التوقيت الصيفي في مصر تبلغ 23 أو 25 ساعة (خطأ مرصود في `ReportsScreen`).

**12.5.2 الملخص**

| البطاقة | التعريف | اللون |
| --- | --- | --- |
| المبيعات | **صافي** المبيعات بعد الإشعارات الدائنة وقبل ضريبة القيمة المضافة | `primary-container` |
| تكلفة البضاعة المباعة | من تكلفة الدفعات أو المتوسط وقت البيع | `secondary-container` |
| الربح الإجمالي | المبيعات − التكلفة | `tertiary-container` |
| المصروفات التشغيلية | **بدون مشتريات البضاعة** (تُحسب في التكلفة فقط، فيزول العد المزدوج المرصود في التقرير الأول) | `secondary-container` |
| صافي الربح | الإجمالي − المصروفات التشغيلية | `--matjark-success-container` |
| ضريبة القيمة المضافة المستحقة | تظهر فقط عند `vatStatus = registered`. وإلا تُستبدل ببطاقة معلومات «غير مسجل في القيمة المضافة» | `--matjark-warning-container` |

- **فروق الدرج** تظهر أسفل الصف كشريط معلومات `outlined` مستقل («عجز X» أو «زيادة X») **ولا تدخل في صافي الربح**، وتُحال للمحاسب (6.6.2).
- تحتها بطاقة `outlined` بمخطط أعمدة يومي (أعمدة CSS/SVG بسيطة بلا مكتبة جديدة)، وبطاقة توزيع طرق الدفع بـ `Progress` لكل طريقة.
- **بطاقات المراقبة** (للمالك والمحاسب فقط، تنبيه فقط ولا تغيّر أي إعداد):
  - عند `incomeTaxRegime = simplified_6_2025`: بطاقة «النظام المبسط» بحجم الأعمال السنوي الصافي، والشريحة الحالية، والضريبة **التقديرية** بوسم «تتحدد الشريحة النهائية آخر السنة»، و`Progress` نحو سقف 20 مليون، وحالة المرونة (`eligible` أو `grace_used` أو `lost_next_year`).
  - عند `vatStatus = unregistered`: بطاقة «حد التسجيل» بالمبيعات الخاضعة والمعفاة منذ بداية السنة المالية مقابل 500 ألف، بمستويات تنبيه.

**12.5.3 المصروفات**

- الأعمدة: التاريخ، رقم السند (`EXP-` بعدّاد تسلسلي، لإنهاء تكرار الأرقام المرصود)، البند، التصنيف، المبلغ، الضريبة، المرجع، إجراءات.
- زر `Button filled` «إضافة مصروف». نافذته `Dialog` بستة حقول: التاريخ، `Select` التصنيف (**بلا «مشتريات بضاعة»**)، البند، المبلغ، نسبة الضريبة (افتراضياً من الإعدادات، ويعطّل الحقل عند `vatStatus = unregistered`)، ملاحظة. و`Select` «مصدر الدفع»: من الدرج أو من خارجه. **من الدرج** يربط المصروف بالوردية المفتوحة ويُسجَّل حركة `cash_out` بسبب `expense` (تخضع لحدود الدرج).
- **لا حذف** (قد كان `deleteExpense` موجوداً). ⋮ يحوي «عكس المصروف» فقط: `Dialog` بسبب إلزامي، ويُنشئ قيداً معاكساً يظهر صفاً فرعياً بالسالب. العكس مسموح للمدير، وللمحاسب للقراءة فقط.
- **Audit: نعم** (`expense.posted`, `expense.reversed`).

**12.5.4 التقارير:** بطاقات `outlined`، لكل منها عنوان وزر فتح. الموجودة: أكثر الأصناف مبيعاً، أكثر الأصناف ربحاً (`product.cost.view`)، المبيعات بالكاشير، بالساعة، المخزون الراكد. **تقارير جديدة تفرضها الضوابط:**

| التقرير | يجيب عن | الصلاحية |
| --- | --- | --- |
| الورديات والفروق | الفرق لكل وردية وكاشير، إعادة العدّ، الملاحظات | `accounts.view` |
| الموافقات (Override) | كل موافقة: الإجراء، الطالب، المعتمِد، المبلغ، الوقت. ومن تجاوز حد التنبيه | مدير ومالك |
| الخصومات | الخصومات حسب الكاشير والصنف والسبب، وما فوق 10% | مدير ومالك |
| المرتجعات | الإشعارات الدائنة حسب السبب والكاشير | `accounts.view` |
| تقادم الديون | العملاء حسب شرائح 0 إلى 30 و31 إلى 60 وأكثر | `accounts.view` |
| حركات الدرج | السحب والإيداع والخزنة والمصروفات لكل وردية | `accounts.view` |

كل تقرير يفتح بملء الشاشة (`ReportView`): شريط الفترة والفلاتر، جدول، وتصدير **CSV** (تنزيل `Blob` بترميز UTF-8 مع BOM ليقرأ Excel العربية، ويعمل على HTTP)، وطباعة بأنماط الطباعة. **Audit: نعم** للتصدير (`report.exported`: التقرير والفترة).

### 12.6 الإعدادات

**12.6.1 التخطيط**

| العرض | البنية |
| --- | --- |
| **Desktop** | لوحتان: قائمة الأقسام على اليمين 280dp (`List` بعنصر محدد على `secondary-container`)، والمحتوى يساراً بعرض أقصى 720dp |
| **Mobile** | قائمة الأقسام بعرض كامل، والضغط يدفع شاشة القسم بزر رجوع في الـ Top App Bar |

كل قسم `Card outlined` من صفوف `ListItem` بمفاتيح أو `Select` في النهاية. ويظهر القسم لمن يملك صلاحيته فقط (10.6.2).

**12.6.2 الأقسام**

| القسم | المحتوى | الصلاحية | Audit |
| --- | --- | --- | --- |
| **المتجر** | الاسم، العنوان، الهاتف، السجل التجاري، الرقم الضريبي، الشعار | `settings.view` | نعم (قبل وبعد) |
| **الضريبة والعملة** | المحاور الثلاثة (`incomeTaxRegime`, `vatStatus`, `etaCompliance`)، النسبة الافتراضية، السعر الشامل، التقريب، مرجع التشريع المعتمد (`LegislativeReference`) للقراءة. **تغيير أي محور يمر بـ `TaxDecisionDialog`** (12.6.3) | مالك ومحاسب (`tax.decision.approve`) | نعم، حرج |
| **نقطة البيع** | `PosPolicySettings`: `requireOpenShift`، `requireReference`، `shiftPolicy`، `longShiftHours`، `maxHeldPerDevice`، `allowNegativeStock`، `returnWindowDays`، تقريب الفكّة | مدير ومالك | نعم |
| **الأمان** | `SecurityPolicySettings`: القفل بالخمول (1 إلى 30 دقيقة) والخلفية، `blindCloseStrict`، `showRememberedUsers`، سقوف الموافقات لكل دور (قائمة `ListItem` بحقلين لكل إجراء)، حدود الدرج، حد الفرق، حدود Override، مهلة حذف السطر. زر `outlined` «إعادة توليد مفتاح الاسترداد» (إعادة إدخال كلمة المرور) | مالك (`security.settings`) | نعم، حرج |
| **المستخدمون** | قائمة بـ `UserAvatar`، إضافة وتعديل (12.6.4) | مالك (`user.manage`) | نعم |
| **الإيصالات والطباعة** | حجم الورق، الرأس والتذييل، الطباعة التلقائية، عرض QR (معطل حتى يتوفر QR حقيقي من منظومة ETA)، أرقام لاتينية (ثابتة) | مدير ومالك | نعم |
| **النسخ الاحتياطي** | 12.6.5 | مدير للتصدير، مالك للاستعادة | نعم |
| **سجل التدقيق** | كما في 6.5 من PART 1 | مالك، قراءة للمحاسب | نعم (`audit.viewed`) |
| **النظام** | الأصل (origin) الحالي، الإصدار، معرّف الجهاز، حالة `isSecureContext` ونتيجة `persist()` (12.0.4)، استهلاك التخزين بـ `Progress`، تاريخ آخر نسخة، ملاحظة «تحميل الصفحة يحتاج الخادم المحلي» | مالك ومدير | لا |

**12.6.3 `TaxDecisionDialog`:** نافذة تُفتح عند تغيير أي محور ضريبي أو قاعدة سعر. الحقول: القيمة الجديدة (للقراءة)، `Select` «السبب» (تسجيل جديد، تجاوز حد، قرار محاسب، تصحيح)، رقم المستند المرجعي (نص حر)، تاريخ السريان، ملاحظة. بطاقة `tertiary-container` تحذيرية «لن تتغير الفواتير السابقة». يُنشأ `TaxDecisionRecord` باسم المستخدم. الزر `filled` «اعتماد القرار».

**12.6.4 المستخدمون**

- القائمة: الاسم، الدور (شريحة)، آخر دخول، الحالة (نشط أو موقوف)، إجراءات (تعديل، إعادة تعيين كلمة المرور، إيقاف، أرشفة).
- **`UserFormDialog`:** الاسم الظاهر، اسم المستخدم (فريد، لاتيني)، `Select` الدور، `PasswordField` كلمة مرور مؤقتة مع زر «توليد»، `MuiSwitch` «يجب تغييرها عند أول دخول» (مفعّل افتراضياً). يضع المستخدم الـ PIN بنفسه عند أول دخول. قسم متقدم مطوي لاستثناءات `UserPermissionOverride` (صلاحية، تأثير، سبب إلزامي، تاريخ انتهاء).
- **القيود:** لا يُوقف أو يُؤرشف مستخدم صاحب وردية مفتوحة. ولا يُوقف آخر مالك. وتغيير الدور للمالك وحده. إعادة تعيين كلمة مرور مستخدم يضع `mustChangePassword = true`. ويُسجَّل كل ذلك.

**12.6.5 النسخ الاحتياطي**

- **إزالة خيار «Google Drive» الحالي:** `restoreFromGoogleDrive` ينسخ إلى `localStorage` بمفتاح آخر (مرصود في التقرير الأول)، فيضاعف استهلاك التخزين ويوهم المستخدم بوجود سحابة. يُستبدل بنسخة داخلية صريحة الاسم، أو يُحذف.
- **التصدير:** `Button filled` «تصدير نسخة كاملة» ينزّل حزمة: `matjark-backup.json` (البيانات)، `audit_log.jsonl`، و`audit_manifest.json` (6.4). وتعمل على HTTP (تنزيل `Blob`).
- **التذكير:** `Select` «ذكّرني بالنسخ»: بعد كل تقفيل وردية (الافتراضي)، يومياً، أسبوعياً. ويظهر مؤشر «آخر نسخة: منذ كذا» وبه لون تحذير بعد 7 أيام.
- **الاستعادة (مالك فقط):** منطقة الخطر (بطاقة بحد `error`). تمر بـ: اختيار ملف، التحقق من البنية وسلسلة التجزئة، `Dialog` بالأعداد (منتجات، فواتير، مستخدمون)، **نسخة تلقائية من الوضع الحالي قبل الاستبدال** تُنزَّل أولاً، وكتابة «استعادة» للتأكيد، ثم زر `filled` بلون `error`. وتُسجَّل `backup.restored` بخطورة حرجة. وكل `resetToSampleData` و`loadBenchmarkStressTest` تُخفيان في الإصدار الإنتاجي.

### 12.7 واجهات TypeScript المضافة

`TaxDecisionRecord` و`AdjustmentEntry` و`ScaledMoney` معرَّفة في خطة الضرائب وPART 1، ولا تُعاد هنا.

```ts
// لماذا: معاملات التجزئة تُحفظ مع كل سر ليُرفع الحمل لاحقاً دون كسر القديم (12.0.1). WebCrypto يوفر PBKDF2 فقط.
export type KdfParams = { name: 'pbkdf2-sha256'; iterations: number; dkLen: 32 };
// يحل KdfParams محل iterations في RecoveryKeyRecord (PART 2)، ويُضاف kdf?: KdfParams إلى User.

// لماذا: حالة البيئة التي يعرضها الإعدادات > النظام ويفحصها حارس البدء (12.0.4).
export interface RuntimeEnvironment {
  isSecureContext: boolean;
  origin: string;                 // يكشف تغيّر العنوان (12.0.4)
  storagePersisted?: boolean;     // نتيجة navigator.storage.persist()
}

// لماذا: كشف حساب العميل. الرصيد يُشتق منه ولا يُعدَّل مباشرة (9.13). موجب = دين على العميل.
export interface CustomerLedgerEntry {
  id: string;
  seq: number;
  customerId: string;
  kind: 'invoice' | 'payment' | 'credit_note' | 'adjustment' | 'reversal';
  amount: ScaledMoney;            // موجب يزيد الدين، سالب يخفضه
  refType?: 'invoice' | 'credit_note' | 'receipt';
  refId?: string;
  shiftId?: string;
  note?: string;
  userId: string;
  createdAt: number;
}

// لماذا: جلسة جرد بالعدّ الأعمى (12.1.4). التسويات الناتجة AdjustmentEntry لا تعديل مباشر للكمية.
export interface StockCountLine {
  productId: string;
  batchId?: string;
  countedQuantity: number;
  systemQuantityAtApproval?: number;  // لا يُعبَّأ قبل الاعتماد
  varianceValue?: ScaledMoney;
}

export interface StockCountSession {
  id: string;
  scope: 'all' | 'category';
  categoryId?: string;
  hideSystemQuantity: boolean;
  status: 'counting' | 'review' | 'approved' | 'cancelled';
  startedBy: string;
  startedAt: number;
  approvedBy?: string;
  approvedAt?: number;
  lines: StockCountLine[];
}

// لماذا: عكس المصروف بدل حذفه (12.5.3).
export interface ExpenseLedgerFields {
  voucherNumber?: string;         // EXP- تسلسلي
  shiftId?: string;               // عند الدفع من الدرج
  reversalOf?: string;
  reversedBy?: string;
  reversalReason?: string;
}

// لماذا: بيان ملف النسخة الاحتياطية للتحقق عند الاستعادة (12.6.5).
export interface BackupManifest {
  version: number;
  exportedAt: number;
  exportedBy: string;
  originAtExport: string;         // لكشف تغيّر العنوان (12.0.4)
  counts: { products: number; invoices: number; customers: number; users: number };
  audit: { count: number; firstSeq: number; lastSeq: number; lastHash: string };
}
```

### 12.8 المكوّنات الجديدة

| المكوّن | Props | أين يُستخدم | إنشاء في `src/components/ui` |
| --- | --- | --- | --- |
| `PageScaffold` | `title`, `actions?`, `tabs?`, `onTabChange?`, `kpis?`, `toolbar?`, `children`, `denseOnCompact?` | كل شاشة إدارية | **نعم** (القالب الموحد من المخطط الأول 6) |
| `KpiCard` | `label`, `value: ReactNode`, `icon?`, `tone: 'primary' \| 'secondary' \| 'tertiary' \| 'success' \| 'warning' \| 'error'`, `onClick?`, `hint?` | المخزن، الفواتير، العملاء، الحسابات، الوردية | **نعم** |
| `SearchField` | `value`, `onChange`, `placeholder`, `onScan?` (12.0.3)، `autoFocus?` | كل شريط أدوات | **نعم** (pill، يغلّف `MuiTextField`) |
| `DateRangeChips` | `value: DateRange`, `onChange`, `presets?`, `min?`, `max?` | الفواتير، الحسابات، التقارير | **نعم** |
| `ResponsiveDataList` | `columns`, `rows`, `renderCard(row)`, `breakpoint?` (600)، `onRowClick?`, `rowActions?` | كل جدول | **نعم** (يختار `MuiDataGrid` أو بطاقات) |
| `DetailPanel` | `open`, `onClose`, `title`, `children`, `footer?` | تفاصيل فاتورة وعميل ووردية | **نعم** (لوحة 420dp أو `MuiBottomSheet` ممدود) |
| `ConfirmDialog` | `open`, `title`, `message`, `confirmLabel`, `tone?: 'default' \| 'danger'`, `typedConfirmation?: string`, `onConfirm()`, `onCancel()` | يحل محل `window.confirm` كله، والاستعادة | **نعم** |
| `ScannerListener` | `onScan(code: string)`, `minLength?` (6)، `maxGapMs?` (35)، `enabled?` | الكاشير، المشتريات، الجرد | لا: `src/utils/` hook |
| `CreditNoteDialog` | `open`, `invoice`, `onSubmit(note)`, `onNeedOverride(note)`, `onClose()` | الفواتير | لا: `components/invoices/` |
| `PurchaseInvoiceDialog` | `open`, `draft?`, `suppliers`, `onSave(draft)`, `onPost(invoice)`, `onClose()` | المشتريات | لا |
| `StockCountDialog` | `open`, `session?`, `onCount(line)`, `onApprove(session)`, `onClose()` | المخزن | لا |
| `CustomerPaymentSheet` | `open`, `customer`, `openInvoices`, `shiftOpen`, `onSubmit(payment)`, `onClose()` | العملاء | لا |
| `ReportView` | `title`, `columns`, `rows`, `range`, `onExport()`, `children?` | التقارير | لا |
| `TaxDecisionDialog` | `open`, `axis`, `proposedValue`, `onSubmit(record)`, `onCancel()` | الإعدادات > الضريبة | لا |
| `UserFormDialog` | `open`, `user?`, `roles`, `onSave(user)`, `onClose()` | الإعدادات > المستخدمون | لا |

حالات كل مكوّن (default / hover / disabled / error) كما في 4.1 إلى 4.3 من المخطط الأول.

### 12.9 جدول Audit للجزء الرابع

| `actionKey` | ما يُسجَّل | الخطورة |
| --- | --- | --- |
| `product.updated` / `product.archived` | الحقول قبل وبعد (السعر والتكلفة والتصنيف الضريبي) | info / warning |
| `inventory.bulk_reprice` | الأصناف والنسبة | warning |
| `inventory.count.started` / `approved` | النطاق، الفروق المجمعة | info / warning |
| `purchase.posted` / `purchase.reversed` | المورد، الإجمالي، الدفعات، المدفوع | info / warning |
| `supplier.payment.recorded` | المبلغ، الطريقة، المرتبط بالدرج | info |
| `customer.payment.recorded` / `customer.limit.changed` | المبلغ والطريقة، الحد قبل وبعد | info / warning |
| `refund.credit_note.created` | الفاتورة، الأسطر، الدفعات، المعتمِد | warning |
| `expense.posted` / `expense.reversed` | المبلغ، المصدر، السبب | info / warning |
| `report.exported` | التقرير والفترة | info |
| `settings.changed.*` | القسم، المفتاح، قبل وبعد | info (critical للضريبة والأمان) |
| `tax.decision.recorded` | المحور، القيمة، المرجع، المستخدم | critical |
| `user.created` / `updated` / `deactivated` / `password_reset` | المستخدم، الدور، المنفِّذ | warning |
| `backup.exported` / `backup.restored` | المحتويات، المنفِّذ، النسخة التلقائية قبل الاستعادة | info / critical |

## Checklist للتنفيذ (PART 4)

**يُنشأ**

- [ ] `src/components/ui/`: `PageScaffold`، `KpiCard`، `SearchField`، `DateRangeChips`، `ResponsiveDataList`، `DetailPanel`، `ConfirmDialog`
- [ ] `src/utils/`: `useScannerListener.ts`، `csvExport.ts`، `kdf.ts` (PBKDF2 عبر WebCrypto مع المعايرة)، `secureContextGuard.ts` (حارس البدء، 12.0.4)
- [ ] شاشات ومكوّنات: `StockCountDialog`، `PurchaseInvoiceDialog`، `CreditNoteDialog`، `CustomerPaymentSheet`، `ReportView`، `TaxDecisionDialog`، `UserFormDialog`، `SettingsScreen` بالتخطيط الجديد
- [ ] مكتبة للتطوير فقط: `vite-plugin-mkcert` (devDependency) وتفعيلها في `vite.config.ts` (12.0.2)

**يُعدَّل**

- [ ] `InventoryScreen`: الأرشفة بدل الحذف، إخفاء التكلفة، التحقق الفوري، الدفعات، الجرد
- [ ] `CustomersScreen`: ينقسم إلى عملاء وموردين (الموردون إلى `Purchases`)، وكشف الحساب، والحد الائتماني
- [ ] `InvoicesScreen`: القائمة الموحدة والإشعارات الدائنة، ويُستبدل `refundInvoice` بـ `createCreditNote`
- [ ] `AccountingScreen` و`ReportsScreen`: الدمج في «الحسابات»، حدود اليوم بالتقويم المحلي، منع العد المزدوج
- [ ] `SettingsScreen`: الأقسام التسعة، وحذف خيار «Google Drive» الحالي
- [ ] `src/types/index.ts`: مدموج في الملحق (أ)، ومعه واجهات 12.7

**يُحذف**

- [ ] `deleteExpense` و`deleteProduct` الفعليان (يُستبدلان بالعكس والأرشفة)
- [ ] `restoreFromGoogleDrive` والزر المرتبط به
- [ ] `window.confirm` في كل الشاشات
- [ ] `loadBenchmarkStressTest` و`resetToSampleData` من الإصدار الإنتاجي

**يُختبر**

- [ ] **التطبيق كله على** `https://localhost:3000` ثم على `https://<IP-الشبكة>:3000` من جهاز ثانٍ بعد تثبيت `rootCA.pem`: الإعداد، الدخول بكلمة مرور وPIN، مفتاح الاسترداد، القفل، تقفيل الوردية، التصدير والاستعادة. وعند فتحه عبر `http://<IP>` يظهر حارس البدء بدل انهيار صامت
- [ ] مسح الكاميرا يعمل، وقارئ الباركود (HID) يضيف الصنف دون تركيز حقل البحث
- [ ] زر «نسخ» مفتاح الاسترداد يعمل عبر Clipboard API
- [ ] تبويب ثانٍ يُفتح للقراءة فقط بـ Web Locks (11.3.9)
- [ ] زمن التحقق من PIN وكلمة المرور على جهاز الكاشير الفعلي ضمن 250 إلى 400ms بعد المعايرة (قياس فعلي)
- [ ] تغيير IP الخادم: رسالة بدء تنبّه إلى اختلاف الأصل، ولا تظهر القاعدة الفارغة كأنها بيانات ضاعت
- [ ] مرتجع جزئي لصنف داخل عرض يعيد الصافي المدفوع للدفعة الصحيحة
- [ ] مصروف من الدرج يظهر في الحسابات وحركات الوردية، ولا يوجد حذف مصروف في أي مسار
- [ ] صافي المبيعات = المبيعات − الإشعارات الدائنة، ومشتريات البضاعة لا تظهر في المصروفات
- [ ] تقرير CSV يُفتح في Excel بالعربية صحيحاً

## سجل التحديثات المطبّقة على الأجزاء 1 إلى 3

طُبِّقت البنود التالية في الأقسام المذكورة. البند 2 لم يعد يلزم لأن `SubtleCrypto` متاحة بعد قرار HTTPS (12.0). ويبقى الجدول سجلاً للتغيير.

| # | الموضع | التعديل |
| --- | --- | --- |
| 1 | PART 1، `PermissionKey` | إضافة: `inventory.view`, `invoices.view`, `customers.view`, `customers.manage`, `accounts.view`, `settings.view`, `shift.view`, `product.cost.view`, `sale.below_cost` |
| 2 | PART 1، 6.1 و6.4 | سلسلة التجزئة بـ SHA-256 عبر `crypto.subtle.digest` (غير متزامنة) |
| 3 | PART 1، `ReauthSheet` | خصائص `lockedApproverId` و`freshAuthWindowMs` و`onSelfApproved`، و`PinField` بـ `variant` (PART 2، 10.0) |
| 4 | PART 1، `User` | دمج `UserAuthFields` وحقل `kdf` |
| 5 | PART 1، `Shift` | دمج `ShiftCloseFields` (PART 3، 11.4) |
| 6 | PART 1، `SecurityPolicySettings` و`PosPolicySettings` | إضافة `returnWindowDays` (14) إلى `PosPolicySettings` |
| 7 | PART 3، `DrawerReasonCode` | إضافة `customer_collection` |
| 8 | PART 1، تعليق `Customer.balance` | موجب = دين على العميل (12.3.1) |
| 9 | PART 2، `RecoveryKeyRecord` و10.1.4 | `kdf: KdfParams` (PBKDF2) بدل `iterations` |
| 10 | PART 2، 10.7.3 | استبدال صف `crypto.subtle` غير متاح بحارس البدء (12.0.4) |
| 11 | PART 3، 11.3.9 و11.1.1 | لا تغيير: Web Locks وزر الكاميرا يبقيان لأن السياق آمن في التطوير |
| 12 | PART 1، القسم 7 (Phase 0) | إضافة: `kdf.ts` و`secureContextGuard.ts` و`vite-plugin-mkcert` (تطوير فقط) |
| 13 | PART 1، `CreditNote` | `exchange` تعني رصيداً للعميل (12.4.4)، ودمجها مع تعريف الضرائب |

**PART 4 جاهز. يتبعه ملحقان: (أ) فهرس الأنواع والأنواع الضريبية الناقصة، و(ب) برومبت التسليم.**

---

## الملحق (أ): فهرس الأنواع والأنواع الضريبية الناقصة

**قاعدة الأولوية عند أي تعارض:** هذا الملحق، ثم كتل الأنواع في الأقسام 5 و10.0 و11.4 و12.7، ثم النص. ملف `src/types/index.ts` النهائي = الأنواع الموجودة اليوم في الكود (`PaymentMethod`, `InvoiceStatus`, `Product`, `CartItem`, `InvoiceItem`, `Invoice`, `Customer`, `Supplier`, `Expense`, `StoreSettings`, `PerformanceBenchmarkResult`) + كل ما في الفهرس أدناه. لا حذف ولا تغيير لحقل قائم.

### أ.1 فهرس الأنواع: أين يُعرَّف كل نوع

| الأنواع | الموضع |
| --- | --- |
| `PermissionKey`, `RoleKey`, `Role`, `PermissionEffect`, `OverrideCeiling`, `Permission`, `RolePermission`, `UserPermissionOverride`, `User` | PART 1، القسم 5 |
| `Shift`, `ShiftStatus`, `DrawerMovementKind`, `CashDrawerMovement` | PART 1، القسم 5 |
| `PurchaseInvoice`, `PurchaseInvoiceLine`, `ProductBatch` | PART 1، القسم 5 |
| `AuditCategory`, `AuditLogEntry`, `OverrideSummaryRow`, `OverrideRequest`, `OverrideGrant` | PART 1، القسم 5 |
| `CreditNote`, `CreditNoteLine`, `InvoiceLedgerFields`, `SecurityPolicySettings` | PART 1، القسم 5 |
| `AuthSession`, `RecoveryKeyRecord`, `LoginAttemptState`, `OnboardingDraft` (و`UserAuthFields` مرجع فقط، مدموجة في `User`) | PART 2، القسم 10.0 |
| `DrawerReasonCode`, `DenominationCount`, `ShiftCloseDraft`, `ShiftReport`, `HeldSale`, `HeldSaleLine`, `PaymentSplit`, `InvoicePaymentFields`, `PosPolicySettings` (و`ShiftCloseFields` مرجع فقط) | PART 3، القسم 11.4 |
| `KdfParams`, `RuntimeEnvironment`, `CustomerLedgerEntry`, `StockCountLine`, `StockCountSession`, `ExpenseLedgerFields`, `BackupManifest` | PART 4، القسم 12.7 |
| الأنواع الضريبية، وسياسة القفل، وحقول المنتج والعميل والمورد | **هذا الملحق (أ.3 و أ.4)** |

### أ.2 قاعدة المبالغ (مهمة قبل أي كود)

الأنواع الجديدة كلها تستعمل `ScaledMoney` (عدد صحيح، 1 ج.م = 10,000) و`BasisPoints` (14% = 1400). **الكود الحالي يخزّن المبالغ كأعداد عشرية عادية.** فيبقى القديم كما هو في المرحلة 0، ولا يُخلط النوعان في دالة واحدة. التحويل يتم عند الحدود فقط عبر `toScaled` و`fromScaled` (مرحلة الضرائب)، وترحيل القاعدة القديمة إلى `ScaledMoney` يتم لاحقاً في Phase 3 مع دمج محرك الضرائب، لا في Phase 0.

### أ.3 الأنواع الضريبية والقفل (ناقصة من الأقسام السابقة)

```ts
// ===== مقاييس الأرقام (خطة الضرائب) =====
export type ScaledMoney = number & { readonly __brand: 'ScaledMoney' };         // 1 ج.م = 10000
export type BasisPoints = number & { readonly __brand: 'BasisPoints' };         // 14% = 1400
export type ScaledQuantity = number & { readonly __brand: 'ScaledQuantity' };   // 1.000 = 1000

// ===== المحاور الثلاثة المستقلة في إعدادات المنشأة =====
export type IncomeTaxRegime = 'general' | 'simplified_6_2025';
export type VatStatus = 'unregistered' | 'registered';

export interface EtaComplianceSettings {
  enabled: boolean;                // تفعيل يدوي بقرار إلزام موثق، لا حد تلقائي
  mandateRef?: string;
  phase?: string;
}

// لماذا: كل تحول في أي محور يُسجَّل بقرار موثق، ولا يتغير تلقائياً بحكم عداد.
export interface TaxRegimeChange {
  axis: 'incomeTaxRegime' | 'vatStatus' | 'etaCompliance';
  from: string;
  to: string;
  effectiveDate: string;           // ISO
  decisionId: string;
}

// لماذا: بدل نص حر. مثال: القانون 149 لسنة 2026، نُشر 2026-07-28، سريان 2026-07-29.
export interface LegislativeReference {
  lawNumber: string;
  effectiveDate: string;           // ISO
  publishedDate: string;           // ISO
  resolutionRef?: string;
}

// لماذا: لكل قرار يغيّر معالجة ضريبية (محور، استخدام استثنائي، سعر يوم الإرجاع، نمط الأمانة).
export interface TaxDecisionRecord {
  id: string;
  topic: string;
  decidedBy: string;
  decidedAt: number;
  documentRef: string;
  notes?: string;
}

// لماذا: قيود قيد دفتري بدل تعديل مباشر لرصيد افتتاحي أو لفروق تقريب المخزون.
export interface AdjustmentEntry {
  id: string;
  target: 'opening_vat_credit' | 'inventory_rounding' | 'other';
  productId?: string;
  amount: ScaledMoney;
  date: number;
  reason: string;
  userId: string;
  decisionId?: string;
}

// ===== قوالب الصنف مقابل المعالجة المطبقة =====
// لماذا: out_of_scope نتيجة حالة المنشأة وليست وصفاً للصنف، فلا تدخل Product.taxProfile.
export type ProductTaxProfile =
  | 'exempt' | 'zero_rated' | 'vat_14' | 'schedule_only' | 'composite' | 'medical_5';
export type AppliedTaxTreatment =
  | 'out_of_scope' | 'exempt' | 'zero_rated' | 'vat_standard'
  | 'schedule_only' | 'composite' | 'medical_reduced';
export type CompositeOrder = 'vat_on_schedule_inclusive' | 'vat_before_schedule';

// لماذا: حقول اختيارية على Product فلا تكسر الموجود. legacyTaxRate يحل محل taxRate القديم عند الترحيل.
export interface ProductTaxFields {
  taxProfile?: ProductTaxProfile;
  scheduleRateBp?: BasisPoints;
  scheduleItemCode?: string;
  compositeOrder?: CompositeOrder;
  excludedFromReducedRate?: boolean;    // حافلات وسيارات ركوب (medical_5)
  /** @deprecated MIGRATION: القيمة 0 تعني معفى لا غير معرّف */
  legacyTaxRate?: number;
}

// لماذا: الغرض يخص عملية البيع لا الصنف (معدل 5% مشروط بالاستخدام).
export type SaleUsagePurpose = 'production_or_service' | 'retail_consumer';
export interface SaleUsageContext {
  purpose: SaleUsagePurpose;
  buyerType: 'consumer' | 'business';
  usageDeclarationRef?: string;
}

export interface RoundingPolicy {
  mode: 'ROUND_HALF_UP';
  scale: 10000;
  level: 'per_line_then_sum';      // يطابق مجموع السطور الإجمالي، فلا roundingAdjustment على الفاتورة
}

// لماذا: لقطة مجمّدة لكل سطر وقت البيع، لا يعاد حسابها أبداً.
export interface InvoiceLineTaxSnapshot {
  readonly productTaxProfileAtSale?: ProductTaxProfile;
  readonly appliedTreatment: AppliedTaxTreatment;
  readonly vatRateBp: BasisPoints;
  readonly scheduleRateBp: BasisPoints;
  readonly priceInclusive: boolean;
  readonly unitCostAtSale: ScaledMoney;
  readonly usageContext?: SaleUsageContext;
  readonly proRataDiscount: ScaledMoney;
  readonly promotionRef?: { promotionId: string; kind: string };
}

export interface InvoiceTaxSnapshot {
  readonly regimeAtSale: { incomeTaxRegime: IncomeTaxRegime; vatStatus: VatStatus; etaCompliance: boolean };
  readonly legislativeRef: LegislativeReference;
  readonly roundingPolicy: RoundingPolicy;
  readonly etaDocument?: { kind: string; submissionId?: string; status: 'pending' | 'accepted' | 'rejected' | 'failed' };
}

// لماذا: توزيع الخصم النسبي لكل مجموعة ضريبية على حدة بطريقة الباقي الأكبر.
export interface DiscountAllocation {
  taxGroupKey: string;
  allocationMethod: 'largest_remainder';
  lines: { lineId: string; allocated: ScaledMoney }[];
}

// لماذا: حقول الضريبة والنظام في StoreSettings، تُضاف اختيارياً أولاً ثم تُلزَم بعد الترحيل.
export interface TaxSettingsFields {
  incomeTaxRegime?: IncomeTaxRegime;
  vatStatus?: VatStatus;
  vatReturnFrequency?: 'monthly' | 'quarterly';
  creditRefundThresholdMonths?: number;   // بالأشهر: 4 للعام و3 للمبسط
  etaCompliance?: EtaComplianceSettings;
  taxRegimeHistory?: TaxRegimeChange[];
  defaultVatRateBp?: BasisPoints;
  pricesIncludeTax?: boolean;
  taxSetupPending?: boolean;
  isOpeningVatCreditLocked?: boolean;
  onboardingCompletedAt?: number;
  deviceId?: string;
}

// لماذا: إعدادات القفل والدخول من PART 2 كانت غائبة عن أي نوع.
export interface AuthPolicySettings {
  idleLockMinutes: number;           // 5 (من 1 إلى 30)
  backgroundLockSeconds: number;     // 60
  showRememberedUsers: boolean;      // true
  hapticsEnabled: boolean;           // true
}

// ===== المورد والعميل =====
export type ConsignmentBillingMode = 'principal_issues_invoice' | 'agent_commission_mode';

// لماذا: يحدده المحاسب بقرار موثق (TaxDecisionRecord) وفق عقد الأمانة الفعلي.
export interface SupplierTaxFields {
  consignmentBillingMode?: ConsignmentBillingMode;
  /** @unverified الحكم القانوني لم يُراجَع */
  isRelatedParty?: boolean;
  /** @unverified */
  withholdingApplicable?: boolean;
}

export interface CustomerCreditFields {
  creditLimit?: ScaledMoney;
  taxRegistrationNumber?: string;
  buyerType?: 'consumer' | 'business';
}
```

### أ.4 كيف تُركَّب هذه الأنواع على الواجهات القائمة

| الواجهة القائمة | تصير |
| --- | --- |
| `Product` | `Product & ProductTaxFields` |
| `InvoiceItem` | يضاف إليه `InvoiceLineTaxSnapshot` |
| `Invoice` | `Invoice & InvoiceLedgerFields & InvoicePaymentFields`، مع حقل اختياري `taxSnapshot?: InvoiceTaxSnapshot` |
| `Customer` | `Customer & CustomerCreditFields`. **اصطلاح `balance`:** موجب = دين على العميل. يُصحَّح تعليق النوع القديم المعاكس، ويُشتق الرصيد من `CustomerLedgerEntry` |
| `Supplier` | `Supplier & SupplierTaxFields` |
| `Expense` | `Expense & ExpenseLedgerFields` |
| `StoreSettings` | `StoreSettings & TaxSettingsFields` مع الحقول الاختيارية `pos?: PosPolicySettings`, `security?: SecurityPolicySettings`, `auth?: AuthPolicySettings` |
| `Shift` | مدموج بالكامل في PART 1 (لا حاجة لـ `ShiftCloseFields`) |
| `User` | مدموج بالكامل في PART 1 (لا حاجة لـ `UserAuthFields`) |
| `CreditNote` | تعريف واحد في PART 1 (يشمل `rateRule` و`decisionId`) |

---

## الملحق (ب): برومبت التسليم لـ ChatGPT

**طريقة الاستعمال:** أرسل البرومبت أولاً، ثم أرفق: (1) هذه الوثيقة مصدّرة Markdown، (2) المخطط الأول «مخطط واجهة متجرك (Material 3)» لأن هذه الوثيقة تحيل على أقسامه (3.5 و4.1 إلى 4.3 و5.x و6.x)، (3) ملف خطة الضرائب `.txt`، (4) كود المشروع. بعد كل خطوة ارجع بالنتيجة للمراجعة قبل أن يكمل. محرك الضرائب (مرحلتاه) عمل منفصل لا يُرسَل الآن.

```text
أنت مهندس React وTypeScript أول تنفّذ تغييرات على مشروع «متجرك Matjark» (نظام نقاط بيع ومخزون ومحاسبة للسوق المصري) اعتماداً على وثائق مكتوبة. أنت المنفّذ، وأنا (المالك) أتخذ القرارات.

## المدخلات
1. «مخطط واجهة متجرك (Material 3): النسخة المحدثة» (PART 1 إلى 4 والملحقان أ وب).
2. «مخطط واجهة متجرك (Material 3)» الأول: رموز التصميم والمكونات والشاشات التي تحيل عليها الوثيقة.
3. ملف منطق حسابات الضريبة (txt): مرجع فقط. محرك الضرائب مرحلة منفصلة ولن تبدأها.
4. كود المشروع (src).

## ترتيب الاعتماد عند التعارض
الملحق (أ) ثم كتل الأنواع في الأقسام 5 و10.0 و11.4 و12.7 ثم نص الوثيقة المحدثة ثم المخطط الأول ثم ملف الضرائب. الكود الفعلي مصدر الحقيقة لما هو موجود، فإن خالفته الوثيقة فتوقف واسأل.

## قواعد ملزمة
1. اقرأ الكود الفعلي قبل أي كتابة: src/components/ui/، src/types/index.ts، src/index.css، src/context/StoreContext.tsx، src/utils/storage.ts، src/App.tsx، src/components/layout/Sidebar.tsx، src/components/pos/CashierScreen.tsx، src/components/accounting/AccountingScreen.tsx، src/components/reports/ReportsScreen.tsx، src/utils/currency.ts، vite.config.ts، package.json. أي اسم مكوّن أو prop تستعمله يجب أن يطابق الموجود، وإلا فصرّح أنه «مكوّن جديد مطلوب إنشاؤه» وعرّف props كاملة.
2. مكتبة المكونات هي الحزمة material (على الأغلب material-esm/material) وغلافها material/react. لا تفترض أسماء أو خصائص لم تتحقق منها. افحص node_modules/material/react أولاً وأخبرني بما وجدته، خاصة: Tabs وNavigationBar وCard وSearch وPickers وbutton-group.
3. لا تكسر StoreContext.tsx ولا أي وظيفة قائمة. التغييرات إضافية فقط: حقول اختيارية، ووسيط اختياري ثانٍ للدوال. أي ترحيل بخطوات واضحة وقابلة للتراجع. استثناء وحيد: المرحلة أ تصحح أسطراً محددة في مكانها دون تغيير توقيع أي دالة.
4. TypeScript بوضع strict وبلا any. الأنواع المالية الجديدة (ScaledMoney) لا تُخلط مع الأعداد العشرية في الكود القديم (الملحق أ.2).
5. التطوير على HTTPS عبر vite-plugin-mkcert (القسم 12.0). التطبيق لا يستعمل الشبكة (offline-first). التجزئة بـ WebCrypto (PBKDF2) مع معايرة، ومعها حارس isSecureContext.
6. العربية RTL، الأرقام لاتينية، الوحدات dp، ألوان من رموز Material 3 فقط، بلا قيم ثابتة.
7. كل رقم افتراضي في الوثيقة (سقوف الموافقات، 200 و500 ج.م للدرج، 14 يوماً للإرجاع، 5 دقائق للقفل، 30 ثانية لحذف السطر، 16 ساعة للوردية) هو إعداد قابل للضبط وليس قراراً نهائياً. ضعه في الإعدادات الافتراضية ولا تدفنه في الكود.
8. أي بند موسوم @unverified (ضريبي أو قانوني) لا تبنِ عليه حساباً ولا تفعّله. اتركه حقلاً اختيارياً معطلاً.
9. لا تخترع قراراً غير مكتوب. إن واجهك غموض أو تعارض فاسألني بأسئلة قصيرة مرقّمة قبل الكتابة.
10. لا تنفّذ taxEngine.ts ولا شاشات الكاشير والوردية والمخزن والفواتير والحسابات (المراحل 1 إلى 4). تلك لاحقاً.

## النطاق: مرحلتان بالترتيب. نفّذ خطوة واحدة في كل رد

### المرحلة أ: تصحيح الأخطاء الحسابية في الكود الحالي (أولاً، قبل Phase 0)
المواصفة التفصيلية في القسم 7.0 من الوثيقة (الخطوات أ.1 إلى أ.6: ترقيم الفواتير، نسبة الضريبة الصفرية، الإيراد مع الخصم، العد المزدوج للمشتريات، فشل الحفظ الصامت، وثلاثة إصلاحات صغيرة). هذه تصحيحات في أسطر محددة بلا ميزات جديدة، ولكل خطوة اختبار قبول رقمي. ابدأ بها قبل أي شيء.

### Phase 0 (بعد اعتمادي للمرحلة أ)
0.1 دمج الأنواع: ملف src/types/index.ts مدموج من الفهرس (أ.1) والملحق (أ.3 وأ.4)، بلا تغيير في الحقول القائمة، وبنجاح tsc --noEmit.
0.2 الأساس البصري: رموز --matjark-success وwarning (نهاري وليلي) في index.css، وإضافة tonal إلى MuiButton مع إزالة قيم hex، ومكونات ui الجديدة: MuiBottomSheet وMuiButtonGroup وPinField (variant: boxes وdots) وPinPad وUserAvatar وPasswordField وStepIndicator وConfirmDialog (بديل window.confirm).
0.3 التخزين والتدقيق: src/storage/idb.ts (قاعدة matjark_audit بمخزن للإضافة فقط)، src/utils/audit.ts (سلسلة SHA-256 عبر crypto.subtle، تسلسل seq بلا فجوات، دالة تحقق)، وترحيل القاعدة من v2 إلى v3 مع نسخة تلقائية قبله دون أي تغيير ظاهر في سلوك التطبيق.
0.4 نواة المصادقة: src/utils/kdf.ts (PBKDF2 مع معايرة 250 إلى 400ms وإعادة تجزئة عند رفع المعاملات)، src/utils/secureContextGuard.ts، src/utils/permissions.ts (مصفوفة 9.7 كبيانات لا كود)، src/context/AuthContext.tsx (الجلسة، can()، قفل الخمول).
0.5 الشاشات: OnboardingScreen (وضعا fresh وupgrade، مع RecoveryKeyDialog)، LoginScreen، LockScreen، بوابة الدخول في App.tsx، وحوار mustChangePassword.
0.6 الصلاحيات في الواجهة: PermissionGate وReauthSheet (الأوضاع الثلاثة) وUserMenu في الـ Sidebar، وتصفية الوجهات حسب الصلاحية، وحارس activeTab مع NoAccess.

لا شيء من المال أو الوردية أو الكاشير في Phase 0 غير الأنواع والأساسات.

## صيغة كل رد
1. ما قرأته في الكود، وكل ما وجدته مخالفاً للوثيقة.
2. خطة هذه الخطوة: ملفات تُنشأ وتُعدَّل وتُحذف.
3. الكود الكامل لكل ملف (بلا مقاطع ناقصة)، دون لمس ما هو خارج النطاق.
4. اختبارات القبول لهذه الخطوة: قائمة يدوية قابلة للتنفيذ، واختبارات وحدة للدوال النقية (kdf وaudit وpermissions).
5. المخاطر على StoreContext وكيف احترزت.
6. أسئلتي المعلّقة إن وُجدت.
ثم توقف وانتظر موافقتي قبل الخطوة التالية.

## قرارات معلّقة، لا تحسمها وحدك
- الأرقام الافتراضية في البند 7.
- blindCloseStrict (الافتراضي false) وrequireOpenShift (الافتراضي false).
- اصطلاح Customer.balance (موجب = دين على العميل) وطريقة ترحيل البيانات القديمة.
- صيغة ترقيم الفواتير الجديدة (INV-YYYY-NNNNNN) والتعامل مع الأرقام القديمة.
- سياسة النشر خارج التطوير (mkcert للتطوير فقط).

ابدأ بقراءة الكود، ثم أرسل لي ما وجدته قبل أن تكتب أي سطر في الخطوة أ.1 من المرحلة أ.
```

**قبل الإرسال تحقق من ثلاثة أشياء:** أن الملفات الأربعة مرفقة، وأن `vite-plugin-mkcert` مثبت على جهازك (الخطوة 0.4 تفترض `isSecureContext = true`)، وأنك ستراجع كل خطوة قبل السماح بالتالية. الوثيقة مبنية على افتراضات لم تُختبر على جهاز كاشير فعلي (أزمنة التجزئة، وWeb Locks، وأسماء مكونات المكتبة)، والبرومبت يطلب من ChatGPT التحقق منها أولاً.

---

## الملحق (ج): برومبت محرك الضرائب (`taxEngine.ts`)

**موضعه من الخطة:** عمل منفصل عن Phase 0 ولا يُرسَل مع برومبت الملحق (ب). يُرسَل **بعد** اعتماد الخطوة 0.1 (دمج الأنواع)، لأنه يعتمد على الأنواع الضريبية في الملحق (أ.3). **برومبت الأنواع الضريبية القديم (المرحلة الأولى) أُلغي** لأن أنواعه صارت في الملحق (أ.3) وتُكتب في الخطوة 0.1. أرسل معه ملف خطة الضرائب `.txt` والملف المدموج `src/types/index.ts`. ويُراجَع القرار القانوني (البنود `@unverified`) مع محاسب قبل تفعيل أي حساب يعتمد عليها.

```text
أنت مهندس TypeScript أول (Principal Engineer) متخصص في المحركات المحاسبية والضريبية الحتمية (deterministic) لأنظمة نقاط البيع، ومطّلع على مشروع «متجرك Matjark» (React 19 وTypeScript بوضع strict).

## المهمة
اكتب ملف src/utils/taxEngine.ts كاملاً ونظيفاً وجاهزاً للنسخ: محرك حساب ضريبي ومحاسبي مكوَّن من دوال نقية فقط. لا تكتب أي شيء آخر.

## شرط البدء
سألصق لك الملف المدموج src/types/index.ts (فيه الأنواع الضريبية من الملحق أ.3 وبقية الأنواع). لا تعدّله ولا تكتب نسخة منه، بل استورد منه فقط. إن احتجت نوعاً غير موجود فاذكره في قسم «نقص الأنواع» في مخرجاتك وتابع بنوع محلي مؤقت داخل الملف موسوم // TEMP-TYPE. وبما أن مخرجات بعض الدوال (إقفال القيمة المضافة، وعدادات الحدود) لم تُعرَّف كأنواع، فعرّفها محلياً وصدّرها وسمّها في «نقص الأنواع».

## قواعد صارمة
1. نقاء كامل: لا React ولا DOM، ولا Date.now() ولا new Date() بلا مدخل، ولا Math.random()، ولا حالة عامة، ولا طباعة، ولا استيراد من StoreContext أو currency.ts. كل التواريخ تُمرَّر كمدخلات.
2. ممنوع الفاصلة العائمة على أي مبلغ أو نسبة. المبالغ ScaledMoney (1 ج.م = 10,000) والنسب BasisPoints (14% = 1400) والكميات ScaledQuantity (1.000 = 1000). كل عملية وسيطة بـ BigInt، وتُحوَّل النتيجة بدالة toSafeNumber تتحقق من Number.MAX_SAFE_INTEGER وتُرجع خطأ بدل القيمة الخاطئة.
3. التقريب ROUND_HALF_UP بمعنى «بعيداً عن الصفر عند التعادل»: 0.335 يصير 0.34 و−0.335 يصير −0.34. دالة واحدة divRoundHalfUp(numerator: bigint, denominator: bigint): bigint تغطي الإشارات، وكل التقريب في الملف يمر عبرها.
4. مبلغ كل سطر في الفاتورة يُقرَّب إلى سنتين (مضاعفات 100 وحدة) ثم تُجمع السطور، فيطابق مجموع السطور الإجمالي دائماً. لا يوجد roundingAdjustment على الفاتورة.
5. لا استثناءات (throw) للأخطاء المتوقعة. كل دالة قد تفشل تُرجع Result<T, TaxEngineError> ({ ok: true; value } أو { ok: false; error }) بأكواد خطأ ثابتة as const ورسالة قصيرة.
6. بلا any وبلا مكتبات خارجية وتحت strict: true.
7. لا تخترع أحكاماً قانونية. كل دالة قائمة على بند غير متحقق منه تُوسَم @unverified في JSDoc وتأخذ معاملاتها من مدخلات أو جداول إعداد لا من ثوابت مخفية.
8. لكل دالة JSDoc موجز بالإنجليزية فيه مثال رقمي واحد على الأقل من الأمثلة المعتمدة أدناه.

## الدوال المطلوبة

### أ) الأساسات
- toScaled(decimalString) وparseScaled: تحويل نص عشري مثل 1250.5 إلى ScaledMoney دون المرور بـ Number. ارفض أكثر من 4 منازل أو أي حروف غريبة بخطأ.
- roundToCents(x): تقريب ScaledMoney إلى مضاعف 100.
- formatEGP(scaled): النص النهائي 1,250.50 ج.م بأرقام لاتينية وبمنزلتين ثابتتين عبر تنسيق نصي على الأعداد الصحيحة لا عبر Intl ولا toFixed. السالب: −1,250.50 ج.م.
- sumScaled وmulBpScaled وmulQtyScaled وغيرها من الأدوات الصغيرة بـ BigInt.

### ب) تحديد المعالجة المطبقة
resolveAppliedTreatment(input) يحوّل ProductTaxProfile مع (vatStatus وSaleUsageContext وexcludedFromReducedRate) إلى AppliedTaxTreatment:
- vatStatus = unregistered يعطي out_of_scope لكل الأصناف، وتبقى الضرائب غير القابلة للخصم جزءاً من التكلفة.
- exempt يعطي exempt، وzero_rated يعطي zero_rated، وvat_14 يعطي vat_standard.
- medical_5 يعطي medical_reduced (500bp) فقط عند production_or_service ودون excludedFromReducedRate، وإلا يعود إلى vat_standard.
- schedule_only وcomposite بحسب القالب وترتيب compositeOrder.

### ج) استخراج الضريبة من السعر الشامل (لكل سطر)
المدخل: المبلغ المدفوع للسطر G بعد الخصم ومُقرَّباً إلى سنتين.
- vat_standard وmedical_reduced (معدل v): net = round(G × 10000 / (10000 + v))، وvat = G − net.
- schedule_only (معدل جدول s): net = round(G × 10000 / (10000 + s))، وscheduleTax = G − net، ولا قيمة مضافة، وتدخل scheduleTax في التكلفة ولا تُخصم.
- composite بالترتيب vat_on_schedule_inclusive: net = round(G × 10000² / ((10000+s)(10000+v)))، وscheduleTax = round(net × s / 10000)، وvat = G − net − scheduleTax.
- composite بالترتيب vat_before_schedule: net = round(G × 10000 / (10000 + v + s))، وscheduleTax = round(net × s / 10000)، وvat = G − net − scheduleTax.
- exempt وzero_rated وout_of_scope: net = G، والضرائب صفر، مع علم inputVatRecoverable (صحيح للصفري فقط من هذه الثلاثة).
- دعم السعر غير الشامل (priceInclusive = false): الدالة نفسها بمدخل مختلف، وتُرجع G = net + tax بنفس قواعد التقريب لكل سطر.

### د) توزيع الخصم النسبي
allocateDiscount(input):
- يُوزَّع الخصم لكل مجموعة ضريبية على حدة (taxGroupKey) نسبةً إلى المبلغ قبل الخصم لكل سطر في المجموعة.
- التوزيع بوحدة السنت بطريقة largest remainder، وعند تساوي البواقي يُعطى الأقدم ترتيباً (أصغر فهرس).
- مجموع المخصص يساوي الخصم الكلي للمجموعة تماماً.
- إن خرج أي سطر بسعر صافٍ ≤ 0 بعد التوزيع فأرجع خطأ ZERO_PRICE_LINE. والخصم الأكبر من إجمالي المجموعة خطأ.

### هـ) فاتورة كاملة
computeInvoice(input): يطبّق بالترتيب: تحديد المعالجة، توزيع الخصم، مبلغ كل سطر (تقريب السنت)، استخراج الضريبة، التجميع (صافي، قيمة مضافة، جدول، إجمالي)، فحص الهامش، ثم بناء InvoiceLineTaxSnapshot لكل سطر وInvoiceTaxSnapshot للفاتورة كبيانات جاهزة (دون حفظ). لا يعتمد على أي حالة. أي تعارض في المدخلات يُرجع خطأً ولا يُصحَّح بصمت.

### و) المرتجعات
computeCreditNote(input):
- لكل سطر: refundNet = إجمالي السطر الأصلي × الكمية المرتجعة / الكمية المباعة بتقريب السنت، مع قاعدة الباقي: آخر مرتجع لما تبقى من السطر يأخذ المتبقي بالضبط حتى لا يتراكم فرق تقريب.
- فصل الضريبة في المرتجع بنفس نسب لقطة الفاتورة الأصلية، وبنفس قاعدة الباقي.
- rateRule = original يستخدم لقطة الفاتورة، وeffective_at_return يتطلب decisionId وإلا خطأ DECISION_REQUIRED.
- مرتجع صنف داخل عرض يُرد بصافيه المدفوع بعد التوزيع وفق promoReturnPolicy (مدخل للدالة وليس حقل نوع): refund_net_paid أو return_bundle_only.
- يرفض إرجاع كمية تتجاوز المتبقي.

### ز) حماية الهامش
checkMargin(input): يقارن صافي سعر البيع قبل الضريبة بصافي تكلفة الوحدة، حيث تكلفة المسجل بلا قيمة مضافة قابلة للخصم، وتكلفة غير المسجل شاملة الضريبة. يُرجع { belowCost: boolean; marginBp }. القرار (السماح بموافقة المدير) خارج هذا الملف.

### ح) تكلفة المخزون (المتوسط المرجح مع البونص)
- computeWeightedAverageCost(input): يضيف الضرائب غير القابلة للخصم (ضريبة الجدول، وقيمة مضافة غير قابلة للخصم عند الشراء بلا فاتورة ضريبية أو لغير المسجل) إلى التكلفة.
- البونص يخفض متوسط التكلفة فقط إذا أُثبت كبند منفصل (documentedBonus: true). التكلفة الإجمالية تُقسم على (المدفوع + المجاني) وتُحسب ضريبة الشراء على المدفوع فقط.
- تكلفة الوحدة محفوظة بدقة 4 أرقام. تُرجع الدالة الباقي التراكمي roundingResidual بدل أن تُخفيه، لتنتج دالة buildInventoryRoundingEntry قيد AdjustmentEntry عند محفّز التسوية (استنفاد، جرد، إقفال) دون حفظه.

### ط) الإقفال الدوري للقيمة المضافة
computeVatPeriodClose(input): المعادلة:
(ضريبة المبيعات − ضريبة المرتجعات + مخرجات الاستهلاك الشخصي والاستخدام الخاص + مخرجات عمولات الأمانة + رد ضريبة الهالك غير المعتمد) − (ضريبة المشتريات القابلة للخصم + ضريبة المصروفات والإيجار + ضريبة الأصول الثابتة + الرصيد الدائن المرحّل).
- النتيجة الموجبة مستحقة، والسالبة رصيد دائن مرحَّل.
- consecutiveCreditMonths تُحسب بالأشهر (الفترة الربع سنوية = 3 أشهر)، وrefundEligible عندما يبلغ العدد creditRefundThresholdMonths من الإعدادات.
- بند معلوماتي منفصل لضريبة الجدول المحمّلة على التكلفة، ولا يدخل المعادلة.

### ي) العدادات والنظام المبسط (تنبيه وحساب فقط، لا تغيّر أي إعداد)
- computeVatRegistrationMonitor(input): مجموع المبيعات الخاضعة والمعفاة منذ بداية السنة المالية مقابل 500,000 ج.م مضروبة بالمقياس، بمستويات تنبيه قابلة للضبط. بداية السنة المالية مدخل إلزامي (@unverified أن الحساب على السنة المالية لا آخر 12 شهراً).
- computeSimplifiedTax(input): يحسب النسبة والالتزام على حجم الأعمال الصافي بعد المرتجعات وقبل القيمة المضافة. الشرائح تُقرأ من جدول إعداد { fromInclusive, toExclusive, rateBp }[] وافتراضيه: 0.4% (حتى 500 ألف)، 0.5% (حتى 2 مليون)، 0.75% (حتى 3 ملايين)، 1% (حتى 10 ملايين)، 1.5% (حتى 20 مليون). حدود الشرائح (شاملة أم لا) وapplicationMode (whole_turnover أو marginal) معاملان قابلان للضبط ومسومان @unverified لأن المصادر متضاربة، ولا تفترض قيمة صامتة. مرونة التجاوز: تجاوز 20 مليون بنسبة لا تتعدى 20% يبقى بسعر 1.5% لمرة واحدة خلال 5 سنوات وإلا ينتهي الاستفادة من السنة التالية، والحالة مخرج صريح (eligible أو grace_used أو lost_next_year). الشريحة النهائية لا تُعرف إلا آخر السنة، فاجعل مخرجاً provisional: boolean للتقدير الشهري.

### ك) دوال @unverified (بمعاملات صريحة وبلا ثوابت قانونية خفية)
- valueOwnerWithdrawal: الاستهلاك الشخصي بسعر البيع، والاستخدام الخاص بإجمالي التكلفة (صافي التكلفة + الجزء غير القابل للخصم من ضريبة المدخلات).
- allocateMixedInputVat: التخصيص النسبي لضريبة المدخلات المشتركة حسب نسبة المبيعات الخاضعة إلى الإجمالي.
- computeWithholding: الاستقطاع (نسبة وحد أدنى وفئة معاملات من المدخلات).

## الأمثلة المعتمدة (استخدمها في JSDoc وعدّها اختبارات ذهبية)
1. شامل 14%: G = 114.00 يعطي net = 100.00 وvat = 14.00.
2. مركب vat_on_schedule_inclusive مع s=500 وv=1400: G = 119.70 يعطي net = 100.00 وscheduleTax = 5.00 وvat = 14.70.
3. مركب vat_before_schedule مع s=500 وv=1400: G = 119.00 يعطي net = 100.00 وscheduleTax = 5.00 وvat = 14.00.
4. التعادل: 0.335 يصير 0.34 و−0.335 يصير −0.34.
5. توزيع الخصم: ثلاثة أسطر 10.00 لكل منها وخصم 10.00 على المجموعة يعطي المخصص 3.34 و3.33 و3.33، والأسطر النهائية 6.66 و6.67 و6.67 والمجموع 20.00.
6. قاعدة الباقي في المرتجع: سطر كميته 3 ومدفوعه 10.00 يُرجَع ثلاث مرات بكمية 1 فيعطي 3.33 و3.33 و3.34.
7. ثلاثة أسطر بسعر 0.01 لكل منها: لا يخرج أي سطر بصفر، وإلا خطأ ZERO_PRICE_LINE.

## المخرجات المطلوبة
1. ملف src/utils/taxEngine.ts الكامل في كتلة كود واحدة مع قائمة export واضحة في أعلاه.
2. «الدوال المُصدَّرة»: جدول (اسم الدالة، المدخل، المخرج، هل هي @unverified).
3. «نقص الأنواع»: كل نوع احتجته وغاب من types/index.ts.
4. «افتراضات وتعارضات»: أي قرار اتخذته، وأي موضع تعارض فيه البرومبت مع الأنواع.
5. «متجهات اختبار ذهبية»: جدول أرقام محسوبة للأمثلة أعلاه ولثلاثة سيناريوهات إضافية من اختيارك (منها مرتجع جزئي عبر فترتين)، دون كتابة أي مشغّل اختبار.
6. افحص ملفك ذاتياً قبل الإرسال: تحت strict: true، بلا any، وبلا أي عملية + - * / على number تمس مبلغاً أو نسبة (كلها بـ BigInt).

توقف تماماً بعد هذه المخرجات. لا تكتب اختبارات ولا تعدّل currency.ts ولا StoreContext.tsx ولا أي واجهة، وانتظر مراجعتي وإشارة البدء.
```

**ملاحظات قبل الاستخدام:** (1) أرقام الأمثلة السبعة مرجع الصحة الوحيد، فتأكد منها بنفسك أو مع المحاسب قبل الإرسال. (2) قاعدة «تقريب كل سطر ثم الجمع» تحتاج اختباراً على بيئة الاختبار لدى منظومة ETA، لأن قواعد التحقق لديها لم أتحقق منها. (3) حدود الشرائح المبسطة وبداية السنة المالية معاملات قابلة للضبط عمداً، لأن المصادر التي راجعتها متضاربة أو صامتة عنها.
