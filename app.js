// app.js (FULL) — التعديل: Customer Type Auto + Subject hidden + Description hidden (من غير تغيير لوجيك التول)
// ملاحظة: نفس ملفك اللي بعته، مع تعديلين داخل computeAutoTicketFields + إضافة helper للـ Customer Type.

/* =========================
   عناصر أساسية
   ========================= */
const qaCard        = document.getElementById('qaCard');         // صندوق الأسئلة
const questionsEl   = document.getElementById('questions');      // الحاوية التي نحقن فيها الأسئلة
const requiredEl    = document.getElementById('summary');        // المربع الأصفر (المطلوب)
const miniSummaryEl = document.getElementById('miniSummary');    // المربع الأزرق (الخلاصة)

/* عناصر Drafts (قد لا تكون موجودة في الـHTML — لذلك كل الاستخدامات محمية) */
const draftsSidebar = document.getElementById('draftsSidebar');
const draftsToggle  = document.getElementById('draftsToggle');
const draftsSearch  = document.getElementById('draftsSearch');
const draftsListEl  = document.getElementById('draftsList');

/* أزرار الخلاصة */
const btnCopy   = document.getElementById('copyMiniBtn');
const btnSave   = document.getElementById('saveDraftBtn');
const btnEnd    = document.getElementById('endBtn');
const btnCreate = document.getElementById('createTicketBtn');

/* حقل اسم المنتج من على OTA (جديد) */
const otaEl   = document.getElementById('otaProductName');

/* ====== Ticket Section Elements ====== */
const tsMobileEl        = document.getElementById('ts_mobile');
const tsStoreEl         = document.getElementById('ts_store');
const tsOrderEl         = document.getElementById('ts_orderNumber');
const tsTxnEl           = document.getElementById('ts_transactionNumber');
const tsSubCategoryEl   = document.getElementById('ts_subCategory');
const tsItemEl          = document.getElementById('ts_item');
const tsCustomerTypeEl  = document.getElementById('ts_customerType');
const tsOrderCreatedEl  = document.getElementById('ts_orderCreated');
const tsReturnPolicyEl  = document.getElementById('ts_returnPolicy');
const tsWithCustomerEl  = document.getElementById('ts_withCustomer');
const tsSubjectEl       = document.getElementById('ts_subject');       // ✅ موجود hidden
const tsDescEl          = document.getElementById('ts_description');   // ✅ موجود hidden

/* مفاتيح التخزين */
const DRAFTS_KEY = 'seoudi_drafts_v1';
const TICKET_PAYLOAD_KEY = 'seoudi_ticket_payload_v1';

/* =========================
   Auto update guard
   (مهم: يمنع اعتبار الـ auto-fill كأنه "User Edited")
   ========================= */
let AUTO_UPDATING = false;
function runAuto(fn){
  AUTO_UPDATING = true;
  try{ fn(); } finally { AUTO_UPDATING = false; }
}

/* =========================
   حقول: (اسم المنتج من OTA + الملاحظات) + Ticket fields
   ========================= */
const FIELDS = {
  otaName:   () => otaEl?.value?.trim() || '',
  otherNotes: () => document.getElementById('otherNotes')?.value?.trim() || '',

  // Ticket fields
  tsMobile: () => tsMobileEl?.value?.trim() || '',
  tsStore:  () => tsStoreEl?.value?.trim() || '',
  tsOrder:  () => tsOrderEl?.value?.trim() || '',
  tsTxn:    () => tsTxnEl?.value?.trim() || '',

  // Category removed from UI + Description, but still ثابت داخل الـ payload
  tsCategory: () => 'Complaint',

  tsSubCategory: () => tsSubCategoryEl?.value?.trim() || '',
  tsItem: () => tsItemEl?.value?.trim() || '',
  tsCustomerType: () => tsCustomerTypeEl?.value?.trim() || '',
  tsOrderCreated: () => tsOrderCreatedEl?.value?.trim() || '',
  tsReturnPolicy: () => tsReturnPolicyEl?.value?.trim() || '',
  tsWithCustomer: () => tsWithCustomerEl?.value?.trim() || '',
  tsSubject: () => tsSubjectEl?.value?.trim() || '',
  tsDescription: () => tsDescEl?.value?.trim() || '',
};

/* ======= Validation ======= */
function markInvalidEl(el, on=true){ if(el) el.classList.toggle('invalid', on); }

function getMissingFields(){
  const missing = [];
  const missingKeys = [];

  // Required Ticket Fields
  const requiredTicket = [
    { key:'tsMobile', el:tsMobileEl, label:'Customer Mobile' },
    { key:'tsStore', el:tsStoreEl, label:'Store' },
    { key:'tsOrder', el:tsOrderEl, label:'Order Number' },
    { key:'tsSubCategory', el:tsSubCategoryEl, label:'Sub Category' },
    { key:'tsItem', el:tsItemEl, label:'Item' },
    { key:'tsCustomerType', el:tsCustomerTypeEl, label:'Customer Type' },
    { key:'tsOrderCreated', el:tsOrderCreatedEl, label:'Order Created' },
    { key:'tsReturnPolicy', el:tsReturnPolicyEl, label:'سياسة الاستبدال والاسترجاع' },
    { key:'tsWithCustomer', el:tsWithCustomerEl, label:'المنتج متواجد لدى العميل' },
    // ✅ Subject و Description لسه موجودين في الخلفية (hidden) وبيتملوا أوتوماتيك
    { key:'tsSubject', el:tsSubjectEl, label:'Subject' },
    { key:'tsDescription', el:tsDescEl, label:'Description' },
  ];

  requiredTicket.forEach(r=>{
    const v = FIELDS[r.key]();
    if(!v){
      missing.push(r.label);
      missingKeys.push(r.key);
    }
  });

  // Require OTA product name as well (مهم للتذكرة)
  if(!FIELDS.otaName()){
    missing.push('اسم المنتج من على OTA');
    missingKeys.push('otaName');
  }

  // Require complaint type selected (optional but helpful)
  if(!state.type){
    missing.push('نوع الشكوى (اختر من الأعلى)');
    missingKeys.push('ctype');
  }

  return { missing, missingKeys };
}

function markInvalidFields(){
  // Clear all invalid first
  [tsMobileEl,tsStoreEl,tsOrderEl,tsSubCategoryEl,tsItemEl,tsCustomerTypeEl,tsOrderCreatedEl,tsReturnPolicyEl,tsWithCustomerEl,tsSubjectEl,tsDescEl,otaEl]
    .forEach(el=>markInvalidEl(el,false));

  const m = getMissingFields();

  // Mark missing ones
  m.missingKeys.forEach(k=>{
    if(k==='tsMobile') markInvalidEl(tsMobileEl,true);
    if(k==='tsStore') markInvalidEl(tsStoreEl,true);
    if(k==='tsOrder') markInvalidEl(tsOrderEl,true);
    if(k==='tsSubCategory') markInvalidEl(tsSubCategoryEl,true);
    if(k==='tsItem') markInvalidEl(tsItemEl,true);
    if(k==='tsCustomerType') markInvalidEl(tsCustomerTypeEl,true);
    if(k==='tsOrderCreated') markInvalidEl(tsOrderCreatedEl,true);
    if(k==='tsReturnPolicy') markInvalidEl(tsReturnPolicyEl,true);
    if(k==='tsWithCustomer') markInvalidEl(tsWithCustomerEl,true);
    if(k==='tsSubject') markInvalidEl(tsSubjectEl,true);
    if(k==='tsDescription') markInvalidEl(tsDescEl,true);
    if(k==='otaName') markInvalidEl(otaEl,true);
  });

  return m;
}

/* ======= Toast ======= */
let toastTimer=null;
function showToast(msg, type='error'){
  if(toastTimer){ clearTimeout(toastTimer); toastTimer=null; }
  document.querySelectorAll('.toast').forEach(t=>t.remove());
  const t = document.createElement('div');
  t.className = `toast ${type==='error'?'toast-error':'toast-success'}`;
  t.textContent = msg;
  document.body.appendChild(t);
  toastTimer = setTimeout(()=>{ t.remove(); }, 3200);
}

/* ======= Utilities ======= */
function show(el, on) { if(!el) return; el.style.display = on ? '' : 'none'; }
function clear(el) { if(!el) return; el.innerHTML = ''; }
function esc(s=''){ return s.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

/* ======= Clipboard helper (مهم للـ Extension / file://) ======= */
async function copyToClipboard(text){
  // Modern
  try{
    if(navigator.clipboard && window.isSecureContext){
      await navigator.clipboard.writeText(text);
      return true;
    }
  }catch{}

  // Fallback
  try{
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly','');
    ta.style.position = 'fixed';
    ta.style.top = '-9999px';
    ta.style.right = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if(!ok) throw new Error('copy failed');
    return true;
  }catch(e){
    throw e;
  }
}

/* ========== تنسيق خاص لسطر الاعتذار + ملاحظة المنتجات المبردة/المجمدة ========== */
(function injectApologyStyle(){
  try{
    const st = document.createElement('style');
    st.textContent = `
      .result-apology .apology-main{ font-weight:700; color:#0d47a1; }
      .note-cold {
        background-color:#eaf3ff;
        color:#0d47a1;
        border:2px solid #0d47a1;
        border-radius:10px;
        padding:12px 14px;
        margin-top:12px;
        line-height:1.7;
      }
      /* نسخة العنوان العلوية قبل الأسئلة */
      .note-cold.note-top{ margin-bottom:12px; }
      .note-cold b { color:#0b3c91; }
    `;
    document.head.appendChild(st);
  }catch{}
})();

/* ========= ملحوظة المنتجات المبردة/المجمدة — تظهر تحت "المطلوب" فقط عند WT + Chef ========= */
function ensureColdNote(){
  try{
    if(!requiredEl) return;

    const hasChef = [...(requiredEl.querySelectorAll('.result')||[])]
      .some(el => /Chef|chef/.test((el.textContent||'').trim()));

    const shouldShow = (state.type === 'wt' && hasChef);

    const existing = requiredEl.querySelector('.note-cold');
    if (!shouldShow){
      if(existing) existing.remove();
      return;
    }

    if (existing){
      requiredEl.appendChild(existing);
      return;
    }

    const note = document.createElement('div');
    note.className = 'note-cold';
    note.innerHTML = `
      <b>ملحوظة هامة:</b><br>
      في حالة <b>المنتجات المبردة أو المجمدة</b>، يتم إبلاغ العميل بضرورة الاحتفاظ بالمنتج على حالته.<br>
      <b>لو المنتج مبرد</b>، يتم حفظه في <b>الثلاجة</b>، ولو المنتج <b>مجمد</b> يُحفظ في <b>الفريزر</b>.<br>
      في حالة أن المنتج <b>مبرد وتم الاحتفاظ به مجمد</b> أو <b>العكس</b> يتم عمل <b>شكوى فقط</b> ولا يتم عمل طلب جديد للعميل.
    `;
    requiredEl.appendChild(note);
  }catch{}
}

/* ========= إظهار/إخفاء ملحوظة قبل الأسئلة عند اختيار PQ أو WT ========= */
function renderColdNoteTopForPQ(showTop=true){
  try{
    const card = document.getElementById('qaCard');
    if(!card) return;

    let note = card.querySelector('.note-cold.note-top');
    if(!showTop){
      if(note) note.remove();
      return;
    }

    if(!note){
      note = document.createElement('div');
      note.className = 'note-cold note-top';
      note.innerHTML = `
        <b>ملحوظة هامة:</b><br>
        في حالة <b>المنتجات المبردة أو المجمدة</b>، يتم إبلاغ العميل بضرورة الاحتفاظ بالمنتج على حالته.<br>
        <b>لو المنتج مبرد</b>، يتم حفظه في <b>الثلاجة</b>، ولو المنتج <b>مجمد</b> يُحفظ في <b>الفريزر</b>.<br>
        في حالة أن المنتج <b>مبرد وتم الاحتفاظ به مجمد</b> أو <b>العكس</b> يتم عمل <b>شكوى فقط</b> ولا يتم عمل طلب جديد للعميل.
      `;
      const questions = document.getElementById('questions');
      if(questions) questions.parentNode.insertBefore(note, questions);
      else card.prepend(note);
    }else{
      const questions = document.getElementById('questions');
      if(questions && note.nextElementSibling !== questions){
        questions.parentNode.insertBefore(note, questions);
      }
    }
  }catch{}
}

/* دالة فحص: نضيف رسالة الاعتذار فقط عندما يكون المطلوب "عمل طلب جديد" فعليًا (وليس "عرض") */
function shouldInjectApology(line=''){
  const t = (line||'').trim();
  if(/^\s*عرض\s+طلب\s+جديد/i.test(t)) return false;
  if(/^\s*يتم\s+عرض\s+طلب\s+جديد/i.test(t)) return false;
  return (
    /^\s*عمل\s+طلب\s+جديد\b/.test(t)
    || /طلب\s+جديد\s+بالمفقود/.test(t)
    || /عمل\s+طلب\s+جديد\s+بباقي\s+الكمية/.test(t)
    || /عمل\s+طلب\s+جديد\s+بنفس\s+الكمية/.test(t)
    || /عمل\s+طلب\s+جديد\s+بالمنتج/.test(t)
  );
}

/* نضيف نتيجة + (رسالة الاعتذار أوتوماتيكياً تحت أي "عمل طلب جديد") */
function addResult(text, opts={}){
  show(qaCard, true);
  show(document.getElementById('summaryCard'), true);

  const d = document.createElement('div');
  d.className = 'result' + (opts.className ? ` ${opts.className}` : '');
  if(opts.html) d.innerHTML = text; else d.textContent = text;
  requiredEl.appendChild(d);

  if (shouldInjectApology(text)) {
    const ap = document.createElement('div');
    ap.className = 'result result-apology';
    ap.innerHTML = `نقول للعميل (<span class="apology-main"><strong>بعتذر لحضرتك جداً عن أي مشكلة واجهتك، هيتم مراجعة الشكوى داخلياً من غير ما نزعج حضرتك</strong></span>)<br>
    وفي حالة إن العميل أصر على التواصل معاه من خلال قسم الشكاوى:<br>
    يتم توضيح ده في الـ Ticket بشكل واضح علشان يتم المتابعة من الفريق المختص.`;
    requiredEl.appendChild(ap);
  }

  renderMiniSummary();
}

function resetRequired() { clear(requiredEl); renderMiniSummary(); }
function pruneNextSiblings(node, className) {
  let n = node?.nextElementSibling;
  while (n) { const nxt = n.nextElementSibling; if (!className || n.classList?.contains(className)) n.remove(); n = nxt; }
}
function radioQuestion({title, name, options}) {
  const wrap = document.createElement('div');
  wrap.className = 'q-block';
  wrap.innerHTML = `
    <div class="q-title">${title}</div>
    <div class="inline-options">
      ${options.map(o=>`<label><input type="radio" name="${name}" value="${o.value}"> ${o.label}</label>`).join('')}
    </div>`;
  return wrap;
}
function inputQuestion({title, name, placeholder}){
  const wrap = document.createElement('div');
  wrap.className='q-block';
  wrap.innerHTML = `
    <div class="q-title">${title}</div>
    <input type="text" name="${name}" id="${name}" placeholder="${placeholder||''}" />
    <p class="hint mt8">هذا الحقل مطلوب.</p>
  `;
  return wrap;
}
const wipe = (obj, keys)=> keys.forEach(k=> obj[k]=null);

/* ======= Build copy text ======= */
function buildCopyText(){
  const SEP = '----------------------------------------';

  const data = [];
  const ota = FIELDS.otaName();
  if (ota) data.push(['اسم المنتج (OTA)', ota]);
  const notes = FIELDS.otherNotes();
  if (notes) data.push(['الملاحظات', notes]);

  const steps = [];
  if(state.type==='pq'){
    steps.push('نوع الشكوى: جودة منتج');
    if(state.pq.caseLabel) steps.push(`الحالة: ${state.pq.caseLabel}`);
    if(state.pq.client)     steps.push(`نوع العميل: ${state.pq.client}`);
    if(state.pq.pay)        steps.push(`طريقة الدفع: ${state.pq.pay}`);
    if(state.pq.product)    steps.push(`نوع المنتج: ${state.pq.product}`);
    if(state.pq.withClient) steps.push(`المنتج مع العميل؟ → ${state.pq.withClient}`);
    if(state.pq.rr)         steps.push(`اختيار العميل: ${state.pq.rr}`);
  }else if(state.type==='missing'){
    steps.push('نوع الشكوى: عناصر مفقودة');
    if(state.mi.client) steps.push(`نوع العميل: ${state.mi.client}`);
    if(state.mi.inv)    steps.push(`هل متحاسب في الفاتورة؟ → ${state.mi.inv}`);
    if(state.mi.pay)    steps.push(`طريقة الدفع: ${state.mi.pay}`);
    if(state.mi.fish)   steps.push(`نوع المنتج: ${state.mi.fish}`);
    if(state.mi.source) steps.push(`مصدر الطلب: ${state.mi.source}`);
    if(state.mi.abd)    steps.push(`مراجعة الماجينتو/ABD → ${state.mi.abd}`);
  }else if(state.type==='wt'){
    steps.push('نوع الشكوى: خطأ فردي');
    if(state.wt.scenario) steps.push(`اختر الحالة: ${state.wt.scenario}`);
    if(state.wt.client)   steps.push(`نوع العميل: ${state.wt.client}`);
    if(state.wt.pay)      steps.push(`طريقة الدفع: ${state.wt.pay}`);
    if(state.wt.kind)     steps.push(`هل منتج: ${state.wt.kind}`);
    if(state.wt.invoiced) steps.push(`هل تمت المحاسبة كاملة؟ → ${state.wt.invoiced}`);
    if(state.wt.abd)      steps.push(`مراجعة الماجينتو/ABD → ${state.wt.abd}`);
    if(state.wt.rr)       steps.push(`اختيار العميل: ${state.wt.rr}`);
  }

  const reqs = [...(requiredEl?.querySelectorAll('.result')||[])]
    .filter(el=>!el.classList.contains('result-apology'))
    .map(el=>el.textContent.trim()).filter(Boolean);

  const lines = [];
  lines.push('الخلاصة');

  if(data.length){
    lines.push('');
    data.forEach(([k,v])=> lines.push(`${k}: ${v}`));
  }
  if(steps.length){
    lines.push('');
    lines.push(SEP);
    lines.push('');
    lines.push('الخطوات المتبعه:');
    steps.forEach(s=> lines.push(s));
  }
  if(reqs.length){
    lines.push('');
    lines.push(SEP);
    lines.push('');
    lines.push('المطلوب:');
    reqs.forEach(r=> lines.push(r));
  }
  return lines.join('\n');
}

/* =========================
   Ticket: Auto-fill + Description Builder
   ========================= */
function getRequiredResults(){
  return [...(requiredEl?.querySelectorAll('.result')||[])]
    .filter(el=>!el.classList.contains('result-apology'))
    .map(el=>el.textContent.trim())
    .filter(Boolean);
}

function extractWTWorkerTag(reqs){
  for(const line of reqs){
    if(/chef/i.test(line)) return 'Chef';
    if(/picker/i.test(line)) return 'Picker';
    if(/\bCC\b/i.test(line) || /–\s*CC/i.test(line)) return 'CC';
  }
  return '';
}

/* =========================
   ✅ NEW: Customer Type Mapping (حسب اختيار العميل + طريقة الدفع)
   - عميل فرع
   - عميل ديليفري
   - عميل تطبيق (Delivery + Online Payment)
   ========================= */
function resolveCustomerType(clientText='', payText=''){
  const c = (clientText || '').toString();
  const p = (payText || '').toString();

  if(!c) return '';

  // Branch
  if(/فرع/.test(c)) return 'عميل فرع';

  // Delivery => depends on pay
  if(/ديليفري/.test(c)){
    if(/دفع\s*مسبق/i.test(p) || /online\s*payment/i.test(p)) return 'عميل تطبيق';
    if(p) return 'عميل ديليفري';
    return ''; // لسه ماختارش طريقة الدفع
  }

  return c.trim();
}

function computeAutoTicketFields(){
  const reqs = getRequiredResults();
  let subCat = '';
  let item = '';
  let custType = '';

  if(state.type==='pq'){
    subCat = 'Product Quality';
    item = state.pq.caseLabel || '';
    custType = resolveCustomerType(state.pq.client, state.pq.pay);

    if(state.pq.withClient){
      if(/نعم/.test(state.pq.withClient)) setAutoSelect(tsWithCustomerEl, 'Yes');
      if(/لا/.test(state.pq.withClient)) setAutoSelect(tsWithCustomerEl, 'No');
    }
  } else if(state.type==='missing'){
    subCat = 'Missing Item';
    item = 'Missing Item';
    custType = resolveCustomerType(state.mi.client, state.mi.pay);
  } else if(state.type==='wt'){
    subCat = 'Wrong Transaction';
    const tag = extractWTWorkerTag(reqs);
    item = tag ? `Wrong Transaction - ${tag}` : 'Wrong Transaction';
    custType = resolveCustomerType(state.wt.client, state.wt.pay);
  }

  const subj = `Complaint - ${subCat || 'Ticket'}${item ? ' - ' + item : ''}`.trim();
  return { subCat, item, custType, subject: subj };
}

function setAuto(el, value){
  if(!el) return;
  if(el.dataset.userEdited === '1') return;
  runAuto(()=>{
    el.value = (value ?? '');
    // بدون dispatchEvent عشان مايتسجلش كـ userEdited
  });
}

function setAutoSelect(el, value){
  if(!el) return;
  if(el.dataset.userEdited === '1') return;
  if(!value) return;
  runAuto(()=>{
    el.value = value;
  });
}

function buildTicketDescription(){
  const SEP = '----------------------------------------';
  const lines = [];

  lines.push('TICKET DATA');
  lines.push(`Customer Mobile: ${FIELDS.tsMobile()}`);
  lines.push(`Store: ${FIELDS.tsStore()}`);
  lines.push(`Order Number: ${FIELDS.tsOrder()}`);
  if(FIELDS.tsTxn()) lines.push(`Transaction Number: ${FIELDS.tsTxn()}`);

  // ✅ Category removed as requested
  lines.push(`Sub Category: ${FIELDS.tsSubCategory()}`);
  lines.push(`Item: ${FIELDS.tsItem()}`);
  lines.push(`Customer Type: ${FIELDS.tsCustomerType()}`);
  lines.push(`Order Created: ${FIELDS.tsOrderCreated()}`);
  lines.push(`Return/Exchange Policy: ${FIELDS.tsReturnPolicy()}`);
  lines.push(`Product With Customer: ${FIELDS.tsWithCustomer()}`);
  lines.push('');
  lines.push(SEP);
  lines.push('');
  lines.push(buildCopyText());

  return lines.join('\n');
}

function updateTicketPreview(){
  const auto = computeAutoTicketFields();

  setAuto(tsSubCategoryEl, auto.subCat);
  setAuto(tsItemEl, auto.item);
  setAuto(tsCustomerTypeEl, auto.custType);

  // ✅ Subject hidden لكن بيتكتب تلقائي
  setAuto(tsSubjectEl, auto.subject);

  const desc = buildTicketDescription();
  if(tsDescEl && tsDescEl.dataset.userEdited !== '1'){
    runAuto(()=>{ tsDescEl.value = desc; });
  }
}

/* =========================
   الحالة العامة (State)
   ========================= */
const state = {
  type: null,
  pq: { caseId:null,caseLabel:null,client:null,pay:null,product:null,withClient:null,rr:null },
  mi: { client:null,pay:null,fish:null,inv:null,abd:null, source:null },
  wt: { scenario:null,client:null,pay:null,kind:null,invoiced:null,abd:null,rr:null },
};
function resetStatePart(key){
  if(key==='pq') state.pq = {caseId:null,caseLabel:null,client:null,pay:null,product:null,withClient:null,rr:null};
  if(key==='mi') state.mi = {client:null,pay:null,fish:null,inv:null,abd:null, source:null};
  if(key==='wt') state.wt = {scenario:null,client:null,pay:null,kind:null,invoiced:null,abd:null,rr:null};
}

/* =========================
   بناء "الخلاصة" (الأزرق)
   ========================= */
function renderMiniSummary(){
  if(!miniSummaryEl) return;
  let html = '<div class="mini-title">الخلاصة</div>';

  const data = [];
  const ota = FIELDS.otaName();
  if (ota) data.push(['اسم المنتج (OTA)', ota]);
  const notes = FIELDS.otherNotes();
  if (notes) data.push(['الملاحظات', notes]);

  if(data.length){
    html += '<div class="mini-section is-data"><ul>';
    data.forEach(([k,v])=> html += `<li><strong>${k}:</strong> ${esc(v)}</li>`); html += '</ul></div>';
  }

  const steps = [];
  if(state.type==='pq'){
    steps.push('نوع الشكوى: جودة منتج');
    if(state.pq.caseLabel) steps.push(`الحالة: ${state.pq.caseLabel}`);
    if(state.pq.client)     steps.push(`نوع العميل: ${state.pq.client}`);
    if(state.pq.pay)        steps.push(`طريقة الدفع: ${state.pq.pay}`);
    if(state.pq.product)    steps.push(`نوع المنتج: ${state.pq.product}`);
    if(state.pq.withClient) steps.push(`المنتج مع العميل؟ → ${state.pq.withClient}`);
    if(state.pq.rr)         steps.push(`اختيار العميل: ${state.pq.rr}`);
  }else if(state.type==='missing'){
    steps.push('نوع الشكوى: عناصر مفقودة');
    if(state.mi.client) steps.push(`نوع العميل: ${state.mi.client}`);
    if(state.mi.inv)    steps.push(`هل متحاسب في الفاتورة؟ → ${state.mi.inv}`);
    if(state.mi.pay)    steps.push(`طريقة الدفع: ${state.mi.pay}`);
    if(state.mi.fish)   steps.push(`نوع المنتج: ${state.mi.fish}`);
    if(state.mi.source) steps.push(`مصدر الطلب: ${state.mi.source}`);
    if(state.mi.abd)    steps.push(`مراجعة الماجينتو/ABD → ${state.mi.abd}`);
  }else if(state.type==='wt'){
    steps.push('نوع الشكوى: خطأ فردي');
    if(state.wt.scenario) steps.push(`اختر الحالة: ${state.wt.scenario}`);
    if(state.wt.client)   steps.push(`نوع العميل: ${state.wt.client}`);
    if(state.wt.pay)      steps.push(`طريقة الدفع: ${state.wt.pay}`);
    if(state.wt.kind)     steps.push(`هل منتج: ${state.wt.kind}`);
    if(state.wt.invoiced) steps.push(`هل تمت المحاسبة كاملة؟ → ${state.wt.invoiced}`);
    if(state.wt.abd)      steps.push(`مراجعة الماجينتو/ABD → ${state.wt.abd}`);
    if(state.wt.rr)       steps.push(`اختيار العميل: ${state.wt.rr}`);
  }

  if(steps.length){
    html += '<div class="mini-section is-steps"><strong>الخطوات المتبعه:</strong><ul>';
    steps.forEach(s=> html += `<li>${esc(s)}</li>`); html += '</ul></div>';
  }

  const reqs = [...(requiredEl?.querySelectorAll('.result')||[])]
    .filter(el=>!el.classList.contains('result-apology'))
    .map(el=>el.textContent.trim()).filter(Boolean);

  if(reqs.length){
    html += '<div class="mini-section is-req"><strong>المطلوب:</strong><ul>';
    reqs.forEach(r=> html += `<li>${esc(r)}</li>`); html += '</ul></div>';
  }
  miniSummaryEl.innerHTML = html;

  updateCopyState();
  updateTicketPreview();
}

/* =========================
   جودة المنتج / المفقود / خطأ فردي
   ========================= */
/* تعريف الحالات */
const PQ_CASES = [
  {id:'mold',       label:'عفن',         mode:'flow',    sub:'عفن'},
  {id:'hyg',        label:'هايجين"نظافة عامة"', mode:'flow', sub:'هايجين"نظافة عامة"'},
  {id:'impurities', label:'شوائب بالمنتج',mode:'flow',    sub:'شوائب بالمنتج'},
  {id:'taste',      label:'رائحة و طعم و لون', mode:'flow', sub:'رائحة و طعم و لون'},
  {id:'taswiya',    label:'تسوية',       mode:'flow',    sub:'تسوية',                    fishGate:true},
  {id:'fat',        label:'دهون زائده',  mode:'flow',    sub:'دهون زائدة'},
  {id:'spoiled',    label:'فاسد',        mode:'flow',    sub:'فاسد'},
  {id:'melted',     label:'سايح',        mode:'flow',    sub:'سايح'},
  {id:'notfresh',   label:'غير طازج او فريش', mode:'flow',sub:'غير طازج غير فريش'},
  {id:'appliances', label:'أجهزة منزلية', mode:'instant', sub:'أجهزة منزلية'},
  {id:'hotfood',    label:'هوت فوود',    mode:'hotfood'},
  {id:'broken',     label:'مكسور/مدهوس/مفتوح', mode:'flow', sub:'مكسور/ مدهوس / مفتوح'},
  {id:'salty',      label:'ملح زائد',    mode:'flow',    sub:'ملح زائد',                  fishGate:true},
  {id:'expired',    label:'منتهي الصلاحية', mode:'flow',  sub:'منتهي الصلاحية'},
  {id:'wrongBagging', label:'تكييس خطأ',  mode:'flow',    sub:'تكييس خطأ'}
];
function pqTicket(c){
  if(c.mode==='hotfood') return 'Complaint–HotFood - Product Quality';
  return `Complaint – Product Quality – ${c.sub}`;
}
function replacementOrderLine(){ return 'عمل طلب جديد بنفس الكمية في الطلب الاساسي.'; }

function buildPQ(){
  state.type = 'pq';
  resetStatePart('pq');
  clear(questionsEl); resetRequired(); show(qaCard,true);

  renderColdNoteTopForPQ(true);

  const wrap = document.createElement('div');
  wrap.className='case-grid';
  PQ_CASES.forEach(c=>{
    const d=document.createElement('div');
    d.className='case';
    d.textContent = c.label;
    d.onclick=()=>selectPQCase(c, d);
    wrap.appendChild(d);
  });
  questionsEl.appendChild(wrap);
  renderMiniSummary();
}

function selectPQCase(c, node){
  document.querySelectorAll('.case').forEach(x=>x.classList.remove('active'));
  node.classList.add('active');
  const old = document.querySelector('.q-after-grid'); if(old) old.remove();
  resetRequired();
  ensureColdNote();
  wipe(state.pq, ['client','pay','product','withClient','rr']);
  state.pq.caseId    = c.id;
  state.pq.caseLabel = c.label;
  renderMiniSummary();

  const holder = document.createElement('div');
  holder.className='q-after-grid';
  questionsEl.appendChild(holder);

  if(c.mode==='instant'){ addResult(pqTicket(c)); return; }
  if(c.mode==='hotfood'){ addResult(pqTicket(c)); return; }

  const qClient = radioQuestion({
    title:'نوع العميل :',
    name:'pqClient',
    options:[ {value:'branch',label:'عميل فرع'}, {value:'delivery',label:'عميل ديليفري'} ]
  });
  holder.appendChild(qClient);

  qClient.querySelectorAll('input[name="pqClient"]').forEach(r=>{
    r.onchange=()=>{
      pruneNextSiblings(qClient,'q-block'); resetRequired();
      wipe(state.pq,['pay','product','withClient','rr']);
      state.pq.client = (r.value==='branch')?'عميل فرع':'عميل ديليفري';
      renderMiniSummary();

      if(r.value==='branch'){ addResult(pqTicket(c)); return; }

      const qPay = radioQuestion({
        title:'هل طريقة الدفع',
        name:'pqPay',
        options:[ {value:'prepaid',label:'دفع مسبق "Online Payment "'}, {value:'cash',label:'كاش - فيزا'} ]
      });
      holder.appendChild(qPay);

      qPay.querySelectorAll('input[name="pqPay"]').forEach(pp=>{
        pp.onchange=()=>{
          pruneNextSiblings(qPay,'q-block'); resetRequired();
          wipe(state.pq,['product','withClient','rr']);
          state.pq.pay = (pp.value==='prepaid')?'دفع مسبق "Online Payment"':'كاش - فيزا';
          renderMiniSummary();

          if(pp.value==='prepaid'){ addResult(pqTicket(c)); return; }

          if(c.fishGate){
            const qKind = radioQuestion({
              title:'هل المنتج:',
              name:'pqKind',
              options:[ {value:'fish',label:'سمك'}, {value:'other',label:'أي منتج آخر'} ]
            });
            holder.appendChild(qKind);

            qKind.querySelectorAll('input[name="pqKind"]').forEach(k=>{
              k.onchange=()=>{
                pruneNextSiblings(qKind,'q-block'); resetRequired();
                wipe(state.pq,['withClient','rr']);
                state.pq.product = (k.value==='fish')?'سمك':'أي منتج آخر';
                renderMiniSummary();

                if(k.value==='fish'){ addResult(pqTicket(c)); }
                else { withClientReturnReplacePQ(c, holder); }
              };
            });
          }else{
            withClientReturnReplacePQ(c, holder);
          }
        };
      });
    };
  });
}

function withClientReturnReplacePQ(caseObj, mount){
  const qWith = radioQuestion({
    title:'هل المنتج متواجد مع العميل؟',
    name:'pqWith',
    options:[ {value:'no',label:'لا'}, {value:'yes',label:'نعم'} ]
  });
  mount.appendChild(qWith);

  qWith.querySelectorAll('input[name="pqWith"]').forEach(w=>{
    w.onchange=()=>{
      pruneNextSiblings(qWith,'q-block'); resetRequired();
      wipe(state.pq,['rr']);
      state.pq.withClient = (w.value==='yes')?'نعم':'لا';
      renderMiniSummary();

      if(w.value==='no'){ addResult(pqTicket(caseObj)); return; }

      const qRR = radioQuestion({
        title:'هل العميل يؤيد أسترجاع ام استبدال؟',
        name:'pqRR',
        options:[ {value:'return',label:'أسترجاع'}, {value:'replace',label:'أستبدال'} ]
      });
      mount.appendChild(qRR);

      qRR.querySelectorAll('input[name="pqRR"]').forEach(rr=>{
        rr.onchange=()=>{
          pruneNextSiblings(qRR,'q-block'); resetRequired();
          state.pq.rr = rr.value==='return'?'أسترجاع':'أستبدال';
          renderMiniSummary();

          if(rr.value==='return'){
            addResult(pqTicket(caseObj));
          }else{
            addResult(replacementOrderLine());
            addResult('ترحيل موعد التوصيل فترة واحدة.');
            addResult('إضافة تعليق "خاص بشكوى".');
            addResult(`عمل تيكت شكوي  بالتصنيف ويتم أضافة PDF بالشكوي
${pqTicket(caseObj)}`);
          }
        };
      });
    };
  });
}

/* =========================
   عناصر مفقودة (Missing Items)
   ========================= */
function buildMissing() {
  state.type = "missing";
  resetStatePart("mi");
  clear(questionsEl);
  resetRequired();
  show(qaCard, true);

  renderColdNoteTopForPQ(false);

  const q1 = radioQuestion({
    title: "نوع العميل :",
    name: "miClient",
    options: [
      { value: "branch", label: "عميل فرع" },
      { value: "delivery", label: "عميل ديليفري" },
    ],
  });
  questionsEl.appendChild(q1);

  q1.querySelectorAll('input[name="miClient"]').forEach((r) => {
    r.onchange = () => {
      pruneNextSiblings(q1, "q-block");
      resetRequired();
      wipe(state.mi, ["pay", "fish", "inv", "abd", "source"]);
      state.mi.client = r.value === "branch" ? "عميل فرع" : "عميل ديليفري";
      renderMiniSummary();

      if (r.value === "branch") {
        addResult("يتم عمل شكوى Complaint - Missing Item - Retail فقط.");
        return;
      }

      const qInv = radioQuestion({
        title: "هل المنتج متحاسب عليه في الفاتورة؟",
        name: "miInv",
        options: [
          { value: "yes", label: "نعم" },
          { value: "no", label: "لا" },
        ],
      });
      questionsEl.appendChild(qInv);

      qInv.querySelectorAll('input[name="miInv"]').forEach((inv) => {
        inv.onchange = () => {
          pruneNextSiblings(qInv, "q-block");
          resetRequired();
          wipe(state.mi, ["pay", "fish", "abd", "source"]);
          state.mi.inv = inv.value === "yes" ? "نعم" : "لا";
          renderMiniSummary();

          if (inv.value === "yes") buildMissingInvYes();
          else buildMissingInvNo();
        };
      });
    };
  });

  renderMiniSummary();

  function buildMissingInvYes() {
    const qPay = radioQuestion({
      title: "هل طريقة الدفع",
      name: "miPayYes",
      options: [
        { value: "prepaid", label: 'دفع مسبق "Online Payment"' },
        { value: "cash", label: "كاش - فيزا" },
      ],
    });
    questionsEl.appendChild(qPay);

    qPay.querySelectorAll('input[name="miPayYes"]').forEach((pp) => {
      pp.onchange = () => {
        pruneNextSiblings(qPay, "q-block");
        resetRequired();
        wipe(state.mi, ["fish", "abd", "source"]);
        state.mi.pay = pp.value === "prepaid" ? 'دفع مسبق "Online Payment"' : "كاش - فيزا";
        renderMiniSummary();

        if (pp.value === "prepaid") {
          const qFishPre = radioQuestion({
            title: "هل المنتج سمك؟",
            name: "miFishYesPre",
            options: [
              { value: "yes", label: "نعم" },
              { value: "no", label: "لا" },
            ],
          });
          questionsEl.appendChild(qFishPre);

          qFishPre.querySelectorAll('input[name="miFishYesPre"]').forEach((ff) => {
            ff.onchange = () => {
              pruneNextSiblings(qFishPre, "q-block");
              resetRequired();
              state.mi.fish = ff.value === "yes" ? "سمك" : "ليس سمك";
              renderMiniSummary();

              if (ff.value === "yes") {
                addResult("شكوى Delivery – Complaint - Missing Item فقط.");
                addResult("يتم عمل (تولى مستولية - Own the Case)");
              } else {
                buildSameProductQuestion();
              }
            };
          });
        } else {
          const qFishCash = radioQuestion({
            title: "هل المنتج سمك؟",
            name: "miFishYesCash",
            options: [
              { value: "yes", label: "نعم" },
              { value: "no", label: "لا" },
            ],
          });
          questionsEl.appendChild(qFishCash);

          qFishCash.querySelectorAll('input[name="miFishYesCash"]').forEach((ff) => {
            ff.onchange = () => {
              pruneNextSiblings(qFishCash, "q-block");
              resetRequired();
              state.mi.fish = ff.value === "yes" ? "سمك" : "ليس سمك";
              renderMiniSummary();

              if (ff.value === "yes") {
                addResult("شكوى Delivery – Complaint - Missing Item فقط.");
                addResult("يتم عمل (تولى مستولية - Own the Case)");
              } else {
                addResult("طلب جديد بالمفقود.");
                addResult("ترحيل فترة واحدة.");
                addResult("تعليق 'خاص بشكوى'.");
                addResult("تيكت: Complaint Missing Item - Delivery + PDF.");
              }
            };
          });
        }
      };
    });
  }

  function buildMissingInvNo() {
    const qFish = radioQuestion({
      title: "هل المنتج سمك؟",
      name: "miFishNo",
      options: [
        { value: "yes", label: "نعم" },
        { value: "no", label: "لا" },
      ],
    });
    questionsEl.appendChild(qFish);

    qFish.querySelectorAll('input[name="miFishNo"]').forEach((ff) => {
      ff.onchange = () => {
        pruneNextSiblings(qFish, "q-block");
        resetRequired();
        state.mi.fish = ff.value === "yes" ? "سمك" : "ليس سمك";
        renderMiniSummary();

        if (ff.value === "yes") {
          addResult("شكوى Delivery – Complaint - Missing Item فقط.");
          addResult("يتم عمل (تولى مستولية - Own the Case)");
        } else {
          buildInvNoRest();
        }
      };
    });
  }

  function buildInvNoRest() {
    const qPay2 = radioQuestion({
      title: "هل طريقة الدفع",
      name: "miPayNo",
      options: [
        { value: "prepaid", label: 'دفع مسبق "Online Payment"' },
        { value: "cash", label: "كاش - فيزا" },
      ],
    });
    questionsEl.appendChild(qPay2);

    qPay2.querySelectorAll('input[name="miPayNo"]').forEach((pp2) => {
      pp2.onchange = () => {
        pruneNextSiblings(qPay2, "q-block");
        resetRequired();
        wipe(state.mi, ["abd", "source"]);
        state.mi.pay = pp2.value === "prepaid" ? 'دفع مسبق "Online Payment"' : "كاش - فيزا";
        renderMiniSummary();

        if (pp2.value === "prepaid") {
          const qABD1 = radioQuestion({
            title: "مراجعة الماجينتو وتيكت الأدمن داش بورد:",
            name: "miABD1",
            options: [
              { value: "deleted", label: "تم الحذف من خلال قسم الأدمن داش بورد" },
              { value: "notordered", label: "لم يكن المنتج مطلوب في الطلب الأصلي" },
            ],
          });
          questionsEl.appendChild(qABD1);

          qABD1.querySelectorAll('input[name="miABD1"]').forEach((ab) => {
            ab.onchange = () => {
              pruneNextSiblings(qABD1, "q-block");
              resetRequired();
              state.mi.abd = ab.value === "deleted" ? "تم الحذف من الأدمن" : "لم يكن مطلوبًا";
              renderMiniSummary();

              if (ab.value === "deleted") {
                addResult("يتم عرض طلب جديد ببديل مناسب (New Order).");
                addResult("وإذا رُفِض أو لا يوجد بديل: Follow Up Order.");
              } else {
                addResult("يتم التوضيح للعميل أن المنتج غير مطلوب بالطلب من الأساس (من التطبيق).");
                addResult("يتم عرض طلب جديد بالمنتج الذي يريده (New Order).");
                addResult("وإذا رُفِض أو لا يوجد بديل: Follow Up Order.");
              }
            };
          });
        } else {
          const qSrc = radioQuestion({
            title: "الطلب من:",
            name: "miSrc",
            options: [
              { value: "app", label: "Application" },
              { value: "ota", label: "OTA" },
            ],
          });
          questionsEl.appendChild(qSrc);

          qSrc.querySelectorAll('input[name="miSrc"]').forEach((ss) => {
            ss.onchange = () => {
              pruneNextSiblings(qSrc, "q-block");
              resetRequired();
              wipe(state.mi, ["abd"]);
              state.mi.source = ss.value === "app" ? "Application" : "OTA";
              renderMiniSummary();

              const qABD2 = radioQuestion({
                title: "مراجعة الماجينتو وتيكت الأدمن داش بورد:",
                name: "miABD2",
                options: [
                  { value: "deleted", label: "تم الحذف من خلال قسم الأدمن داش بورد" },
                  { value: "notordered", label: "لم يكن المنتج مطلوب في الطلب الأصلي" },
                ],
              });
              questionsEl.appendChild(qABD2);

              qABD2.querySelectorAll('input[name="miABD2"]').forEach((ab2) => {
                ab2.onchange = () => {
                  pruneNextSiblings(qABD2, "q-block");
                  resetRequired();
                  state.mi.abd = ab2.value === "deleted" ? "تم الحذف من الأدمن" : "لم يكن مطلوبًا";
                  renderMiniSummary();

                  if (ss.value === "ota") {
                    if (ab2.value === "deleted") {
                      addResult("عرض طلب جديد ببديل مناسب (New Order). وإذا رُفِض أو لا يوجد بديل: Follow Up Order.");
                    } else {
                      addResult("طلب جديد بالمفقود.");
                      addResult("ترحيل فترة واحدة.");
                      addResult("تعليق 'خاص بشكوى'.");
                      addResult("تيكت: Complaint Missing Item - CC + PDF.");
                    }
                  } else {
                    if (ab2.value === "deleted") {
                      addResult("يتم عرض طلب جديد ببديل مناسب (New Order).");
                      addResult("وإذا رُفِض أو لا يوجد بديل: Follow Up Order.");
                    } else {
                      addResult("يتم التوضيح للعميل أن المنتج غير مطلوب بالطلب من الأساس (من التطبيق).");
                      addResult("يتم عرض طلب جديد بالمنتج الذي يريده (New Order).");
                      addResult("وإذا رُفِض أو لا يوجد بديل: Follow Up Order.");
                    }
                  }
                };
              });
            };
          });
        }
      };
    });
  }

  function buildSameProductQuestion() {
    const qSame = radioQuestion({
      title: "هل العميل يريد نفس المنتج اللي في الطلب الاساسي أم منتج آخر؟",
      name: "miSameProd",
      options: [
        { value: "same", label: "نفس المنتج في الطلب الأساسي" },
        { value: "other", label: "منتج آخر" },
      ],
    });
    questionsEl.appendChild(qSame);

    qSame.querySelectorAll('input[name="miSameProd"]').forEach((sp) => {
      sp.onchange = () => {
        pruneNextSiblings(qSame, "q-block");
        resetRequired();

        if (sp.value === "same") {
          addResult("طلب جديد بالمفقود.");
          addResult("لو نفس المنتج يتم اختيار نفس الوزن او الكميه بظبط في الكومنت");
          addResult("ترحيل فترة واحدة.");
          addResult("تعليق 'خاص بشكوى'.");
          addResult("تيكت: Complaint Missing Item - Delivery + PDF.");
        } else {
          addResult("شكوى Delivery – Complaint - Missing Item فقط.");
        }
      };
    });
  }
}

/* =========================
   خطأ فردي (WT)
   ========================= */
function buildWT(){
  state.type='wt';
  resetStatePart('wt');
  clear(questionsEl); resetRequired(); show(qaCard,true);

  renderColdNoteTopForPQ(true);

  const step = radioQuestion({
    title:'اختر الحالة:',
    name:'wtScenario',
    options:[
      {value:'less',   label:'الحالة الأولى (وصول منتج بكميات اقل من المطلوب)'},
      {value:'comment',label:'الحالة الثانية (عدم الالتزام بكومنت في الطلب)'},
    ]
  });
  questionsEl.appendChild(step);

  step.querySelectorAll('input[name="wtScenario"]').forEach(r=>{
    r.onchange=()=>{
      pruneNextSiblings(step,'q-block'); resetRequired();
      wipe(state.wt,['client','pay','kind','invoiced','abd','rr']);
      state.wt.scenario = (r.value==='less')?'الحالة الأولى (وصول منتج بكميات اقل من المطلوب)':'الحالة الثانية (عدم الالتزام بكومنت في الطلب)';
      renderMiniSummary();

      if(r.value==='less'){
        const qClient = radioQuestion({
          title:'نوع العميل :',
          name:'wtClient',
          options:[ {value:'branch',label:'عميل فرع'}, {value:'delivery',label:'عميل ديليفري'} ]
        });
        questionsEl.appendChild(qClient);

        qClient.querySelectorAll('input[name="wtClient"]').forEach(c=>{
          c.onchange=()=>{
            pruneNextSiblings(qClient,'q-block'); resetRequired();
            wipe(state.wt,['pay','kind','invoiced','abd','rr']);
            state.wt.client = (c.value==='branch')?'عميل فرع':'عميل ديليفري'; renderMiniSummary();

            if(c.value==='branch'){ addResult('Complaint Wrong Transaction – chef – less quantity يتم عمل شكوي'); return; }

            const qPay = radioQuestion({
              title:'هل طريقة الدفع',
              name:'wtPay',
              options:[ {value:'prepaid',label:'دفع مسبق "Online Payment "'}, {value:'cash',label:'كاش - فيزا'} ]
            });
            questionsEl.appendChild(qPay);

            qPay.querySelectorAll('input[name="wtPay"]').forEach(pp=>{
              pp.onchange=()=>{
                pruneNextSiblings(qPay,'q-block'); resetRequired();
                wipe(state.wt,['kind','invoiced','abd','rr']);
                state.wt.pay = (pp.value==='prepaid')?'دفع مسبق "Online Payment"':'كاش - فيزا'; renderMiniSummary();

                if(pp.value==='prepaid'){
                  const qKindP = radioQuestion({
                    title:'هل المنتج',
                    name:'wtKindP',
                    options:[
                      {value:'fish', label:'سمك'},
                      {value:'meat', label:'لحوم – جبن  بالوزن - دواجن'},
                      {value:'other',label:'منتجات أخري'}
                    ]
                  });
                  questionsEl.appendChild(qKindP);

                  qKindP.querySelectorAll('input[name="wtKindP"]').forEach(k=>{
                    k.onchange=()=>{
                      pruneNextSiblings(qKindP,'q-block'); resetRequired();
                      wipe(state.wt,['invoiced','abd','rr']);
                      state.wt.kind = (k.value==='fish')?'سمك':(k.value==='meat'?'لحوم – جبن  بالوزن - دواجن':'منتجات أخرى'); renderMiniSummary();

                      if(k.value==='fish'){
                        const qInvFish = radioQuestion({
                          title:'هل تم المحاسبة في الفاتورة على الكمية كاملة؟',
                          name:'wtInvFishP',
                          options:[ {value:'yes',label:'نعم'}, {value:'no',label:'لا'} ]
                        });
                        questionsEl.appendChild(qInvFish);
                        qInvFish.querySelectorAll('input[name="wtInvFishP"]').forEach(inv=>{
                          inv.onchange=()=>{
                            pruneNextSiblings(qInvFish,'q-block'); resetRequired();
                            state.wt.invoiced = inv.value==='yes'?'نعم':'لا'; renderMiniSummary();
                            addResult('Complaint Wrong Transaction – chef – less quantity يتم عمل شكوي');
                          };
                        });
                      }else if(k.value==='meat'){
                        addResult('Complaint Wrong Transaction – chef – less quantity يتم عمل شكوي');
                      }else{
                        addResult('Complaint Wrong Transaction – Picker –Less Quantity يتم عمل شكوي');
                      }
                    };
                  });
                  return;
                }

                // باقي WT كما هو (من عندك)
                addResult('Complaint Wrong Transaction – Picker –Less Quantity');
              };
            });
          };
        });
        return;
      }

      // الحالة الثانية (عدم الالتزام بكومنت)
      addResult('Complaint Wrong Transaction – Chef – عدم الالتزام بكومنت');
    };
  });
}

/* =========================
   إنهاء الشكوى + Reset
   ========================= */
function clearComplaintInputs(){
  const el = document.getElementById('otherNotes');
  if(el){ el.value=''; el.classList.remove('invalid'); }
  if(otaEl){ otaEl.value=''; otaEl.classList.remove('invalid'); }
}

function clearTicketInputs(){
  [
    tsMobileEl, tsStoreEl, tsOrderEl, tsTxnEl, tsSubCategoryEl, tsItemEl,
    tsCustomerTypeEl, tsOrderCreatedEl, tsReturnPolicyEl, tsWithCustomerEl,
    tsSubjectEl, tsDescEl
  ].forEach(el=>{
    if(!el) return;
    el.value = '';
    el.classList.remove('invalid');
    el.dataset.userEdited = '0';
  });
}

function resetAll(){
  state.type=null;
  resetStatePart('pq'); resetStatePart('mi'); resetStatePart('wt');
  clear(questionsEl); resetRequired();

  document.querySelectorAll('input[name="ctype"]').forEach(r=>{ r.checked = false; });
  document.querySelectorAll('.case.active').forEach(x=>x.classList.remove('active'));

  if(qaCard) show(qaCard,false);
  const summaryCard = document.getElementById('summaryCard');
  if(summaryCard) show(summaryCard,false);

  const bar = document.querySelector('#qaProgress .bar');
  if(bar) bar.style.width='0%';

  renderColdNoteTopForPQ(false);

  clearComplaintInputs();
  clearTicketInputs();

  renderMiniSummary();
}

/* التحكم العام في اختيار نوع الشكوى */
document.querySelectorAll('input[name="ctype"]').forEach(input=>{
  input.addEventListener('change', (e)=>{
    clear(questionsEl); resetRequired();
    resetStatePart('pq'); resetStatePart('mi'); resetStatePart('wt');

    const v = e.target.value;
    if(v==='pq')      buildPQ();
    else if(v==='missing') buildMissing();
    else if(v==='wt') buildWT();
  });
});

/* =========================
   أزرار الخلاصة
   ========================= */
function updateCopyState(){ if(!btnCopy) return; btnCopy.disabled = false; }

btnEnd && btnEnd.addEventListener('click', ()=>{
  if(confirm('هل أنت متأكد أنك تريد إنهاء الشكوى؟')) resetAll();
});

btnCopy && btnCopy.addEventListener('click', async()=>{
  if(!FIELDS.otaName()){
    showToast('برجاء كتابة اسم المنتج حتى يتم النسخ', 'error');
    return;
  }
  try{
    const text = buildCopyText();
    await copyToClipboard(text);
    showToast('تم نسخ الخلاصة بنجاح ✅', 'success');
  }catch{
    showToast('تعذّر نسخ الخلاصة.', 'error');
  }
});

btnCreate && btnCreate.addEventListener('click', async()=>{
  updateTicketPreview();

  const m = markInvalidFields();
  if(m.missing.length){
    showToast(`برجاء استكمال البيانات التالية: ${m.missing.join(' - ')}`, 'error');
    return;
  }

  const payload = {
    mobile: FIELDS.tsMobile(),
    store: FIELDS.tsStore(),
    orderNumber: FIELDS.tsOrder(),
    transactionNumber: FIELDS.tsTxn(),
    category: FIELDS.tsCategory(), // ثابت
    subCategory: FIELDS.tsSubCategory(),
    item: FIELDS.tsItem(),
    customerType: FIELDS.tsCustomerType(),
    orderCreated: FIELDS.tsOrderCreated(),
    returnPolicy: FIELDS.tsReturnPolicy(),
    withCustomer: FIELDS.tsWithCustomer(),
    subject: FIELDS.tsSubject(), // ✅ hidden لكن بيتبعت
    description: FIELDS.tsDescription() || buildTicketDescription(),
    otaProductName: FIELDS.otaName(),
    otherNotes: FIELDS.otherNotes(),
    complaintType: state.type,
    requiredActions: getRequiredResults(),
    ts: Date.now()
  };

  try{ localStorage.setItem(TICKET_PAYLOAD_KEY, JSON.stringify(payload)); }catch{}

  try{
    await copyToClipboard(payload.description);
    showToast('تم تجهيز الشكوى ونسخ Description ✅', 'success');
  }catch{
    showToast('تم تجهيز الشكوى لكن تعذّر النسخ. انسخ يدويًا من خانة Description.', 'error');
  }
});

btnSave && btnSave.addEventListener('click', ()=>{
  if(!confirm('هل تريد حفظ المسودة كمسودة؟')) return;
  saveCurrentDraft();
});

/* ============ UI Enhancements: Progress + Theme ============ */
(function(){
  const root = document.body;

  document.querySelectorAll('.swatch[data-swatch]').forEach(s=>{
    const savedBrand = localStorage.getItem('brand');
    if (savedBrand) root.setAttribute('data-brand', savedBrand);
    s.addEventListener('click', ()=>{
      const v = s.getAttribute('data-swatch');
      root.setAttribute('data-brand', v === 'green' ? '' : v);
      if (v === 'green') localStorage.removeItem('brand');
      else localStorage.setItem('brand', v);
    });
  });

  const card = document.getElementById('qaCard');
  function ensureProgressEl(){
    if (!card) return null;
    let p = card.querySelector('#qaProgress');
    if (!p){
      const frag = document.createElement('div');
      frag.className = 'thin-progress';
      frag.id = 'qaProgress';
      frag.innerHTML = '<div class="bar"></div>';
      card.prepend(frag); p = frag;
    }
    return p;
  }
  function computeProgress(){
    if (!card) return;
    const p = ensureProgressEl(); if (!p) return;
    const blocks = Array.from(card.querySelectorAll('.q-block'));
    if (!blocks.length){ p.querySelector('.bar').style.width = '0%'; return; }
    let answered = 0;
    blocks.forEach(b=>{
      const anyChecked = b.querySelector('input[type="radio"]:checked, input[type="checkbox"]:checked, select option:checked');
      const anyFilled  = Array.from(b.querySelectorAll('input[type="text"], textarea')).some(el => el.value && el.value.trim());
      if (anyChecked || anyFilled) answered++;
    });
    const percent = Math.round((answered / blocks.length) * 100);
    p.querySelector('.bar').style.width = percent + '%';
  }
  if (card){
    ensureProgressEl();
    card.addEventListener('change', computeProgress);
    card.addEventListener('input', computeProgress);
    setTimeout(computeProgress, 300);
  }
})();

/* =========================
   Drafts: حفظ/عرض/بحث/حذف
   ========================= */
function readDrafts(){ try{ return JSON.parse(localStorage.getItem(DRAFTS_KEY) || '[]'); } catch{ return []; } }
function writeDrafts(list){ try{ localStorage.setItem(DRAFTS_KEY, JSON.stringify(list)); }catch{} }
function formatTS(ts){
  try{ return new Date(ts).toLocaleString('en-GB', { dateStyle:'short', timeStyle:'short' }); }
  catch{ return ts; }
}
function currentResultsArray(){
  return [...(requiredEl?.querySelectorAll('.result')||[])].map(el=>el.textContent.trim()).filter(Boolean);
}
function saveCurrentDraft(){
  const data = {
    id: 'DR_'+Date.now(),
    ts: Date.now(),
    customer: '',
    fields: {
      otaName: FIELDS.otaName(),
      otherNotes: FIELDS.otherNotes(),
    },
    type: state.type,
    state: JSON.parse(JSON.stringify(state)),
    required: currentResultsArray(),
    brand: document.body.getAttribute('data-brand') || ''
  };
  const list = readDrafts(); list.push(data); writeDrafts(list);
  renderDrafts(); showToast('تم حفظ المسودة ✅', 'success');
}
function openDraftInNewTab(id){
  try{
    const url = new URL(window.location.href);
    url.searchParams.set('draft', id);
    window.open(url.toString(), '_blank');
  }catch{}
}
function deleteDraft(id){
  if(!confirm('هل تريد حذف هذه المسودة؟')) return;
  writeDrafts(readDrafts().filter(d=>d.id!==id));
  renderDrafts(draftsSearch?.value?.trim()||'');
}
function renderDrafts(filter=''){
  if(!draftsListEl) return;
  const list = readDrafts().sort((a,b)=>b.ts - a.ts).filter(d=> !filter || (d.customer||'').includes(filter));
  draftsListEl.innerHTML = '';
  if(!list.length){
    const li = document.createElement('div');
    li.className='draft-empty';
    li.textContent='لا توجد مسودات بعد.';
    draftsListEl.appendChild(li);
    return;
  }
  list.forEach(d=>{
    const li = document.createElement('li');
    li.className='draft-item';
    li.innerHTML = `
      <div class="draft-top">
        <a class="draft-link" href="javascript:void(0)">${esc(d.customer || 'بدون رقم')}</a>
        <span class="draft-meta">${formatTS(d.ts)}</span>
      </div>
      <div class="draft-actions">
        <button class="draft-del">حذف</button>
      </div>`;
    li.querySelector('.draft-link').addEventListener('click', ()=>openDraftInNewTab(d.id));
    li.querySelector('.draft-del').addEventListener('click', ()=>deleteDraft(d.id));
    draftsListEl.appendChild(li);
  });
}
draftsToggle && draftsToggle.addEventListener('click', ()=> draftsSidebar?.classList.toggle('collapsed'));
draftsSearch && draftsSearch.addEventListener('input', ()=> renderDrafts(draftsSearch.value.trim()));

/* تحميل مسودة من ?draft= */
function loadDraftByIdFromURL(){
  try{
    const id = new URLSearchParams(window.location.search).get('draft'); if(!id) return;
    const d = readDrafts().find(x=>x.id===id);
    if(!d){ showToast('لم يتم العثور على هذه المسودة.', 'error'); return; }

    resetAll();
    const notesEl = document.getElementById('otherNotes');
    if(notesEl) notesEl.value = d.fields?.otherNotes ?? '';
    if(otaEl) otaEl.value = d.fields?.otaName ?? '';

    state.type = (d.type==='delay') ? null : (d.type || null);
    if(d.state){
      state.pq = d.state.pq || state.pq;
      state.mi = d.state.mi || state.mi;
      state.wt = d.state.wt || state.wt;
    }

    resetRequired();
    (d.required||[]).forEach(txt=> addResult(txt));
    renderMiniSummary();
    showToast('تم فتح المسودة — يمكنك المتابعة أو التعديل.', 'success');
  }catch{}
}

/* ===== تحديث الخلاصة مباشرة + Ticket live updates ===== */
(function hookLiveInputs(){
  const notesEl = document.getElementById('otherNotes');
  if(notesEl){
    const handler = ()=>{ renderMiniSummary(); };
    notesEl.addEventListener('input', handler);
    notesEl.addEventListener('change', handler);
  }
  if(otaEl){
    const handler = ()=>{ markInvalidEl(otaEl, !FIELDS.otaName()); renderMiniSummary(); };
    otaEl.addEventListener('input', handler);
    otaEl.addEventListener('change', handler);
    updateCopyState();
  }

  // Ticket fields live update + user edited flags
  const ticketEls = [
    tsMobileEl, tsStoreEl, tsOrderEl, tsTxnEl,
    tsSubCategoryEl, tsItemEl, tsCustomerTypeEl,
    tsOrderCreatedEl, tsReturnPolicyEl, tsWithCustomerEl,
    tsSubjectEl, tsDescEl
  ].filter(Boolean);

  ticketEls.forEach(el=>{
    const onEdit = ()=>{
      if(AUTO_UPDATING) return; // ✅ مهم
      el.dataset.userEdited = '1';
      updateTicketPreview();
      if(el.value && el.value.trim()) el.classList.remove('invalid');
    };
    el.addEventListener('input', onEdit);
    el.addEventListener('change', onEdit);
  });
})();

/* تهيئة */
renderDrafts();
loadDraftByIdFromURL();
updateTicketPreview();
