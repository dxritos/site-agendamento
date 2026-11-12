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

/* ===== dados (mock) ===== */
const SVC={
  cab:[{n:'Corte',d:'Lavagem inclusa',p:50,t:45},{n:'Barba',d:'Alinhamento e desenho',p:45,t:30},{n:'Cavanhaque',d:'Assinante R$ 10',p:20,t:15},{n:'Sobrancelha',d:'Assinante R$ 5',p:15,t:5}],
  com:[{n:'Combo Especial',d:'Corte, barba, sobrancelha, lavagem e escova',p:99,t:60},{n:'Corte + Pigmentação',d:'Mais definição',p:75,t:60}],
  ext:[{n:'Selagem',d:'A partir de',p:119.9,t:60},{n:'Hidratação',d:'Lavagem + escova',p:30,t:15},{n:'Lavagem + Escova',d:'Curto e médio',p:20,t:10},{n:'Acabamento',d:'Pezinho e contorno',p:15,t:5}],
  ass:[{n:'Corte (plano)',d:'Incluso no seu plano · seg a qui',p:0,t:45,plan:1},{n:'Corte + Barba (plano)',d:'Incluso no seu plano · seg a qui',p:0,t:60,plan:1}]
};
const WD=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],MO=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const HOURS={1:[9,19],2:[9,19],3:[9,19],4:[9,19],5:[9,20],6:[8,12]};
const today=new Date();today.setHours(0,0,0,0);
const days=Array.from({length:7},(_,i)=>{const d=new Date(today);d.setDate(d.getDate()+i);return d});
function slotsFor(d){
  const h=HOURS[d.getDay()];if(!h)return[];
  const out=[];let seed=d.getDate()*7+d.getMonth();
  for(let m=h[0]*60;m<h[1]*60;m+=30){seed=(seed*9301+49297)%233280;if(seed/233280>.55)out.push(`${String(m/60|0).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`)}
  if(d.getTime()===today.getTime()){const now=new Date();return out.filter(s=>+s.slice(0,2)*60+ +s.slice(3)>now.getHours()*60+now.getMinutes()+30)}
  return out;
}

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
    const s=slotsFor(d),wd=d.getDay(),closed=!HOURS[wd],member=wd>=1&&wd<=4;
    const tag=closed?'':`<span class="wtag ${member?'':'x'}">${member?'Válido para assinantes':'Somente avulso'}</span>`;
    const body=closed?'<span class="none">Fechado</span>':s.length?s.slice(0,6).map(t=>`<a class="slot" href="agendar.html?d=${i}&t=${t}">${t}</a>`).join('')+(s.length>6?`<a class="more" href="agendar.html?d=${i}">+${s.length-6} horários</a>`:''):'<span class="none">Sem horários livres</span>';
    return `<div class="wrow"><div class="dbox"><small>${i===0?'Hoje':WD[wd]}</small><b>${d.getDate()}</b><small>${MO[d.getMonth()]}</small></div><div class="wslots">${tag}${body}</div></div>`;
  }).join('');
}

/* ===== agendamento ===== */
if($('#svclist')){
  const st={cat:'cab',svc:null,day:null,time:null,step:1};
  const validDay=d=>HOURS[d.getDay()]&&(!st.svc||!st.svc.plan||(d.getDay()>=1&&d.getDay()<=4));
  const dayLabel=i=>{const d=days[i];return `${i===0?'Hoje':WD[d.getDay()]}, ${d.getDate()} de ${MO[d.getMonth()]}`};
  const codeIns=$$('#code input');
  function renderSvc(){
    $('#svclist').innerHTML=SVC[st.cat].map((s,i)=>`<button class="svc ${st.svc&&st.svc.n===s.n?'on':''}" data-i="${i}"><div><strong>${s.n}</strong><small>${s.d} · ${s.t} min</small></div><div class="pr"><b>${s.plan?'Incluso':brl(s.p)}</b>${s.plan?'<small class="mem">R$ 0,00</small>':''}</div></button>`).join('');
    $$('#svclist .svc').forEach(b=>b.onclick=()=>{st.svc=SVC[st.cat][b.dataset.i];if(st.day!==null&&!validDay(days[st.day])){st.day=null;st.time=null}renderSvc();update()});
  }
  $$('#svctabs button').forEach(b=>b.onclick=()=>{st.cat=b.dataset.c;$$('#svctabs button').forEach(x=>x.classList.toggle('on',x===b));renderSvc()});
  function renderDays(){
    if(st.day===null){const f=days.findIndex(validDay);if(f>-1)st.day=f}
    $('#days').innerHTML=days.map((d,i)=>`<button class="day ${st.day===i?'on':''}" data-i="${i}" ${validDay(d)?'':'disabled'}><small>${i===0?'Hoje':WD[d.getDay()]}</small><b>${d.getDate()}</b><small>${MO[d.getMonth()]}</small></button>`).join('');
    $$('#days .day').forEach(b=>b.onclick=()=>{st.day=+b.dataset.i;st.time=null;renderDays();update()});
    $('#hint').style.display=st.svc&&st.svc.plan?'flex':'none';
    renderSlots();
  }
  function renderSlots(){
    if(st.day===null){$('#slots').innerHTML='';return}
    const s=slotsFor(days[st.day]);
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
  $('#next').onclick=()=>{if(st.step===1)renderDays();st.step++;if(st.step===4)codeIns.forEach(x=>x.value='');update();if(st.step===4)codeIns[0].focus();if(innerWidth<720)$('.book').scrollIntoView({behavior:reduce?'auto':'smooth'})};
  $('#back').onclick=()=>{st.step--;update()};
  codeIns.forEach((el,i)=>{el.oninput=()=>{el.value=el.value.replace(/\D/g,'');if(el.value&&i<5)codeIns[i+1].focus();update()};
    el.onkeydown=e=>{if(e.key==='Backspace'&&!el.value&&i>0)codeIns[i-1].focus()}});
  $('#btel').oninput=e=>{let d=e.target.value.replace(/\D/g,'').slice(0,11),o='';if(d.length>0)o='('+d.slice(0,2);if(d.length>=2)o+=') ';if(d.length>2)o+=d.slice(2,3)+' ';if(d.length>3)o+=d.slice(3,7);if(d.length>7)o+='-'+d.slice(7);e.target.value=o;update()};
  // vindo da página de horários: ?d=índice&t=HH:MM
  const q=new URLSearchParams(location.search);
  if(q.has('d')){const d=+q.get('d');if(days[d]&&HOURS[days[d].getDay()]){st.svc=SVC.cab[0];st.day=d;st.time=q.get('t');st.step=2;renderSvc();renderDays()}}
  if(q.get('cat')==='ass'){st.cat='ass';$$('#svctabs button').forEach(x=>x.classList.toggle('on',x.dataset.c==='ass'))}
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
    $('#lb-count').textContent=`${cur+1} / ${v.length}`;const f=$('#lb-frame');f.classList.remove('in');void f.offsetWidth;f.classList.add('in')};
  items.forEach(it=>it.onclick=()=>{show(vis().indexOf(it));lb.classList.add('open')});
  $('#lb-prev').onclick=()=>show(cur-1);$('#lb-next').onclick=()=>show(cur+1);
  $('#lb-close').onclick=()=>lb.classList.remove('open');
  lb.onclick=e=>{if(e.target===lb)lb.classList.remove('open')};
  addEventListener('keydown',e=>{if(!lb.classList.contains('open'))return;if(e.key==='Escape')lb.classList.remove('open');if(e.key==='ArrowLeft')show(cur-1);if(e.key==='ArrowRight')show(cur+1)});
}

/* ===== contato: mapa sob demanda ===== */
if($('#map-load'))$('#map-load').onclick=()=>{$('#map').innerHTML='<iframe title="Mapa" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=Av.%20Bom%20Jardim%2C%20Parauapebas%20-%20PA&z=15&output=embed"></iframe>'};

/* ===== contato: mensagem pelo WhatsApp ===== */
if($('#cform')){
  $('#cform').onsubmit=e=>{e.preventDefault();
    const n=$('#cname').value.trim(),m=$('#cmsg').value.trim(),a=$('#csub').value;
    if(!n||!m){$('#cerr').textContent='Preencha nome e mensagem.';return}
    const txt=`Olá, Athos! Sou ${n}. Assunto: ${a}.\n${m}`;
    window.open('https://wa.me/5594981248772?text='+encodeURIComponent(txt),'_blank');
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
