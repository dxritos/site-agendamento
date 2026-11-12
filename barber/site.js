/* Athos Barber — scripts compartilhados do site público */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const brl=v=>'R$ '+Number(v||0).toFixed(2).replace('.',',');
const brl0=v=>'R$ '+Math.round(v);
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
function esc(x){return String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
const maskPhone=v=>{let d=v.replace(/\D/g,'').slice(0,11),o='';if(d.length>0)o='('+d.slice(0,2);if(d.length>=2)o+=') ';if(d.length>2)o+=d.slice(2,3)+' ';if(d.length>3)o+=d.slice(3,7);if(d.length>7)o+='-'+d.slice(7);return o};

/* ===== acessibilidade: elementos com role="button" respondem a Enter/Espaço ===== */
document.addEventListener('keydown',e=>{const t=e.target;if((e.key==='Enter'||e.key===' ')&&t.matches&&t.matches('[role="button"],[role="radio"]')){e.preventDefault();t.click()}});
function modalA11y(box,onClose){ // foco entra, Tab fica preso, Esc fecha, foco volta
  const prev=document.activeElement;
  const f=()=>[...box.querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"]')].filter(x=>!x.disabled&&x.offsetParent!==null);
  setTimeout(()=>{const l=f();(l.find(x=>x.matches('input'))||l[0]||box).focus()},30);
  const key=e=>{if(e.key==='Escape'){close()}else if(e.key==='Tab'){const l=f();if(!l.length)return;const a=l[0],z=l[l.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}};
  function close(){document.removeEventListener('keydown',key);onClose();if(prev&&prev.focus)prev.focus()}
  document.addEventListener('keydown',key);return close;
}

/* ===== menu ===== */
const burger=$('#burger'),mnav=$('#mnav');
if(burger&&mnav){burger.setAttribute('aria-controls','mnav');
  burger.onclick=()=>{const o=mnav.classList.toggle('open');burger.classList.toggle('x',o);burger.setAttribute('aria-expanded',o)};
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&mnav.classList.contains('open'))burger.click()})}
const hd=$('header');if(hd){const onS=()=>hd.classList.toggle('scrolled',scrollY>10);onS();addEventListener('scroll',onS,{passive:true})}

/* pré-carrega a próxima página ao passar o mouse/tocar no link */
const pre=new Set();
const prefetch=href=>{const u=href.split('#')[0];if(!u||pre.has(u))return;pre.add(u);const l=document.createElement('link');l.rel='prefetch';l.href=u;document.head.appendChild(l)};
['mouseover','touchstart','focusin'].forEach(ev=>document.addEventListener(ev,e=>{const a=e.target.closest&&e.target.closest('a[href$=".html"],a[href*=".html?"],a[href*=".html#"]');if(a)prefetch(a.getAttribute('href'))},{passive:true}));
addEventListener('load',()=>(window.requestIdleCallback||setTimeout)(()=>$$('#menu a').forEach(a=>prefetch(a.getAttribute('href')))));

/* ===== dados: vêm do painel (store.js) ===== */
const db=DB.data, C=db.content;
const WD=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],MO=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'],WDF=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const svcById=k=>db.services.find(s=>s.id===k)||{p:0,t:45,on:false};
const SVC={cab:[],com:[],ext:[],ass:[{n:'Corte (plano)',base:'Corte',d:'Incluso no seu plano',p:0,t:svcById('corte').t||45,plan:1},{n:'Corte + Barba (plano)',base:'Corte + Barba',d:'Incluso no seu plano',p:0,t:60,plan:1}]};
db.services.filter(s=>s.on).forEach(s=>{if(SVC[s.cat])SVC[s.cat].push({n:s.n,d:s.d+(s.mp!=null?' · assinante '+brl(s.mp):''),p:s.p,t:s.t,mp:s.mp})});
// dias válidos de plano: todos os planos (inclusive os ocultos da venda, que ainda têm assinantes)
const PLAN_DAYS=[...new Set(db.plans.flatMap(p=>p.days))];
const today=new Date();today.setHours(0,0,0,0);
const days=Array.from({length:7},(_,i)=>{const d=new Date(today);d.setDate(d.getDate()+i);return d});
const holiday=d=>db.holidays.find(h=>h.date===DB.iso(d));
const openDay=d=>!!db.hours[d.getDay()]&&!holiday(d);
const slotsFor=(d,dur=45)=>DB.freeSlots(DB.iso(d),dur);
const mo=()=>MO[today.getMonth()]+'/'+String(today.getFullYear()).slice(2);

/* ===== conteúdo editável pelo painel ===== */
$$('[data-k]').forEach(el=>{const v=C[el.dataset.k];if(v!=null&&v!=='')el.textContent=v});
$$('[data-at]').forEach(el=>el.textContent='@'+C.instagram);
$$('a[href^="https://wa.me/"]').forEach(a=>a.href=a.href.replace(/wa\.me\/\d+/,'wa.me/'+C.wa));
$$('a[href^="https://instagram.com/"]').forEach(a=>a.href='https://instagram.com/'+encodeURIComponent(C.instagram));
$$('a[href^="https://maps.google.com/?q="]').forEach(a=>a.href='https://maps.google.com/?q='+encodeURIComponent(C.address));
function hoursHTML(){
  const order=[1,2,3,4,5,6,0],key=d=>JSON.stringify(db.hours[d]),out=[];
  for(let i=0;i<order.length;){let j=i;while(j+1<order.length&&order[j+1]!==0&&key(order[j+1])===key(order[i]))j++;
    const h=db.hours[order[i]],lbl=i===j?WDF[order[i]]:`${WDF[order[i]]} a ${WDF[order[j]]}`;
    out.push(`<li>${lbl}<b>${h?esc(h[0])+' – '+esc(h[1]):'Fechado'}</b></li>`);i=j+1}
  return out.join('');
}
$$('ul.hours').forEach(ul=>ul.innerHTML=hoursHTML());
if(C.notice_on&&C.notice){const n=document.createElement('div');n.className='notice';n.setAttribute('role','status');n.textContent=C.notice;document.body.prepend(n)}

/* ===== planos da home: montados a partir do painel (plano novo aparece, oculto some) ===== */
const CHECK='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><path d="M20 6L9 17l-5-5"/></svg>';
function planSaving(p){const c=svcById('corte').p,b=svcById('barba').p,q=DB.quota(p),barba=/barba/i.test(p.n);
  const base=q?q.corte*c+q.barba*b:4*(c+(barba?b:0));return base-p.p}
function planCard(p,hot){
  const q=DB.quota(p),save=planSaving(p),mp=db.services.filter(s=>s.on&&s.mp!=null);
  const feats=[`${q?(/barba/i.test(p.n)&&q.barba?`${q.corte} cortes + ${q.barba} barbas por mês`:`${q.corte} cortes por mês`):(/barba/i.test(p.n)?'Corte + barba à vontade':'Cortes à vontade')}, ${p.days.map(d=>WD[d]).join(', ')}`,'Lavagem inclusa'];
  if(p.perks&&p.perks!=='—')feats.push(p.perks);
  if(mp.length)feats.push(mp.map(s=>`${s.n} ${brl0(s.mp)}`).join(' · '));
  if(p.gap)feats.push(`Intervalo de ${p.gap} dias entre cortes`);
  return `<div class="plan${hot?' hot':''}" data-pid="${esc(p.id)}">${hot?'<span class="badge">Mais escolhido</span>':''}
    <h3>${esc(p.n)}</h3><div class="sub">${q?'Pacote mensal':'Assinatura ilimitada'}</div>
    <div class="price"><b>R$ ${esc(p.p)}</b><small>/mês</small></div>
    ${save>0?`<span class="save">Economize ${q?'':'até '}${brl0(save)}/mês${q?'':'*'}</span>`:'<span class="save" style="visibility:hidden">.</span>'}
    <ul class="feat">${feats.map(f=>`<li>${CHECK}${esc(f)}</li>`).join('')}</ul>
    <button class="btn ${hot?'btn-primary':'btn-ghost'}" data-plan="${esc(p.n)}" data-price="${esc(p.p)}">Assinar plano</button></div>`;
}
if($('#plans-ilim')){
  const on=db.plans.filter(p=>p.on),ilim=on.filter(p=>!DB.quota(p)),pack=on.filter(p=>DB.quota(p));
  const fill=(el,L)=>{el.innerHTML=L.length?L.map((p,i)=>planCard(p,L.length>1&&i===L.length-1)).join(''):'<p style="color:var(--muted);text-align:center;grid-column:1/-1">Nenhum plano disponível no momento.</p>'};
  fill($('#plans-ilim'),ilim);fill($('#plans-pack'),pack);
  if(!pack.length&&$('.switch'))$('.switch').style.display='none';
  if(!ilim.length&&pack.length){$('#plans-ilim').style.display='none';$('#plans-pack').style.display=''}
}
$$('.stats>div').forEach(el=>{const sp=el.querySelector('span'),b=el.querySelector('b');if(!sp||!b)return;
  if(/corte ilimitado/i.test(sp.textContent)){const p=db.plans.filter(x=>x.on&&!DB.quota(x)).sort((a,c)=>a.p-c.p)[0];if(p)b.textContent='R$ '+p.p;else el.style.display='none'}
  if(/planos/i.test(sp.textContent))b.textContent=db.plans.filter(p=>p.on).length});

/* ===== FAQ, avaliações e galeria ===== */
const faqText=t=>esc(t).replace(/\{prazo_cancelamento\}/g,esc(DB.cancelText()));
if($('.faq'))$('.faq').innerHTML=db.faq.map((f,i)=>`<div class="faq-i"><button class="faq-q" aria-expanded="false" aria-controls="faq-a${i}">${faqText(f.q)}<i aria-hidden="true"></i></button><div class="faq-a" id="faq-a${i}" role="region"><p>${faqText(f.a)}</p></div></div>`).join('');
if($('.reviews'))$('.reviews').innerHTML=db.reviews.map(r=>`<div class="rev"><div class="stars" aria-label="5 estrelas">★★★★★</div><p>“${esc(r.text)}”</p><div class="who"><span aria-hidden="true">${esc((r.name||'?')[0])}</span><div><b>${esc(r.name)}</b><small>${esc(r.info)}</small></div></div></div>`).join('');
const IMGOK=/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
if($('#gal'))$('#gal').innerHTML=db.gallery.map(g=>{const im=g.img&&DB.img.get(g.img),ok=im&&IMGOK.test(im)?im:null;
  return `<button class="gi" data-cat="${esc(g.cat)}" aria-label="Ampliar foto: ${esc(g.t)}"${ok?` style="background:url(${ok}) center/cover" data-img="${esc(g.img)}"`:''}>${ok?'':'<span class="ph">Foto</span>'}<span class="cap"><b>${esc(g.t)}</b>${esc(g.s)}</span><i class="zoom" aria-hidden="true"></i></button>`}).join('');

/* ===== opções clicáveis (forma de pagamento, dia) acessíveis por teclado ===== */
function wireOpts(root){root.querySelectorAll('.opts').forEach(g=>{g.setAttribute('role','radiogroup');g.querySelectorAll('.opt').forEach(o=>{o.setAttribute('role','radio');o.tabIndex=0;o.setAttribute('aria-checked',o.classList.contains('on'));
  o.onclick=()=>g.querySelectorAll('.opt').forEach(x=>{x.classList.toggle('on',x===o);x.setAttribute('aria-checked',x===o)})})})}
wireOpts(document);

/* ===== planos (home): troca e modal de assinatura ===== */
if($('.switch')){
  $$('.switch button').forEach(b=>{b.setAttribute('aria-pressed',b.classList.contains('on'));b.onclick=()=>{
    $$('.switch button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});
    $('#plans-ilim').style.display=b.dataset.g==='ilim'?'':'none';$('#plans-pack').style.display=b.dataset.g==='pack'?'':'none';
    $$('.plans').forEach(p=>{p.classList.remove('swap');void p.offsetWidth;p.classList.add('swap')})}});
}
const modal=$('#modal');
if(modal){
  modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','mtitle');
  $$('#modal .x').forEach(x=>x.setAttribute('aria-label','Fechar'));
  let curPlan=null,closeA11y=null;
  const closeModal=()=>{modal.classList.remove('open');if(closeA11y){const c=closeA11y;closeA11y=null;c()}};
  document.addEventListener('click',e=>{const b=e.target.closest('[data-plan]');if(!b)return;
    curPlan=db.plans.find(p=>p.n===b.dataset.plan&&p.on)||null;
    $('#mtitle').textContent=b.dataset.plan;$('#mprice').textContent=brl(+b.dataset.price);$('#serr').textContent='';
    $('#m1').style.display='';$('#m2').style.display='none';modal.classList.add('open');closeA11y=modalA11y(modal.querySelector('.mbox:not([style*="none"])')||modal,()=>modal.classList.remove('open'))});
  modal.addEventListener('click',e=>{if(e.target===modal||e.target.closest('[data-close]'))closeModal()});
  $('#stel').oninput=e=>{e.target.value=maskPhone(e.target.value)};
  $('#mconfirm').onclick=()=>{
    const name=$('#sname').value.trim(),phone=$('#stel').value.replace(/\D/g,'');
    if(name.length<2)return $('#serr').textContent='Digite seu nome.';
    if(phone.length!==11)return $('#serr').textContent='WhatsApp inválido. Use DDD + 9 dígitos.';
    if(!curPlan)return $('#serr').textContent='Plano indisponível. Atualize a página.';
    DB.refresh();let c=db.clients.find(x=>x.phone===phone);
    if(DB.isBlocked(c))return $('#serr').textContent='Não foi possível assinar por este número. Fale com o Athos pelo WhatsApp.';
    if(c&&DB.activeSub(c.id))return $('#serr').innerHTML='Este número já tem assinatura. <a href="entrar.html" style="color:var(--teal-2)">Entre na sua área</a> para trocar de plano.';
    const day=$$('#m1 .opts')[0].querySelector('.opt.on').textContent.includes('07')?7:1,met=$$('#m1 .opts')[1].querySelector('.opt.on').dataset.payic==='pix'?'Pix automático':'Cartão';
    const isNew=!c;if(isNew)c={id:'c'+DB.uid(),name,phone,notes:'',blocked:false,misses:0,since:mo()};
    const ok=DB.mutateMany(['clients','subs','tx'],d=>{
      if(isNew)d.clients.push(c);
      const v={plan:curPlan.id,price:curPlan.p,status:'ok',used:0,credit:0,creditMonth:null,day,method:met,pausedUntil:null,courtesyUntil:null,exempt:false,cancelAt:null,nextPlan:null,paidUntil:DB.addMonth(DB.iso(today))};
      const old=d.subs.find(x=>x.cid===c.id);if(old)Object.assign(old,v);else d.subs.push({id:'a'+DB.uid(),cid:c.id,since:mo(),...v});
      d.tx.unshift({id:DB.uid(),date:DB.iso(today),cid:c.id,desc:'Plano '+curPlan.n,method:met,value:curPlan.p,kind:'plano',status:'ok'});
    },`Nova assinatura pelo site: ${c.name} · ${curPlan.n} (${brl(curPlan.p)})`,'Assinaturas','Site');
    if(!ok)return $('#serr').textContent='Não foi possível salvar neste aparelho. Libere espaço do navegador e tente de novo.';
    try{localStorage.setItem('athos_me',c.id)}catch(e){}
    $('#m1').style.display='none';$('#m2').style.display='';$('#m2 .btn-primary').focus();
  };
}

/* ===== FAQ ===== */
$$('.faq-q').forEach(q=>q.onclick=()=>{const it=q.parentNode,open=it.classList.contains('open');
  $$('.faq-i').forEach(x=>{x.classList.remove('open');x.querySelector('.faq-a').style.maxHeight=null;x.querySelector('.faq-q').setAttribute('aria-expanded','false')});
  if(!open){it.classList.add('open');q.setAttribute('aria-expanded','true');const a=it.querySelector('.faq-a');a.style.maxHeight=a.scrollHeight+'px'}});

/* ===== horários (semana) ===== */
function renderWeek(){
  if(!$('#week'))return;
  $('#week').innerHTML=days.map((d,i)=>{
    const s=slotsFor(d),wd=d.getDay(),hol=holiday(d),closed=!openDay(d),member=PLAN_DAYS.includes(wd);
    const tag=closed?'':`<span class="wtag ${member?'':'x'}">${member?'Válido para assinantes':'Somente avulso'}</span>`;
    const body=closed?`<span class="none">${hol?'Fechado · '+esc(hol.name):'Fechado'}</span>`:s.length?s.slice(0,6).map(t=>`<a class="slot" href="agendar.html?d=${i}&t=${t}" aria-label="Agendar ${WDF[wd]} às ${t}">${t}</a>`).join('')+(s.length>6?`<a class="more" href="agendar.html?d=${i}">+${s.length-6} horários</a>`:''):'<span class="none">Sem horários livres</span>';
    return `<div class="wrow"><div class="dbox"><small>${i===0?'Hoje':WD[wd]}</small><b>${d.getDate()}</b><small>${MO[d.getMonth()]}</small></div><div class="wslots">${tag}${body}</div></div>`;
  }).join('');
}
renderWeek();

/* ===== agendamento ===== */
if($('#svclist')){
  const st={cat:'cab',svc:null,day:null,time:null,step:1};
  const validDay=d=>openDay(d)&&(!st.svc||!st.svc.plan||PLAN_DAYS.includes(d.getDay()));
  const dayLabel=i=>{const d=days[i];return `${i===0?'Hoje':WD[d.getDay()]}, ${d.getDate()} de ${MO[d.getMonth()]}`};
  const codeIns=$$('#code input');codeIns.forEach((el,i)=>{el.setAttribute('aria-label',`Dígito ${i+1} de 6`);if(i===0)el.setAttribute('autocomplete','one-time-code')});
  const phoneNow=()=>$('#btel').value.replace(/\D/g,'');
  const clientNow=()=>db.clients.find(x=>x.phone===phoneNow());
  function renderSvc(){
    $('#svclist').innerHTML=SVC[st.cat].map((s,i)=>`<button class="svc ${st.svc&&st.svc.n===s.n?'on':''}" data-i="${i}" aria-pressed="${!!(st.svc&&st.svc.n===s.n)}"><span><strong>${esc(s.n)}</strong><small>${esc(s.d)} · ${s.t} min</small></span><span class="pr"><b>${s.plan?'Incluso':brl(s.p)}</b>${s.plan?'<small class="mem">R$ 0,00</small>':''}</span></button>`).join('')||'<p style="color:var(--muted)">Nenhum serviço nesta categoria.</p>';
    $$('#svclist .svc').forEach(b=>b.onclick=()=>{st.svc=SVC[st.cat][b.dataset.i];if(st.day!==null&&!validDay(days[st.day])){st.day=null;st.time=null}renderSvc();update()});
  }
  $$('#svctabs button').forEach(b=>{b.setAttribute('aria-pressed',b.classList.contains('on'));b.onclick=()=>{st.cat=b.dataset.c;$$('#svctabs button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});renderSvc()}});
  function renderDays(){
    const dur=st.svc?st.svc.t:45,has=d=>validDay(d)&&slotsFor(d,dur).length>0;
    if(st.day===null||!has(days[st.day])&&!st.time){const f=days.findIndex(has);st.day=f>-1?f:null}
    $('#days').innerHTML=days.map((d,i)=>`<button class="day ${st.day===i?'on':''}" data-i="${i}" aria-pressed="${st.day===i}" ${has(d)?'':'disabled'} title="${!openDay(d)?(holiday(d)?esc(holiday(d).name):'Fechado'):has(d)?'':'Lotado'}"><small>${i===0?'Hoje':WD[d.getDay()]}</small><b>${d.getDate()}</b><small>${MO[d.getMonth()]}</small></button>`).join('');
    $$('#days .day').forEach(b=>b.onclick=()=>{st.day=+b.dataset.i;st.time=null;renderDays();update()});
    $('#hint').style.display=st.svc&&st.svc.plan?'flex':'none';
    renderSlots();
  }
  function renderSlots(){
    if(st.day===null){$('#slots').innerHTML='<span style="color:var(--dim);font-size:14px">Sem horários livres nos próximos 7 dias.</span>';return}
    const s=slotsFor(days[st.day],st.svc?st.svc.t:45);
    $('#slots').innerHTML=s.length?s.map(t=>`<button class="slot ${st.time===t?'on':''}" data-t="${t}" aria-pressed="${st.time===t}">${t}</button>`).join(''):'<span style="color:var(--dim);font-size:14px">Sem horários livres neste dia.</span>';
    $$('#slots .slot').forEach((b,i)=>{b.style.animationDelay=Math.min(i,20)*0.015+'s';b.onclick=()=>{st.time=b.dataset.t;renderSlots();update()}});
  }
  // preço final: assinante ativo paga o preço especial (mp) nos serviços que têm
  const isMember=()=>{const c=clientNow(),s=c&&DB.activeSub(c.id);return !!(s&&s.status==='ok')};
  const priceNow=()=>{if(!st.svc||st.svc.plan)return 0;return st.svc.mp!=null&&isMember()?st.svc.mp:st.svc.p};
  function update(){
    const ok=(st.step===1&&st.svc)||(st.step===2&&st.time)||(st.step===3&&phoneNow().length===11&&$('#bname').value.trim().length>=2)||(st.step===4&&codeIns.every(x=>x.value));
    const nx=$('#next');nx.disabled=!ok;
    nx.textContent=st.step===3?'Receber código no WhatsApp':st.step===4?'Confirmar agendamento':'Continuar';
    nx.style.display=st.step===5?'none':'';
    $('#back').style.display=st.step>1&&st.step<5?'':'none';
    const vs=Math.min(st.step,3);
    $$('#bsteps div').forEach((el,i)=>{el.classList.toggle('on',i+1===vs&&st.step<5);el.classList.toggle('ok',i+1<vs||st.step===5);el.setAttribute('aria-current',i+1===vs&&st.step<5?'step':'false')});
    [1,2,3,4,5].forEach(n=>$('#p'+n).classList.toggle('on',n===st.step));
    $('#sel').innerHTML=st.svc?`<b>${esc(st.svc.n)}</b> · ${st.svc.plan?'Incluso no plano':brl(priceNow())}${st.time?` · ${dayLabel(st.day)} às ${esc(st.time)}`:''}`:'Nenhum serviço selecionado';
    if(st.step===3)$('#sum').innerHTML=`<label class="t">Resumo</label>
      <div class="row"><span>Serviço</span><b>${esc(st.svc.n)}</b></div><div class="row"><span>Barbeiro</span><b>Athos</b></div>
      <div class="row"><span>Quando</span><b>${dayLabel(st.day)} · ${esc(st.time)}</b></div><div class="row"><span>Duração</span><b>${st.svc.t} min</b></div>
      <div class="row"><span>Valor</span><b>${st.svc.plan?'R$ 0,00 (plano)':brl(priceNow())+(priceNow()<st.svc.p?' <small style="color:var(--teal-2);font-weight:500">preço de assinante</small>':'')}</b></div>`;
    if(st.step===4)$('#otptel').textContent=$('#btel').value;
    if(st.step===5)$('#donetxt').textContent=`${st.svc.n} · ${dayLabel(st.day)} às ${st.time}. A confirmação chega no seu WhatsApp.`;
  }
  function saveBooking(){
    DB.refresh();
    const phone=phoneNow(),name=$('#bname').value.trim();
    let c=db.clients.find(x=>x.phone===phone);const isNew=!c;
    if(isNew)c={id:'c'+DB.uid(),name,phone,notes:'',blocked:false,misses:0,since:mo()};
    const svc=st.svc.base||st.svc.n,ds=DB.iso(days[st.day]);
    return DB.mutateMany(['clients','appts'],d=>{if(isNew)d.clients.push(c);d.appts.push({id:DB.uid(),date:ds,start:st.time,dur:st.svc.t,cid:c.id,svc,price:priceNow(),plan:!!st.svc.plan,status:'conf',note:'',origin:'site'})},
      `Novo agendamento pelo site: ${c.name} · ${svc} em ${ds.slice(8)}/${ds.slice(5,7)} às ${st.time}`,'Agenda','Site');
  }
  function avulsoOf(base){return base==='Corte + Barba'?{n:'Corte + Barba',d:'Avulso',p:svcById('corte').p+svcById('barba').p,t:60}:{...(SVC.cab.find(x=>x.n===svcById('corte').n)||{n:'Corte',p:svcById('corte').p,t:45})}}
  function planFail(msg){
    const av=avulsoOf(st.svc.base);
    $('#bblock').innerHTML=`${esc(msg)}<span class="bfix"><button type="button" class="btn btn-primary btn-sm" id="bav">Agendar como avulso · ${brl(av.p)}</button><a class="btn btn-ghost btn-sm" href="index.html#planos">Conhecer os planos</a></span>`;
    $('#bav').onclick=()=>{st.svc=av;st.cat='cab';$$('#svctabs button').forEach(x=>{x.classList.toggle('on',x.dataset.c==='cab');x.setAttribute('aria-pressed',x.dataset.c==='cab')});
      if(!DB.freeSlots(DB.iso(days[st.day]),av.t).includes(st.time)){st.step=2;st.time=null;renderDays()}
      $('#bblock').textContent='';renderSvc();update()};
  }
  $('#next').onclick=()=>{$('#bblock').textContent='';$('#bblock2').textContent='';
    if(st.step===3||st.step===4){DB.refresh();const c=clientNow();
      const back=()=>{if(st.step===4){st.step=3;update()}};
      if(DB.isBlocked(c)){back();$('#bblock').textContent='Agendamento online indisponível para este número. Fale com o Athos pelo WhatsApp.';return}
      if(st.svc.plan){const err=c?DB.planCheck(c.id,DB.iso(days[st.day]),st.svc.base):'Este número não tem assinatura ativa.';if(err){back();planFail(err);return}}}
    if(st.step===4&&!DB.freeSlots(DB.iso(days[st.day]),st.svc.t).includes(st.time)){st.step=2;st.time=null;renderSlots();update();$('#bblock2').textContent='Esse horário acabou de ser ocupado. Escolha outro.';return}
    if(st.step===1)renderDays();
    if(st.step===4&&!saveBooking()){$('#bblock2').textContent='Não foi possível salvar o agendamento neste aparelho. Libere espaço do navegador ou fale com o Athos.';return}
    st.step++;if(st.step===4)codeIns.forEach(x=>x.value='');update();if(st.step===4)codeIns[0].focus();if(innerWidth<720)$('.book').scrollIntoView({behavior:reduce?'auto':'smooth'})};
  $('#back').onclick=()=>{st.step--;update()};
  codeIns.forEach((el,i)=>{el.oninput=()=>{el.value=el.value.replace(/\D/g,'').slice(-1);if(el.value&&i<5)codeIns[i+1].focus();update()};
    el.onkeydown=e=>{if(e.key==='Backspace'&&!el.value&&i>0)codeIns[i-1].focus()}});
  $('#btel').oninput=e=>{e.target.value=maskPhone(e.target.value);update()};
  $('#bname').oninput=update;
  // vindo da página de horários: ?d=índice&t=HH:MM (validado)
  const q=new URLSearchParams(location.search);
  if(q.has('d')){const d=+q.get('d');if(days[d]&&openDay(days[d])){st.svc=SVC.cab[0]||null;if(st.svc){st.day=d;const t=q.get('t')||'';st.time=/^\d{2}:\d{2}$/.test(t)&&slotsFor(days[d],st.svc.t).includes(t)?t:null;st.step=2;renderSvc();renderDays()}}}
  if(q.get('cat')==='ass'){st.cat='ass';$$('#svctabs button').forEach(x=>{x.classList.toggle('on',x.dataset.c==='ass');x.setAttribute('aria-pressed',x.dataset.c==='ass')})}
  try{const me=db.clients.find(c=>c.id===localStorage.getItem('athos_me'));if(me){$('#bname').value=me.name;$('#btel').value=maskPhone(me.phone)}}catch(e){}
  renderSvc();update();
  // outra aba mudou a agenda: atualiza os horários livres
  window.onDBChange=()=>{if(st.step<=2){renderDays()}};
}else{window.onDBChange=renderWeek}

/* ===== galeria ===== */
if($('#gal')){
  const items=$$('#gal .gi');
  $$('#gfilters button').forEach(b=>{b.setAttribute('aria-pressed',b.classList.contains('on'));b.onclick=()=>{
    $$('#gfilters button').forEach(x=>{x.classList.toggle('on',x===b);x.setAttribute('aria-pressed',x===b)});
    items.forEach(it=>it.classList.toggle('hide',!(b.dataset.f==='all'||it.dataset.cat===b.dataset.f)))}});
  const lb=$('#lightbox');let cur=0,closeA11y=null,opener=null;
  const vis=()=>items.filter(i=>!i.classList.contains('hide'));
  const show=i=>{const v=vis();cur=(i+v.length)%v.length;const it=v[cur];
    $('#lb-title').textContent=it.querySelector('b').textContent;$('#lb-sub').textContent=it.querySelector('.cap').lastChild.textContent;
    $('#lb-count').textContent=`${cur+1} / ${v.length}`;const im=it.dataset.img&&DB.img.get(it.dataset.img),li=$('.lb-img');li.style.background=im&&IMGOK.test(im)?`url(${im}) center/contain no-repeat #000`:'';li.textContent=im?'':'Foto';const f=$('#lb-frame');f.classList.remove('in');void f.offsetWidth;f.classList.add('in')};
  const close=()=>{lb.classList.remove('open');if(closeA11y){const c=closeA11y;closeA11y=null;c()}};
  lb.setAttribute('aria-modal','true');
  items.forEach(it=>it.onclick=()=>{opener=it;show(vis().indexOf(it));lb.classList.add('open');closeA11y=modalA11y(lb,()=>lb.classList.remove('open'));setTimeout(()=>$('#lb-close').focus(),40)});
  $('#lb-prev').onclick=()=>show(cur-1);$('#lb-next').onclick=()=>show(cur+1);
  $('#lb-close').onclick=close;lb.onclick=e=>{if(e.target===lb)close()};
  addEventListener('keydown',e=>{if(!lb.classList.contains('open'))return;if(e.key==='ArrowLeft')show(cur-1);if(e.key==='ArrowRight')show(cur+1)});
}

/* ===== contato ===== */
if($('#map-load'))$('#map-load').onclick=()=>{$('#map').innerHTML='<iframe title="Mapa da barbearia" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q='+encodeURIComponent(C.address)+'&z=15&output=embed"></iframe>'};
if($('#cform')){
  $('#cform').onsubmit=e=>{e.preventDefault();
    const n=$('#cname').value.trim(),m=$('#cmsg').value.trim(),a=$('#csub').value;
    if(!n||!m){$('#cerr').textContent='Preencha nome e mensagem.';return}
    window.open('https://wa.me/'+C.wa+'?text='+encodeURIComponent(`Olá, Athos! Sou ${n}. Assunto: ${a}.\n${m}`),'_blank','noopener');
  };
  ['#cname','#cmsg'].forEach(s=>$(s).oninput=()=>$('#cerr').textContent='');
}

/* ===== animações de entrada ===== */
(()=>{
  if(reduce||!('IntersectionObserver' in window))return;
  const groups=['.head','.page-top>*','.steps>.step','.barber','.switch','.plans>.plan','.notes>.note','.book','.hrs>div:first-child>*','.feats>.feat-c','.week','.wrow','.gal>.gi','.cta','.foot>div','.reviews>.rev','.faq-i','.ccard','.cgrid>*','.hours-card','.gfilters'];
  groups.forEach(sel=>$$(sel).forEach((el,i)=>{el.classList.add('rv');el.style.setProperty('--d',(Math.min(i,5)*0.05)+'s')}));
  const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){const el=e.target;el.classList.add('in');io.unobserve(el);setTimeout(()=>{el.classList.remove('rv','in');el.style.removeProperty('--d')},900)}}),{threshold:.05});
  $$('.rv').forEach(el=>io.observe(el));
  addEventListener('scroll',()=>{if(innerHeight+scrollY>=document.body.scrollHeight-4)$$('.rv:not(.in)').forEach(el=>el.classList.add('in'))},{passive:true});
  $$('.stats b').forEach(b=>{
    const m=b.textContent.match(/\d+/);if(!m)return;const end=+m[0],pre=b.textContent.slice(0,m.index),pos=b.textContent.slice(m.index+m[0].length);
    const t0=performance.now()+400,dur=900;
    const tick=t=>{const k=Math.min(Math.max((t-t0)/dur,0),1),v=Math.round(end*(1-Math.pow(1-k,3)));b.textContent=pre+v+pos;if(k<1)requestAnimationFrame(tick)};
    b.textContent=pre+'0'+pos;requestAnimationFrame(tick);
  });
})();
