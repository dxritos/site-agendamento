/* painel.html */
/* ================= utilidades ================= */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const db=DB.data;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const money=v=>'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const money0=v=>'R$ '+Number(v||0).toLocaleString('pt-BR',{maximumFractionDigits:0});
const WD=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],WDF=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'],MO=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'],MOF=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const today=new Date();today.setHours(0,0,0,0);const TODAY=DB.iso(today);
const addD=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const fmtD=s=>s?s.slice(8,10)+'/'+s.slice(5,7):'—';
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2600)};
const client=id=>db.clients.find(c=>c.id===id);
const cname=id=>(client(id)||{}).name||'—';
const plan=id=>db.plans.find(p=>p.id===id);
const phoneFmt=p=>{const d=String(p||'').replace(/\D/g,'');return d.length===11?`(${d.slice(0,2)}) ${d[2]} ${d.slice(3,7)}-${d.slice(7)}`:p};
const nextBill=s=>{let d=new Date(today.getFullYear(),today.getMonth(),s.day);if(d<=today)d=new Date(today.getFullYear(),today.getMonth()+1,s.day);return DB.iso(d)};
const sw=(id,on,dis)=>`<label class="sw"><input type="checkbox" id="${id}" ${on?'checked':''} ${dis?'disabled':''}><span></span></label>`;
const timeOpts=(sel,from=7*60,to=21*60,step=15)=>{let o='';for(let m=from;m<=to;m+=step){const t=DB.toHM(m);o+=`<option ${t===sel?'selected':''}>${t}</option>`}return o};
function change(key,fn,desc,area){if(!DB.mutate(key,fn,desc,area))toast('Sem espaço no navegador para salvar');render();toast(desc)}
const cell=v=>{v=String(v??'');if(/^[=+\-@\t\r]/.test(v))v="'"+v;return '"'+v.replace(/"/g,'""')+'"'};
const csv=(head,rows)=>'\ufeff'+[head,...rows].map(r=>r.map(cell).join(';')).join('\n');
function download(name,content,type){const b=new Blob([content],{type});const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}

/* ================= modal genérico ================= */
function modal(html,wide){$('#mbox').className='mbox'+(wide?' wide':'');$('#mbox').innerHTML='<button class="x" data-close>&times;</button>'+html;$('#modal').classList.add('open')}
const closeModal=()=>$('#modal').classList.remove('open');
document.addEventListener('click',e=>{if(e.target.closest('[data-close]')||e.target.id==='modal')closeModal();const o=e.target.closest('.opts4 .opt');if(o)[...o.parentNode.children].forEach(x=>x.classList.toggle('on',x===o))});
addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});
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
function go(k){VIEW=k;history.replaceState(null,'','#'+k);render();scrollTo(0,0)}
document.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g){go(g.dataset.go);if(g.dataset.filter){subFilter=g.dataset.filter;render()}}});

/* ================= HOJE ================= */
const ST={done:['Concluído','c-dim'],now:['Em atendimento','c-ok'],conf:['Confirmado','c-info'],pend:['Aguardando','c-warn'],miss:['Faltou','c-bad'],cancel:['Cancelado','c-dim'],block:['Bloqueado','c-dim']};
function vHoje(){
  const list=db.appts.filter(a=>a.date===TODAY&&a.status!=='cancel').sort((a,b)=>a.start.localeCompare(b.start));
  const svc=list.filter(a=>a.status!=='block');
  const ok=db.subs.filter(s=>s.status==='ok'),late=db.subs.filter(s=>s.status==='late');
  const mrr=ok.reduce((t,s)=>t+(plan(s.plan)||{p:0}).p,0),lateV=late.reduce((t,s)=>t+(plan(s.plan)||{p:0}).p,0);
  const avToday=svc.filter(a=>a.status==='done'&&!a.plan).reduce((t,a)=>t+a.price,0);
  const pend=db.appts.filter(a=>a.status==='pend'&&a.date>=TODAY);
  const hol=db.holidays.find(h=>h.date===TODAY);
  const hr=new Date().getHours();
  return `<div class="top"><div><h1>${hr<12?'Bom dia':hr<18?'Boa tarde':'Boa noite'}, Athos</h1><p>${WDF[today.getDay()]}, ${today.getDate()} de ${MOF[today.getMonth()]}${hol?' · Feriado: '+esc(hol.name):''}</p></div>
   <div class="acts"><button class="btn btn-ghost" data-act="block"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M5.6 5.6l12.8 12.8"/></svg>Bloquear horário</button><button class="btn btn-primary" data-act="new-appt"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>Encaixe</button></div></div>
  <div class="kpis">
    <div class="card kpi"><small>Atendimentos hoje</small><b>${svc.length}</b><span>${svc.filter(a=>a.status==='done').length} concluídos · ${svc.filter(a=>a.plan).length} de assinantes</span></div>
    <div class="card kpi"><small>Avulso recebido hoje</small><b>${money0(avToday)}</b><span>${svc.filter(a=>!a.plan).length} atendimentos avulsos</span></div>
    <div class="card kpi"><small>Assinantes ativos</small><b>${ok.length}</b><span>${db.subs.filter(s=>s.status==='paused').length} pausados</span></div>
    <div class="card kpi"><small>Receita recorrente</small><b>${money0(mrr)}</b><span>por mês</span></div>
    <div class="card kpi"><small>Pagamentos pendentes</small><b class="${late.length?'dn':''}">${late.length}</b><span class="${late.length?'dn':''}">${money0(lateV)} em aberto</span></div>
  </div>
  <div class="g21">
    <div class="card box"><h3>Agenda de hoje <small>clique para editar</small></h3>${list.length?list.map(apptRow).join(''):`<p class="empty">${hol?'Feriado — barbearia fechada.':'Nenhum horário marcado para hoje.'}</p>`}</div>
    <div>
      <div class="card box"><h3>Precisa da sua atenção</h3>
        ${late.length?`<div class="al"><div class="ic" style="background:var(--bad-bg);color:var(--bad)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg></div><div><b>${late.length} assinante(s) com pagamento pendente</b><span>${late.map(s=>esc(cname(s.cid))).join(', ')}</span><br><button class="btn btn-ghost btn-sm" data-go="assinantes" data-filter="late">Ver e corrigir</button></div></div>`:''}
        ${pend.length?`<div class="al"><div class="ic" style="background:var(--warn-bg);color:var(--warn)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg></div><div><b>${pend.length} horário(s) aguardando confirmação</b><span>${pend.slice(0,2).map(a=>esc(cname(a.cid))+' · '+fmtD(a.date)+' '+a.start).join(' · ')}</span></div></div>`:''}
        ${db.content.notice_on?`<div class="al"><div class="ic" style="background:var(--teal-bg);color:var(--teal)"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 11l18-8v18L3 13z"/></svg></div><div><b>Aviso ativo no site</b><span>${esc(db.content.notice)}</span><br><button class="btn btn-ghost btn-sm" data-go="conteudo">Editar</button></div></div>`:''}
        ${!late.length&&!pend.length&&!db.content.notice_on?'<p class="empty">Tudo em dia.</p>':''}
      </div>
      <div class="card box"><h3>Últimas alterações <small><a href="#historico" data-go="historico" style="color:var(--teal-2)">ver tudo</a></small></h3>
        <div class="hist-mini">${db.log.slice(-5).reverse().map(l=>`<div><span>${esc(l.desc)}</span><span>${new Date(l.t).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</span></div>`).join('')||'<p class="empty">Sem alterações.</p>'}</div>
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
    change('appts',L=>{const x=L.find(y=>y.id===a.id);x.status=st;if(st==='done'){const n=L.filter(y=>y.date===TODAY&&y.status==='conf').sort((p,q)=>p.start.localeCompare(q.start))[0];if(n&&!L.some(y=>y.date===TODAY&&y.status==='now'))n.status='now'}},
      `${cname(a.cid)}: ${st==='done'?'atendimento concluído':'falta registrada'} (${fmtD(a.date)} ${a.start})`,'Agenda');
    if(st==='miss')DB.mutate('clients',L=>{const c=L.find(y=>y.id===a.cid);if(c)c.misses=(c.misses||0)+1},`Falta somada para ${cname(a.cid)}`,'Clientes')}
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
const svcOpts=sel=>db.services.map(s=>`<option ${s.n===sel?'selected':''}>${esc(s.n)}</option>`).join('')+['Corte + Barba'].filter(n=>!db.services.some(s=>s.n===n)).map(n=>`<option ${n===sel?'selected':''}>${n}</option>`).join('');
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
  $('#f-save').onclick=()=>{const nd=$('#f-date').value,ns=$('#f-start').value,moved=nd!==a.date||ns!==a.start,dur=svcInfo($('#f-svc').value).t;
    const clash=db.appts.find(x=>x.id!==id&&x.date===nd&&!['cancel'].includes(x.status)&&DB.toMin(x.start)<DB.toMin(ns)+dur&&DB.toMin(x.start)+x.dur>DB.toMin(ns));
    const hol=db.holidays.find(h=>h.date===nd),open=db.hours[new Date(nd+'T00:00').getDay()];
    const warn=clash?`Já existe ${clash.status==='block'?'um bloqueio':'o horário de '+esc(cname(clash.cid))} às ${clash.start} nesse dia.`:hol?`${fmtD(nd)} está fechado (${esc(hol.name)}).`:!open?'A barbearia não abre nesse dia.':(DB.toMin(ns)<DB.toMin(open[0])||DB.toMin(ns)+dur>DB.toMin(open[1]))?`Fora do horário de funcionamento (${open[0]} – ${open[1]}).`:'';
    const doSave=()=>{closeModal();
    change('appts',L=>{const x=L.find(y=>y.id===id);Object.assign(x,{svc:$('#f-svc').value,status:$('#f-st').value,date:nd,start:ns,price:+$('#f-price').value,plan:$('#f-plan').checked,note:$('#f-note').value,dur:svcInfo($('#f-svc').value).t})},
      moved?`${c.name}: remarcado de ${fmtD(a.date)} ${a.start} para ${fmtD(nd)} ${ns}`:`${c.name}: agendamento de ${fmtD(a.date)} ${a.start} editado`,'Agenda')};
    if(warn&&moved)confirmBox('Atenção',warn+' Salvar mesmo assim?','Salvar assim mesmo',doSave,false);else doSave()};
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
    $('#n-save').onclick=()=>{let cid=$('#n-cli').value;const t=$('#n-time').value;if(!t)return toast('Escolha um horário livre');
      if(!cid){const nm=$('#n-name').value.trim();if(!nm)return toast('Informe o nome do cliente');cid='c'+DB.uid();DB.mutate('clients',L=>L.push({id:cid,name:nm,phone:$('#n-phone').value.replace(/\D/g,''),notes:'',blocked:false,misses:0,since:MO[today.getMonth()]+'/'+String(today.getFullYear()).slice(2)}),`Cliente ${nm} cadastrado`,'Clientes')}
      const s=svcInfo($('#n-svc').value),sub=db.subs.find(x=>x.cid===cid&&x.status==='ok');const d=new Date($('#n-date').value+'T00:00');const usePlan=!!sub&&(plan(sub.plan)||{days:[]}).days.includes(d.getDay())&&/^Corte( \+ Barba)?$/.test($('#n-svc').value);
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
  <div class="card box"><div class="filters"><button class="fbtn ${cliF==='all'?'on':''}" data-cf="all">Todos</button><button class="fbtn ${cliF==='miss'?'on':''}" data-cf="miss">Com faltas</button><button class="fbtn ${cliF==='blocked'?'on':''}" data-cf="blocked">Bloqueados</button><input class="inp search" id="cli-q" placeholder="Buscar nome ou telefone..." value="${esc(cliQ)}"></div>
  <div class="tw"><table><thead><tr><th>Cliente</th><th>Plano</th><th>Atendimentos</th><th>Faltas</th><th>Cliente desde</th><th>Status</th></tr></thead><tbody>
  ${rows.map(c=>{const s=db.subs.find(x=>x.cid===c.id&&x.status!=='off');return `<tr class="click" data-cli="${c.id}"><td><b>${esc(c.name)}</b><small>${phoneFmt(c.phone)}</small></td><td>${s?esc(plan(s.plan).n):'<span class="hint">Avulso</span>'}</td><td>${visits(c.id)}</td><td>${c.misses?`<span class="dn">${c.misses}</span>`:'0'}</td><td>${esc(c.since)}</td><td>${c.blocked?'<span class="chip c-bad">Bloqueado</span>':'<span class="chip c-ok">Ativo</span>'}</td></tr>`}).join('')||'<tr><td colspan="6" class="empty">Nenhum cliente encontrado.</td></tr>'}
  </tbody></table></div></div>`;
}
document.addEventListener('click',e=>{const f=e.target.closest('[data-cf]');if(f){cliF=f.dataset.cf;render()}const r=e.target.closest('[data-cli]');if(r)ficha(r.dataset.cli)});
document.addEventListener('input',e=>{if(e.target.id==='cli-q'){cliQ=e.target.value.toLowerCase();const pos=e.target.selectionStart;render();const i=$('#cli-q');i.focus();i.setSelectionRange(pos,pos)}});
function ficha(id){
  const c=client(id);if(!c)return;const hist=db.appts.filter(a=>a.cid===id&&a.status!=='block').sort((a,b)=>(b.date+b.start).localeCompare(a.date+a.start)).slice(0,8);
  const s=db.subs.find(x=>x.cid===id&&x.status!=='off');
  modal(`<div class="eyebrow">Ficha do cliente</div><h3>${esc(c.name)}</h3><p>Cliente desde ${esc(c.since)}${s?' · Assinante '+esc(plan(s.plan).n):''}</p>
   <div class="form"><div class="two"><div class="fl"><label>Nome</label><input class="inp" id="c-name" value="${esc(c.name)}"></div><div class="fl"><label>WhatsApp</label><input class="inp" id="c-phone" value="${esc(c.phone)}"></div></div>
   <div class="fl"><label>Observações (só a equipe vê)</label><textarea class="inp" id="c-notes" placeholder="Preferências, alergias...">${esc(c.notes)}</textarea></div>
   <div class="two"><div class="fl"><label>Faltas registradas</label><input class="inp" type="number" min="0" id="c-miss" value="${c.misses||0}"></div><label style="display:flex;gap:10px;align-items:center;font-size:14px;margin-top:18px">${sw('c-block',c.blocked)} Bloquear agendamento online</label></div></div>
   <div class="sec"><h4>Últimos atendimentos</h4><div class="hist-mini">${hist.map(a=>`<div><span>${fmtD(a.date)} ${a.start} · ${esc(a.svc)}</span><span>${ST[a.status][0]}</span></div>`).join('')||'<p class="empty">Sem histórico.</p>'}</div></div>
   <div class="sec"><h4>Mesclar cadastro duplicado</h4><div class="fix"><select class="inp" id="c-merge"><option value="">Escolha o cadastro duplicado...</option>${db.clients.filter(x=>x.id!==id).map(x=>`<option value="${x.id}">${esc(x.name)} · ${phoneFmt(x.phone)}</option>`).join('')}</select><button class="btn btn-ghost btn-sm" id="c-mergebtn">Mesclar neste</button></div><p class="hint">Horários, assinatura e faltas do duplicado passam para esta ficha, e o duplicado é apagado.</p></div>
   <div class="mact"><button class="btn btn-danger" id="c-del">Excluir dados (LGPD)</button><button class="btn btn-primary" id="c-save">Salvar</button></div>`,true);
  $('#c-save').onclick=()=>{closeModal();change('clients',L=>{const x=L.find(y=>y.id===id);Object.assign(x,{name:$('#c-name').value.trim()||x.name,phone:$('#c-phone').value.replace(/\D/g,''),notes:$('#c-notes').value,misses:+$('#c-miss').value,blocked:$('#c-block').checked})},`Ficha de ${c.name} atualizada`,'Clientes')};
  $('#c-mergebtn').onclick=()=>{const o=$('#c-merge').value;if(!o)return toast('Escolha o cadastro duplicado');const on=cname(o);
    confirmBox('Mesclar cadastros?',`Tudo de <b>${esc(on)}</b> passa para <b>${esc(c.name)}</b>, e o cadastro de ${esc(on)} é apagado.`,'Mesclar',()=>{
      DB.mutate('appts',L=>L.forEach(a=>{if(a.cid===o)a.cid=id}),`Horários de ${on} movidos para ${c.name}`,'Clientes');
      DB.mutate('subs',L=>L.forEach(a=>{if(a.cid===o)a.cid=id}),`Assinatura de ${on} movida para ${c.name}`,'Clientes');
      change('clients',L=>{const x=L.find(y=>y.id===id),y=L.find(z=>z.id===o);x.misses=(x.misses||0)+(y.misses||0);if(y.notes)x.notes=(x.notes?x.notes+'\n':'')+y.notes;L.splice(L.indexOf(y),1)},`Cadastro ${on} mesclado em ${c.name}`,'Clientes')},false)};
  $('#c-del').onclick=()=>confirmBox('Excluir dados do cliente?',`Apaga nome, telefone e observações de ${esc(c.name)}. Os atendimentos ficam no histórico como "Cliente removido".`,'Excluir',()=>change('clients',L=>{const x=L.find(y=>y.id===id);Object.assign(x,{name:'Cliente removido',phone:'',notes:'',blocked:true})},`Dados de ${c.name} excluídos (LGPD)`,'Clientes'));
}
ACT['new-cli']=()=>{modal(`<h3>Novo cliente</h3><div class="form"><div class="two"><input class="inp" id="nc-name" placeholder="Nome"><input class="inp" id="nc-phone" placeholder="WhatsApp com DDD"></div><textarea class="inp" id="nc-notes" placeholder="Observações"></textarea></div><div class="mact"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="nc-save">Cadastrar</button></div>`);
  $('#nc-save').onclick=()=>{const n=$('#nc-name').value.trim();if(!n)return toast('Informe o nome');closeModal();change('clients',L=>L.push({id:'c'+DB.uid(),name:n,phone:$('#nc-phone').value.replace(/\D/g,''),notes:$('#nc-notes').value,blocked:false,misses:0,since:MO[today.getMonth()]+'/'+String(today.getFullYear()).slice(2)}),`Cliente ${n} cadastrado`,'Clientes')}};
ACT['exp-cli']=()=>download('clientes-athos.csv',csv(['Nome','WhatsApp','Faltas','Bloqueado','Desde','Observações'],db.clients.map(c=>[c.name,phoneFmt(c.phone),c.misses,c.blocked?'sim':'não',c.since,(c.notes||'').replace(/\n/g,' ')])),'text/csv');

/* ================= ASSINANTES ================= */
let subFilter='all',subQ='';
const SS={ok:['Ativo','c-ok'],late:['Pendente','c-bad'],paused:['Pausado','c-warn'],off:['Cancelado','c-dim']};
function vAssinantes(){
  const rows=db.subs.filter(s=>(subFilter==='all'||s.status===subFilter)&&cname(s.cid).toLowerCase().includes(subQ));
  return `<div class="top"><div><h1>Assinantes</h1><p>Cobrança automática. Use "Gerenciar" para qualquer correção.</p></div><div class="acts"><button class="btn btn-ghost btn-sm" data-act="exp-sub">Exportar planilha</button><button class="btn btn-primary btn-sm" data-act="new-sub">+ Nova assinatura</button></div></div>
  <div class="pcards">${db.plans.map(p=>{const n=db.subs.filter(s=>s.plan===p.id&&s.status==='ok').length;return `<div class="card pc"><small>${esc(p.n)}${p.on?'':' (pausado)'}</small><b>${n}</b><span>${money0(n*p.p)}/mês</span></div>`}).join('')}</div>
  <div class="card box"><div class="filters">${[['all','Todos'],['ok','Ativos'],['late','Pendentes'],['paused','Pausados'],['off','Cancelados']].map(([k,n])=>`<button class="fbtn ${subFilter===k?'on':''}" data-sf="${k}">${n}</button>`).join('')}<input class="inp search" id="sub-q" placeholder="Buscar assinante..." value="${esc(subQ)}"></div>
  <div class="tw"><table><thead><tr><th>Cliente</th><th>Plano</th><th>Status</th><th>Uso no mês</th><th>Próx. cobrança</th><th>Forma</th><th class="r">Ações</th></tr></thead><tbody>
  ${rows.map(s=>{const p=plan(s.plan)||{n:'—',quota:''};const q=/^(\d)/.exec(p.quota);const tot=q?(p.quota.includes('+')?+q[1]*2:+q[1]):0;
    return `<tr><td><b>${esc(cname(s.cid))}</b><small>desde ${esc(s.since)}</small></td><td>${esc(p.n)}</td><td><span class="chip ${SS[s.status][1]}">${SS[s.status][0]}</span>${s.courtesyUntil?`<small>cortesia até ${fmtD(s.courtesyUntil)}</small>`:''}${s.pausedUntil&&s.status==='paused'?`<small>até ${fmtD(s.pausedUntil)}</small>`:''}</td>
    <td>${s.status==='ok'?(tot?`<span class="mini-bar"><i style="width:${Math.min(100,(s.used/tot)*100)}%"></i></span>${s.used} de ${tot+(s.credit||0)}`:`${s.used} usos`):'<span class="hint">—</span>'}</td>
    <td>${s.status==='off'?'—':s.status==='late'?`<span class="dn">em aberto</span>`:fmtD(nextBill(s))+(s.exempt?' <span class="chip c-warn">isenta</span>':'')}</td><td>${payIcon(s.method)} ${esc(s.method)}</td>
    <td class="r">${s.status==='late'?`<button class="btn btn-primary btn-sm" data-subact="link" data-id="${s.id}">Cobrar</button> `:''}<button class="btn btn-ghost btn-sm" data-sub="${s.id}">Gerenciar</button></td></tr>`}).join('')||'<tr><td colspan="7" class="empty">Nenhuma assinatura.</td></tr>'}
  </tbody></table></div></div>`;
}
document.addEventListener('click',e=>{const f=e.target.closest('[data-sf]');if(f){subFilter=f.dataset.sf;render()}const g=e.target.closest('[data-sub]');if(g)gerSub(g.dataset.sub);const l=e.target.closest('[data-subact="link"]');if(l){const s=db.subs.find(x=>x.id===l.dataset.id);change('subs',L=>{},`Link de pagamento reenviado para ${cname(s.cid)} no WhatsApp`,'Assinaturas')}});
document.addEventListener('input',e=>{if(e.target.id==='sub-q'){subQ=e.target.value.toLowerCase();const pos=e.target.selectionStart;render();const i=$('#sub-q');i.focus();i.setSelectionRange(pos,pos)}});
function gerSub(id){
  const s=db.subs.find(x=>x.id===id),nm=cname(s.cid),p=plan(s.plan);
  const upd=(fn,desc)=>{closeModal();change('subs',L=>fn(L.find(x=>x.id===id)),desc,'Assinaturas')};
  modal(`<div class="eyebrow">Gerenciar assinatura</div><h3>${esc(nm)}</h3><p><span class="chip ${SS[s.status][1]}">${SS[s.status][0]}</span> &nbsp;${esc(p.n)} · ${money(p.p)}/mês</p>
   <div class="form"><div class="three"><div class="fl"><label>Plano</label><select class="inp" id="s-plan">${db.plans.map(x=>`<option value="${x.id}" ${x.id===s.plan?'selected':''}>${esc(x.n)}</option>`).join('')}</select></div><div class="fl"><label>Dia da cobrança</label><select class="inp" id="s-day"><option value="1" ${s.day===1?'selected':''}>Dia 01</option><option value="7" ${s.day===7?'selected':''}>Dia 07</option></select></div><div class="fl"><label>Forma</label><select class="inp" id="s-met">${['Pix automático','Cartão'].map(m=>`<option ${m===s.method?'selected':''}>${m}</option>`).join('')}</select></div></div>
   <button class="btn btn-primary btn-sm" id="s-save" style="justify-self:start">Salvar plano e cobrança</button></div>
   <div class="sec"><h4>Correções</h4>
     <div class="fix"><input class="inp" type="number" id="s-credit" placeholder="Usos a somar (+) ou tirar (−) neste mês"><button class="btn btn-ghost btn-sm" id="s-credit-b">Ajustar saldo</button></div>
     <div class="fix"><select class="inp" id="s-court"><option value="7">7 dias</option><option value="15">15 dias</option><option value="30" selected>30 dias</option></select><button class="btn btn-ghost btn-sm" id="s-court-b">Dar cortesia</button></div>
     <div class="fix"><input class="inp" type="date" id="s-pause" value="${DB.iso(addD(today,30))}"><button class="btn btn-ghost btn-sm" id="s-pause-b">${s.status==='paused'?'Alterar pausa':'Pausar até'}</button></div>
     <div class="fix"><span style="font-size:14px;color:var(--muted)">Próxima cobrança${s.exempt?' está isenta':''}</span><button class="btn btn-ghost btn-sm" id="s-exempt">${s.exempt?'Voltar a cobrar':'Isentar próxima cobrança'}</button></div>
     <div class="fix"><span style="font-size:14px;color:var(--muted)">Última cobrança paga</span><button class="btn btn-ghost btn-sm" id="s-refund">Estornar</button></div>
     ${s.status==='late'?`<div class="fix"><span style="font-size:14px;color:var(--muted)">Pagamento em aberto</span><button class="btn btn-ghost btn-sm" id="s-paid">Marcar como pago</button></div>`:''}
   </div>
   <div class="mact">${s.status==='off'?`<button class="btn btn-primary" id="s-react">Reativar assinatura</button>`:`${s.status==='paused'?'<button class="btn btn-ghost" id="s-react">Retomar agora</button>':''}<button class="btn btn-danger" id="s-cancel">Cancelar assinatura</button>`}</div>`,true);
  $('#s-save').onclick=()=>{const np=$('#s-plan').value;upd(x=>{x.plan=np;x.day=+$('#s-day').value;x.method=$('#s-met').value},np!==s.plan?`${nm}: plano trocado de ${p.n} para ${plan(np).n}`:`${nm}: dados de cobrança atualizados`)};
  $('#s-credit-b').onclick=()=>{const v=parseInt($('#s-credit').value);if(!v)return toast('Informe quantos usos ajustar');upd(x=>{x.credit=(x.credit||0)+v},`${nm}: saldo do mês ajustado em ${v>0?'+':''}${v} uso(s)`)};
  $('#s-court-b').onclick=()=>{const n=+$('#s-court').value,base=s.courtesyUntil&&s.courtesyUntil>TODAY?new Date(s.courtesyUntil+'T00:00'):new Date(nextBill(s)+'T00:00');const until=DB.iso(addD(base,n));upd(x=>{x.courtesyUntil=until;if(x.status==='late')x.status='ok'},`${nm}: cortesia de ${n} dias (até ${fmtD(until)})`)};
  $('#s-pause-b').onclick=()=>{const d=$('#s-pause').value;if(!d||d<=TODAY)return toast('Escolha uma data futura');upd(x=>{x.status='paused';x.pausedUntil=d},`${nm}: assinatura pausada até ${fmtD(d)}`)};
  $('#s-exempt').onclick=()=>upd(x=>{x.exempt=!x.exempt},`${nm}: próxima cobrança ${s.exempt?'volta a ser cobrada':'isenta'}`);
  $('#s-refund').onclick=()=>{const t=db.tx.find(x=>x.cid===s.cid&&x.kind==='plano'&&x.status==='ok');if(!t)return toast('Nenhuma cobrança paga para estornar');
    confirmBox('Estornar cobrança?',`${money(t.value)} de ${fmtD(t.date)} volta para ${esc(nm)}.`,'Estornar',()=>change('tx',L=>{L.find(x=>x.id===t.id).status='refunded'},`${nm}: estorno de ${money(t.value)} (${fmtD(t.date)})`,'Financeiro'))};
  if($('#s-paid'))$('#s-paid').onclick=()=>{closeModal();DB.mutate('tx',L=>{const t=L.find(x=>x.cid===s.cid&&x.status==='failed');if(t){t.status='ok';t.method='Pago manualmente'}},`${nm}: pagamento registrado manualmente`,'Financeiro');change('subs',L=>{L.find(x=>x.id===id).status='ok'},`${nm}: assinatura reativada após pagamento`,'Assinaturas')};
  if($('#s-react'))$('#s-react').onclick=()=>upd(x=>{x.status='ok';x.pausedUntil=null},`${nm}: assinatura ${s.status==='off'?'reativada':'retomada'}`);
  if($('#s-cancel'))$('#s-cancel').onclick=()=>confirmBox('Cancelar assinatura?',`${esc(nm)} perde os benefícios no fim do ciclo atual (${fmtD(nextBill(s))}). Nenhuma nova cobrança é feita.`,'Cancelar assinatura',()=>change('subs',L=>{L.find(x=>x.id===id).status='off'},`${nm}: assinatura cancelada`,'Assinaturas'));
}
ACT['new-sub']=()=>{modal(`<h3>Nova assinatura</h3><p>Para cliente que assinou no balcão. O link de pagamento vai pelo WhatsApp.</p><div class="form"><div class="fl"><label>Cliente</label><select class="inp" id="ns-cli">${clientOpts()}</select></div><div class="two"><div class="fl"><label>Plano</label><select class="inp" id="ns-plan">${db.plans.filter(p=>p.on).map(p=>`<option value="${p.id}">${esc(p.n)} · ${money0(p.p)}</option>`).join('')}</select></div><div class="fl"><label>Dia da cobrança</label><select class="inp" id="ns-day"><option value="1">Dia 01</option><option value="7" selected>Dia 07</option></select></div></div></div><div class="mact"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="ns-save">Criar e enviar link</button></div>`);
  $('#ns-save').onclick=()=>{const cid=$('#ns-cli').value;if(db.subs.some(s=>s.cid===cid&&s.status!=='off'))return toast('Esse cliente já tem assinatura ativa');closeModal();change('subs',L=>L.push({id:'a'+DB.uid(),cid,plan:$('#ns-plan').value,status:'ok',used:0,credit:0,day:+$('#ns-day').value,method:'Pix automático',since:MO[today.getMonth()]+'/'+String(today.getFullYear()).slice(2),pausedUntil:null,courtesyUntil:null,exempt:false}),`Nova assinatura: ${cname(cid)} · ${plan($('#ns-plan').value).n}`,'Assinaturas')}};
ACT['exp-sub']=()=>download('assinantes-athos.csv',csv(['Cliente','Plano','Status','Dia','Forma','Desde'],db.subs.map(s=>[cname(s.cid),(plan(s.plan)||{}).n,(SS[s.status]||['?'])[0],s.day,s.method,s.since])),'text/csv');

/* ================= FINANCEIRO ================= */
let txF='all';
function vFinanceiro(){
  const ym=TODAY.slice(0,7),mt=db.tx.filter(t=>t.date.slice(0,7)===ym);
  const rec=mt.filter(t=>t.status==='ok'&&t.kind==='plano').reduce((s,t)=>s+t.value,0),av=mt.filter(t=>t.status==='ok'&&t.kind!=='plano').reduce((s,t)=>s+t.value,0);
  const refunds=mt.filter(t=>t.status==='refunded').reduce((s,t)=>s+t.value,0),failed=mt.filter(t=>t.status==='failed').reduce((s,t)=>s+t.value,0);
  const REC=[1200,1640,2080,2560,3120,rec],AV=[4100,3900,3700,3500,3400,av],mx=Math.max(...REC.map((r,i)=>r+AV[i]),1);
  const rows=db.tx.filter(t=>txF==='all'||t.status===txF||(txF==='manual'&&t.manual));
  const TS={ok:['Pago','c-ok'],failed:['Falhou','c-bad'],refunded:['Estornado','c-warn']};
  return `<div class="top"><div><h1>Financeiro</h1><p>${MOF[today.getMonth()][0].toUpperCase()+MOF[today.getMonth()].slice(1)} de ${today.getFullYear()}</p></div><div class="acts"><button class="btn btn-ghost btn-sm" data-act="exp-tx">Exportar CSV</button><button class="btn btn-primary btn-sm" data-act="new-tx">+ Registrar pagamento</button></div></div>
  <div class="kpis"><div class="card kpi"><small>Receita do mês</small><b>${money0(rec+av)}</b><span>até hoje</span></div><div class="card kpi"><small>Planos</small><b>${money0(rec)}</b><span>${mt.filter(t=>t.kind==='plano'&&t.status==='ok').length} cobranças pagas</span></div><div class="card kpi"><small>Avulso e balcão</small><b>${money0(av)}</b><span>${mt.filter(t=>t.kind!=='plano'&&t.status==='ok').length} recebimentos</span></div><div class="card kpi"><small>Em aberto</small><b class="${failed?'dn':''}">${money0(failed)}</b><span>cobranças que falharam</span></div><div class="card kpi"><small>Estornos</small><b>${money0(refunds)}</b><span>no mês</span></div></div>
  <div class="g21"><div class="card box"><h3>Receita por mês <small><span style="color:var(--teal)">■</span> Planos &nbsp;<span style="color:#52525b">■</span> Avulso</small></h3><div class="chart">${REC.map((r,i)=>`<div class="col"><span class="v">${money0(r+AV[i])}</span><div class="stack" style="height:${(r+AV[i])/mx*180}px"><i class="s1" style="height:${r/(r+AV[i]||1)*100}%"></i><i class="s2" style="height:${AV[i]/(r+AV[i]||1)*100}%"></i></div></div>`).join('')}</div><div class="xl">${REC.map((_,i)=>`<span>${MO[new Date(today.getFullYear(),today.getMonth()-5+i,1).getMonth()]}</span>`).join('')}</div></div>
  <div class="card box"><h3>Formas de pagamento <small>no mês</small></h3>${['Pix automático','Pix','Cartão','Dinheiro','Maquininha (débito)','Maquininha (crédito)'].map(m=>{const v=mt.filter(t=>t.status==='ok'&&t.method===m).reduce((s,t)=>s+t.value,0);return v?`<div class="meter" style="margin-bottom:12px"><div class="lbl"><span>${m}</span><b>${money0(v)}</b></div><div class="bar"><i style="width:${v/(rec+av||1)*100}%"></i></div></div>`:''}).join('')||'<p class="empty">Sem recebimentos.</p>'}</div></div>
  <div class="card box"><h3>Lançamentos</h3><div class="filters">${[['all','Todos'],['ok','Pagos'],['failed','Falharam'],['refunded','Estornados'],['manual','Lançados à mão']].map(([k,n])=>`<button class="fbtn ${txF===k?'on':''}" data-tf="${k}">${n}</button>`).join('')}</div>
  <div class="tw"><table><thead><tr><th>Data</th><th>Cliente</th><th>Descrição</th><th>Forma</th><th>Status</th><th class="r">Valor</th><th class="r"></th></tr></thead><tbody>
  ${rows.slice(0,60).map(t=>`<tr><td>${fmtD(t.date)}</td><td>${esc(cname(t.cid))}</td><td>${esc(t.desc)}</td><td>${payIcon(t.method)} ${esc(t.method)}</td><td><span class="chip ${TS[t.status][1]}">${TS[t.status][0]}</span></td><td class="r">${money(t.value)}</td><td class="r">${t.status==='ok'?`<button class="btn btn-danger btn-sm" data-refund="${t.id}">Estornar</button>`:''}</td></tr>`).join('')||'<tr><td colspan="7" class="empty">Nada por aqui.</td></tr>'}
  </tbody></table></div></div>`;
}
document.addEventListener('click',e=>{const f=e.target.closest('[data-tf]');if(f){txF=f.dataset.tf;render()}const r=e.target.closest('[data-refund]');if(r){const t=db.tx.find(x=>x.id===r.dataset.refund);confirmBox('Estornar lançamento?',`${money(t.value)} · ${esc(t.desc)} · ${esc(cname(t.cid))}`,'Estornar',()=>change('tx',L=>{L.find(x=>x.id===t.id).status='refunded'},`Estorno de ${money(t.value)} para ${cname(t.cid)} (${t.desc})`,'Financeiro'))}});
ACT['new-tx']=()=>{modal(`<h3>Registrar pagamento</h3><p>Dinheiro, maquininha ou Pix recebido no balcão.</p><div class="form"><div class="fl"><label>Cliente</label><select class="inp" id="t-cli">${clientOpts()}</select></div><div class="two"><div class="fl"><label>Descrição</label><input class="inp" id="t-desc" value="Corte" list="t-svcs"><datalist id="t-svcs">${db.services.map(s=>`<option>${esc(s.n)}</option>`).join('')}<option>Produto: Pomada</option><option>Produto: Óleo capilar</option></datalist></div><div class="fl"><label>Valor (R$)</label><input class="inp" id="t-val" type="number" step="0.01" value="50"></div></div><div class="fl"><label>Data</label><input class="inp" type="date" id="t-date" value="${TODAY}"></div><div class="fl"><label>Forma de pagamento</label><div class="opts4" id="t-met">${['Dinheiro','Pix','Maquininha (débito)','Maquininha (crédito)'].map((m,i)=>`<div class="opt pay ${i===0?'on':''}" data-payic="${m}" data-v="${m}">${payIcon(m)}${m.replace('Maquininha ','').replace(/[()]/g,'')}</div>`).join('')}</div></div></div><div class="mact"><button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary btn-pay" id="t-save" data-paybtn>${payIcon('Dinheiro')}Registrar</button></div>`);
  $('#t-desc').oninput=()=>{const s=db.services.find(x=>x.n===$('#t-desc').value);if(s)$('#t-val').value=s.p};
  $('#t-save').onclick=()=>{const v=+$('#t-val').value;if(!(v>0))return toast('Informe o valor');closeModal();change('tx',L=>L.unshift({id:DB.uid(),date:$('#t-date').value,cid:$('#t-cli').value,desc:$('#t-desc').value,method:$('#t-met .opt.on').dataset.v,value:v,kind:'avulso',status:'ok',manual:true}),`Pagamento de ${money(v)} registrado (${cname($('#t-cli').value)})`,'Financeiro')}};
ACT['exp-tx']=()=>download('financeiro-athos.csv',csv(['Data','Cliente','Descrição','Forma','Status','Valor'],db.tx.map(t=>[t.date,cname(t.cid),t.desc,t.method,t.status,String(t.value).replace('.',',')])),'text/csv');

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
ACT['plan-ed']=b=>{const p=plan(b.dataset.id)||{n:'',p:'',days:[1,2,3,4],quota:'Ilimitado',gap:7,perks:'',on:true};const isNew=!p.id;
  modal(`<h3>${isNew?'Novo plano':'Editar plano'}</h3><p>Mudança de preço vale para novos assinantes. Atuais são avisados com 30 dias.</p><div class="form"><div class="two"><div class="fl"><label>Nome</label><input class="inp" id="p-n" value="${esc(p.n)}"></div><div class="fl"><label>Preço por mês (R$)</label><input class="inp" type="number" id="p-p" value="${p.p}"></div></div>
  <div class="fl"><label>Dias válidos</label><div class="days-pick" id="p-days">${WD.map((d,i)=>`<span data-d="${i}" class="${p.days.includes(i)?'on':''}">${d}</span>`).join('')}</div></div>
  <div class="two"><div class="fl"><label>Cota</label><select class="inp" id="p-q">${['Ilimitado','2 por mês','4 por mês','2 + 2 por mês'].map(q=>`<option ${q===p.quota?'selected':''}>${q}</option>`).join('')}</select></div><div class="fl"><label>Intervalo mínimo</label><select class="inp" id="p-gap">${[0,7,10,14].map(g=>`<option value="${g}" ${g===p.gap?'selected':''}>${g?g+' dias':'Sem intervalo'}</option>`).join('')}</select></div></div>
  <div class="fl"><label>Brindes do mês</label><input class="inp" id="p-perks" value="${esc(p.perks==='—'?'':p.perks)}" placeholder="Ex.: 1 hidratação + 1 sobrancelha"></div></div>
  <div class="mact">${isNew?'':'<button class="btn btn-danger" id="p-del">Excluir</button>'}<button class="btn btn-ghost" data-close>Cancelar</button><button class="btn btn-primary" id="p-save">Salvar</button></div>`);
  $$('#p-days span').forEach(x=>x.onclick=()=>x.classList.toggle('on'));
  $('#p-save').onclick=()=>{const v={n:$('#p-n').value.trim(),p:+$('#p-p').value||0,days:$$('#p-days span.on').map(x=>+x.dataset.d),quota:$('#p-q').value,gap:+$('#p-gap').value,perks:$('#p-perks').value||'—'};if(!v.n)return toast('Informe o nome');if(!v.days.length)return toast('Escolha pelo menos um dia');closeModal();
    if(isNew)change('plans',L=>L.push({id:DB.uid(),on:true,...v}),`Plano ${v.n} criado (${money0(v.p)}/mês)`,'Serviços');
    else change('plans',L=>Object.assign(L.find(x=>x.id===p.id),v),p.p!==v.p?`Preço do plano ${v.n} alterado de ${money0(p.p)} para ${money0(v.p)}`:`Plano ${v.n} editado`,'Serviços')};
  if($('#p-del'))$('#p-del').onclick=()=>{const n=db.subs.filter(s=>s.plan===p.id&&s.status!=='off').length;if(n)return toast(`Não dá para excluir: ${n} assinante(s) ativos. Oculte o plano.`);confirmBox('Excluir plano?',esc(p.n),'Excluir',()=>change('plans',L=>L.splice(L.findIndex(x=>x.id===p.id),1),`Plano ${p.n} excluído`,'Serviços'))}};

/* ================= CONTEÚDO DO SITE ================= */
function vConteudo(){
  const c=db.content;
  return `<div class="top"><div><h1>Conteúdo do site</h1><p>Edite o que os clientes veem. Ao salvar, o site é atualizado na hora.</p></div><div class="acts"><a class="btn btn-ghost btn-sm" href="index.html" target="_blank">Abrir o site ↗</a></div></div>
  <div class="g11">
   <div>
    <div class="card box"><h3>Aviso no topo do site ${sw('k-notice_on',c.notice_on)}</h3><div class="form"><input class="inp" id="k-notice" value="${esc(c.notice)}" placeholder="Ex.: Fechado no feriado"><p class="hint">Faixa que aparece no topo de todas as páginas. Use para feriado, promoção ou mudança de horário.</p></div></div>
    <div class="card box"><h3>Página inicial</h3><div class="form"><div class="fl"><label>Etiqueta</label><input class="inp" id="k-hero_tag" value="${esc(c.hero_tag)}"></div><div class="two"><div class="fl"><label>Título (linha 1)</label><input class="inp" id="k-hero_t1" value="${esc(c.hero_t1)}"></div><div class="fl"><label>Título (destaque verde)</label><input class="inp" id="k-hero_t2" value="${esc(c.hero_t2)}"></div></div><div class="fl"><label>Texto</label><textarea class="inp" id="k-hero_lead">${esc(c.hero_lead)}</textarea></div><div class="fl"><label>Sobre o barbeiro</label><textarea class="inp" id="k-about">${esc(c.about)}</textarea></div></div></div>
    <div class="card box"><h3>Contato</h3><div class="form"><div class="two"><div class="fl"><label>WhatsApp (com 55 e DDD)</label><input class="inp" id="k-wa" value="${esc(c.wa)}"></div><div class="fl"><label>Telefone exibido</label><input class="inp" id="k-phone" value="${esc(c.phone)}"></div></div><div class="two"><div class="fl"><label>Endereço</label><input class="inp" id="k-address" value="${esc(c.address)}"></div><div class="fl"><label>Instagram (sem @)</label><input class="inp" id="k-instagram" value="${esc(c.instagram)}"></div></div></div></div>
    <button class="btn btn-primary" data-act="save-content" style="margin-top:16px">Salvar e publicar</button>
   </div>
   <div>
    <div class="card box"><h3>Perguntas frequentes <button class="btn btn-ghost btn-sm" data-act="faq-add">+ Pergunta</button></h3><div class="list-ed" id="faq-ed">${db.faq.map(f=>`<div class="li-ed" data-fid="${f.id}"><button class="btn btn-danger btn-sm rm" data-act="faq-rm" data-id="${f.id}">×</button><input class="inp" value="${esc(f.q)}" data-f="q" style="padding-right:44px"><textarea class="inp" data-f="a">${esc(f.a)}</textarea></div>`).join('')}</div><button class="btn btn-primary btn-sm" data-act="faq-save" style="margin-top:12px">Salvar perguntas</button></div>
    <div class="card box"><h3>Avaliações <button class="btn btn-ghost btn-sm" data-act="rev-add">+ Avaliação</button></h3><div class="list-ed" id="rev-ed">${db.reviews.map(r=>`<div class="li-ed" data-rid="${r.id}"><button class="btn btn-danger btn-sm rm" data-act="rev-rm" data-id="${r.id}">×</button><div class="two" style="padding-right:44px"><input class="inp" value="${esc(r.name)}" data-f="name" placeholder="Nome"><input class="inp" value="${esc(r.info)}" data-f="info" placeholder="Detalhe"></div><textarea class="inp" data-f="text">${esc(r.text)}</textarea></div>`).join('')}</div><button class="btn btn-primary btn-sm" data-act="rev-save" style="margin-top:12px">Salvar avaliações</button></div>
   </div>
  </div>
  <div class="card box" style="margin-top:16px"><h3>Galeria <span class="acts"><span class="hint">Fotos são reduzidas automaticamente.</span><button class="btn btn-ghost btn-sm" data-act="gal-add">+ Foto</button></span></h3>
   <div class="gal-ed">${db.gallery.map(g=>{const im=g.img&&DB.img.get(g.img);return `<div class="gimg" data-gid="${g.id}"><div class="ph" style="${im&&/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(im)?`background-image:url(${im})`:''}">${im?'':'Sem foto'}</div><div class="tools"><label title="Enviar foto"><input type="file" accept="image/*" hidden data-up="${g.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 16V4M7 9l5-5 5 5M4 20h16"/></svg></label><button title="Remover" data-act="gal-rm" data-id="${g.id}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></button></div>
   <div class="fields"><input class="inp" data-f="t" value="${esc(g.t)}" placeholder="Título"><input class="inp" data-f="s" value="${esc(g.s)}" placeholder="Legenda"><select class="inp" data-f="cat">${[['cortes','Cortes'],['barba','Barba'],['espaco','Espaço']].map(([k,v])=>`<option value="${k}" ${k===g.cat?'selected':''}>${v}</option>`).join('')}</select></div></div>`}).join('')}</div>
   <button class="btn btn-primary btn-sm" data-act="gal-save" style="margin-top:14px">Salvar galeria</button></div>`;
}
const readList=(sel,key,fields)=>$$(sel).map(el=>{const o={id:el.dataset[key]};fields.forEach(f=>o[f]=el.querySelector(`[data-f="${f}"]`).value);return o});
Object.assign(ACT,{
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
  'gal-add':()=>change('gallery',L=>{saveGalFields(L);L.push({id:DB.uid(),cat:'cortes',t:'Novo corte',s:'',img:null})},'Item adicionado à galeria','Conteúdo'),
  'gal-rm':b=>confirmBox('Remover da galeria?','A foto sai do site.','Remover',()=>{const g=db.gallery.find(x=>x.id===b.dataset.id);change('gallery',L=>{saveGalFields(L);L.splice(L.findIndex(x=>x.id===g.id),1)},`Foto "${g.t}" removida da galeria`,'Conteúdo')}),
  'gal-save':()=>change('gallery',L=>saveGalFields(L),'Galeria atualizada','Conteúdo'),
});
function saveGalFields(L){$$('.gimg').forEach(el=>{const g=L.find(x=>x.id===el.dataset.gid);if(!g)return;['t','s','cat'].forEach(f=>g[f]=el.querySelector(`[data-f="${f}"]`).value)})}
document.addEventListener('change',e=>{const up=e.target.dataset&&e.target.dataset.up;if(!up)return;const file=e.target.files[0];if(!file)return;
  const img=new Image(),rd=new FileReader();rd.onload=()=>{img.onload=()=>{const k=Math.min(1,900/Math.max(img.width,img.height)),cv=document.createElement('canvas');cv.width=img.width*k;cv.height=img.height*k;cv.getContext('2d').drawImage(img,0,0,cv.width,cv.height);
    const url=cv.toDataURL('image/jpeg',.72),iid='img_'+DB.uid();if(!DB.img.set(iid,url))return toast('Sem espaço para mais fotos no navegador');
    const g=db.gallery.find(x=>x.id===up);change('gallery',L=>{saveGalFields(L);L.find(x=>x.id===up).img=iid},`Foto enviada para "${g.t}"`,'Conteúdo')};img.src=rd.result};rd.readAsDataURL(file)});

/* ================= MENSAGENS ================= */
const VARS=['{nome}','{servico}','{data}','{hora}','{plano}','{valor}','{link}','{codigo}'];
const SAMPLE={nome:'Lucas',servico:'Corte + Barba',data:'14/11',hora:'15:30',plano:'Corte + Barba Ilimitado',valor:'200,00',link:'athos.bar/r/x7k',codigo:'482915',qtd:'9'};
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
  ${db.team.map(u=>`<tr><td><b>${esc(u.name)}</b><small>${esc(u.email)}</small></td><td>${u.id==='u1'?'Administrador (dono)':`<select class="inp" data-role="${u.id}" style="width:auto">${Object.entries(ROLE).map(([k,v])=>`<option value="${k}" ${k===u.role?'selected':''}>${v}</option>`).join('')}</select>`}</td><td>${sw('tm-'+u.id,u.active,u.id==='u1')}</td><td class="r">${u.id==='u1'?'':`<button class="btn btn-danger btn-sm" data-act="team-rm" data-id="${u.id}">Remover</button>`}</td></tr>`).join('')}
  </tbody></table></div></div>
  <div class="card box"><h3>Permissões por função <button class="btn btn-primary btn-sm" data-act="perm-save">Salvar permissões</button></h3><div class="tw"><table class="perm"><thead><tr><th>Permissão</th><th>Administrador</th><th>Barbeiro</th><th>Recepção</th></tr></thead><tbody>
  ${db.roles.perms.map((p,i)=>`<tr><td>${esc(p)}</td><td><input type="checkbox" checked disabled></td><td><input type="checkbox" data-perm="barbeiro" data-i="${i}" ${db.roles.barbeiro[i]?'checked':''}></td><td><input type="checkbox" data-perm="recepcao" data-i="${i}" ${db.roles.recepcao[i]?'checked':''}></td></tr>`).join('')}
  </tbody></table></div></div>`;
}
document.addEventListener('change',e=>{const t=e.target;
  if(t.dataset&&t.dataset.role){const u=db.team.find(x=>x.id===t.dataset.role);change('team',L=>{L.find(x=>x.id===u.id).role=t.value},`${u.name}: função alterada para ${ROLE[t.value]}`,'Equipe')}
  if(t.id&&t.id.startsWith('tm-')){const u=db.team.find(x=>x.id===t.id.slice(3));change('team',L=>{L.find(x=>x.id===u.id).active=t.checked},`${u.name}: acesso ${t.checked?'liberado':'suspenso'}`,'Equipe')}});
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
  <div class="card box"><div class="filters"><button class="fbtn ${logF==='all'?'on':''}" data-lf="all">Tudo</button>${areas.map(a=>`<button class="fbtn ${logF===a?'on':''}" data-lf="${esc(a)}">${esc(a)}</button>`).join('')}<input class="inp search" id="log-q" placeholder="Buscar..." value="${esc(logQ)}"></div>
  ${rows.map(l=>{const d=new Date(l.t);return `<div class="loge ${l.undone?'undone':''}"><time>${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} ${d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</time><div><b>${esc(l.desc)}</b><span>${esc(l.who)} · ${esc(l.area)}${l.undone?' · desfeito':''}</span></div><div>${l.key&&l.before&&!l.undone?`<button class="btn btn-ghost btn-sm" data-undo="${l.id}">Desfazer</button>`:''}</div></div>`}).join('')||'<p class="empty">Nenhum registro.</p>'}</div>`;
}
document.addEventListener('click',e=>{const f=e.target.closest('[data-lf]');if(f){logF=f.dataset.lf;render()}const u=e.target.closest('[data-undo]');if(u){const id=u.dataset.undo,l=db.log.find(x=>x.id===id),n=DB.laterSameKey(id);
  const doit=()=>{if(DB.undo(id)){render();toast('Alteração desfeita')}};
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
     <div class="acts"><button class="btn btn-ghost btn-sm" data-act="bk-exp">Baixar backup</button><label class="btn btn-ghost btn-sm">Restaurar backup<input type="file" accept=".json" hidden id="bk-imp"></label><button class="btn btn-danger btn-sm" data-act="bk-reset">Voltar aos dados de exemplo</button></div></div>
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
    if(ch.length)DB.mutate('hours',H=>Object.assign(H,hrs),`Horário de funcionamento alterado: ${ch.join(', ')}`,'Configurações');
    const lunch=$('#l-on').checked?[$('#l-a').value,$('#l-b').value]:null;if(JSON.stringify(lunch)!==JSON.stringify(db.lunch)){const before=JSON.stringify(db.lunch);db.lunch=lunch;db.log.push({id:DB.uid(),t:Date.now(),who:'Athos',area:'Configurações',desc:lunch?`Almoço: ${lunch.join(' – ')}`:'Almoço removido',key:'lunch',before});ch.push('almoço')}
    const ns={};['step','minAdv','cancelUntil','tolerance','noShow'].forEach(k=>ns[k]=+$('#cf-'+k).value);
    if(JSON.stringify(ns)!==JSON.stringify(db.settings)){DB.mutate('settings',S=>Object.assign(S,ns),'Regras da agenda alteradas','Configurações');ch.push('regras')}
    DB.save();render();toast(ch.length?'Configurações salvas':'Nada foi alterado')},
  'hol-add':()=>{const d=$('#hol-d').value,n=$('#hol-n').value.trim()||'Folga';if(!d)return toast('Escolha a data');const clash=db.appts.filter(a=>a.date===d&&!['cancel','block'].includes(a.status)).length;
    const go2=()=>change('holidays',L=>L.push({id:DB.uid(),date:d,name:n}),`Dia ${fmtD(d)} fechado: ${n}`,'Configurações');
    clash?confirmBox('Já há horários nesse dia',`${clash} cliente(s) marcados em ${fmtD(d)}. Eles continuam na agenda — avise e remarque pela Agenda.`,'Fechar o dia mesmo assim',go2,false):go2()},
  'hol-rm':b=>{const h=db.holidays.find(x=>x.id===b.dataset.id);change('holidays',L=>L.splice(L.findIndex(x=>x.id===h.id),1),`Dia ${fmtD(h.date)} reaberto (${h.name})`,'Configurações')},
  'bk-exp':()=>download(`backup-athos-${TODAY}.json`,DB.exportAll(),'application/json'),
  'bk-reset':()=>confirmBox('Voltar aos dados de exemplo?','Apaga todas as alterações feitas neste navegador. Baixe um backup antes, se quiser guardar.','Apagar e recomeçar',()=>{DB.reset();location.reload()}),
});

/* ================= render ================= */
const VIEWS={hoje:vHoje,agenda:vAgenda,clientes:vClientes,assinantes:vAssinantes,financeiro:vFinanceiro,servicos:vServicos,conteudo:vConteudo,mensagens:vMensagens,equipe:vEquipe,historico:vHistorico,config:vConfig};
function render(){renderNav();$$('.view').forEach(v=>v.classList.toggle('on',v.id==='v-'+VIEW));$('#v-'+VIEW).innerHTML=VIEWS[VIEW]()}
render();
