// عناصر أساسية
const qaCard=document.getElementById('qaCard');
const sumCard=document.getElementById('sumCard');
const questionsEl=document.getElementById('questions');
const summaryEl=document.getElementById('summary');
const miniSummaryEl=document.getElementById('miniSummary');

// الحالة العامة
let currentType=null; // pq | missing | wt

// أدوات عرض/مسح
function show(el,on){el.style.display=on?'':'none'}
function clear(el){el.innerHTML=''}

// لائحة خطوات التتبّع القديمة (لـ PQ/WT فقط)
const logSteps=[];
function logStep(t){ logSteps.push(t); renderMiniSummary(); }

// إضافة سطر في كارت "المطلوب" + تحديث الخلاصة المصغّرة
function addResult(t){
  const d=document.createElement('div');
  d.className='result';
  d.innerHTML=t;                 // نص صريح بدون شارات
  summaryEl.appendChild(d);
  renderMiniSummary();           // خلي الخلاصة المصغّرة تتضمن "المطلوب" أيضًا
}

// (كانت ترجع شارة — الآن نص فقط)
function tag(t){ return t; }

// ======== حالة مُفهرسة لمسار "عناصر مفقودة" ========
const miSel = { client:null, pay:null, fish:null, inv:null, abd:null };
function setMi(key, value){ miSel[key]=value; renderMiniSummary(); }
function clearMi(keys){ keys.forEach(k=>miSel[k]=null); renderMiniSummary(); }

// توليد الخلاصة المصغّرة: بيانات + خطوات + المطلوب
function renderMiniSummary(){
  if(!miniSummaryEl) return;

  const esc=s=>s.replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));

  // 1) بيانات الشكوى
  const data=[
    ['Customer Number', document.getElementById('custNumber').value],
    ['Order Number', document.getElementById('orderNumber').value],
    ['Order Created from FL', document.getElementById('orderCreated').value],
    ['Receipt Number', document.getElementById('receiptNumber').value],
    ['Product', document.getElementById('productName').value],
  ];

  // 2) المطلوب الحالي من الكارت
  const required=[...summaryEl.querySelectorAll('.result')]
    .map(el=>el.textContent.trim())
    .filter(Boolean);

  let html = '<div class="mini-title">الخلاصة</div>';

  html += '<div class="mini-section"><strong>بيانات الشكوى:</strong><ul>';
  data.forEach(([k,v])=>{ if(v && v.trim()) html += `<li>${k}: ${esc(v.trim())}</li>`; });
  html += '</ul></div>';

  // 3) خطوات التتبّع
  if(currentType==='missing'){
    // ترتيب ثابت للأسئلة في عناصر مفقودة — يظهر الاختيار الحالي فقط
    const steps=[];
    if(miSel.client) steps.push(`نوع العميل: ${miSel.client}`);
    if(miSel.pay)    steps.push(`طريقة الدفع: ${miSel.pay}`);
    if(miSel.fish)   steps.push(`هل المنتج سمك؟ → ${miSel.fish}`);
    if(miSel.inv)    steps.push(`هل متحاسب في الفاتورة؟ → ${miSel.inv}`);
    if(miSel.abd)    steps.push(`مراجعة الماجينتو/ABD → ${miSel.abd}`);

    if(steps.length){
      html += '<div class="mini-section"><strong>خطوات التتبّع:</strong><ul>';
      steps.forEach(s=>{ html += `<li>${esc(s)}</li>`; });
      html += '</ul></div>';
    }
  }else if(logSteps.length){
    html += '<div class="mini-section"><strong>خطوات التتبّع:</strong><ul>';
    logSteps.forEach(s=>{ html += `<li>${esc(s)}</li>`; });
    html += '</ul></div>';
  }

  if(required.length){
    html += '<div class="mini-section"><strong>المطلوب:</strong><ul>';
    required.forEach(r=>{ html += `<li>${esc(r)}</li>`; });
    html += '</ul></div>';
  }

  miniSummaryEl.innerHTML = html;
}

// نصّ الخلاصة المصغّرة للنسخ
function miniSummaryText(){ return miniSummaryEl.innerText.trim(); }

// حدّث الخلاصة المصغّرة عند كتابة أي بيانات
['custNumber','orderNumber','orderCreated','receiptNumber','productName']
  .forEach(id=>document.getElementById(id).addEventListener('input',renderMiniSummary));

// ================= Product Quality =================
const PQ_CASES=[
  {id:'appliances',label:'أجهزة منزلية',mode:'ticket',sub:'أجهزة منزلية'},
  {id:'hotfood',label:'هوت فوود',mode:'ticket',sub:'HotFood'},
  {id:'taswiya',label:'تسوية',mode:'taswiya'},
  {id:'fat',label:'دهون زائدة',mode:'withClient',sub:'دهون زائدة'},
  {id:'taste',label:'رائحة و طعم و لون',mode:'withClient',sub:'رائحة و طعم و لون'},
  {id:'melted',label:'سايح',mode:'withClient',sub:'سايح'},
  {id:'impurities',label:'شوائب بالمنتج',mode:'withClient',sub:'شوائب بالمنتج'},
  {id:'mold',label:'عفن',mode:'withClient',sub:'عفن'},
  {id:'notfresh',label:'غير طازج او فريش',mode:'withClient',sub:'غير طازج غير فريش'},
  {id:'spoiled',label:'فاسد',mode:'withClient',sub:'فاسد'},
  {id:'broken',label:'مكسور/مدهوس/مفتوح',mode:'withClient',sub:'مكسور/ مدهوس / مفتوح'},
  {id:'salty',label:'ملح زائد',mode:'withClient',sub:'ملح زائد'},
  {id:'expired',label:'منتهي الصلاحية',mode:'withClient',sub:'منتهي الصلاحية'},
  {id:'hyg',label:'هايجين "نظافة عامة"',mode:'withClient',sub:'هايجين "نظافة عامة"'}
];

function classificationPQ(s){ return `Complaint – Product Quality – ${s}`; }

function buildPQ(){
  currentType='pq';
  clear(questionsEl); clear(summaryEl); show(qaCard,true); show(sumCard,true);
  logSteps.length=0; logStep('نوع الشكوى: جودة منتج');
  const wrap=document.createElement('div'); wrap.className='case-grid';
  PQ_CASES.forEach(c=>{
    const d=document.createElement('div'); d.className='case';
    d.innerHTML=`<strong>${c.label}</strong>`;
    d.onclick=()=>selectPQ(c,d);
    wrap.appendChild(d);
  });
  questionsEl.appendChild(wrap);
}

function selectPQ(c,node){
  document.querySelectorAll('.case').forEach(x=>x.classList.remove('active'));
  node.classList.add('active');
  const old=document.querySelector('.q-after-grid'); if(old) old.remove();
  clear(summaryEl);
  const holder=document.createElement('div'); holder.className='q-after-grid';

  logStep(`اخترت حالة جودة المنتج: ${c.label}`);

  if(c.mode==='ticket'){
    addResult(`يتم عمل تيكت شكوى بالتصنيف ${classificationPQ(c.sub)}`);
    return;
  }

  if(c.mode==='taswiya'){
    holder.innerHTML=`<div class="q-block"><div class="q-title">هل المنتج:</div>
      <div class="inline-options">
        <label><input type="radio" name="tasType" value="fish"> سمك</label>
        <label><input type="radio" name="tasType" value="other"> أي منتج آخر</label>
      </div></div>`;
    holder.querySelectorAll('input[name="tasType"]').forEach(r=>{
      r.onchange=()=>{
        const chosen=r.closest('label').textContent.trim();
        logStep(`هل المنتج: ${chosen}`);
        clear(summaryEl);
        if(r.value==='fish'){
          addResult(`يتم عمل تيكت شكوى بالتصنيف ${classificationPQ('تسوية')}`);
        }else{
          withClientFlow('تسوية',holder);
        }
      };
    });
  }else if(c.mode==='withClient'){
    withClientFlow(c.sub,holder);
  }
  questionsEl.appendChild(holder);
}

function withClientFlow(sub,mount){
  if(!mount){ mount=document.createElement('div'); mount.className='q-after-grid'; questionsEl.appendChild(mount); }
  mount.innerHTML=`<div class="q-block"><div class="q-title">هل المنتج متواجد مع العميل؟</div>
    <div class="inline-options">
      <label><input type="radio" name="withClient" value="no"> لا</label>
      <label><input type="radio" name="withClient" value="yes"> نعم</label>
    </div></div>`;
  mount.querySelectorAll('input[name="withClient"]').forEach(r=>{
    r.onchange=()=>{
      clear(summaryEl);
      const chosen=r.closest('label').textContent.trim();
      logStep(`هل المنتج متواجد مع العميل؟ → ${chosen}`);
      if(r.value==='no'){
        addResult(`يتم عمل تيكت شكوى بالتصنيف ${classificationPQ(sub)}`);
      }else{
        const x=document.createElement('div'); x.className='q-block';
        x.innerHTML=`<div class="q-title">هل العميل يؤيد أسترجاع ام استبدال؟</div>
          <div class="inline-options">
            <label><input type="radio" name="rr" value="return"> أسترجاع</label>
            <label><input type="radio" name="rr" value="replace"> أستبدال</label>
          </div>`;
        mount.appendChild(x);
        x.querySelectorAll('input[name="rr"]').forEach(rr=>{
          rr.onchange=()=>{
            clear(summaryEl);
            const pick=rr.closest('label').textContent.trim();
            logStep(`هل العميل يؤيد أسترجاع ام استبدال؟ → ${pick}`);
            if(rr.value==='return'){
              addResult(`يتم عمل تيكت شكوى بالتصنيف ${classificationPQ(sub)}`);
            }else{
              addResult('عمل طلب جديد بباقي الكمية.');
              addResult('ترحيل موعد التوصيل فترة واحدة.');
              addResult('إضافة تعليق "خاص بشكوى".');
              addResult(`عمل تيكت شكوى بالتصنيف ${classificationPQ(sub)} ويتم إضافة <strong>PDF</strong> بالشكوى.`);
            }
          };
        });
      }
      renderMiniSummary();
    };
  });
}

// ================= Wrong Transaction =================
function buildWT(){
  currentType='wt';
  clear(questionsEl); clear(summaryEl); show(qaCard,true); show(sumCard,true);
  logSteps.length=0; logStep('نوع الشكوى: خطأ فردي');

  const step=document.createElement('div'); step.className='q-block';
  step.innerHTML=`<div class="q-title">اختر الحالة:</div>
    <div class="inline-options">
      <label><input type="radio" name="wts" value="less"> الحالة الأولى (وصول منتج بكميات أقل من المطلوب)</label>
      <label><input type="radio" name="wts" value="comment"> الحالة الثانية (عدم الالتزام بكومنت في الطلب)</label>
    </div>`;
  questionsEl.appendChild(step);

  step.querySelectorAll('input[name="wts"]').forEach(r=>{
    r.onchange=()=>{
      document.querySelectorAll('.wt-next').forEach(n=>n.remove());
      clear(summaryEl);
      logStep(`اختر الحالة: ${r.closest('label').textContent.trim()}`);
      if(r.value==='less') wtLessQuantity(); else wtComment();
      renderMiniSummary();
    };
  });
}

function resultActionsReplace(){
  addResult('عمل طلب جديد بباقي الكمية.');
  addResult('ترحيل موعد التوصيل فترة واحدة.');
  addResult('إضافة تعليق "خاص بشكوى".');
}

function wtLessQuantity(){
  const div=document.createElement('div'); div.className='q-block wt-next';
  div.innerHTML=`<div class="q-title">هل منتج:</div>
    <div class="inline-options">
      <label><input type="radio" name="lsType" value="fish"> سمك</label>
      <label><input type="radio" name="lsType" value="meat"> لحوم – جبن – فاكهة – خضار</label>
      <label><input type="radio" name="lsType" value="other"> منتجات أخرى</label>
    </div>`;
  questionsEl.appendChild(div);

  div.querySelectorAll('input[name="lsType"]').forEach(r=>{
    r.onchange=()=>{
      document.querySelectorAll('.wt-next2').forEach(n=>n.remove());
      clear(summaryEl);
      logStep(`هل منتج: ${r.closest('label').textContent.trim()}`);

      if(r.value==='fish'){
        addResult(tag('Complaint Wrong Transaction – chef – less quantity'));
      }else if(r.value==='meat'){
        wtInvoiceBranch('Chef – عدم الالتزام بالوزنة',false);
      }else{
        wtInvoiceBranch('Picker – Less Quantity',true);
      }
      renderMiniSummary();
    };
  });
}

function wtInvoiceBranch(tail,isPicker){
  const d=document.createElement('div'); d.className='q-block wt-next2';
  d.innerHTML=`<div class="q-title">هل تم المحاسبة في الفاتورة على الكمية كاملة؟</div>
    <div class="inline-options">
      <label><input type="radio" name="invFull" value="yes"> نعم</label>
      <label><input type="radio" name="invFull" value="no"> لا</label>
    </div>`;
  questionsEl.appendChild(d);

  d.querySelectorAll('input[name="invFull"]').forEach(r=>{
    r.onchange=()=>{
      document.querySelectorAll('.wt-next3').forEach(n=>n.remove());
      clear(summaryEl);
      logStep(`هل تم المحاسبة على الكمية كاملة؟ → ${r.closest('label').textContent.trim()}`);

      if(r.value==='yes'){
        resultActionsReplace();
        addResult(tag('Complaint Wrong Transaction – '+tail));
        addResult('يتم إضافة PDF بالشكوى.');
      }else{
        const k=document.createElement('div'); k.className='q-block wt-next3';
        k.innerHTML=`<div class="q-title">اختر الحالة:</div>
          <div class="inline-options">
            <label><input type="radio" name="abd" value="partial"> الحالة الأولى: مراجعة الماجينتو وتيكت الأدمن داش بورد (أُرسلت الكمية المتاحة)</label>
            <label><input type="radio" name="abd" value="nochange"> الحالة الثانية: لا يوجد أي تعديل على المنتج والكمية من خلال الـ ABD</label>
          </div>`;
        questionsEl.appendChild(k);

        k.querySelectorAll('input[name="abd"]').forEach(rr=>{
          rr.onchange=()=>{
            clear(summaryEl);
            logStep(`مراجعة الماجينتو/ABD → ${rr.closest('label').textContent.trim()}`);
            if(rr.value==='partial'){
              addResult('عرض طلب جديد ببديل مناسب (New Order).');
            }else{
              resultActionsReplace();
              addResult(tag('Complaint Wrong Transaction – '+(isPicker?'Picker – Less Quantity':'Chef – عدم الالتزام بالوزن')));
              addResult('يتم إضافة PDF بالشكوى.');
            }
            renderMiniSummary();
          };
        });
      }
      renderMiniSummary();
    };
  });
}

function wtComment(){
  const d=document.createElement('div'); d.className='q-block wt-next';
  d.innerHTML=`<div class="q-title">هل منتج:</div>
    <div class="inline-options">
      <label><input type="radio" name="cmType" value="fish"> سمك</label>
      <label><input type="radio" name="cmType" value="meat"> لحوم – جبن – فاكهة – خضار</label>
      <label><input type="radio" name="cmType" value="other"> منتجات أخرى</label>
    </div>`;
  questionsEl.appendChild(d);

  d.querySelectorAll('input[name="cmType"]').forEach(r=>{
    r.onchange=()=>{
      document.querySelectorAll('.wt-next2').forEach(n=>n.remove());
      clear(summaryEl);
      logStep(`هل منتج: ${r.closest('label').textContent.trim()}`);

      if(r.value==='fish'){
        addResult(tag('Complaint Wrong Transaction – chef – عدم الالتزام بكومنت'));
      }else if(r.value==='meat'){
        const x=document.createElement('div'); x.className='q-block wt-next2';
        x.innerHTML=`<div class="q-title">هل تريد استرجاع أم استبدال المنتج؟</div>
          <div class="inline-options">
            <label><input type="radio" name="cmRR" value="return"> أسترجاع فقط</label>
            <label><input type="radio" name="cmRR" value="replace"> أستبدال</label>
          </div>`;
        questionsEl.appendChild(x);

        x.querySelectorAll('input[name="cmRR"]').forEach(rr=>{
          rr.onchange=()=>{
            clear(summaryEl);
            logStep(`استرجاع أم استبدال؟ → ${rr.closest('label').textContent.trim()}`);
            if(rr.value==='return'){
              addResult(tag('Complaint Wrong Transaction – Chef – عدم الالتزام بكومنت'));
            }else{
              resultActionsReplace();
              addResult(tag('Complaint Wrong Transaction – Chef – عدم الالتزام بكومنت'));
              addResult('يتم إضافة PDF بالشكوى.');
            }
            renderMiniSummary();
          };
        });
      }else{
        const x=document.createElement('div'); x.className='q-block wt-next2';
        x.innerHTML=`<div class="q-title">هل تريد استرجاع أم استبدال المنتج؟</div>
          <div class="inline-options">
            <label><input type="radio" name="cmRR2" value="return"> أسترجاع فقط</label>
            <label><input type="radio" name="cmRR2" value="replace"> أستبدال</label>
          </div>`;
        questionsEl.appendChild(x);

        x.querySelectorAll('input[name="cmRR2"]').forEach(rr=>{
          rr.onchange=()=>{
            clear(summaryEl);
            logStep(`استرجاع أم استبدال؟ → ${rr.closest('label').textContent.trim()}`);
            if(rr.value==='return'){
              addResult(tag('Complaint Wrong Transaction – Picker – عدم الالتزام بكومنت'));
            }else{
              resultActionsReplace();
              addResult(tag('Complaint Wrong Transaction – Picker – عدم الالتزام بكومنت'));
              addResult('يتم إضافة PDF بالشكوى.');
            }
            renderMiniSummary();
          };
        });
      }
      renderMiniSummary();
    };
  });
}

// ================= Missing Items (بدون تكرار) =================
function buildMissing(){
  currentType='missing';
  clear(questionsEl); clear(summaryEl); show(qaCard,true); show(sumCard,true);
  // صفّر الحالة المُفهرسة
  miSel.client=miSel.pay=miSel.fish=miSel.inv=miSel.abd=null;
  renderMiniSummary();

  // Q1: نوع العميل
  const q1=document.createElement('div'); q1.className='q-block mi-next';
  q1.innerHTML=`<div class="q-title">نوع العميل :</div>
    <div class="inline-options">
      <label><input type="radio" name="miClient" value="branch"> عميل فرع</label>
      <label><input type="radio" name="miClient" value="delivery"> عميل ديليفري</label>
    </div>`;
  questionsEl.appendChild(q1);

  q1.querySelectorAll('input[name="miClient"]').forEach(r=>{
    r.onchange=()=>{
      pruneNextSiblings(q1);
      clear(summaryEl);
      setMi('client', r.closest('label').textContent.trim());
      if(r.value==='branch'){
        addResult('Complaint - Missing Item يتم عمل شكوي فقط.');
        clearMi(['pay','fish','inv','abd']);
      }else{
        miPayment(q1);
      }
    };
  });
}

// امسح فقط الكتل التالية (ما قبلها يفضل كما هو)
function pruneNextSiblings(node){
  let n=node.nextElementSibling;
  while(n){
    const nxt=n.nextElementSibling;
    if(n.classList && n.classList.contains('mi-next')) n.remove();
    n=nxt;
  }
}

function miPayment(prev){
  const q=document.createElement('div'); q.className='q-block mi-next';
  q.innerHTML=`<div class="q-title">هل طريقة الدفع</div>
    <div class="inline-options">
      <label><input type="radio" name="miPay" value="prepaid"> دفع مسبق "Online Payment"</label>
      <label><input type="radio" name="miPay" value="cash"> كاش - فيزا</label>
    </div>`;
  questionsEl.appendChild(q);

  q.querySelectorAll('input[name="miPay"]').forEach(r=>{
    r.onchange=()=>{
      pruneNextSiblings(q); clear(summaryEl);
      setMi('pay', r.closest('label').textContent.trim());
      if(r.value==='prepaid'){
        addResult('Complaint - Missing Item يتم عمل شكوي فقط.');
        clearMi(['fish','inv','abd']);
      }else{
        miFish(q);
      }
    };
  });
}

function miFish(prev){
  const q=document.createElement('div'); q.className='q-block mi-next';
  q.innerHTML=`<div class="q-title">هل المنتج سمك؟</div>
    <div class="inline-options">
      <label><input type="radio" name="miFish" value="yes"> نعم</label>
      <label><input type="radio" name="miFish" value="no"> لا</label>
    </div>`;
  questionsEl.appendChild(q);

  q.querySelectorAll('input[name="miFish"]').forEach(r=>{
    r.onchange=()=>{
      pruneNextSiblings(q); clear(summaryEl);
      setMi('fish', r.closest('label').textContent.trim());
      if(r.value==='yes') miInvoicedFish(q); else miInvoicedOther(q);
      clearMi(['inv','abd']);
    };
  });
}

function miInvoicedFish(prev){
  const q=document.createElement('div'); q.className='q-block mi-next';
  q.innerHTML=`<div class="q-title">هل المنتج متحاسب عليه في الفاتورة؟</div>
    <div class="inline-options">
      <label><input type="radio" name="miInvFish" value="yes"> نعم</label>
      <label><input type="radio" name="miInvFish" value="no"> لا</label>
    </div>`;
  questionsEl.appendChild(q);

  q.querySelectorAll('input[name="miInvFish"]').forEach(r=>{
    r.onchange=()=>{
      pruneNextSiblings(q); clear(summaryEl);
      setMi('inv', r.closest('label').textContent.trim());

      if(r.value==='yes'){
        addResult('شكوى Complaint Missing Item فقط.');
        clearMi(['abd']);
      }else{
        miABDForFish(q);
      }
    };
  });
}

function miABDForFish(prev){
  const q=document.createElement('div'); q.className='q-block mi-next';
  q.innerHTML=`<div class="q-title">مراجعة الماجينتو وتيكت الأدمن داش بورد:</div>
    <div class="inline-options">
      <label><input type="radio" name="miAbdFish" value="deleted"> تم الحذف من خلال قسم الأدمن داش بورد</label>
      <label><input type="radio" name="miAbdFish" value="notordered"> لم يكن المنتج مطلوب في الطلب الأصلي</label>
    </div>`;
  questionsEl.appendChild(q);

  q.querySelectorAll('input[name="miAbdFish"]').forEach(r=>{
    r.onchange=()=>{
      pruneNextSiblings(q); clear(summaryEl);
      setMi('abd', r.closest('label').textContent.trim());

      if(r.value==='deleted'){
        addResult('عرض طلب جديد ببديل مناسب (New Order).');
        addResult('وإذا رُفِض أو لا يوجد بديل: Follow Up Order.');
      }else{
        addResult('Complaint - Missing Item يتم عمل شكوي فقط.');
      }
    };
  });
}

function miInvoicedOther(prev){
  const q=document.createElement('div'); q.className='q-block mi-next';
  q.innerHTML=`<div class="q-title">هل المنتج متحاسب عليه في الفاتورة؟</div>
    <div class="inline-options">
      <label><input type="radio" name="miInvOther" value="yes"> نعم</label>
      <label><input type="radio" name="miInvOther" value="no"> لا</label>
    </div>`;
  questionsEl.appendChild(q);

  q.querySelectorAll('input[name="miInvOther"]').forEach(r=>{
    r.onchange=()=>{
      pruneNextSiblings(q); clear(summaryEl);
      setMi('inv', r.closest('label').textContent.trim());

      if(r.value==='yes'){
        addResult('طلب جديد بالمفقود.');
        addResult('ترحيل فترة واحدة.');
        addResult(`تعليق 'خاص بشكوى'.`);
        addResult('تيكت: Complaint Missing Item + PDF.');
        clearMi(['abd']);
      }else{
        miABDForOther(q);
      }
    };
  });
}

function miABDForOther(prev){
  const q=document.createElement('div'); q.className='q-block mi-next';
  q.innerHTML=`<div class="q-title">مراجعة الماجينتو وتيكت الأدمن داش بورد:</div>
    <div class="inline-options">
      <label><input type="radio" name="miAbdOther" value="deleted"> تم الحذف من خلال قسم الأدمن داش بورد</label>
      <label><input type="radio" name="miAbdOther" value="notordered"> لم يكن المنتج مطلوب في الطلب الأصلي</label>
    </div>`;
  questionsEl.appendChild(q);

  q.querySelectorAll('input[name="miAbdOther"]').forEach(r=>{
    r.onchange=()=>{
      pruneNextSiblings(q); clear(summaryEl);
      setMi('abd', r.closest('label').textContent.trim());

      if(r.value==='deleted'){
        addResult('عرض طلب جديد ببديل مناسب (New Order).');
      }else{
        addResult('طلب جديد بالمفقود.');
        addResult('ترحيل فترة واحدة.');
        addResult(`تعليق 'خاص بشكوى'.`);
        addResult('تيكت: Complaint Missing Item + PDF.');
      }
    };
  });
}

// ================= Controller =================
document.querySelectorAll('input[name="ctype"]').forEach(r=>{
  r.onchange=()=>{
    currentType=r.value;
    clear(questionsEl); clear(summaryEl); logSteps.length=0;
    // صفّر حالة عناصر مفقودة عند تركها أو الدخول لها
    miSel.client=miSel.pay=miSel.fish=miSel.inv=miSel.abd=null;
    renderMiniSummary();

    if(r.value==='pq') buildPQ();
    else if(r.value==='wt') buildWT();
    else if(r.value==='missing') buildMissing();

    show(qaCard,true); show(sumCard,true);
  };
});

// ================= أزرار النسخ/إنهاء =================
function resetAll(){
  currentType=null;
  clear(questionsEl); clear(summaryEl);
  show(qaCard,false); show(sumCard,false);
  document.querySelectorAll('input[name="ctype"]').forEach(i=>i.checked=false);
  ['custNumber','orderNumber','orderCreated','receiptNumber','productName']
    .forEach(id=>document.getElementById(id).value='');
  logSteps.length=0;
  miSel.client=miSel.pay=miSel.fish=miSel.inv=miSel.abd=null;
  renderMiniSummary();
}
document.getElementById('endBtn').onclick=resetAll;

document.getElementById('copyMiniBtn').onclick=async()=>{
  try{ await navigator.clipboard.writeText(miniSummaryText()); }catch(e){}
};