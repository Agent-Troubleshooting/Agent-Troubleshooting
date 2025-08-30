/* =========================
   عناصر أساسية من الصفحة
   ========================= */
const qaCard        = document.getElementById('qaCard');         // صندوق الأسئلة
const questionsEl   = document.getElementById('questions');      // الحاوية التي نحقن فيها الأسئلة
const requiredEl    = document.getElementById('summary');        // المربع الأصفر (المطلوب)
const miniSummaryEl = document.getElementById('miniSummary');    // المربع الأزرق (الخلاصة)

/* بيانات العميل لعرضها في الخلاصة */
const FIELDS = {
  custNumber:   () => document.getElementById('custNumber')?.value?.trim() || '',
  orderNumber:  () => document.getElementById('orderNumber')?.value?.trim() || '',
  orderCreated: () => document.getElementById('orderCreated')?.value?.trim() || '',
  receiptNumber:() => document.getElementById('receiptNumber')?.value?.trim() || '',
  productName:  () => document.getElementById('productName')?.value?.trim() || '',
};

/* =========================
   أدوات مساعدة
   ========================= */
function show(el, on) { if(!el) return; el.style.display = on ? '' : 'none'; }
function clear(el) { if(!el) return; el.innerHTML = ''; }
function esc(s=''){ return s.replace(/[&<>"']/g, m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m])); }

/* أضف بند في "المطلوب" */
function addResult(text) {
  show(qaCard, true);
  show(document.getElementById('summaryCard'), true);
  const d = document.createElement('div');
  d.className = 'result';
  d.textContent = text;
  requiredEl.appendChild(d);
  renderMiniSummary();
}

/* امسح "المطلوب" الأصفر بالكامل */
function resetRequired() {
  clear(requiredEl);
  renderMiniSummary();
}

/* امسح الأسئلة التي تلي عقدة معينة */
function pruneNextSiblings(node, className) {
  let n = node?.nextElementSibling;
  while (n) {
    const nxt = n.nextElementSibling;
    if (!className || n.classList?.contains(className)) n.remove();
    n = nxt;
  }
}

/* صانع سؤال راديو عام */
function radioQuestion({title, name, options}) {
  const wrap = document.createElement('div');
  wrap.className = 'q-block';
  wrap.innerHTML = `
    <div class="q-title">${title}</div>
    <div class="inline-options">
      ${options.map(o=>(
        `<label><input type="radio" name="${name}" value="${o.value}"> ${o.label}</label>`
      )).join('')}
    </div>
  `;
  return wrap;
}

/* دالة تصنيف PQ */
function pqClass(sub){ return `Complaint – Product Quality – ${sub}`; }

/* النص الخاص بالاستبدال (حسب الحالة) */
function replaceTextFor(caseId){
  // حالات لازم "بنفس الكمية في الطلب الاساسي"
  const SAME = new Set(['mold','spoiled','hyg','expired']);
  if(SAME.has(caseId)) return 'عمل طلب جديد بنفس الكمية في الطلب الاساسي.';
  // باقي الحالات "بباقي الكمية"
  return 'عمل طلب جديد بباقي الكمية.';
}

/* =========================
   الحالة العامة (State)
   ========================= */
const state = {
  type: null,   // 'pq' | 'missing' | 'wt'
  // جودة منتج
  pq: {
    caseId: null,          // معرف الحالة
    caseLabel: null,       // نص الحالة
    client: null,          // branch | delivery
    pay: null,             // prepaid | cash
    product: null,         // fish | other | meat
    withClient: null,      // yes | no
    rr: null,              // return | replace
  },
  // عناصر مفقودة
  mi: {
    client:null, pay:null, fish:null, inv:null, abd:null
  },
  // خطأ فردي
  wt: {
    scenario: null,  // less | comment
    kind: null,      // fish | meat | other
    invoiced: null,  // yes | no
    abd: null,       // partial | nochange
    rr: null,        // return | replace
  }
};

function resetStatePart(key){
  if(key==='pq') state.pq = {caseId:null,caseLabel:null,client:null,pay:null,product:null,withClient:null,rr:null};
  if(key==='mi') state.mi = {client:null,pay:null,fish:null,inv:null,abd:null};
  if(key==='wt') state.wt = {scenario:null,kind:null,invoiced:null,abd:null,rr:null};
}

/* =========================
   بناء "الخلاصة" (الأزرق)
   ========================= */
function renderMiniSummary(){
  if(!miniSummaryEl) return;
  let html = '<div class="mini-title">الخلاصة</div>';

  // 1) بيانات الشكوى
  const data = [
    ['Customer Number', FIELDS.custNumber()],
    ['Order Number', FIELDS.orderNumber()],
    ['Order Created from FL', FIELDS.orderCreated()],
    ['Receipt Number', FIELDS.receiptNumber()],
    ['Product', FIELDS.productName()],
  ].filter(([k,v])=>!!v);
  if(data.length){
    html += '<div class="mini-section"><strong>بيانات الشكوى:</strong><ul>';
    data.forEach(([k,v])=> html += `<li>${k}: ${esc(v)}</li>`);
    html += '</ul></div>';
  }

  // 2) خطوات التتبع: نعرض فقط الاختيارات الحالية (من الـ state)
  const steps = [];
  if(state.type==='pq'){
    steps.push('نوع الشكوى: جودة منتج');
    if(state.pq.caseLabel) steps.push(`الحالة: ${state.pq.caseLabel}`);
    if(state.pq.client)     steps.push(`نوع العميل: ${state.pq.client==='branch'?'عميل فرع':'عميل ديليفري'}`);
    if(state.pq.pay)        steps.push(`طريقة الدفع: ${state.pq.pay==='prepaid'?'دفع مسبق "Online Payment"':'كاش - فيزا'}`);
    if(state.pq.product){
      const txt = state.pq.product==='fish'?'سمك':(state.pq.product==='meat'?'لحوم – جبن – فاكهة – خضار':'أي منتج آخر');
      steps.push(`نوع المنتج: ${txt}`);
    }
    if(state.pq.withClient) steps.push(`هل المنتج متواجد مع العميل؟ → ${state.pq.withClient==='yes'?'نعم':'لا'}`);
    if(state.pq.rr)         steps.push(`استرجاع أم استبدال؟ → ${state.pq.rr==='return'?'استرجاع':'استبدال'}`);
  }else if(state.type==='missing'){
    steps.push('نوع الشكوى: عناصر مفقودة');
    if(state.mi.client) steps.push(`نوع العميل: ${state.mi.client}`);
    if(state.mi.pay) steps.push(`طريقة الدفع: ${state.mi.pay}`);
    if(state.mi.fish) steps.push(`نوع المنتج: ${state.mi.fish}`);
    if(state.mi.inv) steps.push(`هل متحاسب في الفاتورة؟ → ${state.mi.inv}`);
    if(state.mi.abd) steps.push(`مراجعة الماجينتو/ABD → ${state.mi.abd}`);
  }else if(state.type==='wt'){
    steps.push('نوع الشكوى: خطأ فردي');
    if(state.wt.scenario) steps.push(`اختر الحالة: ${state.wt.scenario==='less'?'الحالة الأولى (كمية أقل)':'الحالة الثانية (عدم الالتزام بكومنت)'}`);
    if(state.wt.kind){
      const t = state.wt.kind==='fish'?'سمك':(state.wt.kind==='meat'?'لحوم – جبن – فاكهة – خضار':'منتجات أخرى');
      steps.push(`هل منتج: ${t}`);
    }
    if(state.wt.invoiced) steps.push(`هل تم المحاسبة كاملة؟ → ${state.wt.invoiced==='yes'?'نعم':'لا'}`);
    if(state.wt.abd) steps.push(`مراجعة الماجينتو/ABD → ${state.wt.abd==='partial'?'أُرسلت الكمية المتاحة':'لا يوجد تعديل من ABD'}`);
    if(state.wt.rr) steps.push(`استرجاع أم استبدال؟ → ${state.wt.rr==='return'?'استرجاع':'استبدال'}`);
  }

  if(steps.length){
    html += '<div class="mini-section"><strong>خطوات التتبّع:</strong><ul>';
    steps.forEach(s=> html += `<li>${esc(s)}</li>`);
    html += '</ul></div>';
  }

  // 3) المطلوب (اللي جوه الأصفر)
  const reqs = [...(requiredEl?.querySelectorAll('.result')||[])].map(el=>el.textContent.trim()).filter(Boolean);
  if(reqs.length){
    html += '<div class="mini-section"><strong>المطلوب:</strong><ul>';
    reqs.forEach(r=> html += `<li>${esc(r)}</li>`);
    html += '</ul></div>';
  }

  miniSummaryEl.innerHTML = html;
}

/* =========================
   جودة المنتج (Product Quality)
   ========================= */
const PQ_CASES = [
  {id:'appliances', label:'أجهزة منزلية',  type:'instant', sub:'أجهزة منزلية'},
  {id:'hotfood',    label:'هوت فوود',      type:'instant', sub:'HotFood - Product Quality'}, // حسب النص المطلوب
  {id:'taswiya',    label:'تسوية',         type:'taswiya', sub:'تسوية'},
  {id:'fat',        label:'دهون زائدة',    type:'flow',    sub:'دهون زائدة'},
  {id:'taste',      label:'رائحة و طعم و لون', type:'flow', sub:'رائحة و طعم و لون'},
  {id:'melted',     label:'سايح',          type:'flow',    sub:'سايح'},
  {id:'impurities', label:'شوائب بالمنتج',  type:'flow',    sub:'شوائب بالمنتج'},
  {id:'mold',       label:'عفن',           type:'flow',    sub:'عفن'},
  {id:'notfresh',   label:'غير طازج او فريش', type:'flow',  sub:'غير طازج غير فريش'},
  {id:'spoiled',    label:'فاسد',          type:'flow',    sub:'فاسد'},
  {id:'broken',     label:'مكسور/مدهوس/مفتوح', type:'flow', sub:'مكسور/ مدهوس / مفتوح'},
  {id:'salty',      label:'ملح زائد',       type:'flow',    sub:'ملح زائد'},
  {id:'expired',    label:'منتهي الصلاحية', type:'flow',    sub:'منتهي الصلاحية'},
  {id:'hyg',        label:'هايجين "نظافة عامة"', type:'flow', sub:'هايجين "نظافة عامة"'},
];

function buildPQ(){
  state.type = 'pq';
  resetStatePart('pq');
  clear(questionsEl); resetRequired();
  show(qaCard,true);

  // شبكة الحالات
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

/* اختيار حالة PQ */
function selectPQCase(c, node){
  document.querySelectorAll('.case').forEach(x=>x.classList.remove('active'));
  node.classList.add('active');
  // امسح كل الأسئلة اللاحقة والمطلوب
  const old = document.querySelector('.q-after-grid'); if(old) old.remove();
  resetRequired();

  state.pq.caseId    = c.id;
  state.pq.caseLabel = c.label;
  renderMiniSummary();

  // حاوية للأسئلة بعد الشبكة
  const holder = document.createElement('div');
  holder.className='q-after-grid';
  questionsEl.appendChild(holder);

  if(c.type==='instant'){
    // يعمل تيكت فورًا
    addResult(`يتم عمل تيكت شكوى بالتصنيف ${pqClass(c.sub)}`);
    return;
  }

  if(c.type==='taswiya'){
    // 1) نوع العميل
    const q = radioQuestion({
      title:'نوع العميل :',
      name:'pqClient',
      options:[
        {value:'branch',  label:'عميل فرع'},
        {value:'delivery',label:'عميل ديليفري'},
      ]
    });
    holder.appendChild(q);
    q.querySelectorAll('input[name="pqClient"]').forEach(r=>{
      r.onchange=()=>{
        pruneNextSiblings(q,'q-block'); resetRequired();
        state.pq.client = r.value;
        renderMiniSummary();
        if(r.value==='branch'){
          addResult(`يتم عمل تيكت شكوى بالتصنيف ${pqClass(c.sub)}`);
        }else{
          // طريقة الدفع
          const q2 = radioQuestion({
            title:'هل طريقة الدفع',
            name:'pqPay',
            options:[
              {value:'prepaid',label:'دفع مسبق "Online Payment"'},
              {value:'cash',   label:'كاش - فيزا'},
            ]
          });
          holder.appendChild(q2);
          q2.querySelectorAll('input[name="pqPay"]').forEach(rr=>{
            rr.onchange=()=>{
              pruneNextSiblings(q2,'q-block'); resetRequired();
              state.pq.pay = rr.value; renderMiniSummary();
              if(rr.value==='prepaid'){
                addResult(`يتم عمل تيكت شكوى بالتصنيف ${pqClass(c.sub)}`);
              }else{
                // سمك/أي منتج آخر
                const q3 = radioQuestion({
                  title:'هل المنتج:',
                  name:'pqProd',
                  options:[
                    {value:'fish', label:'سمك'},
                    {value:'other',label:'أي منتج آخر'},
                  ]
                });
                holder.appendChild(q3);
                q3.querySelectorAll('input[name="pqProd"]').forEach(p=>{
                  p.onchange=()=>{
                    pruneNextSiblings(q3,'q-block'); resetRequired();
                    state.pq.product = p.value; renderMiniSummary();
                    if(p.value==='fish'){
                      addResult(`يتم عمل تيكت شكوى بالتصنيف ${pqClass(c.sub)}`);
                    }else{
                      withClientFlowPQ(c, holder); // باقي السيناريو العام
                    }
                  };
                });
              }
            };
          });
        }
      };
    });
    return;
  }

  if(c.type==='flow'){
    // الأسئلة العامة
    const q = radioQuestion({
      title:'نوع العميل :',
      name:'pqClient',
      options:[
        {value:'branch',  label:'عميل فرع'},
        {value:'delivery',label:'عميل ديليفري'},
      ]
    });
    holder.appendChild(q);
    q.querySelectorAll('input[name="pqClient"]').forEach(r=>{
      r.onchange=()=>{
        pruneNextSiblings(q,'q-block'); resetRequired();
        state.pq.client = r.value; renderMiniSummary();
        if(r.value==='branch'){
          addResult(`يتم عمل تيكت شكوى بالتصنيف ${pqClass(c.sub)}`);
        }else{
          const q2 = radioQuestion({
            title:'هل طريقة الدفع',
            name:'pqPay',
            options:[
              {value:'prepaid',label:'دفع مسبق "Online Payment"'},
              {value:'cash',   label:'كاش - فيزا'},
            ]
          });
          holder.appendChild(q2);
          q2.querySelectorAll('input[name="pqPay"]').forEach(rr=>{
            rr.onchange=()=>{
              pruneNextSiblings(q2,'q-block'); resetRequired();
              state.pq.pay = rr.value; renderMiniSummary();
              if(rr.value==='prepaid'){
                addResult(`يتم عمل تيكت شكوى بالتصنيف ${pqClass(c.sub)}`);
              }else{
                withClientFlowPQ(c, holder, /*forceReplaceText*/true);
              }
            };
          });
        }
      };
    });
  }
}

/* سيناريو المنتج مع العميل → استرجاع/استبدال */
function withClientFlowPQ(caseObj, mount, forceReplace=false){
  // سؤال تواجد المنتج
  const q = radioQuestion({
    title:'هل المنتج متواجد مع العميل؟',
    name:'pqWith',
    options:[
      {value:'no', label:'لا'},
      {value:'yes',label:'نعم'},
    ]
  });
  mount.appendChild(q);
  q.querySelectorAll('input[name="pqWith"]').forEach(r=>{
    r.onchange=()=>{
      pruneNextSiblings(q,'q-block'); resetRequired();
      state.pq.withClient = r.value; renderMiniSummary();
      if(r.value==='no'){
        addResult(`يتم عمل تيكت شكوى بالتصنيف ${pqClass(caseObj.sub)}`);
      }else{
        // استرجاع/استبدال
        const q2 = radioQuestion({
          title:'هل العميل يؤيد أسترجاع ام استبدال؟',
          name:'pqRR',
          options:[
            {value:'return', label:'استرجاع'},
            {value:'replace',label:'استبدال'},
          ]
        });
        mount.appendChild(q2);
        q2.querySelectorAll('input[name="pqRR"]').forEach(rr=>{
          rr.onchange=()=>{
            pruneNextSiblings(q2,'q-block'); resetRequired();
            state.pq.rr = rr.value; renderMiniSummary();

            if(rr.value==='return'){
              addResult(`يتم عمل تيكت شكوى بالتصنيف ${pqClass(caseObj.sub)}`);
            }else{
              // استبدال
              addResult(replaceTextFor(caseObj.id));
              addResult('ترحيل موعد التوصيل فترة واحدة.');
              addResult('إضافة تعليق "خاص بشكوى".');
              addResult(`يتم عمل تيكت شكوى بالتصنيف ${pqClass(caseObj.sub)} ويتم إضافة PDF بالشكوى.`);
            }
          };
        });
      }
    };
  });
}

/* =========================
   عناصر مفقودة
   ========================= */
function buildMissing(){
  state.type='missing';
  resetStatePart('mi');
  clear(questionsEl); resetRequired(); show(qaCard,true);

  // Q1: نوع العميل
  const q1 = radioQuestion({
    title:'نوع العميل :',
    name:'miClient',
    options:[
      {value:'branch',  label:'عميل فرع'},
      {value:'delivery',label:'عميل ديليفري'},
    ]
  });
  questionsEl.appendChild(q1);

  q1.querySelectorAll('input[name="miClient"]').forEach(r=>{
    r.onchange=()=>{
      pruneNextSiblings(q1,'q-block'); resetRequired();
      state.mi.client = r.value==='branch'?'عميل فرع':'عميل ديليفري'; renderMiniSummary();

      if(r.value==='branch'){
        addResult('يتم عمل شكوى Complaint Missing Item فقط.');
      }else{
        // طريقة الدفع
        const q2 = radioQuestion({
          title:'هل طريقة الدفع',
          name:'miPay',
          options:[
            {value:'prepaid',label:'دفع مسبق "Online Payment"'},
            {value:'cash',   label:'كاش - فيزا'},
          ]
        });
        questionsEl.appendChild(q2);

        q2.querySelectorAll('input[name="miPay"]').forEach(rr=>{
          rr.onchange=()=>{
            pruneNextSiblings(q2,'q-block'); resetRequired();
            state.mi.pay = rr.value==='prepaid'?'دفع مسبق':'كاش - فيزا'; renderMiniSummary();

            if(rr.value==='prepaid'){
              addResult('يتم عمل شكوى Complaint Missing Item فقط.');
            }else{
              // نوع المنتج
              const q3 = radioQuestion({
                title:'هل المنتج',
                name:'miProd',
                options:[
                  {value:'fish', label:'سمك'},
                  {value:'meat', label:'لحوم – جبن – فاكهة – خضار'},
                  {value:'other',label:'منتجات أخرى'},
                ]
              });
              questionsEl.appendChild(q3);
              q3.querySelectorAll('input[name="miProd"]').forEach(p=>{
                p.onchange=()=>{
                  pruneNextSiblings(q3,'q-block'); resetRequired();
                  state.mi.fish = p.value==='fish'?'سمك':'غير سمك';
                  renderMiniSummary();

                  // سؤال الفاتورة
                  const q4 = radioQuestion({
                    title:'هل المنتج متحاسب عليه في الفاتورة؟',
                    name:'miInv',
                    options:[
                      {value:'yes',label:'نعم'},
                      {value:'no', label:'لا'},
                    ]
                  });
                  questionsEl.appendChild(q4);
                  q4.querySelectorAll('input[name="miInv"]').forEach(inv=>{
                    inv.onchange=()=>{
                      pruneNextSiblings(q4,'q-block'); resetRequired();
                      state.mi.inv = inv.value==='yes'?'نعم':'لا'; renderMiniSummary();

                      if(inv.value==='yes'){
                        if(p.value==='fish'){
                          addResult('شكوى Complaint Missing Item فقط.');
                        }else{
                          addResult('طلب جديد بالمفقود.');
                          addResult('ترحيل فترة واحدة.');
                          addResult(`تعليق 'خاص بشكوى'.`);
                          addResult('تيكت: Complaint Missing Item + PDF.');
                        }
                      }else{
                        const q5 = radioQuestion({
                          title:'مراجعة الماجينتو وتيكت الأدمن داش بورد:',
                          name:'miABD',
                          options:[
                            {value:'deleted',    label:'تم الحذف من خلال قسم الأدمن داش بورد'},
                            {value:'notordered', label:'لم يكن المنتج مطلوب في الطلب الأصلي'},
                          ]
                        });
                        questionsEl.appendChild(q5);
                        q5.querySelectorAll('input[name="miABD"]').forEach(ab=>{
                          ab.onchange=()=>{
                            pruneNextSiblings(q5,'q-block'); resetRequired();
                            state.mi.abd = ab.value==='deleted'?'تم الحذف من الأدمن':'لم يكن مطلوبًا'; renderMiniSummary();

                            if(ab.value==='deleted'){
                              addResult('عرض طلب جديد ببديل مناسب (New Order).');
                              if(p.value==='fish') addResult('وإذا رُفِض أو لا يوجد بديل: Follow Up Order.');
                            }else{
                              if(p.value==='fish'){
                                addResult('Complaint - Missing Item يتم عمل شكوي فقط.');
                              }else{
                                addResult('طلب جديد بالمفقود.');
                                addResult('ترحيل فترة واحدة.');
                                addResult(`تعليق 'خاص بشكوى'.`);
                                addResult('تيكت: Complaint Missing Item + PDF.');
                              }
                            }
                          };
                        });
                      }
                    };
                  });
                };
              });
            }
          };
        });
      }
    };
  });

  renderMiniSummary();
}

/* =========================
   خطأ فردي (WT)
   ========================= */
function buildWT(){
  state.type='wt';
  resetStatePart('wt');
  clear(questionsEl); resetRequired(); show(qaCard,true);

  const step = radioQuestion({
    title:'اختر الحالة:',
    name:'wtScenario',
    options:[
      {value:'less',   label:'الحالة الأولى (وصول منتج بكميات أقل من المطلوب)'},
      {value:'comment',label:'الحالة الثانية (عدم الالتزام بكومنت في الطلب)'},
    ]
  });
  questionsEl.appendChild(step);

  step.querySelectorAll('input[name="wtScenario"]').forEach(r=>{
    r.onchange=()=>{
      pruneNextSiblings(step,'q-block'); resetRequired();
      state.wt.scenario = r.value; renderMiniSummary();

      if(r.value==='less'){
        /* ======= الحالة الأولى: نوع العميل → (لو ديليفري) طريقة الدفع → (لو كاش) هل منتج ======= */
        const qClient = radioQuestion({
          title:'نوع العميل :',
          name:'wtClient',
          options:[
            {value:'branch',  label:'عميل فرع'},
            {value:'delivery',label:'عميل ديليفري'},
          ]
        });
        questionsEl.appendChild(qClient);

        qClient.querySelectorAll('input[name="wtClient"]').forEach(c=>{
          c.onchange=()=>{
            pruneNextSiblings(qClient,'q-block'); resetRequired();
            if(c.value==='branch'){
              addResult('Complaint Wrong Transaction – chef – less quantity');
              return;
            }

            const qPay = radioQuestion({
              title:'هل طريقة الدفع',
              name:'wtPay',
              options:[
                {value:'prepaid',label:'دفع مسبق "Online Payment "'},
                {value:'cash',   label:'كاش - فيزا'},
              ]
            });
            questionsEl.appendChild(qPay);

            qPay.querySelectorAll('input[name="wtPay"]').forEach(pp=>{
              pp.onchange=()=>{
                pruneNextSiblings(qPay,'q-block'); resetRequired();

                if(pp.value==='prepaid'){
                  addResult('Complaint Wrong Transaction – chef – less quantity');
                }else{
                  const q1 = radioQuestion({
                    title:'هل منتج:',
                    name:'wtKind',
                    options:[
                      {value:'fish', label:'سمك'},
                      {value:'meat', label:'لحوم – جبن – فاكهة – خضار'},
                      {value:'other',label:'منتجات أخرى'},
                    ]
                  });
                  questionsEl.appendChild(q1);
                  q1.querySelectorAll('input[name="wtKind"]').forEach(k=>{
                    k.onchange=()=>{
                      pruneNextSiblings(q1,'q-block'); resetRequired();
                      state.wt.kind = k.value; renderMiniSummary();

                      if(k.value==='fish'){
                        addResult('Complaint Wrong Transaction – chef – less quantity');
                      }else{
                        const q2 = radioQuestion({
                          title:'هل تم المحاسبة في الفاتورة على الكمية كاملة؟',
                          name:'wtInv',
                          options:[
                            {value:'yes',label:'نعم'},
                            {value:'no', label:'لا'},
                          ]
                        });
                        questionsEl.appendChild(q2);
                        q2.querySelectorAll('input[name="wtInv"]').forEach(inv=>{
                          inv.onchange=()=>{
                            pruneNextSiblings(q2,'q-block'); resetRequired();
                            state.wt.invoiced = inv.value; renderMiniSummary();

                            if(inv.value==='yes'){
                              addResult('عمل طلب جديد بباقي الكمية.');
                              addResult('ترحيل موعد التوصيل فترة واحدة.');
                              addResult('إضافة تعليق "خاص بشكوى".');
                              addResult('Complaint Wrong Transaction – '+(k.value==='meat'?'Chef – عدم الالتزام بالوزنة':'Picker – Less Quantity'));
                              addResult('يتم إضافة PDF بالشكوى.');
                            }else{
                              const q3 = radioQuestion({
                                title:'اختر الحالة:',
                                name:'wtABD',
                                options:[
                                  {value:'partial',  label:'الحالة الأولى: (أُرسلت الكمية المتاحة)'},
                                  {value:'nochange', label:'الحالة الثانية: لا يوجد تعديل من ABD'},
                                ]
                              });
                              questionsEl.appendChild(q3);
                              q3.querySelectorAll('input[name="wtABD"]').forEach(a=>{
                                a.onchange=()=>{
                                  pruneNextSiblings(q3,'q-block'); resetRequired();
                                  state.wt.abd = a.value; renderMiniSummary();

                                  if(a.value==='partial'){
                                    addResult('عرض طلب جديد ببديل مناسب (New Order).');
                                  }else{
                                    addResult('عمل طلب جديد بباقي الكمية.');
                                    addResult('ترحيل موعد التوصيل فترة واحدة.');
                                    addResult('إضافة تعليق "خاص بشكوى".');
                                    addResult('Complaint Wrong Transaction – '+(k.value==='meat'?'Chef – عدم الالتزام بالوزن':'Picker – Less Quantity'));
                                    addResult('يتم إضافة PDF بالشكوى.');
                                  }
                                };
                              });
                            }
                          };
                        });
                      }
                    };
                  });
                }
              };
            });
          };
        });
        /* ===================== نهاية الحالة الأولى ===================== */
      }else{
        /* ======= الحالة الثانية: نوع العميل → (لو ديليفري) طريقة الدفع → (لو كاش) هل منتج ======= */
        const qClient2 = radioQuestion({
          title:'نوع العميل :',
          name:'wtCClient',
          options:[
            {value:'branch',  label:'عميل فرع'},
            {value:'delivery',label:'عميل ديليفري'},
          ]
        });
        questionsEl.appendChild(qClient2);

        qClient2.querySelectorAll('input[name="wtCClient"]').forEach(c=>{
          c.onchange=()=>{
            pruneNextSiblings(qClient2,'q-block'); resetRequired();

            if(c.value==='branch'){
              // عميل فرع → شكوى مباشرة
              addResult('Complaint Wrong Transaction – chef – عدم الالتزام بكومنت');
              return;
            }

            // ديليفري → اسأل عن الدفع
            const qPay2 = radioQuestion({
              title:'هل طريقة الدفع',
              name:'wtCPay',
              options:[
                {value:'prepaid',label:'دفع مسبق "Online Payment "'},
                {value:'cash',   label:'كاش - فيزا'},
              ]
            });
            questionsEl.appendChild(qPay2);

            qPay2.querySelectorAll('input[name="wtCPay"]').forEach(pp=>{
              pp.onchange=()=>{
                pruneNextSiblings(qPay2,'q-block'); resetRequired();

                if(pp.value==='prepaid'){
                  // دفع مسبق → شكوى مباشرة
                  addResult('Complaint Wrong Transaction – chef – عدم الالتزام بكومنت');
                }else{
                  // كاش/فيزا → تابع بالسؤال الموجود أصلاً: هل منتج؟
                  const q1 = radioQuestion({
                    title:'هل منتج:',
                    name:'wtCKind',
                    options:[
                      {value:'fish', label:'سمك'},
                      {value:'meat', label:'لحوم – جبن – فاكهة – خضار'},
                      {value:'other',label:'منتجات أخرى'},
                    ]
                  });
                  questionsEl.appendChild(q1);
                  q1.querySelectorAll('input[name="wtCKind"]').forEach(k=>{
                    k.onchange=()=>{
                      pruneNextSiblings(q1,'q-block'); resetRequired();
                      state.wt.kind = k.value; renderMiniSummary();

                      if(k.value==='fish'){
                        addResult('Complaint Wrong Transaction – chef – عدم الالتزام بكومنت');
                      }else{
                        const q2 = radioQuestion({
                          title:'هل تريد استرجاع أم استبدال المنتج؟',
                          name:'wtCRR',
                          options:[
                            {value:'return', label:'أسترجاع فقط'},
                            {value:'replace',label:'أستبدال'},
                          ]
                        });
                        questionsEl.appendChild(q2);
                        q2.querySelectorAll('input[name="wtCRR"]').forEach(rr=>{
                          rr.onchange=()=>{
                            pruneNextSiblings(q2,'q-block'); resetRequired();
                            state.wt.rr = rr.value; renderMiniSummary();

                            const who = (k.value==='meat')?'Chef':'Picker';
                            if(rr.value==='return'){
                              addResult(`Complaint Wrong Transaction – ${who} – عدم الالتزام بكومنت`);
                            }else{
                              addResult('عمل طلب جديد بباقي الكمية.');
                              addResult('ترحيل موعد التوصيل فترة واحدة.');
                              addResult('إضافة تعليق "خاص بشكوى".');
                              addResult(`Complaint Wrong Transaction – ${who} – عدم الالتزام بكومنت`);
                              addResult('يتم إضافة PDF بالشكوى.');
                            }
                          };
                        });
                      }
                    };
                  });
                }
              };
            });
          };
        });
        /* ===================== نهاية الحالة الثانية ===================== */
      }
    };
  });

  renderMiniSummary();
}

/* =========================
   التحكم العام في اختيار نوع الشكوى
   ========================= */
function resetAll(){
  state.type=null;
  resetStatePart('pq'); resetStatePart('mi'); resetStatePart('wt');
  clear(questionsEl); resetRequired();
  if(qaCard) show(qaCard,false);
  renderMiniSummary();
}

document.querySelectorAll('input[name="ctype"]').forEach(r=>{
  r.addEventListener('change', ()=>{
    clear(questionsEl); resetRequired();
    resetStatePart('pq'); resetStatePart('mi'); resetStatePart('wt');

    const v = r.value;
    if(v==='pq')      buildPQ();
    else if(v==='missing') buildMissing();
    else if(v==='wt') buildWT();
  });
});

/* أزرار مساعدة إن وُجدت */
document.getElementById('endBtn')?.addEventListener('click', resetAll);
document.getElementById('copyMiniBtn')?.addEventListener('click', async()=>{
  try{
    const t = miniSummaryEl?.innerText?.trim() || '';
    await navigator.clipboard.writeText(t);
  }catch(e){}
});

/* عند الكتابة في بيانات العميل → حدّث الخلاصة */
['custNumber','orderNumber','orderCreated','receiptNumber','productName'].forEach(id=>{
  const el = document.getElementById(id);
  if(!el) return;
  el.addEventListener('input', renderMiniSummary);
});
/* ============ UI Enhancements: Progress + Theme ============ */
(function(){
  const root = document.body;

  /* ---------- Theme: light/dark toggle ---------- */
  const toggleBtn = document.getElementById('toggleTheme');
  if (toggleBtn){
    // استرجع الإعداد السابق
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) root.setAttribute('data-theme', savedTheme);

    toggleBtn.addEventListener('click', ()=>{
      const cur = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      if (cur === 'light') root.removeAttribute('data-theme');
      else root.setAttribute('data-theme','dark');
      localStorage.setItem('theme', root.getAttribute('data-theme') || 'light');
    });
  }

  /* ---------- Brand swatches ---------- */
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

  /* ---------- QA Progress (auto) ---------- */
  const qaCard = document.getElementById('qaCard');

  function ensureProgressEl(){
    if (!qaCard) return null;
    let p = qaCard.querySelector('#qaProgress');
    if (!p){
      const frag = document.createElement('div');
      frag.className = 'thin-progress';
      frag.id = 'qaProgress';
      frag.innerHTML = '<div class="bar"></div>';
      qaCard.prepend(frag);
      p = frag;
    }
    return p;
  }

  function computeProgress(){
    if (!qaCard) return;
    const p = ensureProgressEl();
    if (!p) return;

    // كل مجموعة أسئلة مرسومة في .q-block
    const blocks = Array.from(qaCard.querySelectorAll('.q-block'));
    if (!blocks.length){
      p.querySelector('.bar').style.width = '0%';
      return;
    }

    let answered = 0;
    blocks.forEach(b=>{
      const anyChecked = b.querySelector('input:checked, select option:checked, textarea[value]:not([value=""])');
      if (anyChecked) answered++;
    });

    const percent = Math.round((answered / blocks.length) * 100);
    p.querySelector('.bar').style.width = percent + '%';
  }

  if (qaCard){
    ensureProgressEl();
    // حدّث التقدم على أي تغيير داخل الأسئلة
    qaCard.addEventListener('change', computeProgress);
    qaCard.addEventListener('input', computeProgress);
    // أول مرة
    setTimeout(computeProgress, 300);
  }
})();