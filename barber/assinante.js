/* assinante.html — área do cliente */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const db=DB.data;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brl=v=>'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const toast=m=>{const t=$('#toast');t.textContent=m;t.setAttribute('role','status');t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2600)};
const WD=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],MO=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'],MOF=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const today=new Date();today.setHours(0,0,0,0);const TODAY=DB.iso(today);
const fmtD=s=>s?s.slice(8,10)+'/'+s.slice(5,7):'—';
const dt=s=>new Date(s+'T00:00:00');
const addD=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};
const plural=(n,s,p)=>n+' '+(n===1?s:p);

/* ===== quem está logado: sem sessão vai para o login (?demo libera o seletor para apresentação) ===== */
const q=new URLSearchParams(location.search),DEMO=q.has('demo');
let ME=null;try{ME=localStorage.getItem('farias_me')}catch(e){}
if(DEMO&&q.get('como'))ME=q.get('como');
let NOSESSION=false;
if(!db.clients.some(c=>c.id===ME)){if(DEMO)ME=db.clients[0]&&db.clients[0].id;else{NOSESSION=true;location.replace('entrar.html')}}
const me=()=>db.clients.find(c=>c.id===ME)||{name:'',phone:''};
const mySub=()=>DB.activeSub(ME)||db.subs.find(s=>s.cid===ME)||null;
const plan=id=>DB.plan(id);
const blocked=()=>DB.isBlocked(me());
const who=()=>(me().name||'Cliente')+' (cliente)';
const act=(key,fn,desc,area)=>{if(!DB.mutate(key,fn,desc,area,who()))return toast('Não foi possível salvar neste aparelho.');render();const m=desc.replace(/^.*?: /,'');toast(m[0].toUpperCase()+m.slice(1))};

/* ===== modal acessível ===== */
let lastFocus=null;
function modal(html){lastFocus=document.activeElement;$('#mbox').innerHTML='<button class="x" data-close aria-label="Fechar">&times;</button>'+html;const m=$('#modal');m.setAttribute('role','dialog');m.setAttribute('aria-modal','true');m.classList.add('open');wireOpts($('#mbox'));setTimeout(()=>{const f=$('#mbox input,#mbox .opt.on,#mbox .popt.on,#mbox button:not(.x)');(f||$('#mbox .x')).focus()},30)}
const closeModal=()=>{$('#modal').classList.remove('open');if(lastFocus&&lastFocus.focus)lastFocus.focus()};
function wireOpts(root){root.querySelectorAll('.opts,.plans').forEach(g=>{g.setAttribute('role','radiogroup');g.querySelectorAll('.opt,.popt').forEach(o=>{o.setAttribute('role','radio');o.tabIndex=0;o.setAttribute('aria-checked',o.classList.contains('on'))})})}
document.addEventListener('click',e=>{if(e.target.closest('[data-close]')||e.target.id==='modal')closeModal();const o=e.target.closest('.opt,.popt');if(o)[...o.parentNode.children].forEach(x=>{x.classList.toggle('on',x===o);x.setAttribute('aria-checked',x===o)})});
addEventListener('keydown',e=>{
  if(e.key==='Escape'&&$('#modal').classList.contains('open'))closeModal();
  if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('[role="radio"],[role="button"]')){e.preventDefault();e.target.click()}
  if(e.key==='Tab'&&$('#modal').classList.contains('open')){const f=[...$('#mbox').querySelectorAll('button,a[href],input,select,textarea,[tabindex="0"]')].filter(x=>!x.disabled);if(!f.length)return;const a=f[0],z=f[f.length-1];if(e.shiftKey&&document.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&document.activeElement===z){e.preventDefault();a.focus()}}
});

/* ===== navegação ===== */
const TABS=[['inicio','Início','<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'],['agenda','Agenda','<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>'],['pagamentos','Pagamentos','<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>'],['plano','Meu plano','<path d="M12 2l2.4 7.2H22l-6 4.6 2.3 7.2-6.3-4.5-6.3 4.5L8 13.8 2 9.2h7.6z"/>']];
let VIEW='inicio';
const tabHtml=()=>TABS.map(([k,n,ic])=>`<button class="tab ${k===VIEW?'on':''}" data-go="${k}" ${k===VIEW?'aria-current="page"':''}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">${ic}</svg>${n}</button>`).join('');
document.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g){e.preventDefault();VIEW=g.dataset.go;render();scrollTo(0,0)}});

/* ===== dados do cliente ===== */
const upcoming=()=>db.appts.filter(a=>a.cid===ME&&a.date>=TODAY&&['conf','pend','now'].includes(a.status)).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
const pastAppts=()=>db.appts.filter(a=>a.cid===ME&&['done','miss','cancel'].includes(a.status)).sort((a,b)=>(b.date+b.start).localeCompare(a.date+a.start));
const canChange=a=>((dt(a.date)-new Date())/60000+DB.toMin(a.start))>=(db.settings.cancelUntil||120);
const subState=s=>s.status==='late'?['Suspenso','c-bad']:s.status==='paused'?['Pausado','c-warn']:s.cancelAt?['Cancelamento agendado','c-warn']:['Ativo','c-ok'];

/* ===== telas ===== */
function apptHtml(a,full){
  const d=dt(a.date),ok=canChange(a)&&!blocked();
  return `<div class="appt"><div class="dbox"><small>${WD[d.getDay()]}</small><b>${d.getDate()}</b><small>${MO[d.getMonth()]}</small></div>
  <div class="inf"><strong>${esc(a.svc)}</strong><span>${esc(a.start)} · ${a.dur} min · com Farias</span></div>
  <div class="acts"><span class="chip ${a.plan?'c-ok':'c-info'}">${a.plan?'Incluso no plano':brl(a.price)}</span>${full?(ok?`<button class="btn btn-ghost btn-sm" data-move="${a.id}">Remarcar</button><button class="btn btn-danger btn-sm" data-cancel="${a.id}">Cancelar</button>`:`<span class="chip c-dim">${blocked()?'Fale com o Farias para alterar':'Menos de '+DB.cancelText()+' para o horário: fale com o Farias'}</span>`):''}</div></div>`;
}
function vInicio(){
  const c=me(),s=mySub(),has=s&&s.status!=='off',p=has&&plan(s.plan),up=upcoming();
  let card,alert='';
  if(blocked())alert+=`<div class="alert"><div><b>Agendamento online indisponível</b><span>Fale com o Farias pelo WhatsApp para marcar ou alterar horários.</span></div></div>`;
  if(db.content.notice_on&&db.content.notice)alert+=`<div class="alert info" role="status"><div><b>Aviso da barbearia</b><span>${esc(db.content.notice)}</span></div></div>`;
  if(!has){
    card=`<div class="card plan none"><div class="top"><span class="eyebrow">Seu plano</span><span class="chip c-dim">${s?'Cancelado':'Sem plano'}</span></div><h2>${s?'Assinatura cancelada':'Você ainda não assina'}</h2><div class="meta">Assine e corte o mês inteiro pagando menos que o avulso.</div><button class="btn btn-primary" data-go="plano">Ver planos</button></div>`;
  }else{
    const late=s.status==='late',paused=s.status==='paused',price=DB.subPrice(s),ym=TODAY.slice(0,7),u=DB.usage(ME,ym),qt=DB.quota(p),cr=DB.credit(s,ym);
    if(late)alert+=`<div class="alert"><div><b>Pagamento não identificado</b><span>A cobrança do ${esc(p.n)} não foi paga. Pague para liberar os horários do plano.</span></div><button class="btn btn-primary btn-sm btn-pay" data-pix>${payIcon('pix')}Pagar com Pix · ${brl(price)}</button></div>`;
    else if(paused)alert+=`<div class="alert warn"><div><b>Assinatura pausada</b><span>Volta automaticamente em ${fmtD(s.pausedUntil)}. Nenhuma cobrança até lá.</span></div></div>`;
    else if(s.cancelAt)alert+=`<div class="alert warn"><div><b>Cancelamento agendado</b><span>Seus benefícios continuam até ${fmtD(s.cancelAt)}. Depois disso, nenhuma nova cobrança.</span></div><button class="btn btn-ghost btn-sm" data-keep>Manter assinatura</button></div>`;
    else if(s.courtesyUntil&&s.courtesyUntil>=TODAY)alert+=`<div class="alert info"><div><b>Você ganhou uma cortesia</b><span>Seu plano está garantido sem cobrança até ${fmtD(s.courtesyUntil)}.</span></div></div>`;
    else if(s.exempt)alert+=`<div class="alert info"><div><b>Próxima cobrança isenta</b><span>O Farias isentou sua cobrança de ${fmtD(DB.nextBill(s))}.</span></div></div>`;
    if(s.nextPlan)alert+=`<div class="alert info"><div><b>Troca de plano agendada</b><span>A partir de ${fmtD(s.nextPlanAt)} seu plano passa a ser ${esc(plan(s.nextPlan).n)} (${brl(plan(s.nextPlan).p)}/mês).</span></div><button class="btn btn-ghost btn-sm" data-undochange>Desistir da troca</button></div>`;
    let meters;
    if(qt){const parts=[['Cortes do mês',u.corte,qt.corte+cr]];if(qt.barba)parts.push(['Barbas do mês',u.barba,qt.barba+cr]);
      meters=parts.map(([l,a,b])=>`<div class="meter"><div class="lbl"><span>${l}</span><b>${Math.min(a,b)} de ${b}</b></div><div class="bar"><i style="width:${b?Math.min(100,a/b*100):0}%;${late?'background:var(--bad)':''}"></i></div></div>`).join('')}
    else meters=`<div class="meter"><div class="lbl"><span>Atendimentos do plano</span><b>${plural(u.total,'neste mês','neste mês')}</b></div><p style="font-size:12.5px;color:var(--muted);margin-top:4px">Ilimitado, ${p.days.map(d=>WD[d]).join(', ')}${p.gap?` · intervalo de ${p.gap} dias`:''}</p></div>`;
    if(cr)meters+=`<p style="font-size:12.5px;color:var(--teal-2)">${cr>0?'+':''}${plural(cr,'uso ajustado','usos ajustados')} pelo Farias neste mês</p>`;
    const st=subState(s);
    card=`<div class="card plan ${late?'susp':''}"><div class="top"><span class="eyebrow">Seu plano</span><span class="chip ${st[1]}">${st[0]}</span></div>
      <h2>${esc(p.n)}</h2><div class="meta">${brl(price)}/mês · ${late?'cobrança em aberto':paused?'pausado até '+fmtD(s.pausedUntil):s.cancelAt?'termina em '+fmtD(s.cancelAt):'próxima cobrança '+fmtD(DB.nextBill(s))+' · '+esc(s.method)}</div><div class="meters">${meters}</div></div>`;
  }
  const active=has&&s.status==='ok';let perksBox;
  if(active){const perks=[[`Válido em`,p.days.map(d=>WD[d]).join(', ')]];if(p.perks&&p.perks!=='—')perks.push(['Brindes do mês',p.perks]);if(p.gap)perks.push(['Intervalo entre cortes',p.gap+' dias']);
    db.services.filter(x=>x.on&&x.mp!=null).forEach(x=>perks.push([x.n,brl(x.mp)]));
    perksBox=`<h3>Seus benefícios</h3><ul class="perks">${perks.map(([a,b])=>`<li>${esc(a)}<b>${esc(b)}</b></li>`).join('')}</ul>`}
  else if(has){perksBox=`<h3>Seus benefícios</h3><p class="empty">${s.status==='late'?'Benefícios suspensos até o pagamento. Depois de pagar, tudo volta na hora.':'Benefícios pausados até '+fmtD(s.pausedUntil)+'.'}</p>`}
  else{const on=db.plans.filter(x=>x.on).sort((a,b)=>a.p-b.p),mp=db.services.filter(x=>x.on&&x.mp!=null);
    perksBox=`<h3>Por que assinar?</h3><ul class="perks">${on.length?`<li>Planos a partir de<b>${brl(on[0].p)}/mês</b></li>`:''}<li>Cobrança automática<b>sem fidelidade</b></li>${mp.map(x=>`<li>${esc(x.n)} para assinante<b>${brl(x.mp)} <s style="color:var(--dim);font-weight:400">${brl(x.p)}</s></b></li>`).join('')}</ul><button class="btn btn-primary btn-sm" style="margin-top:14px" data-go="plano">Ver planos</button>`}
  const bookBtn=blocked()?`<a href="https://wa.me/${esc(db.content.wa)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18"/></svg>Agendar pelo WhatsApp</a>`
    :`<a href="agendar.html${active?'?cat=ass':''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M12 13v4M10 15h4"/></svg>Novo agendamento</a>`;
  return `<h1>Fala, ${esc((c.name||'').split(' ')[0])}!</h1><p class="sub">${up.length?`Seu próximo horário é ${WD[dt(up[0].date).getDay()].toLowerCase()}, ${fmtD(up[0].date)} às ${esc(up[0].start)}.`:'Você não tem horários marcados.'}</p>${alert}
  <div class="grid2"><div>${card}<div class="quick">${bookBtn}<a href="https://wa.me/${esc(db.content.wa)}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z"/></svg>Falar com o Farias</a></div></div>
  <div style="display:grid;gap:16px;align-content:start"><div class="card box"><h3>Próximos horários <a href="#" data-go="agenda">Ver todos</a></h3>${up.slice(0,2).map(a=>apptHtml(a,false)).join('')||'<p class="empty">Nenhum horário marcado.</p>'}</div>
  <div class="card box">${perksBox}</div></div></div>`;
}
function vAgenda(){
  const up=upcoming(),hist=pastAppts();const ST={done:['Concluído','c-dim'],miss:['Faltou','c-bad'],cancel:['Cancelado','c-dim']};
  return `<h1>Minha agenda</h1><p class="sub">Remarque ou cancele com até ${DB.cancelText()} de antecedência.</p>
  <div class="card box" style="margin-bottom:16px"><h3>Próximos ${blocked()?'':'<a href="agendar.html">+ Agendar</a>'}</h3>${up.map(a=>apptHtml(a,true)).join('')||'<p class="empty">Nenhum horário marcado.</p>'}</div>
  <div class="card box"><h3>Histórico</h3><div class="tw"><table><thead><tr><th>Data</th><th>Serviço</th><th>Status</th><th class="r">Valor</th></tr></thead><tbody>${hist.map(a=>`<tr><td>${fmtD(a.date)}</td><td>${esc(a.svc)}</td><td><span class="chip ${ST[a.status][1]}">${ST[a.status][0]}</span></td><td class="r">${a.plan?'<span class="chip c-ok">Plano</span>':brl(a.price)}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">Sem histórico ainda.</td></tr>'}</tbody></table></div></div>`;
}
function vPagamentos(){
  const s=mySub(),has=s&&s.status!=='off',p=has&&plan(s.plan),price=has?DB.subPrice(s):0,tx=db.tx.filter(t=>t.cid===ME).sort((a,b)=>b.date.localeCompare(a.date));
  const TS={ok:['Pago','c-ok'],failed:['Em aberto','c-bad'],refunded:['Estornado','c-warn'],waived:['Perdoado','c-dim']};
  const nb=has&&DB.nextBill(s),free=has&&(s.exempt||(s.courtesyUntil&&s.courtesyUntil>=nb));
  const next=!has?'<p class="empty">Sem assinatura ativa.</p>':s.status==='late'?`<div class="kv"><div><span>Fatura em aberto</span><b style="color:var(--bad)">${brl(price)}</b></div><div><span>Ação</span><button class="btn btn-primary btn-sm btn-pay" data-pix>${payIcon('pix')}Pagar agora</button></div></div>`
    :s.cancelAt?`<div class="kv"><div><span>Situação</span><b>Sem novas cobranças</b></div><div><span>Benefícios até</span><b>${fmtD(s.cancelAt)}</b></div></div>`
    :`<div class="kv"><div><span>Valor</span><b>${free?'<s style="color:var(--dim)">'+brl(price)+'</s> R$ 0,00':brl(s.nextPlan?plan(s.nextPlan).p:price)}</b></div><div><span>Data</span><b>${s.status==='paused'?'após a pausa':dt(nb).getDate()+' de '+MOF[dt(nb).getMonth()]}</b></div><div><span>Plano</span><b>${esc(s.nextPlan?plan(s.nextPlan).n:p.n)}</b></div></div>`;
  return `<h1>Pagamentos</h1><p class="sub">Cobrança automática. Você não precisa lembrar de nada.</p>
  <div class="grid2"><div class="card box"><h3>Próxima cobrança</h3>${next}</div><div class="card box"><h3>Forma de pagamento</h3>${has?`<div class="kv"><div><span>Método</span><b>${payIcon(s.method)} ${esc(s.method)}</b></div><div><span>Dia de cobrança</span><b>Todo dia ${String(s.day).padStart(2,'0')}</b></div></div><button class="btn btn-ghost btn-sm" style="margin-top:16px" data-m="pay">Alterar forma de pagamento</button>`:'<p class="empty">Sem assinatura ativa.</p>'}</div></div>
  <div class="card box" style="margin-top:16px"><h3>Recibos</h3><div class="tw"><table><thead><tr><th>Data</th><th>Descrição</th><th>Status</th><th class="r">Valor</th></tr></thead><tbody>${tx.map(t=>`<tr><td>${fmtD(t.date)}</td><td>${esc(t.desc)}</td><td><span class="chip ${(TS[t.status]||['?','c-dim'])[1]}">${(TS[t.status]||['?'])[0]}</span></td><td class="r">${brl(t.value)}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">Nenhum pagamento ainda.</td></tr>'}</tbody></table></div></div>`;
}
function vPlano(){
  const s=mySub(),has=s&&s.status!=='off',p=has&&plan(s.plan);
  if(!has){const on=db.plans.filter(x=>x.on);
    if(blocked())return `<h1>Planos</h1><div class="card box"><p class="empty">Para assinar, fale com o Farias pelo WhatsApp.</p></div>`;
    return `<h1>Planos</h1><p class="sub">Escolha um plano. A cobrança é automática e você cancela quando quiser.</p><div class="card box">${on.length?`<div class="plans" style="margin:0">${on.map((x,i)=>`<div class="popt ${i===Math.min(1,on.length-1)?'on':''}" data-pid="${esc(x.id)}"><div><strong>${esc(x.n)}</strong><small>${x.days.map(d=>WD[d]).join(', ')} · ${esc(x.quota)}${x.perks&&x.perks!=='—'?' · '+esc(x.perks):''}</small></div><b>${brl(x.p)}</b></div>`).join('')}</div><div class="opts"><div class="opt pay on" data-payic="pix">${payIcon('pix')}Pix automático</div><div class="opt pay" data-payic="card">${payIcon('card')}Cartão</div></div><button class="btn btn-primary btn-pay" style="margin-top:16px" data-subscribe data-paybtn>${payIcon('pix')}Assinar agora</button>`:'<p class="empty">Nenhum plano disponível no momento.</p>'}</div>`}
  const rules=[['Dias válidos',p.days.map(d=>WD[d]).join(', ')],['Cota',p.quota||'—'],['Intervalo mínimo',p.gap?p.gap+' dias':'Sem intervalo'],['Brindes',p.perks==='—'?'Nenhum':p.perks],['Saldo','Renova todo mês, não acumula']];
  const st=subState(s),late=s.status==='late';
  return `<h1>Meu plano</h1><p class="sub">Troque ou cancele quando quiser, sem fidelidade.</p>
  <div class="grid2"><div class="card box"><h3>Detalhes</h3><div class="kv"><div><span>Plano</span><b>${esc(p.n)}</b></div><div><span>Valor</span><b>${brl(DB.subPrice(s))}/mês</b></div><div><span>Status</span><span class="chip ${st[1]}">${st[0]}</span></div><div><span>Assinante desde</span><b>${esc(s.since)}</b></div></div></div>
  <div class="card box"><h3>Gerenciar</h3><div style="display:grid;gap:10px">
    ${late?`<button class="btn btn-primary btn-pay" data-pix>${payIcon('pix')}Pagar fatura em aberto</button><p class="empty" style="font-size:13px">Troca de plano e cancelamento ficam liberados depois do pagamento.</p>`
      :s.cancelAt?`<button class="btn btn-primary" data-keep>Manter assinatura</button><p class="empty" style="font-size:13px">Cancelamento agendado para ${fmtD(s.cancelAt)}.</p>`
      :`<button class="btn btn-ghost" data-m="change">${s.nextPlan?'Alterar troca agendada':'Trocar de plano'}</button><button class="btn btn-ghost" data-m="day">Alterar dia de cobrança</button><button class="btn btn-ghost" data-m="pay">Alterar forma de pagamento</button><button class="btn btn-danger" data-m="cancel">Cancelar assinatura</button>`}
  </div></div></div>
  <div class="card box" style="margin-top:16px"><h3>Regras do plano</h3><ul class="perks">${rules.map(([a,b])=>`<li>${a}<b>${esc(b)}</b></li>`).join('')}</ul></div>`;
}

/* ===== ações (gravam no mesmo banco que o painel usa) ===== */
document.addEventListener('click',e=>{
  const t=e.target;
  const cn=t.closest('[data-cancel]');if(cn){const a=db.appts.find(x=>x.id===cn.dataset.cancel);if(!a||!canChange(a))return toast('Prazo para alterar encerrado. Fale com o Farias.');
    modal(`<h3 id="mt">Cancelar horário?</h3><p>${esc(a.svc)} · ${fmtD(a.date)} às ${esc(a.start)}. O horário fica livre para outro cliente${a.plan?' e o uso do plano não é descontado':''}.</p><div class="mact"><button class="btn btn-ghost" data-close>Manter</button><button class="btn btn-danger" id="ok">Cancelar horário</button></div>`);
    $('#ok').onclick=()=>{closeModal();act('appts',L=>{const x=L.find(y=>y.id===a.id);if(x)x.status='cancel'},`${me().name}: horário de ${fmtD(a.date)} ${a.start} cancelado pelo cliente`,'Agenda')}}
  const mv=t.closest('[data-move]');if(mv)moveAppt(mv.dataset.move);
  if(t.closest('[data-keep]')){const s=mySub();act('subs',L=>{const x=L.find(y=>y.id===s.id);x.cancelAt=null},`${me().name}: desistiu do cancelamento da assinatura`,'Assinaturas')}
  if(t.closest('[data-undochange]')){const s=mySub();act('subs',L=>{const x=L.find(y=>y.id===s.id);x.nextPlan=null;x.nextPlanAt=null},`${me().name}: desistiu da troca de plano`,'Assinaturas')}
  if(t.closest('[data-pix]')){const s=mySub(),p=plan(s.plan),price=DB.subPrice(s);
    modal(`<h3 id="mt">Pagar com Pix</h3><p>Copie o código e pague no app do banco. A assinatura volta assim que o pagamento é confirmado.</p><div class="pix-head">${payIcon('pix')}<span>Pix copia e cola · ${brl(price)}</span></div><div class="pix">00020126580014BR.GOV.BCB.PIX0136fariasbarbearia-${esc(s.id)}520400005303986540${price.toFixed(2)}5802BR5913FARIAS BARBEARIA6011SUACIDADE6304ABCD</div><p style="font-size:12px;color:var(--dim)">Demonstração: no sistema real a confirmação chega automaticamente pelo banco.</p><div class="mact"><button class="btn btn-ghost" id="copy">Copiar código</button><button class="btn btn-primary btn-pay" id="paid">${payIcon('pix')}Simular pagamento</button></div>`);
    $('#copy').onclick=()=>{try{navigator.clipboard.writeText($('.pix').textContent)}catch(e){}toast('Código Pix copiado')};
    $('#paid').onclick=()=>{closeModal();
      const ok=DB.mutateMany(['tx','subs'],d=>{const x=d.tx.find(y=>y.cid===ME&&y.status==='failed');if(x){x.status='ok';x.method='Pix';x.value=price}else d.tx.unshift({id:DB.uid(),date:TODAY,cid:ME,desc:'Plano '+p.n,method:'Pix',value:price,kind:'plano',status:'ok'});const sub=d.subs.find(y=>y.id===s.id);sub.status='ok'},
        `${me().name}: pagou ${brl(price)} via Pix e a assinatura foi reativada`,'Financeiro',who());
      if(!ok)return toast('Não foi possível salvar neste aparelho.');render();toast('Pagamento confirmado. Assinatura reativada.')}}
  if(t.closest('[data-subscribe]')){
    DB.refresh();if(blocked())return toast('Para assinar, fale com o Farias.');if(DB.activeSub(ME)){render();return toast('Você já tem uma assinatura.')}
    const pid=($('.popt.on')||{}).dataset.pid,p=db.plans.find(x=>x.id===pid&&x.on);if(!p)return toast('Escolha um plano.');
    const met=$('.opts .opt.on').dataset.payic==='pix'?'Pix automático':'Cartão',mo=MO[today.getMonth()]+'/'+String(today.getFullYear()).slice(2);
    const ok=DB.mutateMany(['subs','tx'],d=>{
      const v={plan:p.id,price:p.p,status:'ok',used:0,credit:0,creditMonth:null,day:today.getDate()<=15?1:7,method:met,pausedUntil:null,courtesyUntil:null,exempt:false,cancelAt:null,nextPlan:null,paidUntil:DB.addMonth(TODAY)};
      const old=d.subs.find(x=>x.cid===ME);if(old)Object.assign(old,v);else d.subs.push({id:'a'+DB.uid(),cid:ME,since:mo,...v});
      d.tx.unshift({id:DB.uid(),date:TODAY,cid:ME,desc:'Plano '+p.n,method:met,value:p.p,kind:'plano',status:'ok'})},`${me().name}: assinou o plano ${p.n} (${brl(p.p)})`,'Assinaturas',who());
    if(!ok)return toast('Não foi possível salvar neste aparelho.');VIEW='inicio';render();toast('Assinatura confirmada!')}
  const m=t.closest('[data-m]');if(m)M[m.dataset.m]();
});
const M={
  change(){const s=mySub();if(s.status==='late')return toast('Pague a fatura em aberto antes de trocar de plano.');
    const target=s.nextPlan||s.plan,nb=DB.nextBill(s);
    modal(`<h3 id="mt">Trocar de plano</h3><p>A troca vale a partir da próxima cobrança, em ${fmtD(nb)}. Até lá você continua no plano atual.</p><div class="plans">${db.plans.filter(x=>x.on||x.id===s.plan).map(x=>`<div class="popt ${x.id===target?'on':''}" data-pid="${esc(x.id)}"><div><strong>${esc(x.n)}</strong><small>${x.id===s.plan?'Plano atual':esc(x.quota)}</small></div><b>${brl(x.id===s.plan?DB.subPrice(s):x.p)}</b></div>`).join('')}</div><div class="mact"><button class="btn btn-ghost" data-close>Voltar</button><button class="btn btn-primary" id="ok">Confirmar</button></div>`);
    $('#ok').onclick=()=>{const np=$('.popt.on').dataset.pid;closeModal();
      if(np===s.plan){if(s.nextPlan)act('subs',L=>{const x=L.find(y=>y.id===s.id);x.nextPlan=null;x.nextPlanAt=null},`${me().name}: manteve o plano ${plan(s.plan).n}`,'Assinaturas');return}
      act('subs',L=>{const x=L.find(y=>y.id===s.id);x.nextPlan=np;x.nextPlanAt=nb},`${me().name}: troca agendada de ${plan(s.plan).n} para ${plan(np).n} em ${fmtD(nb)}`,'Assinaturas')}},
  day(){const s=mySub();modal(`<h3 id="mt">Dia de cobrança</h3><p>Escolha o dia do mês em que a cobrança cai. Se você já pagou este ciclo, a mudança vale a partir do próximo.</p><div class="opts"><div class="opt ${s.day===1?'on':''}" data-d="1">Dia 01</div><div class="opt ${s.day===7?'on':''}" data-d="7">Dia 07</div></div><div class="mact"><button class="btn btn-ghost" data-close>Voltar</button><button class="btn btn-primary" id="ok">Salvar</button></div>`);
    $('#ok').onclick=()=>{const d=+$('.opt.on').dataset.d;closeModal();if(d===s.day)return;act('subs',L=>{const x=L.find(y=>y.id===s.id);x.day=d;if(!x.paidUntil)x.paidUntil=DB.nextBill(s)},`${me().name}: dia de cobrança alterado para ${String(d).padStart(2,'0')}`,'Assinaturas')}},
  pay(){const s=mySub();modal(`<h3 id="mt">Forma de pagamento</h3><p>Cobrança automática no dia escolhido.</p><div class="opts"><div class="opt pay ${s.method==='Pix automático'?'on':''}" data-payic="pix">${payIcon('pix')}Pix automático</div><div class="opt pay ${s.method==='Cartão'?'on':''}" data-payic="card">${payIcon('card')}Cartão</div></div><div class="mact"><button class="btn btn-ghost" data-close>Voltar</button><button class="btn btn-primary" id="ok">Salvar</button></div>`);
    $('#ok').onclick=()=>{const v=$('.opt.on').dataset.payic==='pix'?'Pix automático':'Cartão';closeModal();if(v===s.method)return;act('subs',L=>{L.find(x=>x.id===s.id).method=v},`${me().name}: forma de pagamento alterada para ${v}`,'Assinaturas')}},
  cancel(){const s=mySub(),cur=DB.subPrice(s),alt=db.plans.filter(x=>x.on&&x.p<cur).sort((a,b)=>a.p-b.p)[0],end=DB.nextBill(s);
    modal(`<h3 id="mt">Cancelar assinatura?</h3><p>Seus benefícios continuam até ${fmtD(end)}. Depois disso, nenhuma nova cobrança é feita.</p>${alt?`<div class="offer">Antes de ir: que tal o <b>${esc(alt.n)} por ${brl(alt.p)}/mês</b>? Você continua com preço de assinante.</div>`:''}<div class="mact">${alt?'<button class="btn btn-ghost" id="alt">Trocar de plano</button>':'<button class="btn btn-ghost" data-close>Voltar</button>'}<button class="btn btn-danger" id="ok">Cancelar mesmo</button></div>`);
    if($('#alt'))$('#alt').onclick=()=>M.change();
    $('#ok').onclick=()=>{closeModal();act('subs',L=>{const x=L.find(y=>y.id===s.id);x.cancelAt=end;x.nextPlan=null;x.nextPlanAt=null},`${me().name}: cancelou a assinatura ${plan(s.plan).n} (benefícios até ${fmtD(end)})`,'Assinaturas')}},
};
function moveAppt(id){
  DB.refresh();const a=db.appts.find(x=>x.id===id);if(!a)return;
  if(blocked())return toast('Fale com o Farias para alterar seus horários.');
  if(!canChange(a))return toast('Prazo para alterar encerrado. Fale com o Farias.');
  // dias possíveis: com horário livre e, se for do plano, dentro de todas as regras do plano
  const ok=ds=>DB.freeSlots(ds,a.dur,a.id).length&&(!a.plan||!DB.planCheck(ME,ds,a.svc,a.id));
  const days=Array.from({length:14},(_,i)=>DB.iso(addD(today,i))).filter(ok);
  let sel=days[0]||null,time=null;
  const draw=()=>{$('#mv-days').innerHTML=days.map(ds=>{const d=dt(ds);return `<button class="day ${ds===sel?'on':''}" data-ds="${ds}" aria-pressed="${ds===sel}"><small>${WD[d.getDay()]}</small><b>${d.getDate()}</b><small>${MO[d.getMonth()]}</small></button>`}).join('')||'<p class="empty">Nenhum dia disponível nas próximas 2 semanas.</p>';
    const sl=sel?DB.freeSlots(sel,a.dur,a.id):[];$('#mv-slots').innerHTML=sl.map(t=>`<button class="slot ${t===time?'on':''}" data-t="${t}" aria-pressed="${t===time}">${t}</button>`).join('')||(sel?'<p class="empty">Sem horários livres.</p>':'');
    $$('#mv-days .day').forEach(b=>b.onclick=()=>{sel=b.dataset.ds;time=null;draw()});$$('#mv-slots .slot').forEach(b=>b.onclick=()=>{time=b.dataset.t;draw()});$('#ok').disabled=!time};
  const why=a.plan?DB.planCheck(ME,a.date,a.svc,a.id):null;
  modal(`<h3 id="mt">Remarcar horário</h3><p>${esc(a.svc)} · hoje marcado para ${fmtD(a.date)} às ${esc(a.start)}.${a.plan?' Só aparecem os dias que respeitam as regras do seu plano.':''}</p>${why&&/pendente|pausada/.test(why)?`<p class="empty" style="color:var(--bad)">${esc(why)}</p>`:''}<div class="days" id="mv-days"></div><div class="slots" id="mv-slots"></div><div class="mact"><button class="btn btn-ghost" data-close>Voltar</button><button class="btn btn-primary" id="ok">Confirmar</button></div>`);
  draw();
  $('#ok').onclick=()=>{if(!time)return;DB.refresh();
    if(!DB.freeSlots(sel,a.dur,a.id).includes(time))return toast('Esse horário acabou de ser ocupado. Escolha outro.'),draw();
    if(a.plan){const err=DB.planCheck(ME,sel,a.svc,a.id);if(err)return toast(err)}
    closeModal();act('appts',L=>{const x=L.find(y=>y.id===id);x.date=sel;x.start=time;x.status='conf'},`${me().name}: remarcou de ${fmtD(a.date)} ${a.start} para ${fmtD(sel)} ${time}`,'Agenda')};
}

/* ===== render ===== */
const VIEWS={inicio:vInicio,agenda:vAgenda,pagamentos:vPagamentos,plano:vPlano};
function render(){
  const c=me();$('#av').textContent=(c.name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  $('#side').innerHTML=tabHtml();$('#bnav').innerHTML=tabHtml();
  $$('.view').forEach(v=>v.classList.toggle('on',v.id==='v-'+VIEW));$('#v-'+VIEW).innerHTML=VIEWS[VIEW]();wireOpts($('#v-'+VIEW));
}
window.onDBChange=()=>{if(!$('#modal').classList.contains('open'))render()};
$('#logout').onclick=()=>{try{localStorage.removeItem('farias_me')}catch(e){}location.href='entrar.html'};
if(!NOSESSION){
if(DEMO){$('#demobox').hidden=false;$('#demosel').innerHTML=db.clients.map(c=>{const s=DB.activeSub(c.id)||db.subs.find(x=>x.cid===c.id);return `<option value="${esc(c.id)}" ${c.id===ME?'selected':''}>${esc(c.name)}${s?' · '+({ok:'ativo',late:'pendente',paused:'pausado',off:'cancelado'})[s.status]:' · sem plano'}</option>`}).join('');
  $('#demosel').onchange=e=>{ME=e.target.value;try{localStorage.setItem('farias_me',ME)}catch(x){}VIEW='inicio';render()}}
render();
// cliente sem nome (cadastro antigo/incompleto): pede o nome uma vez
if(!me().name||/^novo cliente$/i.test(me().name)){modal(`<h3 id="mt">Como podemos te chamar?</h3><p>Seu nome aparece para o Farias na agenda.</p><label class="t" for="nm" style="margin-top:14px">Seu nome</label><input class="inp" id="nm" autocomplete="name"><div class="mact"><button class="btn btn-primary" id="nm-ok">Salvar</button></div>`);
  $('#nm-ok').onclick=()=>{const v=$('#nm').value.trim();if(v.length<2)return toast('Digite seu nome');closeModal();act('clients',L=>{L.find(x=>x.id===ME).name=v},`${v}: nome cadastrado`,'Clientes')}}

}
