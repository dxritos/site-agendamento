/* painel.html */
/* ================= utilidades ================= */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const db=DB.data;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const NF2=new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}),NF0=new Intl.NumberFormat('pt-BR',{maximumFractionDigits:0}),TF=new Intl.DateTimeFormat('pt-BR',{hour:'2-digit',minute:'2-digit'});
const money=v=>'R$ '+NF2.format(Number(v||0));
const money0=v=>'R$ '+NF0.format(Number(v||0));
const WD=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],WDF=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'],MO=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'],MOF=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const today=new Date();today.setHours(0,0,0,0);const TODAY=DB.iso(today);
const addD=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const fmtD=s=>s?s.slice(8,10)+'/'+s.slice(5,7):'—';
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2600)};
/* erro de validação ao lado do campo: mensagem anunciada, campo marcado e focado; some ao corrigir */
const fieldErr=(sel,msg)=>{const el=$(sel),ctl=el.matches('input,select,textarea');if(el._err)el._err.remove();const m=document.createElement('div');m.className='ferr';m.id='err-'+el.id;m.setAttribute('role','alert');m.textContent=msg;
  const fl=el.closest('.fl');if(fl)fl.append(m);else(el.closest('.two,.three,.fix')||el).after(m);el._err=m;el.setAttribute('aria-describedby',m.id);if(ctl)el.setAttribute('aria-invalid','true');(ctl?el:el.querySelector('button,input')||el).focus();
  const clr=()=>{m.remove();el._err=null;el.removeAttribute('aria-invalid');el.removeAttribute('aria-describedby')};['input','change','click'].forEach(ev=>el.addEventListener(ev,clr,{once:true}))};
const client=id=>db.clients.find(c=>c.id===id);
const cname=id=>(client(id)||{}).name||'—';
const plan=id=>DB.plan(id);
const plural=(n,a,b)=>n+' '+(n===1?a:b);
const phoneFmt=p=>{const d=String(p||'').replace(/\D/g,'');return d.length===11?`(${d.slice(0,2)}) ${d[2]} ${d.slice(3,7)}-${d.slice(7)}`:p};
const nextBill=s=>DB.nextBill(s);
const price=s=>DB.subPrice(s);
const sw=(id,on,dis)=>`<label class="sw"><input type="checkbox" id="${id}" ${on?'checked':''} ${dis?'disabled':''}><span></span></label>`;
const timeOpts=(sel,from=7*60,to=21*60,step=15)=>{let o='';for(let m=from;m<=to;m+=step){const t=DB.toHM(m);o+=`<option ${t===sel?'selected':''}>${t}</option>`}return o};
function mutMany(keys,fn,desc,area){if(!DB.mutateMany(keys,fn,desc,area))toast('Sem espaço no navegador para salvar');render();toast(desc)}
function change(key,fn,desc,area){if(!DB.mutate(key,fn,desc,area))toast('Sem espaço no navegador para salvar');render();toast(desc)}
const cell=v=>{v=String(v??'');if(/^[=+\-@\t\r]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"'};
const csv=(head,rows)=>'\ufeff'+[head,...rows].map(r=>r.map(cell).join(';')).join('\n');
function download(name,content,type){const b=new Blob([content],{type});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

/* ================= modal genérico ================= */
/* acessibilidade: liga cada rótulo ao seu campo e dá nome a botões só com ícone */
function a11y(root){root.querySelectorAll('.fl').forEach(f=>{const l=f.querySelector('label'),i=f.querySelector('input,select,textarea');if(l&&i){if(!i.id)i.id='f'+DB.uid();l.htmlFor=i.id}});
  root.querySelectorAll('input[placeholder]:not([aria-label]),textarea[placeholder]:not([aria-label])').forEach(i=>{if(!(i.id&&document.querySelector('label[for="'+i.id+'"]')))i.setAttribute('aria-label',i.placeholder)});
  root.querySelectorAll('.rm').forEach(b=>b.setAttribute('aria-label','Remover'));
  root.querySelectorAll('.sw input').forEach(i=>{if(!i.getAttribute('aria-label')){const t=(i.closest('tr,.set,.msg,h3,.hrow')||{}).textContent||'';i.setAttribute('aria-label','Ativar: '+t.trim().replace(/\s+/g,' ').slice(0,40))}});
  root.querySelectorAll('.opts4 .opt').forEach(o=>{o.tabIndex=0;if(!o.getAttribute('role'))o.setAttribute('role','button')})}
let lastFocus=null;
function modal(html,wide){lastFocus=document.activeElement;$('#mbox').className='mbox'+(wide?' wide':'');$('#mbox').innerHTML='<button class="x" data-close aria-label="Fechar">&times;</button>'+html;const m=$('#modal');m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.classList.add('open');a11y($('#mbox'));setTimeout(()=>{const f=$('#mbox input:not([type=hidden]),#mbox select,#mbox textarea,#mbox button:not(.x)');(f||$('#mbox .x')).focus()},30)}
const closeModal=()=>{if(!$('#modal').classList.contains('open'))return;$('#modal').classList.remove('open');if(lastFocus&&lastFocus.focus&&document.contains(lastFocus))lastFocus.focus()};
document.addEventListener('click',e=>{if(e.target.closest('[data-close]')||e.target.id==='modal')closeModal();const o=e.target.closest('.opts4 .opt');if(o)[...o.parentNode.children].forEach(x=>x.classList.toggle('on',x===o))});
addEventListener('keydown',e=>{
  if(e.key==='Escape')closeModal();
  if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('[role="button"],[role="radio"]')){e.preventDefault();e.target.click()}
  if(e.key==='Tab'&&$('#modal').classList.contains('open')){const f=[...$('#mbox').querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"]')].filter(x=>!x.disabled&&x.offsetParent!==null);if(!f.length)return;const a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}
});
function confirmBox(title,text,label,fn,danger=true){modal(`<h3>${title}</h3><p>${text}</p><div class="mact"><button class="btn btn-ghost" data-close>Voltar</button><button class="btn ${danger?'btn-danger':'btn-primary'}" id="cf-ok">${label}</button></div>`);$('#cf-ok').onclick=()=>{closeModal();fn()}}

/* ================= navegação ================= */
const I={
 hoje:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
 agenda:'<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>',
 clientes:'<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
 assinantes:'<path d="M12 2l2.4 7.2H22l-6 4.6 2.3 7.2-6.3-4.5-6.3 4.5L8 13.8 2 9.2h7.6z"/>',
 financeiro:'<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
 servicos:'<path d="M6 3l12 9-5 1 3 6-2 1-3-6-4 4z"/>',
 conteudo:'<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/>',
 mensagens:'<path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z"/>',
 equipe:'<circle cx="9" cy="8" r="4"/><path d="M2 21a7 7 0 0 1 14 0M16 4a4 4 0 0 1 0 8M22 21a7 7 0 0 0-4-6.3"/>',
 historico:'<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
 config:'<circle cx="12" cy="12" r="3"/><path d="M12 1v3M12 20v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M1 12h3M20 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1"/>'};
const NAV=[['Operação',[['hoje','Hoje'],['agenda','Agenda'],['clientes','Clientes'],['assinantes','Assinantes']]],['Gestão',[['financeiro','Financeiro'],['servicos','Serviços e planos']]],['Site',[['conteudo','Conteúdo do site'],['mensagens','Mensagens WhatsApp']]],['Sistema',[['equipe','Equipe e permissões'],['historico','Histórico'],['config','Configurações']]]];
let VIEW=(location.hash||'#hoje').slice(1);if(!/^[a-z]+$/.test(VIEW)||!document.getElementById('v-'+VIEW))VIEW='hoje';
function renderNav(){
  const late=db.subs.filter(s=>s.status==='late').length;
  const h=NAV.map(([g,items])=>`<div class="ngrp">${g}</div>`+items.map(([k,n])=>`<button class="tab ${k===VIEW?'on':''}" data-go="${k}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${I[k]}</svg>${n}${k==='assinantes'&&late?`<span class="cnt">${late}</span>`:''}</button>`).join('')).join('');
  $('#snav').innerHTML=h;$('#mnav').innerHTML=h;
}
function go(k){if(!VIEWS[k])k='hoje';if(VIEW!==k)history.pushState(null,'','#'+k);VIEW=k;render();scrollTo(0,0)}
addEventListener('hashchange',()=>{const k=(location.hash||'#hoje').slice(1);if(/^[a-z]+$/.test(k)&&VIEWS[k]&&k!==VIEW){VIEW=k;render()}});
document.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g){go(g.dataset.go);if(g.dataset.filter){subFilter=g.dataset.filter;render()}}});

/* ================= HOJE ================= */
const ST={done:['Concluído','c-dim'],now:['Em atendimento','c-ok'],conf:['Confirmado','c-info'],pend:['Aguardando','c-warn'],miss:['Faltou','c-bad'],cancel:['Cancelado','c-dim'],block:['Bloqueado','c-dim']};
function vHoje(){
  const list=db.appts.filter(a=>a.date===TODAY&&a.status!=='cancel').sort((a,b)=>a.start.localeCompare(b.start));
  const svc=list.filter(a=>a.status!=='block');
  const ok=db.subs.filter(s=>s.status==='ok'),late=db.subs.filter(s=>s.status==='late');
  const mrr=ok.reduce((t,s)=>t+price(s),0),lateV=late.reduce((t,s)=>t+price(s),0);
  const avToday=db.tx.filter(t=>t.date===TODAY&&t.kind!=='plano'&&t.status==='ok').reduce((t,x)=>t+x.value,0);
  const pend=db.appts.filter(a=>a.status==='pend'&&a.date>=TODAY);
  const hol=db.holidays.find(h=>h.date===TODAY);
  const hr=new Date().getHours();
  return `<div class="top"><div><h1>${hr<12?'Bom dia':hr<18?'Boa tarde':'Boa noite'}, Farias</h1><p>${WDF[today.getDay()]}, ${today.getDate()} de ${MOF[today.getMonth()]}${hol?' · Feriado: '+esc(hol.name):''}</p></div>
   <div class="acts"><button class="btn btn-ghost" data-act="block"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></svg>Bloquear horário</button><button class="btn btn-primary" data-act="new-appt"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>Encaixe</button></div></div>
  <div class="kpis">
    <div class="card kpi"><small>Atendimentos hoje</small><b>${svc.length}</b><span>${svc.filter(a=>a.status==='done').length} concluídos · ${svc.filter(a=>a.plan).length} de assinantes</span></div>
    <div class="card kpi"><small>Avulso recebido hoje</small><b>${money0(avToday)}</b><span>${svc.filter(a=>!a.plan).length} atendimentos avulsos</span></div>
    <div class="card kpi"><small>Assinantes ativos</small><b>${ok.length}</b><span>${db.subs.filter(s=>s.status==='paused').length} pausados</span></div>
    <div class="card kpi"><small>Receita recorrente</small><b>${money0(mrr)}</b><span>por mês</span></div>
    <div class="card kpi"><small>Pagamentos pendentes</small><b class="${late.length?'dn':''}">${late.length}</b><span class="${late.length?'dn':''}">${money0(lateV)} em aberto</span></div>
  </div>
  <div class="g21">
    <div class="card box"><h3>Agenda de hoje</h3>${list.length?list.map(apptRow).join(''):`<p class="empty">${hol?'Feriado — barbearia fechada.':'Nenhum horário marcado para hoje.'}</p>`}</div>
    <div>
      <div class="card box"><h3>Precisa da sua atenção</h3>
        ${late.length?`<div class="al"><div class="ic" style="background:var(--bad-bg);color:var(--bad)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg></div><div><b>${plural(late.length,'assinante','assinantes')} com pagamento pendente</b><span>${late.map(s=>esc(cname(s.cid))).join(', ')}</span><br><button class="btn btn-ghost btn-sm" data-go="assinantes" data-filter="late">Ver e corrigir</button></div></div>`:''}
        ${pend.length?`<div class="al"><div class="ic" style="background:var(--warn-bg);color:var(--warn)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></div><div><b>${plural(pend.length,'horário aguardando','horários aguardando')} confirmação</b><span>${pend.slice(0,2).map(a=>esc(cname(a.cid))+' · '+fmtD(a.date)+' '+a.start).join(' · ')}</span></div></div>`:''}
        ${db.content.notice_on?`<div class="al"><div class="ic" style="background:var(--teal-bg);color:var(--teal)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l18-8v18L3 13z"/></svg></div><div><b>Aviso ativo no site</b><span>${esc(db.content.notice)}</span><br><button class="btn btn-ghost btn-sm" data-go="conteudo">Editar</button></div></div>`:''}
        ${!late.length&&!pend.length&&!db.content.notice_on?'<p class="empty">Tudo em dia.</p>':''}
      </div>
      <div class="card box"><h3>Últimas alterações <small><a href="#historico" data-go="historico" style="color:var(--teal-2);display:inline-flex;align-items:center;min-height:24px">ver tudo</a></small></h3>
        <div class="hist-mini">${db.log.slice().sort((a,b)=>b.t-a.t).slice(0,5).map(l=>`<div><span>${esc(l.desc)}</span><span>${TF.format(new Date(l.t))}</span></div>`).join('')||'<p class="empty">Sem alterações.</p>'}</div>
      </div>
    </div>
  </div>`;
}
function apptRow(a){
  if(a.status==='block')return `<div class="ti done"><div class="h">${a.start}</div><div class="inf"><strong>Bloqueado</strong><span>${esc(a.note||'Horário bloqueado')} · ${a.dur} min</span></div><div class="r"><button class="btn btn-ghost btn-sm" data-edit="${a.id}">Editar</button></div></div>`;
  return `<div class="ti ${a.status==='done'||a.status==='miss'?'done':''} ${a.status==='now'?'now':''}"><div class="h">${a.start}</div>
   <div class="inf"><strong>${esc(cname(a.cid))}</strong><span>${esc(a.svc)} · ${a.plan?'<span style="color:var(--teal-2)">Assinante</span>':money(a.price)}${a.note?' · '+esc(a.note):''}</span></div>
   <div class="r"><span class="chip ${ST[a.status][1]}">${ST[a.status][0]}</span>${['conf','now','pend'].includes(a.status)?`<button class="btn btn-ghost btn-sm" data-st="done" data-id="${a.id}">Concluir</button>${a.status!=='now'?`<button class="btn btn-danger btn-sm" data-st="miss" data-id="${a.id}">Faltou</button>`:''}`:''}<button class="btn btn-ghost btn-sm" data-edit="${a.id}">Editar</button></div></div>`;
}
document.addEventListener('click',e=>{
  const b=e.target.closest('[data-st]');if(b){const a=db.appts.find(x=>x.id===b.dataset.id);const st=b.dataset.st;
    const nextNow=L=>{const n=L.filter(y=>y.date===TODAY&&y.status==='conf').sort((p,q)=>p.start.localeCompare(q.start))[0];if(n&&!L.some(y=>y.date===TODAY&&y.status==='now'))n.status='now'};
    if(st==='miss'){mutMany(['appts','clients'],d=>{d.appts.find(y=>y.id===a.id).status='miss';const c=d.clients.find(y=>y.id===a.cid);if(c)c.misses=(c.misses||0)+1},`${cname(a.cid)}: falta registrada (${fmtD(a.date)} ${a.start})`,'Agenda');return}
    if(a.plan||!a.price){change('appts',L=>{L.find(y=>y.id===a.id).status='done';nextNow(L)},`${cname(a.cid)}: atendimento concluído (${fmtD(a.date)} ${a.start})`,'Agenda');return}
    const M=['Dinheiro','Pix','Maquininha (débito)','Maquininha (crédito)'];
    modal(`<div class="eyebrow">Concluir atendimento</div><h3>${esc(cname(a.cid))}</h3><p>${esc(a.svc)} · ${money(a.price)}. Como o cliente pagou?</p><div class="opts4" id="cp-met" style="margin-top:16px">${M.map((m,i)=>`<div class="opt pay ${i===0?'on':''}" role="radio" tabindex="0" aria-checked="${i===0}" data-payic="${m}" data-v="${m}">${payIcon(m)}${m.replace('Maquininha ','').replace(/[()]/g,'')}</div>`).join('')}</div>
      <div class="mact"><button class="btn btn-ghost" id="cp-later">Concluir sem pagamento</button><button class="btn btn-primary btn-pay" id="cp-ok" data-paybtn>${payIcon('Dinheiro')}Concluir e registrar</button></div>`);
    $('#cp-ok').onclick=()=>{const m=$('#cp-met .opt.on').dataset.v;closeModal();mutMany(['appts','tx'],d=>{d.appts.find(y=>y.id===a.id).status='done';nextNow(d.appts);d.tx.unshift({id:DB.uid(),date:TODAY,cid:a.cid,desc:a.svc,method:m,value:a.price,kind:'avulso',status:'ok'})},`${cname(a.cid)}: atendimento concluído e ${money(a.price)} recebido (${m})`,'Agenda')};
    $('#cp-later').onclick=()=>{closeModal();change('appts',L=>{L.find(y=>y.id===a.id).status='done';nextNow(L)},`${cname(a.cid)}: atendimento concluído sem pagamento registrado`,'Agenda')}}
  const ed=e.target.closest('[data-edit]');if(ed)editAppt(ed.dataset.edit);
  const ac=e.target.closest('[data-act]');if(ac&&ACT[ac.dataset.act])ACT[ac.dataset.act](ac);
});

/* ================= AGENDA ================= */
let wkOff=0;
function vAgenda(){
  const monday=addD(today,-((today.getDay()+6)%7)+7*wkOff),days=Array.from({length:6},(_,i)=>addD(monday,i));
  const H0=7,H1=21,PX=56;
  let cal='<div></div>'+days.map(d=>{const ds=DB.iso(d),hol=db.holidays.find(h=>h.date===ds);return `<div class="hd ${ds===TODAY?'today':''} ${hol?'hol':''}">${WD[d.getDay()]}${hol?' · feriado':''}<b>${d.getDate()}</b></div>`}).join('');
  cal+='<div class="hcol">'+Array.from({length:H1-H0},(_,i)=>`<div>${String(H0+i).padStart(2,'0')}:00</div>`).join('')+'</div>';
  days.forEach(d=>{
    const ds=DB.iso(d),h=db.hours[d.getDay()],hol=db.holidays.find(x=>x.date===ds);let ev='';
    if(!h||hol)ev+=`<div class="closed" style="top:0;height:${(H1-H0)*PX}px">${hol?esc(hol.name):'Fechado'}</div>`;
    else{const a=DB.toMin(h[0])/60,b=DB.toMin(h[1])/60;
      if(a>H0)ev+=`<div class="closed" style="top:0;height:${(a-H0)*PX}px"></div>`;
      if(b<H1)ev+=`<div class="closed" style="top:${(b-H0)*PX}px;height:${(H1-b)*PX}px">Fechado</div>`;
      if(d.getDay()<=5&&db.lunch)ev+=`<div class="ev block" style="top:${(DB.toMin(db.lunch[0])/60-H0)*PX+1}px;height:${(DB.toMin(db.lunch[1])-DB.toMin(db.lunch[0]))/60*PX-3}px;cursor:default"><b>Almoço</b></div>`}
    db.appts.filter(x=>x.date===ds&&x.status!=='cancel').forEach(x=>{
      const top=(DB.toMin(x.start)/60-H0)*PX+1,ht=Math.max(x.dur/60*PX-3,20);
      const cls=x.status==='block'?'block':x.status==='miss'?'miss':x.plan?'plan':'avl';
      ev+=`<button class="ev ${cls} ${x.status==='done'?'done':''}" style="top:${top}px;height:${ht}px" data-edit="${x.id}"><b>${x.start} ${x.status==='block'?'Bloqueado':esc(cname(x.cid))}</b>${ht>30?esc(x.status==='block'?(x.note||''):x.svc):''}</button>`});
    cal+=`<div class="dcol" style="height:${(H1-H0)*PX}px">${ev}</div>`;
  });
  return `<div class="top"><div><h1>Agenda</h1><p>${days[0].getDate()} de ${MOF[days[0].getMonth()]} a ${days[5].getDate()} de ${MOF[days[5].getMonth()]}</p></div>
   <div class="acts"><button class="btn btn-ghost btn-sm" data-act="wk" data-d="-1">‹ Anterior</button><button class="btn btn-ghost btn-sm" data-act="wk" data-d="0">Hoje</button><button class="btn btn-ghost btn-sm" data-act="wk" data-d="1">Próxima ›</button><button class="btn btn-ghost btn-sm" data-act="block">Bloquear horário</button><button class="btn btn-primary btn-sm" data-act="new-appt">+ Encaixe</button></div></div>
  <div class="card box"><div class="legend" style="margin-bottom:14px"><span><i style="background:var(--teal)"></i>Assinante</span><span><i style="background:var(--info)"></i>Avulso</span><span><i style="background:var(--bad)"></i>Faltou</span><span><i style="background:var(--dim)"></i>Bloqueado</span><span class="hint">Clique num horário para editar, remarcar ou cancelar.</span></div>
  <div class="cal-wrap"><div class="cal">${cal}</div></div></div>`;
}
const svcOpts=sel=>(sel&&!db.services.some(s=>s.n===sel)&&sel!=='Corte + Barba'?`<option selected>${esc(sel)}</option>`:'')+db.services.map(s=>`<option ${s.n===sel?'selected':''}>${esc(s.n)}</option>`).join('')+['Corte + Barba'].filter(n=>!db.services.some(s=>s.n===n)).map(n=>`<option ${n===sel?'selected':''}>${n}</option>`).join('');
const clientOpts=sel=>db.clients.map(c=>`<option value="${c.id}" ${c.id===sel?'selected':''}>${esc(c.name)} · ${phoneFmt(c.phone)}</option>`).join('');
const svcInfo=n=>{const s=db.services.find(x=>x.n===n);return s?{p:s.p,t:s.t}:n==='Corte + Barba'?{p:95,t:60}:{p:0,t:45}};
function editAppt(id){
  const a=db.appts.find(x=>x.id===id);if(!a)return;
  if(a.status==='block'){
    modal(`<div class="eyebrow">Bloqueio</div><h3>Editar bloqueio</h3><div class="form"><div class="three"><div class="fl"><label>Data</label><input class="inp" type="date" id="f-date" value="${a.date}"></div><div class="fl"><label>Início</label><select class="inp" id="f-start">${timeOpts(a.start)}</select></div><div class="fl"><label>Duração</label><select class="inp" id="f-dur">${[30,60,90,120,180,240,600].map(m=>`<option value="${m}" ${m===a.dur?'selected':''}>${m>=600?'Dia inteiro':m/60>=1?(m/60)+' h':m+' min'}</option>`).join('')}</select></div></div><div class="fl"><label>Motivo</label><input class="inp" id="f-note" value="${esc(a.note)}"></div></div>
    <div class="mact"><button class="btn btn-danger" id="f-del">Remover bloqueio</button><button class="btn btn-primary" id="f-save">Salvar</button></div>`);
    $('#f-save').onclick=()=>{closeModal();change('appts',L=>{const x=L.find(y=>y.id===id);x.date=$('#f-date').value;x.start=$('#f-start').value;x.dur=+$('#f-dur').value;x.note=$('#f-note').value},`Bloqueio alterado (${fmtD(a.date)} ${a.start})`,'Agenda')};
    $('#f-del').onclick=()=>{closeModal();change('appts',L=>L.splice(L.findIndex(y=>y.id===id),1),`Bloqueio removido (${fmtD(a.date)} ${a.start})`,'Agenda')};return;
  }
  const c=client(a.cid)||{};
  modal(`<div class="eyebrow">Agendamento</div><h3>${esc(c.name)}</h3><p>${phoneFmt(c.phone)} · ${a.origin==='site'?'agendado pelo site':'lançado pelo painel'}</p>
   <div class="form">
     <div class="two"><div class="fl"><label>Serviço</label><select class="inp" id="f-svc">${svcOpts(a.svc)}</select></div><div class="fl"><label>Status</label><select class="inp" id="f-st">${Object.entries(ST).filter(([k])=>k!=='block').map(([k,v])=>`<option value="${k}" ${k===a.status?'selected':''}>${v[0]}</option>`).join('')}</select></div></div>
     <div class="three"><div class="fl"><label>Data</label><input class="inp" type="date" id="f-date" value="${a.date}"></div><div class="fl"><label>Horário</label><select class="inp" id="f-start">${timeOpts(a.start)}</select></div><div class="fl"><label>Valor (R$)</label><input class="inp" id="f-price" type="number" step="0.01" value="${a.price}"></div></div>
     <label style="display:flex;gap:10px;align-items:center;font-size:14px">${sw('f-plan',a.plan)} Usar plano do assinante (R$ 0)</label>
     <div class="fl"><label>Observação interna</label><input class="inp" id="f-note" value="${esc(a.note)}" placeholder="Só a equipe vê"></div>
   </div>
   <div class="mact"><button class="btn btn-danger" id="f-cancel">Cancelar horário</button><button class="btn btn-ghost" id="f-wa">Avisar no WhatsApp</button><button class="btn btn-primary" id="f-save">Salvar</button></div>`);
  $('#f-svc').onchange=()=>{const s=svcInfo($('#f-svc').value);if(!$('#f-plan').checked)$('#f-price').value=s.p};
  $('#f-plan').onchange=()=>{$('#f-price').value=$('#f-plan').checked?0:svcInfo($('#f-svc').value).p};
  $('#f-save').onclick=()=>{const nd=$('#f-date').value,ns=$('#f-start').value,svcCh=$('#f-svc').value!==a.svc,dur=svcCh?svcInfo($('#f-svc').value).t:a.dur,moved=nd!==a.date||ns!==a.start||dur!==a.dur,newSt=$('#f-st').value;
    const clash=db.appts.find(x=>x.id!==id&&x.date===nd&&!['cancel'].includes(x.status)&&DB.toMin(x.start)<DB.toMin(ns)+dur&&DB.toMin(x.start)+x.dur>DB.toMin(ns));
    const hol=db.holidays.find(h=>h.date===nd),open=db.hours[new Date(nd+'T00:00').getDay()],planErr=$('#f-plan').checked&&(!a.plan||moved||svcCh)?DB.planCheck(a.cid,nd,$('#f-svc').value,id):null;
    const warn=clash?`Já existe ${clash.status==='block'?'um bloqueio':'o horário de '+esc(cname(clash.cid))} às ${clash.start} nesse dia.`:hol?`${fmtD(nd)} está fechado (${esc(hol.name)}).`:!open?'A barbearia não abre nesse dia.':(DB.toMin(ns)<DB.toMin(open[0])||DB.toMin(ns)+dur>DB.toMin(open[1]))?`Fora do horário de funcionamento (${open[0]} – ${open[1]}).`:nd<TODAY&&moved?'A data escolhida já passou.':planErr?'Regra do plano: '+esc(planErr):'';
    const doSave=()=>{closeModal();
    mutMany(['appts','clients'],d=>{const x=d.appts.find(y=>y.id===id);Object.assign(x,{svc:$('#f-svc').value,status:newSt,date:nd,start:ns,price:+$('#f-price').value,plan:$('#f-plan').checked,note:$('#f-note').value,dur});
      if(newSt==='miss'&&a.status!=='miss'){const cl=d.clients.find(y=>y.id===a.cid);if(cl)cl.misses=(cl.misses||0)+1}},
      moved?`${c.name}: remarcado de ${fmtD(a.date)} ${a.start} para ${fmtD(nd)} ${ns}`:`${c.name}: agendamento de ${fmtD(a.date)} ${a.start} editado`,'Agenda')};
    if(warn&&(moved||planErr))confirmBox('Atenção',warn+' Salvar mesmo assim?','Salvar assim mesmo',doSave,false);else doSave()};
  $('#f-cancel').onclick=()=>confirmBox('Cancelar horário?',`${esc(c.name)} · ${fmtD(a.date)} às ${a.start}. O horário volta a ficar livre no site.`,'Cancelar horário',()=>change('appts',L=>{L.find(y=>y.id===id).status='cancel'},`${c.name}: horário de ${fmtD(a.date)} ${a.start} cancelado`,'Agenda'));
  $('#f-wa').onclick=()=>window.open(`https://wa.me/55${String(c.phone).replace(/\D/g,'')}?text=${encodeURIComponent(`Oi, ${c.name}! Sobre seu horário de ${fmtD(a.date)} às ${a.start}:`)}`,'_blank','noopener');
}
const ACT={
  wk:b=>{const d=+b.dataset.d;wkOff=d===0?0:wkOff+d;render()},
  'new-appt':()=>{
    modal(`<div class="eyebrow">Encaixe</div><h3>Novo agendamento</h3><p>Cliente que ligou, mandou mensagem ou chegou sem horário.</p>
     <div class="form"><div class="fl"><label>Cliente</label><select class="inp" id="n-cli"><option value="">+ Novo cliente</option>${clientOpts()}</select></div>
     <div class="two" id="n-newc"><input class="inp" id="n-name" placeholder="Nome"><input class="inp" id="n-phone" placeholder="WhatsApp com DDD"></div>
     <div class="three"><div class="fl"><label>Serviço</label><select class="inp" id="n-svc">${svcOpts('Corte')}</select></div><div class="fl"><label>Data</label><input class="inp" type="date" id="n-date" value="${TODAY}"></div><div class="fl"><label>Horário</label><select class="inp" id="n-time"></select></div></div>
     <p class="hint" id="n-hint"></p></div>
     <div class="mact"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="n-save">Adicionar à agenda</button></div>`);
    const fill=()=>{const s=svcInfo($('#n-svc').value),f=DB.freeSlots($('#n-date').value,s.t);$('#n-time').innerHTML=f.length?f.map(t=>`<option>${t}</option>`).join(''):'<option value="">Sem horário livre</option>';$('#n-hint').textContent=f.length?`${f.length} horários livres nesse dia.`:'Dia fechado, feriado ou lotado.'};
    $('#n-cli').onchange=()=>$('#n-newc').style.display=$('#n-cli').value?'none':'';
    $('#n-svc').onchange=fill;$('#n-date').onchange=fill;fill();
    $('#n-save').onclick=()=>{let cid=$('#n-cli').value;const t=$('#n-time').value;if(!t)return fieldErr('#n-time','Escolha um horário livre');
      if(!cid){const nm=$('#n-name').value.trim();if(!nm)return toast('Informe o nome do cliente');cid='c'+DB.uid();DB.mutate('clients',L=>L.push({id:cid,name:nm,phone:$('#n-phone').value.replace(/\D/g,''),notes:'',blocked:false,misses:0,since:MO[today.getMonth()]+'/'+String(today.getFullYear()).slice(2)}),`Cliente ${nm} cadastrado`,'Clientes')}
      const s=svcInfo($('#n-svc').value),ds=$('#n-date').value,isPlanSvc=/^corte( \+ barba)?$/i.test($('#n-svc').value),usePlan=isPlanSvc&&!DB.planCheck(cid,ds,$('#n-svc').value);
      closeModal();change('appts',L=>L.push({id:DB.uid(),date:$('#n-date').value,start:t,dur:s.t,cid,svc:$('#n-svc').value,price:usePlan?0:s.p,plan:usePlan,status:'conf',note:'Encaixe',origin:'painel'}),`Encaixe: ${cname(cid)} em ${fmtD($('#n-date').value)} às ${t}`,'Agenda')};
  },
  block:()=>{
    modal(`<div class="eyebrow">Agenda</div><h3>Bloquear horário</h3><p>O horário some do agendamento online. Use para almoço, compromisso ou folga.</p>
     <div class="form"><div class="three"><div class="fl"><label>Data</label><input class="inp" type="date" id="b-date" value="${TODAY}"></div><div class="fl"><label>Início</label><select class="inp" id="b-start">${timeOpts('14:00')}</select></div><div class="fl"><label>Duração</label><select class="inp" id="b-dur"><option value="30">30 min</option><option value="60" selected>1 h</option><option value="120">2 h</option><option value="240">4 h</option><option value="600">Resto do dia</option></select></div></div>
     <div class="fl"><label>Motivo (só a equipe vê)</label><input class="inp" id="b-note" placeholder="Ex.: dentista"></div></div>
     <div class="mact"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="b-save">Bloquear</button></div>`);
    $('#b-save').onclick=()=>{const dt=$('#b-date').value,st=$('#b-start').value,clash=db.appts.filter(a=>a.date===dt&&a.status!=='cancel'&&a.status!=='block'&&DB.toMin(a.start)<DB.toMin(st)+ +$('#b-dur').value&&DB.toMin(a.start)+a.dur>DB.toMin(st));
      const go2=()=>{closeModal();change('appts',L=>L.push({id:DB.uid(),date:dt,start:st,dur:+$('#b-dur').value,cid:null,svc:'Bloqueado',price:0,plan:false,status:'block',note:$('#b-note').value,origin:'painel'}),`Horário bloqueado em ${fmtD(dt)} a partir de ${st}`,'Agenda')};
      if(clash.length)confirmBox('Já há clientes nesse período',clash.map(a=>esc(cname(a.cid))+' às '+a.start).join(', ')+'. Bloquear mesmo assim? Os horários deles continuam marcados.','Bloquear assim mesmo',go2,false);else go2()};
  },
};

/* ================= CLIENTES ================= */
let cliF='all',cliQ='';
function vClientes(){
  const visits=id=>db.appts.filter(a=>a.cid===id&&a.status==='done').length;
  const rows=db.clients.filter(c=>(cliF==='all'||(cliF==='blocked'&&c.blocked)||(cliF==='miss'&&c.misses>0))&&(c.name.toLowerCase().includes(cliQ)||c.phone.includes(cliQ.replace(/\D/g,'')||'#')));
  const dupPhones=db.clients.map(c=>c.phone).filter((p,i,a)=>a.indexOf(p)!==i);
  return `<div class="top"><div><h1>Clientes</h1><p>${db.clients.length} cadastrados. Clique para ver a ficha, corrigir dados ou mesclar.</p></div><div class="acts"><button class="btn btn-ghost btn-sm" data-act="exp-cli">Exportar planilha</button><button class="btn btn-primary btn-sm" data-act="new-cli">+ Novo cliente</button></div></div>
  ${dupPhones.length?`<div class="al" style="margin-bottom:14px"><div class="ic" style="background:var(--warn-bg);color:var(--warn)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg></div><div><b>Possível cadastro duplicado</b><span>${db.clients.filter(c=>dupPhones.includes(c.phone)).map(c=>esc(c.name)).join(' e ')} usam o mesmo número. Abra a ficha e use "Mesclar".</span></div></div>`:''}
  <div class="card box"><div class="filters"><button class="fbtn ${cliF==='all'?'on':''}" data-cf="all">Todos</button><button class="fbtn ${cliF==='miss'?'on':''}" data-cf="miss">Com faltas</button><button class="fbtn ${cliF==='blocked'?'on':''}" data-cf="blocked">Bloqueados</button><input class="inp search" id="cli-q" placeholder="Buscar nome ou telefone…" value="${esc(cliQ)}"></div>
  <div class="tw"><table><thead><tr><th>Cliente</th><th>Plano</th><th>Atendimentos</th><th>Faltas</th><th>Cliente desde</th><th>Status</th></tr></thead><tbody>
  ${rows.map(c=>{const s=db.subs.find(x=>x.cid===c.id&&x.status!=='off');return `<tr class="click" data-cli="${c.id}"><td><button type="button" class="rowbtn" data-cli="${c.id}">${esc(c.name)}</button><small>${phoneFmt(c.phone)}</small></td><td>${s?esc(plan(s.plan).n):'<span class="hint">Avulso</span>'}</td><td>${visits(c.id)}</td><td>${c.misses?`<span class="dn">${c.misses}</span>`:'0'}</td><td>${esc(c.since)}</td><td>${c.blocked?'<span class="chip c-bad">Bloqueado</span>':'<span class="chip c-ok">Ativo</span>'}</td></tr>`}).join('')||'<tr><td colspan="6" class="empty">Nenhum cliente encontrado.</td></tr>'}
  </tbody></table></div></div>`;
}
document.addEventListener('click',e=>{const f=e.target.closest('[data-cf]');if(f){cliF=f.dataset.cf;render()}const r=e.target.closest('[data-cli]');if(r)ficha(r.dataset.cli)});
document.addEventListener('input',e=>{if(e.target.id==='cli-q'){cliQ=e.target.value.toLowerCase();const pos=e.target.selectionStart;render();const i=$('#cli-q');i.focus();i.setSelectionRange(pos,pos)}});
function ficha(id){
  const c=client(id);if(!c)return;const hist=db.appts.filter(a=>a.cid===id&&a.status!=='block').sort((a,b)=>(b.date+b.start).localeCompare(a.date+a.start)).slice(0,8);
  const s=db.subs.find(x=>x.cid===id&&x.status!=='off');
  modal(`<div class="eyebrow">Ficha do cliente</div><h3>${esc(c.name)}</h3><p>Cliente desde ${esc(c.since)}${s?' · Assinante '+esc(plan(s.plan).n):''}</p>
   <div class="form"><div class="two"><div class="fl"><label>Nome</label><input class="inp" id="c-name" value="${esc(c.name)}"></div><div class="fl"><label>WhatsApp</label><input class="inp" id="c-phone" type="tel" inputmode="numeric" autocomplete="off" value="${esc(c.phone)}"></div></div>
   <div class="fl"><label>Observações (só a equipe vê)</label><textarea class="inp" id="c-notes" placeholder="Preferências, alergias…">${esc(c.notes)}</textarea></div>
   <div class="two"><div class="fl"><label>Faltas registradas</label><input class="inp" type="number" min="0" id="c-miss" value="${c.misses||0}"></div><label style="display:flex;gap:10px;align-items:center;font-size:14px;margin-top:18px">${sw('c-block',c.blocked)} Bloquear agendamento online</label></div></div>
   <div class="sec"><h4>Últimos atendimentos</h4><div class="hist-mini">${hist.map(a=>`<div><span>${fmtD(a.date)} ${a.start} · ${esc(a.svc)}</span><span>${ST[a.status][0]}</span></div>`).join('')||'<p class="empty">Sem histórico.</p>'}</div></div>
   <div class="sec"><h4>Mesclar cadastro duplicado</h4><div class="fix"><select class="inp" id="c-merge"><option value="">Escolha o cadastro duplicado…</option>${db.clients.filter(x=>x.id!==id).map(x=>`<option value="${x.id}">${esc(x.name)} · ${phoneFmt(x.phone)}</option>`).join('')}</select><button class="btn btn-ghost btn-sm" id="c-mergebtn">Mesclar neste</button></div><p class="hint">Horários, assinatura e faltas do duplicado passam para esta ficha, e o duplicado é apagado.</p></div>
   <div class="mact"><button class="btn btn-danger" id="c-del">Excluir dados (LGPD)</button><button class="btn btn-primary" id="c-save">Salvar</button></div>`,true);
  $('#c-save').onclick=()=>{closeModal();change('clients',L=>{const x=L.find(y=>y.id===id);Object.assign(x,{name:$('#c-name').value.trim()||x.name,phone:$('#c-phone').value.replace(/\D/g,''),notes:$('#c-notes').value,misses:+$('#c-miss').value,blocked:$('#c-block').checked})},`Ficha de ${c.name} atualizada`,'Clientes')};
  $('#c-mergebtn').onclick=()=>{const o=$('#c-merge').value;if(!o)return fieldErr('#c-merge','Escolha o cadastro duplicado');const on=cname(o);if(DB.activeSub(o)&&DB.activeSub(id))return toast('Os dois cadastros têm assinatura. Cancele uma delas antes de mesclar.');
    confirmBox('Mesclar cadastros?',`Tudo de <b>${esc(on)}</b> passa para <b>${esc(c.name)}</b>, e o cadastro de ${esc(on)} é apagado.`,'Mesclar',()=>{
      mutMany(['appts','subs','tx','clients'],d=>{d.appts.forEach(a=>{if(a.cid===o)a.cid=id});d.tx.forEach(t=>{if(t.cid===o)t.cid=id});d.subs.forEach(a=>{if(a.cid===o)a.cid=id});
        const x=d.clients.find(y=>y.id===id),y=d.clients.find(z=>z.id===o);x.misses=(x.misses||0)+(y.misses||0);if(y.notes)x.notes=(x.notes?x.notes+'\n':'')+y.notes;d.clients.splice(d.clients.indexOf(y),1)},`Cadastro ${on} mesclado em ${c.name} (horários, assinatura e pagamentos)`,'Clientes')},false)};
  $('#c-del').onclick=()=>confirmBox('Excluir dados do cliente?',`Apaga nome, telefone e observações de ${esc(c.name)}, encerra a assinatura e cancela os horários futuros. Os atendimentos passados ficam como "Cliente removido".`,'Excluir',()=>mutMany(['clients','subs','appts'],d=>{Object.assign(d.clients.find(y=>y.id===id),{name:'Cliente removido',phone:'',notes:'',blocked:true});d.subs.forEach(x=>{if(x.cid===id&&x.status!=='off'){x.status='off';x.cancelAt=null}});d.appts.forEach(a=>{if(a.cid===id&&a.date>=TODAY&&['conf','pend'].includes(a.status))a.status='cancel'})},`Dados de ${c.name} excluídos (LGPD): assinatura encerrada e horários futuros cancelados`,'Clientes'));
}
ACT['new-cli']=()=>{modal(`<h3>Novo cliente</h3><div class="form"><div class="two"><input class="inp" id="nc-name" placeholder="Nome"><input class="inp" id="nc-phone" placeholder="WhatsApp com DDD"></div><textarea class="inp" id="nc-notes" placeholder="Observações"></textarea></div><div class="mact"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="nc-save">Cadastrar</button></div>`);
  $('#nc-save').onclick=()=>{const n=$('#nc-name').value.trim();if(!n)return fieldErr('#nc-name','Informe o nome');closeModal();change('clients',L=>L.push({id:'c'+DB.uid(),name:n,phone:$('#nc-phone').value.replace(/\D/g,''),notes:$('#nc-notes').value,blocked:false,misses:0,since:MO[today.getMonth()]+'/'+String(today.getFullYear()).slice(2)}),`Cliente ${n} cadastrado`,'Clientes')}};
ACT['exp-cli']=()=>download('clientes-farias.csv',csv(['Nome','WhatsApp','Faltas','Bloqueado','Desde','Observações'],db.clients.map(c=>[c.name,phoneFmt(c.phone),c.misses,c.blocked?'sim':'não',c.since,(c.notes||'').replace(/\n/g,' ')])),'text/csv');

/* ================= ASSINANTES ================= */
let subFilter='all',subQ='';
const SS={ok:['Ativo','c-ok'],late:['Pendente','c-bad'],paused:['Pausado','c-warn'],off:['Cancelado','c-dim']};
function vAssinantes(){
  const rows=db.subs.filter(s=>(subFilter==='all'||s.status===subFilter)&&cname(s.cid).toLowerCase().includes(subQ));
  return `<div class="top"><div><h1>Assinantes</h1><p>Cobrança automática. Use "Gerenciar" para qualquer correção.</p></div><div class="acts"><button class="btn btn-ghost btn-sm" data-act="exp-sub">Exportar planilha</button><button class="btn btn-primary btn-sm" data-act="new-sub">+ Nova assinatura</button></div></div>
  <div class="pcards">${db.plans.map(p=>{const L=db.subs.filter(s=>s.plan===p.id&&s.status==='ok'),n=L.length;return `<div class="card pc"><small>${esc(p.n)}${p.on?'':' (fora da venda)'}</small><b>${n}</b><span>${money0(L.reduce((t,s)=>t+price(s),0))}/mês</span></div>`}).join('')}</div>
  <div class="card box"><div class="filters">${[['all','Todos'],['ok','Ativos'],['late','Pendentes'],['paused','Pausados'],['off','Cancelados']].map(([k,n])=>`<button class="fbtn ${subFilter===k?'on':''}" data-sf="${k}">${n}</button>`).join('')}<input class="inp search" id="sub-q" placeholder="Buscar assinante…" value="${esc(subQ)}"></div>
  <div class="tw"><table><thead><tr><th>Cliente</th><th>Plano</th><th>Status</th><th>Uso no mês</th><th>Próx. cobrança</th><th>Forma</th><th class="r">Ações</th></tr></thead><tbody>
  ${rows.map(s=>{const p=plan(s.plan)||{n:'—',quota:''};const q=/^(\d)/.exec(p.quota);const tot=q?(p.quota.includes('+')?+q[1]*2:+q[1]):0;
    return `<tr><td><b>${esc(cname(s.cid))}</b><small>desde ${esc(s.since)}</small></td><td>${esc(p.n)}</td><td><span class="chip ${SS[s.status][1]}">${SS[s.status][0]}</span>${s.courtesyUntil?`<small>cortesia até ${fmtD(s.courtesyUntil)}</small>`:''}${s.pausedUntil&&s.status==='paused'?`<small>até ${fmtD(s.pausedUntil)}</small>`:''}${s.cancelAt?`<small>cancela em ${fmtD(s.cancelAt)}</small>`:''}</td>
    <td>${s.status==='ok'?(()=>{const ym=TODAY.slice(0,7),u=DB.usage(s.cid,ym),qt=DB.quota(p),cr=DB.credit(s,ym);if(!qt)return plural(u.total,'atendimento','atendimentos')+' no mês';const lim=qt.corte+qt.barba+2*cr*(qt.barba?1:0)+(qt.barba?0:cr),used=u.corte+(qt.barba?u.barba:0);return `<span class="mini-bar"><i style="width:${Math.min(100,used/lim*100)}%"></i></span>${Math.min(used,lim)} de ${lim}`})():'<span class="hint">—</span>'}</td>
    <td>${s.status==='off'?'—':s.status==='late'?`<span class="dn">em aberto</span>`:fmtD(nextBill(s))+(s.exempt?' <span class="chip c-warn">isenta</span>':'')}</td><td>${payIcon(s.method)} ${esc(s.method)}</td>
    <td class="r">${s.status==='late'?`<button class="btn btn-primary btn-sm" data-subact="link" data-id="${s.id}">Cobrar</button> `:''}<button class="btn btn-ghost btn-sm" data-sub="${s.id}">Gerenciar</button></td></tr>`}).join('')||'<tr><td colspan="7" class="empty">Nenhuma assinatura.</td></tr>'}
  </tbody></table></div></div>`;
}
document.addEventListener('click',e=>{const f=e.target.closest('[data-sf]');if(f){subFilter=f.dataset.sf;render()}const g=e.target.closest('[data-sub]');if(g)gerSub(g.dataset.sub);const l=e.target.closest('[data-subact="link"]');if(l){const s=db.subs.find(x=>x.id===l.dataset.id);DB.refresh();DB._log({id:DB.uid(),t:Date.now(),who:'Farias',area:'Assinaturas',desc:`Link de pagamento reenviado para ${cname(s.cid)} no WhatsApp`});DB.save();render();toast('Link de pagamento enviado no WhatsApp')}});
document.addEventListener('input',e=>{if(e.target.id==='sub-q'){subQ=e.target.value.toLowerCase();const pos=e.target.selectionStart;render();const i=$('#sub-q');i.focus();i.setSelectionRange(pos,pos)}});
function gerSub(id){
  const s=db.subs.find(x=>x.id===id),nm=cname(s.cid),p=plan(s.plan),st=s.status,cur=price(s);
  const upd=(fn,desc)=>{closeModal();change('subs',L=>fn(L.find(x=>x.id===id)),desc,'Assinaturas')};
  modal(`<div class="eyebrow">Gerenciar assinatura</div><h3>${esc(nm)}</h3><p><span class="chip ${SS[st][1]}">${SS[st][0]}</span> &nbsp;${esc(p.n)} · ${money(cur)}/mês${cur!==DB.plan(s.plan).p&&db.plans.some(x=>x.id===s.plan)?` <span class="hint">(preço contratado; tabela atual ${money(DB.plan(s.plan).p)})</span>`:''}${s.cancelAt?` · <span class="chip c-warn">cancela em ${fmtD(s.cancelAt)}</span>`:''}${s.nextPlan?` · <span class="chip c-info">troca para ${esc(plan(s.nextPlan).n)} em ${fmtD(s.nextPlanAt)}</span>`:''}</p>
   <div class="form"><div class="three"><div class="fl"><label>Plano</label><select class="inp" id="s-plan">${db.plans.map(x=>`<option value="${x.id}" ${x.id===s.plan?'selected':''}>${esc(x.n)}</option>`).join('')}</select></div><div class="fl"><label>Dia da cobrança</label><select class="inp" id="s-day"><option value="1" ${s.day===1?'selected':''}>Dia 01</option><option value="7" ${s.day===7?'selected':''}>Dia 07</option></select></div><div class="fl"><label>Forma</label><select class="inp" id="s-met">${['Pix automático','Cartão'].map(m=>`<option ${m===s.method?'selected':''}>${m}</option>`).join('')}</select></div></div>
   <button class="btn btn-primary btn-sm" id="s-save" style="justify-self:start">Salvar plano e cobrança</button></div>
   <div class="sec"><h4>Correções</h4>
     ${st==='off'?'<p class="hint">Assinatura cancelada. Reative para fazer correções.</p>':`
     ${st==='ok'?`<div class="fix"><input class="inp" type="number" id="s-credit" aria-label="Usos a ajustar" placeholder="Usos a somar (+) ou tirar (−) neste mês"><button class="btn btn-ghost btn-sm" id="s-credit-b">Ajustar saldo</button></div>`:''}
     <div class="fix"><select class="inp" id="s-court" aria-label="Dias de cortesia"><option value="7">7 dias</option><option value="15">15 dias</option><option value="30" selected>30 dias</option></select><button class="btn btn-ghost btn-sm" id="s-court-b">${st==='late'?'Perdoar fatura e dar cortesia':'Dar cortesia'}</button></div>
     ${st==='ok'||st==='paused'?`<div class="fix"><input class="inp" type="date" id="s-pause" aria-label="Pausar até" value="${DB.iso(addD(today,30))}"><button class="btn btn-ghost btn-sm" id="s-pause-b">${st==='paused'?'Alterar pausa':'Pausar até'}</button></div>`:''}
     ${st==='ok'?`<div class="fix"><span style="font-size:14px;color:var(--muted)">Próxima cobrança${s.exempt?' está isenta':''}</span><button class="btn btn-ghost btn-sm" id="s-exempt">${s.exempt?'Voltar a cobrar':'Isentar próxima cobrança'}</button></div>`:''}
     <div class="fix"><span style="font-size:14px;color:var(--muted)">Última cobrança paga</span><button class="btn btn-ghost btn-sm" id="s-refund">Estornar</button></div>`}
     ${s.status==='late'?`<div class="fix"><span style="font-size:14px;color:var(--muted)">Pagamento em aberto</span><button class="btn btn-ghost btn-sm" id="s-paid">Marcar como pago</button></div>`:''}
   </div>
   <div class="mact">${st==='off'?`<button class="btn btn-primary" id="s-react">Reativar e cobrar ${money(DB.plan(s.plan).p)}</button>`:`${st==='paused'?'<button class="btn btn-ghost" id="s-react">Retomar agora</button>':''}${s.cancelAt?'<button class="btn btn-ghost" id="s-keep">Desfazer cancelamento</button><button class="btn btn-danger" id="s-cancel-now">Encerrar agora</button>':'<button class="btn btn-danger" id="s-cancel">Cancelar assinatura</button>'}`}</div>`,true);
  $('#s-save').onclick=()=>{const np=$('#s-plan').value;upd(x=>{if(np!==x.plan){x.plan=np;x.price=DB.plan(np).p;x.nextPlan=null;x.nextPlanAt=null}x.day=+$('#s-day').value;x.method=$('#s-met').value},np!==s.plan?`${nm}: plano trocado de ${p.n} para ${plan(np).n} (${money(DB.plan(np).p)})`:`${nm}: dados de cobrança atualizados`)};
  if($('#s-credit-b'))$('#s-credit-b').onclick=()=>{const v=parseInt($('#s-credit').value);if(!v)return fieldErr('#s-credit','Informe quantos usos ajustar');const ym=TODAY.slice(0,7);upd(x=>{x.credit=DB.credit(x,ym)+v;x.creditMonth=ym},`${nm}: saldo de ${MOF[today.getMonth()]} ajustado em ${v>0?'+':''}${plural(v,'uso','usos')}`)};
  if($('#s-court-b'))$('#s-court-b').onclick=()=>{const n=+$('#s-court').value,base=s.courtesyUntil&&s.courtesyUntil>TODAY?new Date(s.courtesyUntil+'T00:00'):new Date(nextBill(s)+'T00:00');const until=DB.iso(addD(base,n));closeModal();
    mutMany(['subs','tx'],d=>{const x=d.subs.find(y=>y.id===id);x.courtesyUntil=until;if(x.status==='late'){x.status='ok';d.tx.forEach(t=>{if(t.cid===s.cid&&t.status==='failed')t.status='waived'})}},`${nm}: cortesia de ${n} dias (até ${fmtD(until)})${st==='late'?' e fatura em aberto perdoada':''}`,'Assinaturas')};
  if($('#s-pause-b'))$('#s-pause-b').onclick=()=>{const d=$('#s-pause').value;if(!d||d<=TODAY)return toast('Escolha uma data futura');upd(x=>{x.status='paused';x.pausedUntil=d},`${nm}: assinatura pausada até ${fmtD(d)}`)};
  if($('#s-exempt'))$('#s-exempt').onclick=()=>upd(x=>{x.exempt=!x.exempt},`${nm}: próxima cobrança ${s.exempt?'volta a ser cobrada':'isenta'}`);
  if($('#s-refund'))$('#s-refund').onclick=()=>{const t=db.tx.find(x=>x.cid===s.cid&&x.kind==='plano'&&x.status==='ok');if(!t)return toast('Nenhuma cobrança paga para estornar');
    modal(`<h3>Estornar cobrança?</h3><p>${money(t.value)} de ${fmtD(t.date)} volta para ${esc(nm)}.</p><label style="display:flex;gap:10px;align-items:center;font-size:14px;margin-top:14px">${sw('rf-susp',st==='ok')} Suspender a assinatura até um novo pagamento</label><div class="mact"><button class="btn btn-ghost" data-close>Voltar</button><button class="btn btn-danger" id="rf-ok">Estornar</button></div>`);
    $('#rf-ok').onclick=()=>{const susp=$('#rf-susp').checked;closeModal();mutMany(['tx','subs'],d=>{d.tx.find(x=>x.id===t.id).status='refunded';if(susp){const x=d.subs.find(y=>y.id===id);if(x.status==='ok')x.status='late'}},`${nm}: estorno de ${money(t.value)} (${fmtD(t.date)})${susp?' e assinatura suspensa':''}`,'Financeiro')}};
  if($('#s-paid'))$('#s-paid').onclick=()=>{closeModal();mutMany(['tx','subs'],d=>{const t=d.tx.find(x=>x.cid===s.cid&&x.status==='failed');if(t){t.status='ok';t.method='Pago no balcão';t.value=cur}else d.tx.unshift({id:DB.uid(),date:TODAY,cid:s.cid,desc:'Plano '+p.n,method:'Pago no balcão',value:cur,kind:'plano',status:'ok'});d.subs.find(x=>x.id===id).status='ok'},`${nm}: pagamento de ${money(cur)} registrado no balcão e assinatura reativada`,'Assinaturas')};
  if($('#s-react'))$('#s-react').onclick=()=>{
    if(st==='paused')return upd(x=>{x.status='ok';x.pausedUntil=null},`${nm}: assinatura retomada`);
    if(DB.activeSub(s.cid))return toast('Esse cliente já tem outra assinatura ativa.');
    const np=DB.plan(s.plan);if(!db.plans.some(x=>x.id===s.plan))return toast('O plano desta assinatura foi excluído. Crie uma nova assinatura.');
    confirmBox('Reativar assinatura?',`Cobra ${money(np.p)} agora (plano ${esc(np.n)}, preço atual) e libera os benefícios.`,'Reativar e cobrar',()=>mutMany(['subs','tx'],d=>{Object.assign(d.subs.find(y=>y.id===id),{status:'ok',price:np.p,pausedUntil:null,cancelAt:null,nextPlan:null,paidUntil:DB.addMonth(TODAY),credit:0,creditMonth:null});d.tx.unshift({id:DB.uid(),date:TODAY,cid:s.cid,desc:'Plano '+np.n,method:s.method,value:np.p,kind:'plano',status:'ok'})},`${nm}: assinatura reativada (${money(np.p)} cobrado)`,'Assinaturas'),false)};
  if($('#s-keep'))$('#s-keep').onclick=()=>upd(x=>{x.cancelAt=null},`${nm}: cancelamento desfeito`);
  if($('#s-cancel-now'))$('#s-cancel-now').onclick=()=>confirmBox('Encerrar agora?',`${esc(nm)} perde os benefícios hoje, sem esperar ${fmtD(s.cancelAt)}.`,'Encerrar agora',()=>change('subs',L=>{const x=L.find(y=>y.id===id);x.status='off';x.cancelAt=null},`${nm}: assinatura encerrada`,'Assinaturas'));
  if($('#s-cancel'))$('#s-cancel').onclick=()=>{const end=nextBill(s);confirmBox('Cancelar assinatura?',`${esc(nm)} mantém os benefícios até o fim do ciclo atual (${fmtD(end)}). Nenhuma nova cobrança é feita.`,'Cancelar no fim do ciclo',()=>change('subs',L=>{const x=L.find(y=>y.id===id);x.cancelAt=st==='ok'?end:null;if(st!=='ok')x.status='off';x.nextPlan=null},`${nm}: ${st==='ok'?'cancelamento agendado para '+fmtD(end):'assinatura cancelada'}`,'Assinaturas'))};
}
ACT['new-sub']=()=>{modal(`<h3>Nova assinatura</h3><p>Para cliente que assinou no balcão. O link de pagamento vai pelo WhatsApp.</p><div class="form"><div class="fl"><label>Cliente</label><select class="inp" id="ns-cli">${clientOpts()}</select></div><div class="two"><div class="fl"><label>Plano</label><select class="inp" id="ns-plan">${db.plans.filter(p=>p.on).map(p=>`<option value="${p.id}">${esc(p.n)} · ${money0(p.p)}</option>`).join('')}</select></div><div class="fl"><label>Dia da cobrança</label><select class="inp" id="ns-day"><option value="1">Dia 01</option><option value="7" selected>Dia 07</option></select></div></div></div><div class="mact"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="ns-save">Criar e enviar link</button></div>`);
  $('#ns-save').onclick=()=>{const cid=$('#ns-cli').value,pl=DB.plan($('#ns-plan').value);DB.refresh();if(DB.activeSub(cid))return toast('Esse cliente já tem assinatura ativa');closeModal();
    mutMany(['subs','tx'],d=>{const v={plan:pl.id,price:pl.p,status:'ok',used:0,credit:0,creditMonth:null,day:+$('#ns-day').value,method:'Pix automático',pausedUntil:null,courtesyUntil:null,exempt:false,cancelAt:null,nextPlan:null,paidUntil:DB.addMonth(TODAY)};const old=d.subs.find(x=>x.cid===cid);if(old)Object.assign(old,v);else d.subs.push({id:'a'+DB.uid(),cid,since:MO[today.getMonth()]+'/'+String(today.getFullYear()).slice(2),...v});
      d.tx.unshift({id:DB.uid(),date:TODAY,cid,desc:'Plano '+pl.n,method:'Pix automático',value:pl.p,kind:'plano',status:'ok'})},`Nova assinatura: ${cname(cid)} · ${pl.n} (${money(pl.p)})`,'Assinaturas')}};
ACT['exp-sub']=()=>download('assinantes-farias.csv',csv(['Cliente','Plano','Status','Dia','Forma','Desde'],db.subs.map(s=>[cname(s.cid),(plan(s.plan)||{}).n,(SS[s.status]||['?'])[0],s.day,s.method,s.since])),'text/csv');

/* ================= FINANCEIRO ================= */
let txF='all';
function vFinanceiro(){
  const ym=TODAY.slice(0,7),mt=db.tx.filter(t=>t.date.slice(0,7)===ym);
  const rec=mt.filter(t=>t.status==='ok'&&t.kind==='plano').reduce((s,t)=>s+t.value,0),av=mt.filter(t=>t.status==='ok'&&t.kind!=='plano').reduce((s,t)=>s+t.value,0);
  const refunds=mt.filter(t=>t.status==='refunded').reduce((s,t)=>s+t.value,0),failed=mt.filter(t=>t.status==='failed').reduce((s,t)=>s+t.value,0);
  const REC=[1200,1640,2080,2560,3120,rec],AV=[4100,3900,3700,3500,3400,av],mx=Math.max(...REC.map((r,i)=>r+AV[i]),1);
  const rows=db.tx.filter(t=>txF==='all'||t.status===txF||(txF==='manual'&&t.manual));
  const TS={ok:['Pago','c-ok'],failed:['Falhou','c-bad'],refunded:['Estornado','c-warn'],waived:['Perdoado','c-dim']};
  return `<div class="top"><div><h1>Financeiro</h1><p>${MOF[today.getMonth()][0].toUpperCase()+MOF[today.getMonth()].slice(1)} de ${today.getFullYear()}</p></div><div class="acts"><button class="btn btn-ghost btn-sm" data-act="exp-tx">Exportar CSV</button><button class="btn btn-primary btn-sm" data-act="new-tx">+ Registrar pagamento</button></div></div>
  <div class="kpis"><div class="card kpi"><small>Receita do mês</small><b>${money0(rec+av)}</b><span>até hoje</span></div><div class="card kpi"><small>Planos</small><b>${money0(rec)}</b><span>${mt.filter(t=>t.kind==='plano'&&t.status==='ok').length} cobranças pagas</span></div><div class="card kpi"><small>Avulso e balcão</small><b>${money0(av)}</b><span>${mt.filter(t=>t.kind!=='plano'&&t.status==='ok').length} recebimentos</span></div><div class="card kpi"><small>Em aberto</small><b class="${failed?'dn':''}">${money0(failed)}</b><span>cobranças que falharam</span></div><div class="card kpi"><small>Estornos</small><b>${money0(refunds)}</b><span>no mês</span></div></div>
  <div class="g21"><div class="card box"><h3>Receita por mês <small><span style="color:var(--teal)">■</span> Planos &nbsp;<span style="color:var(--info)">■</span> Avulso</small></h3><div class="chart">${REC.map((r,i)=>`<div class="col"><span class="v">${money0(r+AV[i])}</span><div class="stack" style="height:${(r+AV[i])/mx*180}px"><i class="s1" style="height:${r/(r+AV[i]||1)*100}%"></i><i class="s2" style="height:${AV[i]/(r+AV[i]||1)*100}%"></i></div></div>`).join('')}</div><div class="xl">${REC.map((_,i)=>`<span>${MO[new Date(today.getFullYear(),today.getMonth()-5+i,1).getMonth()]}</span>`).join('')}</div></div>
  <div class="card box"><h3>Formas de pagamento <small>no mês</small></h3>${['Pix automático','Pix','Cartão','Dinheiro','Maquininha (débito)','Maquininha (crédito)'].map(m=>{const v=mt.filter(t=>t.status==='ok'&&t.method===m).reduce((s,t)=>s+t.value,0);return v?`<div class="meter" style="margin-bottom:12px"><div class="lbl"><span>${m}</span><b>${money0(v)}</b></div><div class="bar"><i style="width:${v/(rec+av||1)*100}%"></i></div></div>`:''}).join('')||'<p class="empty">Sem recebimentos.</p>'}</div></div>
  <div class="card box"><h3>Lançamentos</h3><div class="filters">${[['all','Todos'],['ok','Pagos'],['failed','Falharam'],['refunded','Estornados'],['manual','Lançados à mão']].map(([k,n])=>`<button class="fbtn ${txF===k?'on':''}" data-tf="${k}">${n}</button>`).join('')}</div>
  <div class="tw"><table><thead><tr><th>Data</th><th>Cliente</th><th>Descrição</th><th>Forma</th><th>Status</th><th class="r">Valor</th><th class="r"></th></tr></thead><tbody>
  ${rows.slice(0,60).map(t=>`<tr><td>${fmtD(t.date)}</td><td>${esc(cname(t.cid))}</td><td>${esc(t.desc)}</td><td>${payIcon(t.method)} ${esc(t.method)}</td><td><span class="chip ${TS[t.status][1]}">${TS[t.status][0]}</span></td><td class="r">${money(t.value)}</td><td class="r">${t.status==='ok'?`<button class="btn btn-danger btn-sm" data-refund="${t.id}">Estornar</button>`:''}</td></tr>`).join('')||'<tr><td colspan="7" class="empty">Nada por aqui.</td></tr>'}
  </tbody></table></div></div>`;
}
document.addEventListener('click',e=>{const f=e.target.closest('[data-tf]');if(f){txF=f.dataset.tf;render()}const r=e.target.closest('[data-refund]');if(r){const t=db.tx.find(x=>x.id===r.dataset.refund);confirmBox('Estornar lançamento?',`${money(t.value)} · ${esc(t.desc)} · ${esc(cname(t.cid))}`,'Estornar',()=>change('tx',L=>{L.find(x=>x.id===t.id).status='refunded'},`Estorno de ${money(t.value)} para ${cname(t.cid)} (${t.desc})`,'Financeiro'))}});
ACT['new-tx']=()=>{modal(`<h3>Registrar pagamento</h3><p>Dinheiro, maquininha ou Pix recebido no balcão.</p><div class="form"><div class="fl"><label>Cliente</label><select class="inp" id="t-cli">${clientOpts()}</select></div><div class="two"><div class="fl"><label>Descrição</label><input class="inp" id="t-desc" value="Corte" list="t-svcs"><datalist id="t-svcs">${db.services.map(s=>`<option>${esc(s.n)}</option>`).join('')}<option>Produto: Pomada</option><option>Produto: Óleo capilar</option></datalist></div><div class="fl"><label>Valor (R$)</label><input class="inp" id="t-val" type="number" step="0.01" value="50"></div></div><div class="fl"><label>Data</label><input class="inp" type="date" id="t-date" value="${TODAY}"></div><div class="fl"><label>Forma de pagamento</label><div class="opts4" id="t-met">${['Dinheiro','Pix','Maquininha (débito)','Maquininha (crédito)'].map((m,i)=>`<div class="opt pay ${i===0?'on':''}" data-payic="${m}" data-v="${m}">${payIcon(m)}${m.replace('Maquininha ','').replace(/[()]/g,'')}</div>`).join('')}</div></div></div><div class="mact"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary btn-pay" id="t-save" data-paybtn>${payIcon('Dinheiro')}Registrar</button></div>`);
  $('#t-desc').oninput=()=>{const s=db.services.find(x=>x.n===$('#t-desc').value);if(s)$('#t-val').value=s.p};
  $('#t-save').onclick=()=>{const v=+$('#t-val').value;if(!(v>0))return fieldErr('#t-val','Informe o valor');closeModal();change('tx',L=>L.unshift({id:DB.uid(),date:$('#t-date').value,cid:$('#t-cli').value,desc:$('#t-desc').value,method:$('#t-met .opt.on').dataset.v,value:v,kind:'avulso',status:'ok',manual:true}),`Pagamento de ${money(v)} registrado (${cname($('#t-cli').value)})`,'Financeiro')}};
ACT['exp-tx']=()=>download('financeiro-farias.csv',csv(['Data','Cliente','Descrição','Forma','Status','Valor'],db.tx.map(t=>[t.date,cname(t.cid),t.desc,t.method,t.status,String(t.value).replace('.',',')])),'text/csv');

/* ================= SERVIÇOS E PLANOS ================= */
const CAT={cab:'Cabelo e barba',com:'Combos',ext:'Tratamentos'};
function vServicos(){
  return `<div class="top"><div><h1>Serviços e planos</h1><p>Tudo aqui aparece na hora no site e no agendamento.</p></div><div class="acts"><a class="btn btn-ghost btn-sm" href="index.html#planos" target="_blank">Ver no site ↗</a><button class="btn btn-ghost btn-sm" data-act="plan-ed">+ Novo plano</button><button class="btn btn-primary btn-sm" data-act="svc-ed">+ Novo serviço</button></div></div>
  <div class="card box"><h3>Planos de assinatura</h3><div class="tw"><table><thead><tr><th>Plano</th><th>Preço</th><th>Dias válidos</th><th>Cota</th><th>Brindes</th><th>Assinantes</th><th>No site</th><th></th></tr></thead><tbody>
  ${db.plans.map(p=>`<tr><td><b>${esc(p.n)}</b></td><td>${money0(p.p)}/mês</td><td>${p.days.map(d=>WD[d]).join(', ')}</td><td>${esc(p.quota)}${p.gap?`<small>intervalo ${p.gap} dias</small>`:''}</td><td style="white-space:normal">${esc(p.perks)}</td><td>${db.subs.filter(s=>s.plan===p.id&&s.status!=='off').length}</td><td>${sw('pl-'+p.id,p.on)}</td><td class="r"><button class="btn btn-ghost btn-sm" data-act="plan-ed" data-id="${p.id}">Editar</button></td></tr>`).join('')}
  </tbody></table></div></div>
  <div class="card box"><h3>Serviços avulsos</h3><div class="tw"><table><thead><tr><th>Serviço</th><th>Categoria</th><th>Duração</th><th>Preço</th><th>Assinante paga</th><th>No site</th><th></th></tr></thead><tbody>
  ${db.services.map(s=>`<tr><td><b>${esc(s.n)}</b><small>${esc(s.d)}</small></td><td>${CAT[s.cat]}</td><td>${s.t} min</td><td>${money(s.p)}</td><td>${s.mp!=null?money(s.mp):'<span class="hint">igual</span>'}</td><td>${sw('sv-'+s.id,s.on)}</td><td class="r"><button class="btn btn-ghost btn-sm" data-act="svc-ed" data-id="${s.id}">Editar</button></td></tr>`).join('')}
  </tbody></table></div></div>`;
}
document.addEventListener('change',e=>{
  const t=e.target;if(!t.id)return;
  if(t.id.startsWith('pl-')){const p=plan(t.id.slice(3));change('plans',L=>{L.find(x=>x.id===p.id).on=t.checked},`Plano ${p.n} ${t.checked?'ativado':'ocultado'} no site`,'Serviços')}
  if(t.id.startsWith('sv-')){const s=db.services.find(x=>x.id===t.id.slice(3));change('services',L=>{L.find(x=>x.id===s.id).on=t.checked},`Serviço ${s.n} ${t.checked?'ativado':'ocultado'} no site`,'Serviços')}
});
ACT['svc-ed']=b=>{const s=db.services.find(x=>x.id===b.dataset.id)||{cat:'cab',n:'',d:'',p:'',t:30,mp:null,on:true};const isNew=!s.id;
  modal(`<h3>${isNew?'Novo serviço':'Editar serviço'}</h3><div class="form"><div class="two"><div class="fl"><label>Nome</label><input class="inp" id="e-n" value="${esc(s.n)}"></div><div class="fl"><label>Categoria</label><select class="inp" id="e-cat">${Object.entries(CAT).map(([k,v])=>`<option value="${k}" ${k===s.cat?'selected':''}>${v}</option>`).join('')}</select></div></div><div class="fl"><label>Descrição curta</label><input class="inp" id="e-d" value="${esc(s.d)}"></div><div class="three"><div class="fl"><label>Duração (min)</label><input class="inp" type="number" id="e-t" value="${s.t}"></div><div class="fl"><label>Preço (R$)</label><input class="inp" type="number" step="0.01" id="e-p" value="${s.p}"></div><div class="fl"><label>Assinante (R$)</label><input class="inp" type="number" step="0.01" id="e-mp" value="${s.mp??''}" placeholder="igual"></div></div></div>
  <div class="mact">${isNew?'':'<button class="btn btn-danger" id="e-del">Excluir</button>'}<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="e-save">Salvar</button></div>`);
  $('#e-save').onclick=()=>{const v={n:$('#e-n').value.trim(),cat:$('#e-cat').value,d:$('#e-d').value,t:+$('#e-t').value||30,p:+$('#e-p').value||0,mp:$('#e-mp').value===''?null:+$('#e-mp').value};if(!v.n)return toast('Informe o nome');closeModal();
    if(isNew)change('services',L=>L.push({id:DB.uid(),on:true,...v}),`Serviço ${v.n} criado (${money(v.p)})`,'Serviços');
    else change('services',L=>Object.assign(L.find(x=>x.id===s.id),v),s.p!==v.p?`Preço de ${v.n} alterado de ${money(s.p)} para ${money(v.p)}`:`Serviço ${v.n} editado`,'Serviços')};
  if($('#e-del'))$('#e-del').onclick=()=>confirmBox('Excluir serviço?',`${esc(s.n)} sai do site e do agendamento. Horários já marcados continuam.`,'Excluir',()=>change('services',L=>L.splice(L.findIndex(x=>x.id===s.id),1),`Serviço ${s.n} excluído`,'Serviços'))};
ACT['plan-ed']=b=>{const p=db.plans.find(x=>x.id===b.dataset.id)||{n:'',p:'',days:[1,2,3,4],quota:'Ilimitado',gap:7,perks:'',on:true};const isNew=!p.id;
  modal(`<h3>${isNew?'Novo plano':'Editar plano'}</h3><p>Mudança de preço vale para novos assinantes. Atuais são avisados com 30 dias.</p><div class="form"><div class="two"><div class="fl"><label>Nome</label><input class="inp" id="p-n" value="${esc(p.n)}"></div><div class="fl"><label>Preço por mês (R$)</label><input class="inp" type="number" id="p-p" value="${p.p}"></div></div>
  <div class="fl"><label>Dias válidos</label><div class="days-pick" id="p-days">${WD.map((d,i)=>`<button type="button" data-d="${i}" aria-pressed="${p.days.includes(i)}" class="${p.days.includes(i)?'on':''}">${d}</button>`).join('')}</div></div>
  <div class="two"><div class="fl"><label>Cota</label><select class="inp" id="p-q">${['Ilimitado','2 por mês','4 por mês','2 + 2 por mês'].map(q=>`<option ${q===p.quota?'selected':''}>${q}</option>`).join('')}</select></div><div class="fl"><label>Intervalo mínimo</label><select class="inp" id="p-gap">${[0,7,10,14].map(g=>`<option value="${g}" ${g===p.gap?'selected':''}>${g?g+' dias':'Sem intervalo'}</option>`).join('')}</select></div></div>
  <div class="fl"><label>Brindes do mês</label><input class="inp" id="p-perks" value="${esc(p.perks==='—'?'':p.perks)}" placeholder="Ex.: 1 hidratação + 1 sobrancelha"></div></div>
  <div class="mact">${isNew?'':'<button class="btn btn-danger" id="p-del">Excluir</button>'}<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="p-save">Salvar</button></div>`);
  $$('#p-days button').forEach(x=>x.onclick=()=>x.setAttribute('aria-pressed',x.classList.toggle('on')));
  $('#p-save').onclick=()=>{const v={n:$('#p-n').value.trim(),p:+$('#p-p').value||0,days:$$('#p-days button.on').map(x=>+x.dataset.d),quota:$('#p-q').value,gap:+$('#p-gap').value,perks:$('#p-perks').value||'—'};if(!v.n)return fieldErr('#p-n','Informe o nome');if(!v.days.length)return fieldErr('#p-days','Escolha pelo menos um dia');closeModal();
    if(isNew)change('plans',L=>L.push({id:DB.uid(),on:true,...v}),`Plano ${v.n} criado (${money0(v.p)}/mês)`,'Serviços');
    else change('plans',L=>Object.assign(L.find(x=>x.id===p.id),v),p.p!==v.p?`Preço do plano ${v.n} alterado de ${money0(p.p)} para ${money0(v.p)}`:`Plano ${v.n} editado`,'Serviços')};
  if($('#p-del'))$('#p-del').onclick=()=>{const n=db.subs.filter(s=>s.plan===p.id||s.nextPlan===p.id).length;if(n)return toast(`Não dá para excluir: ${plural(n,'assinatura usa','assinaturas usam')} este plano (inclusive canceladas). Oculte o plano em vez de excluir.`);confirmBox('Excluir plano?',esc(p.n),'Excluir',()=>change('plans',L=>L.splice(L.findIndex(x=>x.id===p.id),1),`Plano ${p.n} excluído`,'Serviços'))}};

/* ================= CONTEÚDO DO SITE ================= */
function vConteudo(){
  const c=db.content;
  return `<div class="top"><div><h1>Conteúdo do site</h1><p>Edite o que os clientes veem. Ao salvar, o site é atualizado na hora.</p></div><div class="acts"><a class="btn btn-ghost btn-sm" href="index.html" target="_blank">Abrir o site ↗</a></div></div>
  <div class="g11">
   <div>
    <div class="card box"><h3>Aviso no topo do site ${sw('k-notice_on',c.notice_on)}</h3><div class="form"><input class="inp" id="k-notice" value="${esc(c.notice)}" placeholder="Ex.: Fechado no feriado"><p class="hint">Faixa que aparece no topo de todas as páginas. Use para feriado, promoção ou mudança de horário.</p></div></div>
    <div class="card box"><h3>Página inicial</h3><div class="form"><div class="fl"><label>Etiqueta</label><input class="inp" id="k-hero_tag" value="${esc(c.hero_tag)}"></div><div class="two"><div class="fl"><label>Título (linha 1)</label><input class="inp" id="k-hero_t1" value="${esc(c.hero_t1)}"></div><div class="fl"><label>Título (destaque)</label><input class="inp" id="k-hero_t2" value="${esc(c.hero_t2)}"></div></div><div class="fl"><label>Texto</label><textarea class="inp" id="k-hero_lead">${esc(c.hero_lead)}</textarea></div><div class="fl"><label>Sobre o barbeiro</label><textarea class="inp" id="k-about">${esc(c.about)}</textarea></div></div></div>
    <div class="card box"><h3>Instagram na galeria ${sw('ig-on',!!c.ig_on)}</h3><div class="form">
      <p class="hint">Mostra as últimas fotos do perfil na página Galeria, atualizadas sozinhas. Precisa de uma conta profissional (comercial ou criador de conteúdo) e de um token de acesso gerado no painel de desenvolvedor da Meta.</p>
      <div class="fl"><label>Token de acesso da Meta</label><input class="inp" id="ig-token" type="password" autocomplete="off" value="${esc(c.ig_token||'')}" placeholder="Cole aqui o token (começa com IG…)"></div>
      <p class="hint">Neste protótipo o token fica salvo só neste navegador. No sistema definitivo ele fica guardado no servidor, nunca no site.</p>
      <div class="acts"><button class="btn btn-ghost btn-sm" data-act="ig-test">Testar conexão</button><button class="btn btn-primary btn-sm" data-act="ig-save">Salvar</button><span class="hint" id="ig-st"></span></div></div></div>
    <div class="card box"><h3>Contato</h3><div class="form"><div class="two"><div class="fl"><label>WhatsApp (com 55 e DDD)</label><input class="inp" id="k-wa" value="${esc(c.wa)}"></div><div class="fl"><label>Telefone exibido</label><input class="inp" id="k-phone" value="${esc(c.phone)}"></div></div><div class="two"><div class="fl"><label>Endereço</label><input class="inp" id="k-address" value="${esc(c.address)}"></div><div class="fl"><label>Instagram (sem @)</label><input class="inp" id="k-instagram" value="${esc(c.instagram)}"></div></div></div></div>
    <button class="btn btn-primary" data-act="save-content" style="margin-top:16px">Salvar e publicar</button>
   </div>
   <div>
    <div class="card box"><h3>Perguntas frequentes <button class="btn btn-ghost btn-sm" data-act="faq-add">+ Pergunta</button></h3><div class="list-ed" id="faq-ed">${db.faq.map(f=>`<div class="li-ed" data-fid="${f.id}"><button class="btn btn-danger btn-sm rm" data-act="faq-rm" data-id="${f.id}">×</button><input class="inp" value="${esc(f.q)}" data-f="q" style="padding-right:44px"><textarea class="inp" data-f="a">${esc(f.a)}</textarea></div>`).join('')}</div><button class="btn btn-primary btn-sm" data-act="faq-save" style="margin-top:12px">Salvar perguntas</button></div>
    <div class="card box"><h3>Avaliações <button class="btn btn-ghost btn-sm" data-act="rev-add">+ Avaliação</button></h3><div class="list-ed" id="rev-ed">${db.reviews.map(r=>`<div class="li-ed" data-rid="${r.id}"><button class="btn btn-danger btn-sm rm" data-act="rev-rm" data-id="${r.id}">×</button><div class="two" style="padding-right:44px"><input class="inp" value="${esc(r.name)}" data-f="name" placeholder="Nome"><input class="inp" value="${esc(r.info)}" data-f="info" placeholder="Detalhe"></div><textarea class="inp" data-f="text">${esc(r.text)}</textarea></div>`).join('')}</div><button class="btn btn-primary btn-sm" data-act="rev-save" style="margin-top:12px">Salvar avaliações</button></div>
   </div>
  </div>
  <div class="card box" style="margin-top:16px"><h3>Galeria <span class="acts"><span class="hint">Fotos são reduzidas automaticamente.</span><button class="btn btn-ghost btn-sm" data-act="gal-add">+ Foto</button></span></h3>
   <div class="gal-ed">${db.gallery.map(g=>{const im=g.img&&DB.img.get(g.img);return `<div class="gimg" data-gid="${g.id}"><div class="ph" style="${im&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(im)?`background-image:url(${im})`:''}">${im?'':`<span style="padding:10px;text-transform:none;letter-spacing:0;font-size:11.5px;line-height:1.35;text-align:center">${esc(g.hint||'Sem foto')}</span>`}</div><div class="tools"><label title="Enviar foto"><input type="file" accept="image/*" hidden data-up="${g.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg></label><button title="Remover" data-act="gal-rm" data-id="${g.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></button></div>
   <div class="fields"><input class="inp" data-f="t" value="${esc(g.t)}" placeholder="Título"><input class="inp" data-f="s" value="${esc(g.s)}" placeholder="Legenda"><textarea class="inp" data-f="hint" rows="2" placeholder="O que esta foto deve mostrar" style="min-height:54px;font-size:12.5px">${esc(g.hint||'')}</textarea><select class="inp" data-f="cat">${[['cortes','Cortes'],['barba','Barba'],['espaco','Espaço']].map(([k,v])=>`<option value="${k}" ${k===g.cat?'selected':''}>${v}</option>`).join('')}</select></div></div>`}).join('')}</div>
   <button class="btn btn-primary btn-sm" data-act="gal-save" style="margin-top:14px">Salvar galeria</button></div>`;
}
const readList=(sel,key,fields)=>$$(sel).map(el=>{const o={id:el.dataset[key]};fields.forEach(f=>o[f]=el.querySelector(`[data-f="${f}"]`).value);return o});
Object.assign(ACT,{
  'ig-test':async()=>{const t=$('#ig-token').value.trim(),st=$('#ig-st');if(!t)return st.textContent='Cole o token primeiro.';st.textContent='Testando…';
    try{const r=await fetch('https://graph.instagram.com/me?fields=username,media_count&access_token='+encodeURIComponent(t));const j=await r.json();
      st.textContent=j.username?`Conectado a @${j.username} (${j.media_count||0} publicações).`:'Token inválido ou expirado'+(j.error&&j.error.message?': '+j.error.message:'.')}catch(e){st.textContent='Não foi possível falar com o Instagram agora.'}},
  'ig-save':()=>{const on=$('#ig-on').checked,t=$('#ig-token').value.trim();if(on&&!t)return toast('Para ligar, cole o token de acesso.');try{sessionStorage.removeItem('farias_ig')}catch(e){}
    change('content',c=>{c.ig_on=on;c.ig_token=t},on?'Instagram ligado na galeria':'Instagram desligado na galeria','Conteúdo')},
  'save-content':()=>{const keys=['notice','hero_tag','hero_t1','hero_t2','hero_lead','about','wa','phone','address','instagram'];const nv={};keys.forEach(k=>nv[k]=$('#k-'+k).value);nv.notice_on=$('#k-notice_on').checked;nv.wa=nv.wa.replace(/\D/g,'');
    const changed=Object.keys(nv).filter(k=>nv[k]!==db.content[k]);if(!changed.length)return toast('Nada foi alterado');
    const L={notice:'aviso',notice_on:'aviso',hero_tag:'etiqueta',hero_t1:'título',hero_t2:'título',hero_lead:'texto da home',about:'sobre',wa:'WhatsApp',phone:'telefone',address:'endereço',instagram:'Instagram'};
    change('content',c=>Object.assign(c,nv),`Site atualizado: ${[...new Set(changed.map(k=>L[k]))].join(', ')}`,'Conteúdo')},
  'faq-add':()=>{const f={id:DB.uid(),q:'Nova pergunta',a:'Resposta'};change('faq',L=>{L.splice(0,L.length,...readList('#faq-ed .li-ed','fid',['q','a']));L.push(f)},'Pergunta adicionada ao FAQ','Conteúdo')},
  'faq-rm':b=>change('faq',L=>{L.splice(0,L.length,...readList('#faq-ed .li-ed','fid',['q','a']).filter(x=>x.id!==b.dataset.id))},'Pergunta removida do FAQ','Conteúdo'),
  'faq-save':()=>change('faq',L=>L.splice(0,L.length,...readList('#faq-ed .li-ed','fid',['q','a'])),'Perguntas frequentes atualizadas','Conteúdo'),
  'rev-add':()=>change('reviews',L=>{L.splice(0,L.length,...readList('#rev-ed .li-ed','rid',['name','info','text']));L.push({id:DB.uid(),name:'Nome',info:'Cliente',text:'Depoimento'})},'Avaliação adicionada','Conteúdo'),
  'rev-rm':b=>change('reviews',L=>{L.splice(0,L.length,...readList('#rev-ed .li-ed','rid',['name','info','text']).filter(x=>x.id!==b.dataset.id))},'Avaliação removida','Conteúdo'),
  'rev-save':()=>change('reviews',L=>L.splice(0,L.length,...readList('#rev-ed .li-ed','rid',['name','info','text'])),'Avaliações atualizadas','Conteúdo'),
  'gal-add':()=>change('gallery',L=>{saveGalFields(L);L.push({id:DB.uid(),cat:'cortes',t:'Novo corte',s:'',hint:'Descreva aqui a foto que deve entrar (ex.: corte de perfil, com boa luz).',img:null})},'Item adicionado à galeria','Conteúdo'),
  'gal-rm':b=>confirmBox('Remover da galeria?','A foto sai do site.','Remover',()=>{const g=db.gallery.find(x=>x.id===b.dataset.id);change('gallery',L=>{saveGalFields(L);L.splice(L.findIndex(x=>x.id===g.id),1)},`Foto "${g.t}" removida da galeria`,'Conteúdo')}),
  'gal-save':()=>change('gallery',L=>saveGalFields(L),'Galeria atualizada','Conteúdo'),
});
function saveGalFields(L){$$('.gimg').forEach(el=>{const g=L.find(x=>x.id===el.dataset.gid);if(!g)return;['t','s','cat','hint'].forEach(f=>{const x=el.querySelector(`[data-f="${f}"]`);if(x)g[f]=x.value})})}
document.addEventListener('change',e=>{const up=e.target.dataset&&e.target.dataset.up;if(!up)return;const file=e.target.files[0];if(!file)return;
  const img=new Image(),rd=new FileReader();rd.onload=()=>{img.onload=()=>{const k=Math.min(1,900/Math.max(img.width,img.height)),cv=document.createElement('canvas');cv.width=img.width*k;cv.height=img.height*k;cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
    const url=cv.toDataURL('image/jpeg',.72),iid='img_'+DB.uid();if(!DB.img.set(iid,url))return toast('Sem espaço para mais fotos no navegador');
    const g=db.gallery.find(x=>x.id===up);change('gallery',L=>{saveGalFields(L);L.find(x=>x.id===up).img=iid},`Foto enviada para "${g.t}"`,'Conteúdo')};img.src=rd.result};rd.readAsDataURL(file)});

/* ================= MENSAGENS ================= */
const VARS=['{nome}','{servico}','{data}','{hora}','{plano}','{valor}','{link}','{codigo}'];
const SAMPLE={nome:'Lucas',servico:'Corte + Barba',data:'14/11',hora:'15:30',plano:'Corte + Barba Ilimitado',valor:'200,00',link:'farias.bar/r/x7k',codigo:'482915',qtd:'9'};
const fillVars=t=>t.replace(/\{(\w+)\}/g,(m,k)=>SAMPLE[k]??m);
function vMensagens(){
  return `<div class="top"><div><h1>Mensagens WhatsApp</h1><p>Edite os textos automáticos e escolha quais avisos são enviados.</p></div><div class="acts"><button class="btn btn-primary btn-sm" data-act="msg-save">Salvar mensagens</button></div></div>
  <div class="card box">${Object.entries(db.messages).map(([k,m])=>`<div class="msg"><div><div class="hd"><b>${esc(m.name)}</b>${sw('m-on-'+k,m.on,m.lock)}</div><textarea class="inp" id="m-${k}" data-k="${k}" rows="3">${esc(m.txt)}</textarea><div class="chips-var" style="margin-top:8px">${VARS.map(v=>`<button data-ins="${v}" data-t="m-${k}">${v}</button>`).join('')}</div>${m.lock?'<p class="hint" style="margin-top:6px">Obrigatória para o login.</p>':''}</div><div class="bubble ${m.on?'':'off'}" id="pv-${k}">${esc(fillVars(m.txt))}<small>agora ✓✓</small></div></div>`).join('')}</div>`;
}
document.addEventListener('input',e=>{const k=e.target.dataset&&e.target.dataset.k;if(k&&db.messages[k]&&$('#pv-'+k))$('#pv-'+k).innerHTML=esc(fillVars(e.target.value))+'<small>agora ✓✓</small>'});
document.addEventListener('click',e=>{const b=e.target.closest('[data-ins]');if(!b)return;const t=$('#'+b.dataset.t),p=t.selectionStart??t.value.length;t.value=t.value.slice(0,p)+b.dataset.ins+t.value.slice(t.selectionEnd??p);t.focus();t.dispatchEvent(new Event('input',{bubbles:true}))});
ACT['msg-save']=()=>change('messages',M=>Object.keys(M).forEach(k=>{M[k].txt=$('#m-'+k).value;M[k].on=$('#m-on-'+k).checked}),'Mensagens do WhatsApp atualizadas','Mensagens');

/* ================= EQUIPE ================= */
const ROLE={admin:'Administrador',barbeiro:'Barbeiro',recepcao:'Recepção'};
function vEquipe(){
  return `<div class="top"><div><h1>Equipe e permissões</h1><p>Quem acessa o painel e o que cada um pode fazer.</p></div><div class="acts"><button class="btn btn-primary btn-sm" data-act="team-add">+ Adicionar pessoa</button></div></div>
  <div class="card box"><h3>Pessoas</h3><div class="tw"><table><thead><tr><th>Nome</th><th>Função</th><th>Acesso</th><th></th></tr></thead><tbody>
  ${db.team.map(u=>`<tr><td><b>${esc(u.name)}</b><small>${esc(u.email)}</small></td><td>${u.id==='u1'?'Administrador (dono)':`<select class="inp" data-role="${u.id}" style="width:auto">${Object.entries(ROLE).map(([k,v])=>`<option value="${k}" ${k===u.role?'selected':''}>${v}</option>`).join('')}</select>`}</td><td>${sw('tmon-'+u.id,u.active,u.id==='u1')}</td><td class="r">${u.id==='u1'?'':`<button class="btn btn-danger btn-sm" data-act="team-rm" data-id="${u.id}">Remover</button>`}</td></tr>`).join('')}
  </tbody></table></div></div>
  <div class="card box"><h3>Permissões por função <button class="btn btn-primary btn-sm" data-act="perm-save">Salvar permissões</button></h3><div class="tw"><table class="perm"><thead><tr><th>Permissão</th><th>Administrador</th><th>Barbeiro</th><th>Recepção</th></tr></thead><tbody>
  ${db.roles.perms.map((p,i)=>`<tr><td>${esc(p)}</td><td><input type="checkbox" checked disabled></td><td><input type="checkbox" data-perm="barbeiro" data-i="${i}" ${db.roles.barbeiro[i]?'checked':''}></td><td><input type="checkbox" data-perm="recepcao" data-i="${i}" ${db.roles.recepcao[i]?'checked':''}></td></tr>`).join('')}
  </tbody></table></div></div>`;
}
document.addEventListener('change',e=>{const t=e.target;
  if(t.dataset&&t.dataset.role){const u=db.team.find(x=>x.id===t.dataset.role);change('team',L=>{L.find(x=>x.id===u.id).role=t.value},`${u.name}: função alterada para ${ROLE[t.value]}`,'Equipe')}
  if(t.id&&t.id.startsWith('tmon-')){const u=db.team.find(x=>x.id===t.id.slice(5));if(!u)return;change('team',L=>{L.find(x=>x.id===u.id).active=t.checked},`${u.name}: acesso ${t.checked?'liberado':'suspenso'}`,'Equipe')}});
Object.assign(ACT,{
  'team-add':()=>{modal(`<h3>Adicionar pessoa</h3><p>Ela recebe um convite por e-mail para criar a senha.</p><div class="form"><div class="two"><input class="inp" id="tm-name" placeholder="Nome"><input class="inp" id="tm-email" type="email" placeholder="E-mail"></div><select class="inp" id="tm-role"><option value="barbeiro">Barbeiro</option><option value="recepcao">Recepção</option><option value="admin">Administrador</option></select></div><div class="mact"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="tm-save">Enviar convite</button></div>`);
    $('#tm-save').onclick=()=>{const n=$('#tm-name').value.trim(),em=$('#tm-email').value.trim();if(!n||!/\S+@\S+\.\S+/.test(em))return toast('Informe nome e e-mail');closeModal();change('team',L=>L.push({id:'u'+DB.uid(),name:n,email:em,role:$('#tm-role').value,active:true}),`${n} adicionado(a) à equipe como ${ROLE[$('#tm-role').value]}`,'Equipe')}},
  'team-rm':b=>{const u=db.team.find(x=>x.id===b.dataset.id);confirmBox('Remover da equipe?',`${esc(u.name)} perde o acesso ao painel.`,'Remover',()=>change('team',L=>L.splice(L.findIndex(x=>x.id===u.id),1),`${u.name} removido(a) da equipe`,'Equipe'))},
  'perm-save':()=>change('roles',R=>{['barbeiro','recepcao'].forEach(r=>R[r]=R.perms.map((_,i)=>$(`[data-perm="${r}"][data-i="${i}"]`).checked?1:0))},'Permissões das funções atualizadas','Equipe'),
});

/* ================= HISTÓRICO ================= */
let logF='all',logQ='';
function vHistorico(){
  const areas=[...new Set(db.log.map(l=>l.area))];
  const rows=db.log.slice().reverse().filter(l=>(logF==='all'||l.area===logF)&&l.desc.toLowerCase().includes(logQ));
  return `<div class="top"><div><h1>Histórico</h1><p>Toda alteração fica registrada. As mais recentes podem ser desfeitas.</p></div></div>
  <div class="card box"><div class="filters"><button class="fbtn ${logF==='all'?'on':''}" data-lf="all">Tudo</button>${areas.map(a=>`<button class="fbtn ${logF===a?'on':''}" data-lf="${esc(a)}">${esc(a)}</button>`).join('')}<input class="inp search" id="log-q" placeholder="Buscar…" value="${esc(logQ)}"></div>
  ${rows.map(l=>{const d=new Date(l.t);return `<div class="loge ${l.undone?'undone':''}"><time>${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${TF.format(d)}</time><div><b>${esc(l.desc)}</b><span>${esc(l.who)} · ${esc(l.area)}${l.undone?' · desfeito':''}</span></div><div>${DB.canUndo(l)?`<button class="btn btn-ghost btn-sm" data-undo="${l.id}">Desfazer</button>`:''}</div></div>`}).join('')||'<p class="empty">Nenhum registro.</p>'}</div>`;
}
document.addEventListener('click',e=>{const f=e.target.closest('[data-lf]');if(f){logF=f.dataset.lf;render()}const u=e.target.closest('[data-undo]');if(u){const id=u.dataset.undo,l=db.log.find(x=>x.id===id),n=DB.laterSameKey(id),orf=DB.undoOrphans(id);
  if(orf)return confirmBox('Não dá para desfazer só isso',`Desfazer deixaria ${plural(orf,'registro','registros')} (agenda, assinatura ou pagamento) sem cliente. Desfaça antes as alterações mais recentes ligadas a este cliente.`,'Entendi',()=>{},false);
  const doit=()=>{if(DB.undo(id)){render();toast('Alteração desfeita')}else toast('Não foi possível desfazer')};
  n?confirmBox('Desfazer esta alteração?',`Isso também desfaz ${n} alteração(ões) feita(s) depois na mesma área (${esc(l.area)}).`,'Desfazer',doit,false):doit()}});
document.addEventListener('input',e=>{if(e.target.id==='log-q'){logQ=e.target.value.toLowerCase();const pos=e.target.selectionStart;render();const i=$('#log-q');i.focus();i.setSelectionRange(pos,pos)}});

/* ================= CONFIGURAÇÕES ================= */
function vConfig(){
  const s=db.settings,sel=(id,opts,v)=>`<select class="inp" id="${id}">${opts.map(([val,l])=>`<option value="${val}" ${+val===+v?'selected':''}>${l}</option>`).join('')}</select>`;
  return `<div class="top"><div><h1>Configurações</h1><p>Regras da agenda, feriados e backup.</p></div><div class="acts"><button class="btn btn-primary btn-sm" data-act="cfg-save">Salvar alterações</button></div></div>
  <div class="g11">
   <div>
    <div class="card box"><h3>Horário de funcionamento</h3>${[1,2,3,4,5,6,0].map(d=>{const h=db.hours[d];return `<div class="hrow"><span>${WDF[d]}</span><select class="inp" id="h-a-${d}" ${h?'':'disabled'}>${timeOpts(h?h[0]:'09:00',6*60,22*60,30)}</select><select class="inp" id="h-b-${d}" ${h?'':'disabled'}>${timeOpts(h?h[1]:'19:00',6*60,23*60,30)}</select>${sw('h-on-'+d,!!h)}</div>`}).join('')}
     <div class="hrow" style="margin-top:6px;border-top:1px solid var(--line);padding-top:12px"><span>Almoço</span><select class="inp" id="l-a" ${db.lunch?'':'disabled'}>${timeOpts(db.lunch?db.lunch[0]:'12:00',10*60,15*60,30)}</select><select class="inp" id="l-b" ${db.lunch?'':'disabled'}>${timeOpts(db.lunch?db.lunch[1]:'13:00',10*60,16*60,30)}</select>${sw('l-on',!!db.lunch)}</div></div>
    <div class="card box"><h3>Feriados e folgas <small>o dia fica fechado no site</small></h3><div class="fix"><div class="two"><input class="inp" type="date" id="hol-d"><input class="inp" id="hol-n" placeholder="Nome (ex.: Férias)"></div><button class="btn btn-ghost btn-sm" data-act="hol-add">Adicionar</button></div>
     <div class="hist-mini" style="max-height:none">${db.holidays.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(h=>`<div><span>${fmtD(h.date)}/${h.date.slice(2,4)} · ${esc(h.name)}${h.date<TODAY?' (passou)':''}</span><button class="btn btn-danger btn-sm" data-act="hol-rm" data-id="${h.id}">Remover</button></div>`).join('')||'<p class="empty">Nenhum feriado cadastrado.</p>'}</div></div>
   </div>
   <div>
    <div class="card box"><h3>Regras da agenda</h3>
     <div class="set"><div>Intervalo entre horários<small>Grade exibida ao cliente</small></div>${sel('cf-step',[[15,'15 min'],[30,'30 min'],[60,'1 hora']],s.step)}</div>
     <div class="set"><div>Antecedência mínima<small>Para o cliente agendar</small></div>${sel('cf-minAdv',[[0,'Nenhuma'],[30,'30 min'],[60,'1 hora'],[120,'2 horas']],s.minAdv)}</div>
     <div class="set"><div>Cancelar ou remarcar até<small>Antes do horário</small></div>${sel('cf-cancelUntil',[[60,'1 hora'],[120,'2 horas'],[240,'4 horas'],[1440,'24 horas']],s.cancelUntil)}</div>
     <div class="set"><div>Tolerância de atraso</div>${sel('cf-tolerance',[[10,'10 min'],[15,'15 min'],[20,'20 min']],s.tolerance)}</div>
     <div class="set"><div>Faltas sem aviso<small>Bloqueia agendamento online após</small></div>${sel('cf-noShow',[[2,'2 faltas'],[3,'3 faltas'],[5,'5 faltas'],[99,'Nunca bloquear']],s.noShow)}</div></div>
    <div class="card box"><h3>Backup dos dados</h3><p class="hint" style="margin-bottom:14px">Baixe uma cópia de tudo (clientes, agenda, financeiro, conteúdo) ou restaure um backup.</p>
     <div class="acts"><button class="btn btn-ghost btn-sm" data-act="bk-exp">Baixar backup</button><label class="btn btn-ghost btn-sm">Restaurar backup<input type="file" accept=".json" hidden id="bk-imp"></label>${new URLSearchParams(location.search).has('demo')?'<button class="btn btn-danger btn-sm" data-act="bk-reset">Voltar aos dados de exemplo</button>':''}</div></div>
   </div>
  </div>`;
}
document.addEventListener('change',e=>{const t=e.target;if(!t.id)return;
  const m=/^h-on-(\d)$/.exec(t.id);if(m){$('#h-a-'+m[1]).disabled=$('#h-b-'+m[1]).disabled=!t.checked}
  if(t.id==='l-on'){$('#l-a').disabled=$('#l-b').disabled=!t.checked}
  if(t.id==='bk-imp'&&t.files[0]){const rd=new FileReader();rd.onload=()=>{try{DB.importAll(rd.result);toast('Backup restaurado');setTimeout(()=>location.reload(),600)}catch(err){toast('Arquivo de backup inválido')}};rd.readAsText(t.files[0])}});
Object.assign(ACT,{
  'cfg-save':()=>{
    const hrs={},ch=[];[0,1,2,3,4,5,6].forEach(d=>{hrs[d]=$('#h-on-'+d).checked?[$('#h-a-'+d).value,$('#h-b-'+d).value]:null;if(JSON.stringify(hrs[d])!==JSON.stringify(db.hours[d]))ch.push(WDF[d])});
    const bad=[0,1,2,3,4,5,6].filter(d=>hrs[d]&&DB.toMin(hrs[d][0])>=DB.toMin(hrs[d][1]));if(bad.length)return toast(`${bad.map(d=>WDF[d]).join(', ')}: o horário de abertura precisa ser antes do fechamento.`);
    const lunchV=$('#l-on').checked?[$('#l-a').value,$('#l-b').value]:null;if(lunchV&&DB.toMin(lunchV[0])>=DB.toMin(lunchV[1]))return toast('Almoço: o início precisa ser antes do fim.');
    const hit=db.appts.filter(a=>a.date>=TODAY&&['conf','pend'].includes(a.status)&&(()=>{const h=hrs[new Date(a.date+'T00:00').getDay()];return !h||DB.toMin(a.start)<DB.toMin(h[0])||DB.toMin(a.start)+a.dur>DB.toMin(h[1])})());
    if(hit.length&&!ACT._cfgOk){return confirmBox('Clientes fora do novo horário',`${plural(hit.length,'horário marcado fica','horários marcados ficam')} fora do novo funcionamento: ${hit.slice(0,4).map(a=>esc(cname(a.cid))+' '+fmtD(a.date)+' '+a.start).join(', ')}${hit.length>4?'…':''}. Eles continuam na agenda: avise e remarque.`,'Salvar assim mesmo',()=>{ACT._cfgOk=true;ACT['cfg-save']();ACT._cfgOk=false},false)}
    if(ch.length)DB.mutate('hours',H=>Object.assign(H,hrs),`Horário de funcionamento alterado: ${ch.join(', ')}`,'Configurações');
    const lunch=lunchV;if(JSON.stringify(lunch)!==JSON.stringify(db.lunch)){DB.mutateMany(['lunch'],d=>{d.lunch=lunch},lunch?`Almoço: ${lunch.join(' – ')}`:'Almoço removido','Configurações');ch.push('almoço')}
    const ns={};['step','minAdv','cancelUntil','tolerance','noShow'].forEach(k=>ns[k]=+$('#cf-'+k).value);
    if(JSON.stringify(ns)!==JSON.stringify(db.settings)){DB.mutate('settings',S=>Object.assign(S,ns),'Regras da agenda alteradas','Configurações');ch.push('regras')}
    DB.save();render();toast(ch.length?'Configurações salvas':'Nada foi alterado')},
  'hol-add':()=>{const d=$('#hol-d').value,n=$('#hol-n').value.trim()||'Folga';if(!d)return toast('Escolha a data');const clash=db.appts.filter(a=>a.date===d&&!['cancel','block'].includes(a.status)).length;
    const go2=()=>change('holidays',L=>L.push({id:DB.uid(),date:d,name:n}),`Dia ${fmtD(d)} fechado: ${n}`,'Configurações');
    clash?confirmBox('Já há horários nesse dia',`${clash} cliente(s) marcados em ${fmtD(d)}. Eles continuam na agenda — avise e remarque pela Agenda.`,'Fechar o dia mesmo assim',go2,false):go2()},
  'hol-rm':b=>{const h=db.holidays.find(x=>x.id===b.dataset.id);change('holidays',L=>L.splice(L.findIndex(x=>x.id===h.id),1),`Dia ${fmtD(h.date)} reaberto (${h.name})`,'Configurações')},
  'bk-exp':()=>download(`backup-farias-${TODAY}.json`,DB.exportAll(),'application/json'),
  'bk-reset':()=>confirmBox('Voltar aos dados de exemplo?','Apaga todas as alterações feitas neste navegador. Baixe um backup antes, se quiser guardar.','Apagar e recomeçar',()=>{DB.reset();location.reload()}),
});

/* ================= render ================= */
const VIEWS={hoje:vHoje,agenda:vAgenda,clientes:vClientes,assinantes:vAssinantes,financeiro:vFinanceiro,servicos:vServicos,conteudo:vConteudo,mensagens:vMensagens,equipe:vEquipe,historico:vHistorico,config:vConfig};
function render(){renderNav();$$('.view').forEach(v=>v.classList.toggle('on',v.id==='v-'+VIEW));$('#v-'+VIEW).innerHTML=VIEWS[VIEW]();a11y($('#v-'+VIEW));$$('tr.click').forEach(t=>{t.tabIndex=0})}
/* outra aba (site ou área do cliente) gravou: atualiza a tela se nenhuma janela estiver aberta */
window.onDBChange=()=>{if(!$('#modal').classList.contains('open'))render()};
render();
