/* Athos Barber — scripts compartilhados do site */
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const brl=v=>v===0?'R$ 0,00':'R$ '+v.toFixed(2).replace('.',',');
const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ===== menu ===== */
$('#burger').onclick=()=>{const o=$('#mnav').classList.toggle('open');$('#burger').classList.toggle('x',o);$('#burger').setAttribute('aria-expanded',o)};
const hd=$('header');const onS=()=>hd.classList.toggle('scrolled',scrollY>10);onS();addEventListener('scroll',onS,{passive:true});

/* pré-carrega a próxima página ao passar o mouse/tocar no link (navegação instantânea) */
const pre=new Set();
const prefetch=href=>{const u=href.split('#')[0];if(!u||pre.has(u))return;pre.add(u);const l=document.createElement('link');l.rel='prefetch';l.href=u;document.head.appendChild(l)};
['mouseover','touchstart','focusin'].forEach(ev=>document.addEventListener(ev,e=>{const a=e.target.closest&&e.target.closest('a[href$=".html"],a[href*=".html?"],a[href*=".html#"]');if(a)prefetch(a.getAttribute('href'))},{passive:true}));
/* depois que a página carrega, pré-carrega as páginas do menu em segundo plano */
addEventListener('load',()=>(window.requestIdleCallback||setTimeout)(()=>$$('#menu a').forEach(a=>prefetch(a.getAttribute('href')))));

/* ===== dados: vêm do painel (store.js) ===== */
const db=DB.data, C=db.content;
const brl0=v=>'R$ '+Math.round(v);
const WD=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],MO=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'],WDF=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
const SVC={cab:[],com:[],ext:[],ass:[{n:'Corte (plano)',base:'Corte',d:'Incluso no seu plano',p:0,t:45,plan:1},{n:'Corte + Barba (plano)',base:'Corte + Barba',d:'Incluso no seu plano',p:0,t:60,plan:1}]};
db.services.filter(s=>s.on).forEach(s=>{if(SVC[s.cat])SVC[s.cat].push({n:s.n,d:s.d+(s.mp!=null?' · assinante '+brl(s.mp):''),p:s.p,t:s.t})});
const PLAN_DAYS=[...new Set(db.plans.filter(p=>p.on).flatMap(p=>p.days))];
const today=new Date();today.setHours(0,0,0,0);
const days=Array.from({length:7},(_,i)=>{const d=new Date(today);d.setDate(d.getDate()+i);return d});
const holiday=d=>db.holidays.find(h=>h.date===DB.iso(d));
const openDay=d=>!!db.hours[d.getDay()]&&!holiday(d);
const slotsFor=(d,dur=45)=>DB.freeSlots(DB.iso(d),dur);

/* ===== conteúdo editável pelo painel ===== */
$$('[data-k]').forEach(el=>{const v=C[el.dataset.k];if(v!=null&&v!=='')el.textContent=v});
$$('[data-at]').forEach(el=>el.textContent='@'+C.instagram);
$$('a[href^="https://wa.me/"]').forEach(a=>a.href=a.href.replace(/wa\.me\/\d+/,'wa.me/'+C.wa));
$$('a[href^="https://instagram.com/"]').forEach(a=>a.href='https://instagram.com/'+C.instagram);
$$('a[href^="https://maps.google.com/?q="]').forEach(a=>a.href='https://maps.google.com/?q='+encodeURIComponent(C.address));
function hoursHTML(){
  const order=[1,2,3,4,5,6,0],key=d=>JSON.stringify(db.hours[d]),out=[];
  for(let i=0;i<order.length;){let j=i;while(j+1<order.length&&order[j+1]!==0&&key(order[j+1])===key(order[i]))j++;
    const h=db.hours[order[i]],lbl=i===j?WDF[order[i]]:`${WDF[order[i]]} a ${WDF[order[j]]}`;
    out.push(`<li>${lbl}<b>${h?h[0]+' – '+h[1]:'Fechado'}</b></li>`);i=j+1}
  return out.join('');
}
$$('ul.hours').forEach(ul=>ul.innerHTML=hoursHTML());
if(C.notice_on&&C.notice){const n=document.createElement('div');n.className='notice';n.textContent=C.notice;document.body.prepend(n)}
// planos da home
$$('.plan[data-pid]').forEach(card=>{const p=db.plans.find(x=>x.id===card.dataset.pid);if(!p||!p.on){card.style.display='none';return}
  card.querySelector('h3').textContent=p.n;card.querySelector('.price b').textContent='R$ '+p.p;
  const b=card.querySelector('[data-plan]');b.dataset.plan=p.n;b.dataset.price=p.p;
  const sv=k=>(db.services.find(s=>s.id===k)||{p:0}).p,base={ci:4*sv('corte'),cbi:4*(sv('corte')+sv('barba')),c2:2*sv('corte'),cb2:2*(sv('corte')+sv('barba'))}[p.id],el=card.querySelector('.save');
  if(el&&base){const e=base-p.p;el.style.display=e>0?'':'none';el.textContent=(p.quota==='Ilimitado'?'Economize até ':'Economize ')+brl0(e)+'/mês'+(p.quota==='Ilimitado'?'*':'')}});
$$('.stats>div').forEach(el=>{const sp=el.querySelector('span'),b=el.querySelector('b');if(!sp||!b)return;
  if(/corte ilimitado/i.test(sp.textContent)){const p=db.plans.find(x=>x.id==='ci');if(p)b.textContent='R$ '+p.p}
  if(/planos/i.test(sp.textContent))b.textContent=db.plans.filter(p=>p.on).length});
// FAQ, avaliações e galeria
if($('.faq'))$('.faq').innerHTML=db.faq.map(f=>`<div class="faq-i"><button class="faq-q">${esc(f.q)}<i></i></button><div class="faq-a"><p>${esc(f.a)}</p></div></div>`).join('');
if($('.reviews'))$('.reviews').innerHTML=db.reviews.map(r=>`<div class="rev"><div class="stars">★★★★★</div><p>“${esc(r.text)}”</p><div class="who"><span>${esc((r.name||'?')[0])}</span><div><b>${esc(r.name)}</b><small>${esc(r.info)}</small></div></div></div>`).join('');
if($('#gal'))$('#gal').innerHTML=db.gallery.map(g=>{const im=g.img&&DB.img.get(g.img);return `<button class="gi" data-cat="${g.cat}"${im?` style="background:url(${im}) center/cover" data-img="${g.img}"`:''}>${im?'':'<span class="ph">Foto</span>'}<div class="cap"><b>${esc(g.t)}</b>${esc(g.s)}</div><i class="zoom"></i></button>`}).join('');
function esc(x){return String(x??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]))}

/* ===== planos (home) ===== */
if($('.switch')){
  $$('.switch button').forEach(b=>b.onclick=()=>{
    $$('.switch button').forEach(x=>x.classList.toggle('on',x===b));
    $('#plans-ilim').style.display=b.dataset.g==='ilim'?'':'none';
    $('#plans-pack').style.display=b.dataset.g==='pack'?'':'none';
    $$('.plans').forEach(p=>{p.classList.remove('swap');void p.offsetWidth;p.classList.add('swap')});
  });
}
const modal=$('#modal');
if(modal){
  $$('[data-plan]').forEach(b=>b.onclick=()=>{
    $('#mtitle').textContent=b.dataset.plan;$('#mprice').textContent=brl(+b.dataset.price);
    $('#m1').style.display='';$('#m2').style.display='none';modal.classList.add('open');
  });
  $$('[data-close]').forEach(b=>b.addEventListener('click',()=>modal.classList.remove('open')));
  modal.onclick=e=>{if(e.target===modal)modal.classList.remove('open')};
  $('#mconfirm').onclick=()=>{$('#m1').style.display='none';$('#m2').style.display=''};
}
$$('.opts').forEach(g=>g.querySelectorAll('.opt').forEach(o=>o.onclick=()=>g.querySelectorAll('.opt').forEach(x=>x.classList.toggle('on',x===o))));

/* ===== FAQ ===== */
$$('.faq-q').forEach(q=>q.onclick=()=>{const it=q.parentNode,open=it.classList.contains('open');
  $$('.faq-i').forEach(x=>{x.classList.remove('open');x.querySelector('.faq-a').style.maxHeight=null});
  if(!open){it.classList.add('open');const a=it.querySelector('.faq-a');a.style.maxHeight=a.scrollHeight+'px'}});

/* ===== horários (semana) ===== */
if($('#week')){
  $('#week').innerHTML=days.map((d,i)=>{
    const s=slotsFor(d),wd=d.getDay(),hol=holiday(d),closed=!openDay(d),member=PLAN_DAYS.includes(wd);
    const tag=closed?'':`<span class="wtag ${member?'':'x'}">${member?'Válido para assinantes':'Somente avulso'}</span>`;
    const body=closed?`<span class="none">${hol?'Fechado · '+esc(hol.name):'Fechado'}</span>`:s.length?s.slice(0,6).map(t=>`<a class="slot" href="agendar.html?d=${i}&t=${t}">${t}</a>`).join('')+(s.length>6?`<a class="more" href="agendar.html?d=${i}">+${s.length-6} horários</a>`:''):'<span class="none">Sem horários livres</span>';
    return `<div class="wrow"><div class="dbox"><small>${i===0?'Hoje':WD[wd]}</small><b>${d.getDate()}</b><small>${MO[d.getMonth()]}</small></div><div class="wslots">${tag}${body}</div></div>`;
  }).join('');
}

/* ===== agendamento ===== */
if($('#svclist')){
  const st={cat:'cab',svc:null,day:null,time:null,step:1};
  const validDay=d=>openDay(d)&&(!st.svc||!st.svc.plan||PLAN_DAYS.includes(d.getDay()));
  const dayLabel=i=>{const d=days[i];return `${i===0?'Hoje':WD[d.getDay()]}, ${d.getDate()} de ${MO[d.getMonth()]}`};
  const codeIns=$$('#code input');
  function renderSvc(){
    $('#svclist').innerHTML=SVC[st.cat].map((s,i)=>`<button class="svc ${st.svc&&st.svc.n===s.n?'on':''}" data-i="${i}"><div><strong>${s.n}</strong><small>${s.d} · ${s.t} min</small></div><div class="pr"><b>${s.plan?'Incluso':brl(s.p)}</b>${s.plan?'<small class="mem">R$ 0,00</small>':''}</div></button>`).join('');
    $$('#svclist .svc').forEach(b=>b.onclick=()=>{st.svc=SVC[st.cat][b.dataset.i];if(st.day!==null&&!validDay(days[st.day])){st.day=null;st.time=null}renderSvc();update()});
  }
  $$('#svctabs button').forEach(b=>b.onclick=()=>{st.cat=b.dataset.c;$$('#svctabs button').forEach(x=>x.classList.toggle('on',x===b));renderSvc()});
  function renderDays(){
    const dur=st.svc?st.svc.t:45,has=d=>validDay(d)&&slotsFor(d,dur).length>0;
    if(st.day===null||!has(days[st.day])&&!st.time){const f=days.findIndex(has);st.day=f>-1?f:null}
    $('#days').innerHTML=days.map((d,i)=>`<button class="day ${st.day===i?'on':''}" data-i="${i}" ${has(d)?'':'disabled'} title="${!openDay(d)?(holiday(d)?esc(holiday(d).name):'Fechado'):has(d)?'':'Lotado'}"><small>${i===0?'Hoje':WD[d.getDay()]}</small><b>${d.getDate()}</b><small>${MO[d.getMonth()]}</small></button>`).join('');
    $$('#days .day').forEach(b=>b.onclick=()=>{st.day=+b.dataset.i;st.time=null;renderDays();update()});
    $('#hint').style.display=st.svc&&st.svc.plan?'flex':'none';
    renderSlots();
  }
  function renderSlots(){
    if(st.day===null){$('#slots').innerHTML='';return}
    const s=slotsFor(days[st.day],st.svc?st.svc.t:45);
    $('#slots').innerHTML=s.length?s.map(t=>`<button class="slot ${st.time===t?'on':''}" data-t="${t}">${t}</button>`).join(''):'<span style="color:var(--dim);font-size:14px">Sem horários livres neste dia.</span>';
    $$('#slots .slot').forEach((b,i)=>{b.style.animationDelay=Math.min(i,20)*0.015+'s';b.onclick=()=>{st.time=b.dataset.t;renderSlots();update()}});
  }
  function update(){
    const ok=(st.step===1&&st.svc)||(st.step===2&&st.time)||(st.step===3&&$('#btel').value.replace(/\D/g,'').length>=10)||(st.step===4&&codeIns.every(x=>x.value));
    const nx=$('#next');nx.disabled=!ok;nx.style.opacity=ok?1:.5;
    nx.textContent=st.step===3?'Receber código no WhatsApp':st.step===4?'Confirmar agendamento':'Continuar';
    nx.style.display=st.step===5?'none':'';
    $('#back').style.display=st.step>1&&st.step<5?'':'none';
    const vs=Math.min(st.step,3);
    $$('#bsteps div').forEach((el,i)=>{el.classList.toggle('on',i+1===vs&&st.step<5);el.classList.toggle('ok',i+1<vs||st.step===5)});
    [1,2,3,4,5].forEach(n=>$('#p'+n).classList.toggle('on',n===st.step));
    $('#sel').innerHTML=st.svc?`<b>${st.svc.n}</b> · ${st.svc.plan?'Incluso no plano':brl(st.svc.p)}${st.time?` · ${dayLabel(st.day)} às ${st.time}`:''}`:'Nenhum serviço selecionado';
    if(st.step===3)$('#sum').innerHTML=`<label class="t">Resumo</label>
      <div class="row"><span>Serviço</span><b>${st.svc.n}</b></div><div class="row"><span>Barbeiro</span><b>Athos</b></div>
      <div class="row"><span>Quando</span><b>${dayLabel(st.day)} · ${st.time}</b></div><div class="row"><span>Duração</span><b>${st.svc.t} min</b></div>
      <div class="row"><span>Valor</span><b>${st.svc.plan?'R$ 0,00 (plano)':brl(st.svc.p)}</b></div>`;
    if(st.step===4)$('#otptel').textContent=$('#btel').value;
    if(st.step===5)$('#donetxt').textContent=`${st.svc.n} · ${dayLabel(st.day)} às ${st.time}. A confirmação chega no seu WhatsApp.`;
  }
  function saveBooking(){
    const phone=$('#btel').value.replace(/\D/g,''),name=($('#bname').value||'').trim()||'Cliente';
    let c=db.clients.find(x=>x.phone===phone);
    if(!c){c={id:'c'+DB.uid(),name,phone,notes:'',blocked:false,misses:0,since:MO[today.getMonth()]+'/'+String(today.getFullYear()).slice(2)};DB.mutate('clients',L=>L.push(c),'Cliente '+name+' cadastrado pelo site','Clientes','Site')}
    const svc=st.svc.base||st.svc.n,ds=DB.iso(days[st.day]);
    DB.mutate('appts',L=>L.push({id:DB.uid(),date:ds,start:st.time,dur:st.svc.t,cid:c.id,svc,price:st.svc.p,plan:!!st.svc.plan,status:'conf',note:'',origin:'site'}),`Novo agendamento pelo site: ${c.name} · ${svc} em ${ds.slice(8)}/${ds.slice(5,7)} às ${st.time}`,'Agenda','Site');
  }
  /* regras do plano: só agenda pelo plano quem tem assinatura ativa e dentro das regras */
  const fmtDM=d=>String(d.getDate()).padStart(2,'0')+'/'+String(d.getMonth()+1).padStart(2,'0');
  function planCheck(phone){
    const c=db.clients.find(x=>x.phone===phone);
    const s=c&&db.subs.find(x=>x.cid===c.id&&x.status!=='off');
    if(!s)return 'Este número não tem assinatura ativa.';
    if(s.status==='late')return 'Sua assinatura está com o pagamento pendente. Regularize na sua área do cliente para usar o plano.';
    if(s.status==='paused')return `Sua assinatura está pausada${s.pausedUntil?' até '+s.pausedUntil.slice(8)+'/'+s.pausedUntil.slice(5,7):''}.`;
    const p=db.plans.find(x=>x.id===s.plan);if(!p)return 'Plano não encontrado. Fale com o Athos.';
    const d=days[st.day],wantsBarba=/barba/i.test(st.svc.base);
    if(wantsBarba&&!/barba/i.test(p.n))return `Seu plano (${p.n}) não inclui barba.`;
    if(!p.days.includes(d.getDay()))return `Seu plano vale só ${p.days.map(x=>WD[x]).join(', ')}. ${WDF[d.getDay()]} é atendimento avulso.`;
    const ym=DB.iso(d).slice(0,7),mine=db.appts.filter(a=>a.cid===c.id&&a.plan&&!['cancel','miss'].includes(a.status));
    const m=/^(\d+)(?: \+ (\d+))?/.exec(p.quota);
    if(m){const lim=(wantsBarba&&m[2]?+m[2]:+m[1])+(s.credit||0),used=mine.filter(a=>a.date.slice(0,7)===ym&&(!wantsBarba||/barba/i.test(a.svc))).length;
      if(used>=lim)return `Você já usou ${lim===1?'o':'os'} ${lim} ${wantsBarba?(lim===1?'serviço de barba':'serviços de barba'):(lim===1?'corte':'cortes')} do plano neste mês. O saldo renova no dia 1º.`}
    if(p.gap){const t=d.getTime(),near=mine.find(a=>Math.abs(new Date(a.date+'T00:00').getTime()-t)<p.gap*864e5);
      if(near){const nx=new Date(near.date+'T00:00');nx.setDate(nx.getDate()+p.gap);return `Seu plano pede ${p.gap} dias entre um corte e outro (você tem horário em ${near.date.slice(8)}/${near.date.slice(5,7)}). Pelo plano, o próximo é a partir de ${fmtDM(nx)}.`}}
    return null;
  }
  function avulsoOf(base){const f=k=>(db.services.find(x=>x.id===k)||{p:0,t:0});return base==='Corte + Barba'?{n:'Corte + Barba',d:'Avulso',p:f('corte').p+f('barba').p,t:60}:{...SVC.cab.find(x=>x.n==='Corte')||{n:'Corte',p:f('corte').p,t:45}}}
  function planFail(msg){
    const av=avulsoOf(st.svc.base);
    $('#bblock').innerHTML=`${esc(msg)}<span class="bfix"><button type="button" class="btn btn-primary btn-sm" id="bav">Agendar como avulso · ${brl(av.p)}</button><a class="btn btn-ghost btn-sm" href="index.html#planos">Conhecer os planos</a></span>`;
    $('#bav').onclick=()=>{st.svc=av;st.cat='cab';$$('#svctabs button').forEach(x=>x.classList.toggle('on',x.dataset.c==='cab'));
      if(!DB.freeSlots(DB.iso(days[st.day]),av.t).includes(st.time)){st.step=2;st.time=null;renderDays()}
      $('#bblock').textContent='';renderSvc();update()};
  }
  $('#next').onclick=()=>{$('#bblock').textContent='';$('#bblock2').textContent='';
    if(st.step===3||st.step===4){const phone=$('#btel').value.replace(/\D/g,''),c=db.clients.find(x=>x.phone===phone);
      if(c&&c.blocked){if(st.step===4){st.step=3;update()}$('#bblock').textContent='Agendamento online indisponível para este número. Fale com o Athos pelo WhatsApp.';return}
      if(st.svc.plan){const err=planCheck(phone);if(err){if(st.step===4){st.step=3;update()}planFail(err);return}}}
    if(st.step===4&&!DB.freeSlots(DB.iso(days[st.day]),st.svc.t).includes(st.time)){st.step=2;st.time=null;renderSlots();update();$('#bblock2').textContent='Esse horário acabou de ser ocupado. Escolha outro.';return}
    if(st.step===1)renderDays();st.step++;if(st.step===5)saveBooking();if(st.step===4)codeIns.forEach(x=>x.value='');update();if(st.step===4)codeIns[0].focus();if(innerWidth<720)$('.book').scrollIntoView({behavior:reduce?'auto':'smooth'})};
  $('#back').onclick=()=>{st.step--;update()};
  codeIns.forEach((el,i)=>{el.oninput=()=>{el.value=el.value.replace(/\D/g,'');if(el.value&&i<5)codeIns[i+1].focus();update()};
    el.onkeydown=e=>{if(e.key==='Backspace'&&!el.value&&i>0)codeIns[i-1].focus()}});
  $('#btel').oninput=e=>{let d=e.target.value.replace(/\D/g,'').slice(0,11),o='';if(d.length>0)o='('+d.slice(0,2);if(d.length>=2)o+=') ';if(d.length>2)o+=d.slice(2,3)+' ';if(d.length>3)o+=d.slice(3,7);if(d.length>7)o+='-'+d.slice(7);e.target.value=o;update()};
  // vindo da página de horários: ?d=índice&t=HH:MM
  const q=new URLSearchParams(location.search);
  if(q.has('d')){const d=+q.get('d');if(days[d]&&openDay(days[d])){st.svc=SVC.cab[0];st.day=d;st.time=q.get('t');st.step=2;renderSvc();renderDays()}}
  if(q.get('cat')==='ass'){st.cat='ass';$$('#svctabs button').forEach(x=>x.classList.toggle('on',x.dataset.c==='ass'))}
  try{const me=DB.data.clients.find(c=>c.id===localStorage.getItem('athos_me'));if(me&&$('#btel')){$('#bname').value=me.name;$('#btel').value=me.phone.replace(/(\d{2})(\d)(\d{4})(\d{4})/,'($1) $2 $3-$4')}}catch(e){}
  renderSvc();update();
}

/* ===== galeria ===== */
if($('#gal')){
  const items=$$('#gal .gi');
  $$('#gfilters button').forEach(b=>b.onclick=()=>{
    $$('#gfilters button').forEach(x=>x.classList.toggle('on',x===b));
    items.forEach(it=>{const show=b.dataset.f==='all'||it.dataset.cat===b.dataset.f;it.classList.toggle('hide',!show)});
  });
  const lb=$('#lightbox');let cur=0;
  const vis=()=>items.filter(i=>!i.classList.contains('hide'));
  const show=i=>{const v=vis();cur=(i+v.length)%v.length;const it=v[cur];
    $('#lb-title').textContent=it.querySelector('b').textContent;$('#lb-sub').textContent=it.querySelector('.cap').lastChild.textContent;
    $('#lb-count').textContent=`${cur+1} / ${v.length}`;const im=it.dataset.img&&DB.img.get(it.dataset.img),li=$('.lb-img');li.style.background=im?`url(${im}) center/contain no-repeat #000`:'';li.textContent=im?'':'Foto';const f=$('#lb-frame');f.classList.remove('in');void f.offsetWidth;f.classList.add('in')};
  items.forEach(it=>it.onclick=()=>{show(vis().indexOf(it));lb.classList.add('open')});
  $('#lb-prev').onclick=()=>show(cur-1);$('#lb-next').onclick=()=>show(cur+1);
  $('#lb-close').onclick=()=>lb.classList.remove('open');
  lb.onclick=e=>{if(e.target===lb)lb.classList.remove('open')};
  addEventListener('keydown',e=>{if(!lb.classList.contains('open'))return;if(e.key==='Escape')lb.classList.remove('open');if(e.key==='ArrowLeft')show(cur-1);if(e.key==='ArrowRight')show(cur+1)});
}

/* ===== contato: mapa sob demanda ===== */
if($('#map-load'))$('#map-load').onclick=()=>{$('#map').innerHTML='<iframe title="Mapa" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q='+encodeURIComponent(C.address)+'&z=15&output=embed"></iframe>'};

/* ===== contato: mensagem pelo WhatsApp ===== */
if($('#cform')){
  $('#cform').onsubmit=e=>{e.preventDefault();
    const n=$('#cname').value.trim(),m=$('#cmsg').value.trim(),a=$('#csub').value;
    if(!n||!m){$('#cerr').textContent='Preencha nome e mensagem.';return}
    const txt=`Olá, Athos! Sou ${n}. Assunto: ${a}.\n${m}`;
    window.open('https://wa.me/'+C.wa+'?text='+encodeURIComponent(txt),'_blank');
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
