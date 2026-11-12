/* assinante.html */
const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
const db=DB.data;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const brl=v=>'R$ '+Number(v||0).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(t._t);t._t=setTimeout(()=>t.classList.remove('show'),2600)};
const WD=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],MO=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'],MOF=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
const today=new Date();today.setHours(0,0,0,0);const TODAY=DB.iso(today);
const fmtD=s=>s?s.slice(8,10)+'/'+s.slice(5,7):'—';
const dt=s=>new Date(s+'T00:00:00');
const addD=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x};

/* ===== quem está logado ===== */
let ME=null;try{ME=localStorage.getItem('athos_me')}catch(e){}
const q=new URLSearchParams(location.search);
if(q.get('como'))ME=q.get('como');
if(!db.clients.some(c=>c.id===ME))ME='c1';                       // demonstração: abre como Lucas
const me=()=>db.clients.find(c=>c.id===ME);
const mySub=()=>db.subs.filter(s=>s.cid===ME).sort((a,b)=>(a.status==='off')-(b.status==='off'))[0]||null;
const plan=id=>db.plans.find(p=>p.id===id);
const nextBill=s=>{let d=new Date(today.getFullYear(),today.getMonth(),s.day);if(d<=today)d=new Date(today.getFullYear(),today.getMonth()+1,s.day);return DB.iso(d)};
const act=(key,fn,desc,area)=>{DB.mutate(key,fn,desc,area,(me()||{}).name+' (cliente)');render();const m=desc.replace(/^.*?: /,'');toast(m[0].toUpperCase()+m.slice(1))};

/* ===== modal ===== */
function modal(html){$('#mbox').innerHTML='<button class="x" data-close>&times;</button>'+html;$('#modal').classList.add('open')}
const closeModal=()=>$('#modal').classList.remove('open');
document.addEventListener('click',e=>{if(e.target.closest('[data-close]')||e.target.id==='modal')closeModal();const o=e.target.closest('.opt,.popt');if(o)[...o.parentNode.children].forEach(x=>x.classList.toggle('on',x===o))});
addEventListener('keydown',e=>{if(e.key==='Escape')closeModal()});

/* ===== navegação ===== */
const TABS=[['inicio','Início','<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>'],['agenda','Agenda','<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4"/>'],['pagamentos','Pagamentos','<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>'],['plano','Meu plano','<path d="M12 2l2.4 7.2H22l-6 4.6 2.3 7.2-6.3-4.5-6.3 4.5L8 13.8 2 9.2h7.6z"/>']];
let VIEW='inicio';
const tabHtml=()=>TABS.map(([k,n,ic])=>`<button class="tab ${k===VIEW?'on':''}" data-go="${k}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">${ic}</svg>${n}</button>`).join('');
document.addEventListener('click',e=>{const g=e.target.closest('[data-go]');if(g){e.preventDefault();VIEW=g.dataset.go;render();scrollTo(0,0)}});

/* ===== dados do cliente ===== */
function upcoming(){return db.appts.filter(a=>a.cid===ME&&a.date>=TODAY&&['conf','pend','now'].includes(a.status)).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start))}
function history(){return db.appts.filter(a=>a.cid===ME&&['done','miss','cancel'].includes(a.status)).sort((a,b)=>(b.date+b.start).localeCompare(a.date+a.start))}
function usage(s){
  const p=plan(s.plan),ym=TODAY.slice(0,7);
  const used=db.appts.filter(a=>a.cid===ME&&a.plan&&a.date.slice(0,7)===ym&&!['cancel','miss'].includes(a.status)).length;
  const m=/^(\d+)(?: \+ (\d+))?/.exec(p.quota);const total=m?(+m[1]+(+m[2]||0)):null;
  return {used,total:total!=null?total+(s.credit||0):null,credit:s.credit||0};
}
const canChange=a=>{const mins=(dt(a.date)-new Date())/60000+DB.toMin(a.start);return mins>=(db.settings.cancelUntil||120)};

/* ===== telas ===== */
function apptHtml(a,full){
  const d=dt(a.date),ok=canChange(a);
  return `<div class="appt"><div class="dbox"><small>${WD[d.getDay()]}</small><b>${d.getDate()}</b><small>${MO[d.getMonth()]}</small></div>
  <div class="inf"><strong>${esc(a.svc)}</strong><span>${a.start} · ${a.dur} min · com Athos</span></div>
  <div class="acts"><span class="chip ${a.plan?'c-ok':'c-info'}">${a.plan?'Incluso no plano':brl(a.price)}</span>${full?(ok?`<button class="btn btn-ghost btn-sm" data-move="${a.id}">Remarcar</button><button class="btn btn-danger btn-sm" data-cancel="${a.id}">Cancelar</button>`:`<span class="chip c-dim" title="Menos de ${(db.settings.cancelUntil||120)/60} h para o horário">Fale com o Athos para alterar</span>`):''}</div></div>`;
}
function vInicio(){
  const c=me(),s=mySub(),p=s&&plan(s.plan),up=upcoming();
  let card,alert='';
  if(!s||s.status==='off'){
    card=`<div class="card plan none"><div class="top"><span class="eyebrow">Seu plano</span><span class="chip c-dim">${s?'Cancelado':'Sem plano'}</span></div><h2>${s?'Assinatura cancelada':'Você ainda não assina'}</h2><div class="meta">Assine e corte o mês inteiro pagando menos que o avulso.</div><button class="btn btn-primary" data-go="plano">Ver planos</button></div>`;
  }else{
    const u=usage(s),late=s.status==='late',paused=s.status==='paused';
    if(late)alert=`<div class="alert"><div><b>Pagamento não identificado</b><span>A cobrança do ${esc(p.n)} não foi paga. Pague para liberar os horários do plano.</span></div><button class="btn btn-primary btn-sm btn-pay" data-pix>${payIcon('pix')}Pagar com Pix · ${brl(p.p)}</button></div>`;
    else if(paused)alert=`<div class="alert warn"><div><b>Assinatura pausada</b><span>Volta automaticamente em ${fmtD(s.pausedUntil)}. Nenhuma cobrança até lá.</span></div></div>`;
    else if(s.courtesyUntil&&s.courtesyUntil>=TODAY)alert=`<div class="alert info"><div><b>Você ganhou uma cortesia</b><span>Seu plano está garantido sem cobrança até ${fmtD(s.courtesyUntil)}.</span></div></div>`;
    else if(s.exempt)alert=`<div class="alert info"><div><b>Próxima cobrança isenta</b><span>O Athos isentou sua cobrança de ${fmtD(nextBill(s))}.</span></div></div>`;
    const meters=[`<div class="meter"><div class="lbl"><span>${p.quota==='Ilimitado'?'Atendimentos do plano no mês':'Saldo do mês'}</span><b>${u.total!=null?`${u.used} de ${u.total}`:`${u.used} · ilimitado`}</b></div><div class="bar"><i style="width:${u.total!=null?Math.min(100,u.used/u.total*100):100}%;${late?'background:var(--bad)':''}"></i></div></div>`];
    if(u.credit)meters.push(`<p class="hint" style="font-size:12.5px;color:var(--teal-2)">${u.credit>0?'+':''}${u.credit} uso(s) ajustado(s) pelo Athos neste mês</p>`);
    card=`<div class="card plan ${late?'susp':''}"><div class="top"><span class="eyebrow">Seu plano</span><span class="chip ${late?'c-bad':paused?'c-warn':'c-ok'}">${late?'Suspenso':paused?'Pausado':'Ativo'}</span></div>
      <h2>${esc(p.n)}</h2><div class="meta">${brl(p.p)}/mês · ${late?'cobrança em aberto':paused?'pausado até '+fmtD(s.pausedUntil):'próxima cobrança '+fmtD(nextBill(s))+' · '+esc(s.method)}</div><div class="meters">${meters.join('')}</div></div>`;
  }
  // benefícios: só aparecem como "seus" para assinatura ativa; suspensa/pausada mostra aviso; sem plano vira oferta
  const active=s&&s.status==='ok',hasSub=s&&s.status!=='off';let perksBox;
  if(active){const perks=[[`Válido em`,p.days.map(d=>WD[d]).join(', ')]];if(p.perks&&p.perks!=='—')perks.push(['Brindes do mês',p.perks]);if(p.gap)perks.push(['Intervalo entre cortes',p.gap+' dias']);
    db.services.filter(x=>x.on&&x.mp!=null).forEach(x=>perks.push([x.n,brl(x.mp)]));
    perksBox=`<h3>Seus benefícios</h3><ul class="perks">${perks.map(([a,b])=>`<li>${esc(a)}<b>${esc(b)}</b></li>`).join('')}</ul>`}
  else if(hasSub){perksBox=`<h3>Seus benefícios</h3><p class="empty">${s.status==='late'?'Benefícios suspensos até o pagamento. Depois de pagar, tudo volta na hora.':'Benefícios pausados até '+fmtD(s.pausedUntil)+'.'}</p>`}
  else{const on=db.plans.filter(x=>x.on).sort((a,b)=>a.p-b.p),mp=db.services.filter(x=>x.on&&x.mp!=null);
    perksBox=`<h3>Por que assinar?</h3><ul class="perks">${on.length?`<li>Planos a partir de<b>${brl(on[0].p)}/mês</b></li>`:''}<li>Cobrança automática<b>sem fidelidade</b></li>${mp.map(x=>`<li>${esc(x.n)} para assinante<b>${brl(x.mp)} <s style="color:var(--dim);font-weight:400">${brl(x.p)}</s></b></li>`).join('')}</ul><button class="btn btn-primary btn-sm" style="margin-top:14px" data-go="plano">Ver planos</button>`}
  return `<h1>Fala, ${esc((c.name||'').split(' ')[0])}!</h1><p class="sub">${up.length?`Seu próximo horário é ${WD[dt(up[0].date).getDay()].toLowerCase()}, ${fmtD(up[0].date)} às ${up[0].start}.`:'Você não tem horários marcados.'}</p>${alert}
  <div class="grid2"><div>${card}<div class="quick"><a href="agendar.html${s&&s.status==='ok'?'?cat=ass':''}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="17" rx="2"/><path d="M3 9h18M8 2v4M16 2v4M12 13v4M10 15h4"/></svg>Novo agendamento</a><a href="https://wa.me/${db.content.wa}" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.4 8.4 0 0 1-12.3 7.4L3 21l2.1-5.6A8.4 8.4 0 1 1 21 11.5z"/></svg>Falar com o Athos</a></div></div>
  <div style="display:grid;gap:16px;align-content:start"><div class="card box"><h3>Próximos horários <a href="#" data-go="agenda">Ver todos</a></h3>${up.slice(0,2).map(a=>apptHtml(a,false)).join('')||'<p class="empty">Nenhum horário marcado.</p>'}</div>
  <div class="card box">${perksBox}</div></div></div>`;
}
function vAgenda(){
  const up=upcoming(),hist=history();const ST={done:['Concluído','c-dim'],miss:['Faltou','c-bad'],cancel:['Cancelado','c-dim']};
  return `<h1>Minha agenda</h1><p class="sub">Remarque ou cancele com até ${(db.settings.cancelUntil||120)/60} h de antecedência.</p>
  <div class="card box" style="margin-bottom:16px"><h3>Próximos <a href="agendar.html">+ Agendar</a></h3>${up.map(a=>apptHtml(a,true)).join('')||'<p class="empty">Nenhum horário marcado.</p>'}</div>
  <div class="card box"><h3>Histórico</h3><div style="overflow-x:auto"><table><thead><tr><th>Data</th><th>Serviço</th><th>Status</th><th class="r">Valor</th></tr></thead><tbody>${hist.map(a=>`<tr><td>${fmtD(a.date)}</td><td>${esc(a.svc)}</td><td><span class="chip ${ST[a.status][1]}">${ST[a.status][0]}</span></td><td class="r">${a.plan?'<span class="chip c-ok">Plano</span>':brl(a.price)}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">Sem histórico ainda.</td></tr>'}</tbody></table></div></div>`;
}
function vPagamentos(){
  const s=mySub(),p=s&&plan(s.plan),tx=db.tx.filter(t=>t.cid===ME).sort((a,b)=>b.date.localeCompare(a.date));const TS={ok:['Pago','c-ok'],failed:['Em aberto','c-bad'],refunded:['Estornado','c-warn']};
  const next=!s||s.status==='off'?'<p class="empty">Sem assinatura ativa.</p>':s.status==='late'?`<div class="kv"><div><span>Fatura em aberto</span><b style="color:var(--bad)">${brl(p.p)}</b></div><div><span>Ação</span><button class="btn btn-primary btn-sm btn-pay" data-pix>${payIcon('pix')}Pagar agora</button></div></div>`
    :`<div class="kv"><div><span>Valor</span><b>${s.exempt||(s.courtesyUntil&&s.courtesyUntil>=nextBill(s))?'<s style="color:var(--dim)">'+brl(p.p)+'</s> R$ 0,00':brl(p.p)}</b></div><div><span>Data</span><b>${s.status==='paused'?'após a pausa':dt(nextBill(s)).getDate()+' de '+MOF[dt(nextBill(s)).getMonth()]}</b></div><div><span>Plano</span><b>${esc(p.n)}</b></div></div>`;
  return `<h1>Pagamentos</h1><p class="sub">Cobrança automática. Você não precisa lembrar de nada.</p>
  <div class="grid2"><div class="card box"><h3>Próxima cobrança</h3>${next}</div><div class="card box"><h3>Forma de pagamento</h3>${s&&s.status!=='off'?`<div class="kv"><div><span>Método</span><b>${payIcon(s.method)} ${esc(s.method)}</b></div><div><span>Dia de cobrança</span><b>Todo dia ${String(s.day).padStart(2,'0')}</b></div></div><button class="btn btn-ghost btn-sm" style="margin-top:16px" data-m="pay">Alterar forma de pagamento</button>`:'<p class="empty">—</p>'}</div></div>
  <div class="card box" style="margin-top:16px"><h3>Recibos</h3><div style="overflow-x:auto"><table><thead><tr><th>Data</th><th>Descrição</th><th>Status</th><th class="r">Valor</th></tr></thead><tbody>${tx.map(t=>`<tr><td>${fmtD(t.date)}</td><td>${esc(t.desc)}</td><td><span class="chip ${TS[t.status][1]}">${TS[t.status][0]}</span></td><td class="r">${brl(t.value)}</td></tr>`).join('')||'<tr><td colspan="4" class="empty">Nenhum pagamento ainda.</td></tr>'}</tbody></table></div></div>`;
}
function vPlano(){
  const s=mySub(),p=s&&s.status!=='off'&&plan(s.plan);
  if(!p)return `<h1>Planos</h1><p class="sub">Escolha um plano. A cobrança é automática e você cancela quando quiser.</p><div class="card box"><div class="plans" style="margin:0">${db.plans.filter(x=>x.on).map((x,i)=>`<div class="popt ${i===1?'on':''}" data-pid="${x.id}"><div><strong>${esc(x.n)}</strong><small>${x.days.map(d=>WD[d]).join(', ')} · ${esc(x.quota)}${x.perks&&x.perks!=='—'?' · '+esc(x.perks):''}</small></div><b>${brl(x.p)}</b></div>`).join('')}</div><div class="opts"><div class="opt pay on" data-payic="pix">${payIcon('pix')}Pix automático</div><div class="opt pay" data-payic="card">${payIcon('card')}Cartão</div></div><button class="btn btn-primary btn-pay" style="margin-top:16px" data-subscribe data-paybtn>${payIcon('pix')}Assinar agora</button></div>`;
  const rules=[['Dias válidos',p.days.map(d=>WD[d]).join(', ')],['Cota',p.quota],['Intervalo mínimo',p.gap?p.gap+' dias':'Sem intervalo'],['Brindes',p.perks==='—'?'Nenhum':p.perks],['Saldo','Renova todo mês, não acumula']];
  return `<h1>Meu plano</h1><p class="sub">Troque ou cancele quando quiser, sem fidelidade.</p>
  <div class="grid2"><div class="card box"><h3>Detalhes</h3><div class="kv"><div><span>Plano</span><b>${esc(p.n)}</b></div><div><span>Valor</span><b>${brl(p.p)}/mês</b></div><div><span>Status</span><span class="chip ${s.status==='late'?'c-bad':s.status==='paused'?'c-warn':'c-ok'}">${{ok:'Ativo',late:'Suspenso',paused:'Pausado'}[s.status]}</span></div><div><span>Assinante desde</span><b>${esc(s.since)}</b></div></div></div>
  <div class="card box"><h3>Gerenciar</h3><div style="display:grid;gap:10px"><button class="btn btn-ghost" data-m="change">Trocar de plano</button><button class="btn btn-ghost" data-m="day">Alterar dia de cobrança</button><button class="btn btn-ghost" data-m="pay">Alterar forma de pagamento</button><button class="btn btn-danger" data-m="cancel">Cancelar assinatura</button></div></div></div>
  <div class="card box" style="margin-top:16px"><h3>Regras do plano</h3><ul class="perks">${rules.map(([a,b])=>`<li>${a}<b>${esc(b)}</b></li>`).join('')}</ul></div>`;
}

/* ===== ações (gravam no mesmo banco que o painel usa) ===== */
document.addEventListener('click',e=>{
  const t=e.target;
  const cn=t.closest('[data-cancel]');if(cn){const a=db.appts.find(x=>x.id===cn.dataset.cancel);
    modal(`<h3>Cancelar horário?</h3><p>${esc(a.svc)} · ${fmtD(a.date)} às ${a.start}. O horário fica livre para outro cliente${a.plan?' e o uso do plano não é descontado':''}.</p><div class="mact"><button class="btn btn-ghost" data-close>Manter</button><button class="btn btn-danger" id="ok">Cancelar horário</button></div>`);
    $('#ok').onclick=()=>{closeModal();act('appts',L=>{L.find(x=>x.id===a.id).status='cancel'},`${me().name}: horário de ${fmtD(a.date)} ${a.start} cancelado pelo cliente`,'Agenda')}}
  const mv=t.closest('[data-move]');if(mv)moveAppt(mv.dataset.move);
  if(t.closest('[data-pix]')){const s=mySub(),p=plan(s.plan);
    modal(`<h3>Pagar com Pix</h3><p>Copie o código e pague no app do banco. A assinatura volta na hora.</p><div class="pix-head">${payIcon('pix')}<span>Pix copia e cola</span></div><div class="pix">00020126580014BR.GOV.BCB.PIX0136athosbarber-${s.id}520400005303986540${p.p.toFixed(2)}5802BR5913ATHOS BARBER6011PARAUAPEBAS6304ABCD</div><div class="mact"><button class="btn btn-ghost" id="copy">Copiar código</button><button class="btn btn-primary btn-pay" id="paid">${payIcon('pix')}Já paguei</button></div>`);
    $('#copy').onclick=()=>{try{navigator.clipboard.writeText($('.pix').textContent)}catch(e){}toast('Código Pix copiado')};
    $('#paid').onclick=()=>{closeModal();DB.mutate('tx',L=>{const x=L.find(y=>y.cid===ME&&y.status==='failed');if(x){x.status='ok';x.method='Pix'}else L.unshift({id:DB.uid(),date:TODAY,cid:ME,desc:'Plano '+p.n,method:'Pix',value:p.p,kind:'plano',status:'ok'})},`${me().name}: pagou ${brl(p.p)} via Pix`,'Financeiro',me().name+' (cliente)');
      act('subs',L=>{L.find(x=>x.id===s.id).status='ok'},`${me().name}: assinatura reativada após pagamento`,'Assinaturas')}}
  if(t.closest('[data-subscribe]')){const pid=($('.popt.on')||{}).dataset.pid,met=$('.opts .opt.on').textContent,p=plan(pid);
    DB.mutate('tx',L=>L.unshift({id:DB.uid(),date:TODAY,cid:ME,desc:'Plano '+p.n,method:met,value:p.p,kind:'plano',status:'ok'}),`${me().name}: primeira cobrança de ${brl(p.p)}`,'Financeiro',me().name+' (cliente)');
    act('subs',L=>{const old=L.find(x=>x.cid===ME);const v={plan:pid,status:'ok',used:0,credit:0,day:today.getDate()<=4?1:7,method:met,pausedUntil:null,courtesyUntil:null,exempt:false};if(old)Object.assign(old,v);else L.push({id:'a'+DB.uid(),cid:ME,since:MO[today.getMonth()]+'/'+String(today.getFullYear()).slice(2),...v})},`${me().name}: assinou o plano ${p.n}`,'Assinaturas');VIEW='inicio';render()}
  const m=t.closest('[data-m]');if(m)M[m.dataset.m]();
});
const M={
  change(){const s=mySub();modal(`<h3>Trocar de plano</h3><p>A troca vale a partir da próxima cobrança.</p><div class="plans">${db.plans.filter(x=>x.on).map(x=>`<div class="popt ${x.id===s.plan?'on':''}" data-pid="${x.id}"><div><strong>${esc(x.n)}</strong><small>${x.id===s.plan?'Plano atual':esc(x.quota)}</small></div><b>${brl(x.p)}</b></div>`).join('')}</div><div class="mact"><button class="btn btn-ghost" data-close>Voltar</button><button class="btn btn-primary" id="ok">Confirmar troca</button></div>`);
    $('#ok').onclick=()=>{const np=$('.popt.on').dataset.pid;closeModal();if(np===s.plan)return;act('subs',L=>{L.find(x=>x.id===s.id).plan=np},`${me().name}: trocou de ${plan(s.plan).n} para ${plan(np).n}`,'Assinaturas')}},
  day(){const s=mySub();modal(`<h3>Dia de cobrança</h3><p>Escolha o dia do mês em que a cobrança cai.</p><div class="opts"><div class="opt ${s.day===1?'on':''}" data-d="1">Dia 01</div><div class="opt ${s.day===7?'on':''}" data-d="7">Dia 07</div></div><div class="mact"><button class="btn btn-ghost" data-close>Voltar</button><button class="btn btn-primary" id="ok">Salvar</button></div>`);
    $('#ok').onclick=()=>{const d=+$('.opt.on').dataset.d;closeModal();act('subs',L=>{L.find(x=>x.id===s.id).day=d},`${me().name}: dia de cobrança alterado para ${String(d).padStart(2,'0')}`,'Assinaturas')}},
  pay(){const s=mySub();modal(`<h3>Forma de pagamento</h3><p>Cobrança automática no dia escolhido.</p><div class="opts"><div class="opt pay ${s.method==='Pix automático'?'on':''}" data-payic="pix">${payIcon('pix')}Pix automático</div><div class="opt pay ${s.method==='Cartão'?'on':''}" data-payic="card">${payIcon('card')}Cartão</div></div><div class="mact"><button class="btn btn-ghost" data-close>Voltar</button><button class="btn btn-primary" id="ok">Salvar</button></div>`);
    $('#ok').onclick=()=>{const v=$('.opt.on').textContent;closeModal();act('subs',L=>{L.find(x=>x.id===s.id).method=v},`${me().name}: forma de pagamento alterada para ${v}`,'Assinaturas')}},
  cancel(){const s=mySub(),alt=db.plans.filter(x=>x.on&&x.p<plan(s.plan).p).sort((a,b)=>a.p-b.p)[0];
    modal(`<h3>Cancelar assinatura?</h3><p>Seus benefícios continuam até ${fmtD(nextBill(s))}. Depois disso, nenhuma nova cobrança é feita.</p>${alt?`<div class="offer">Antes de ir: que tal o <b>${esc(alt.n)} por ${brl(alt.p)}/mês</b>? Você continua com preço de assinante.</div>`:''}<div class="mact">${alt?'<button class="btn btn-ghost" id="alt">Trocar de plano</button>':'<button class="btn btn-ghost" data-close>Voltar</button>'}<button class="btn btn-danger" id="ok">Cancelar mesmo</button></div>`);
    if($('#alt'))$('#alt').onclick=()=>M.change();
    $('#ok').onclick=()=>{closeModal();act('subs',L=>{L.find(x=>x.id===s.id).status='off'},`${me().name}: cancelou a assinatura ${plan(s.plan).n}`,'Assinaturas')}},
};
function moveAppt(id){
  const a=db.appts.find(x=>x.id===id);const s=mySub(),p=s&&plan(s.plan);
  const days=Array.from({length:14},(_,i)=>addD(today,i)).filter(d=>DB.freeSlots(DB.iso(d),a.dur).length&&(!a.plan||(p&&p.days.includes(d.getDay()))));
  let sel=days[0]?DB.iso(days[0]):null,time=null;
  const draw=()=>{$('#mv-days').innerHTML=days.map(d=>{const ds=DB.iso(d);return `<button class="day ${ds===sel?'on':''}" data-ds="${ds}"><small>${WD[d.getDay()]}</small><b>${d.getDate()}</b><small>${MO[d.getMonth()]}</small></button>`}).join('');
    const sl=sel?DB.freeSlots(sel,a.dur):[];$('#mv-slots').innerHTML=sl.map(t=>`<button class="slot ${t===time?'on':''}" data-t="${t}">${t}</button>`).join('')||'<p class="empty">Sem horários livres.</p>';
    $$('#mv-days .day').forEach(b=>b.onclick=()=>{sel=b.dataset.ds;time=null;draw()});$$('#mv-slots .slot').forEach(b=>b.onclick=()=>{time=b.dataset.t;draw()});$('#ok').disabled=!time;$('#ok').style.opacity=time?1:.5};
  modal(`<h3>Remarcar horário</h3><p>${esc(a.svc)} · hoje marcado para ${fmtD(a.date)} às ${a.start}.${a.plan?' Só aparecem os dias válidos do seu plano.':''}</p><div class="days" id="mv-days"></div><div class="slots" id="mv-slots"></div><div class="mact"><button class="btn btn-ghost" data-close>Voltar</button><button class="btn btn-primary" id="ok">Confirmar</button></div>`);
  draw();
  $('#ok').onclick=()=>{if(!time)return;closeModal();act('appts',L=>{const x=L.find(y=>y.id===id);x.date=sel;x.start=time;x.status='conf'},`${me().name}: remarcou de ${fmtD(a.date)} ${a.start} para ${fmtD(sel)} ${time}`,'Agenda')};
}

/* ===== render ===== */
const VIEWS={inicio:vInicio,agenda:vAgenda,pagamentos:vPagamentos,plano:vPlano};
function render(){
  const c=me();$('#av').textContent=(c.name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
  $('#side').innerHTML=tabHtml();$('#bnav').innerHTML=tabHtml();
  $$('.view').forEach(v=>v.classList.toggle('on',v.id==='v-'+VIEW));$('#v-'+VIEW).innerHTML=VIEWS[VIEW]();
}
$('#logout').onclick=()=>{try{localStorage.removeItem('athos_me')}catch(e){}location.href='entrar.html'};
if(q.has('demo')){$('#demobox').hidden=false;$('#demosel').innerHTML=db.clients.map(c=>{const s=db.subs.find(x=>x.cid===c.id);return `<option value="${c.id}" ${c.id===ME?'selected':''}>${esc(c.name)}${s?' · '+({ok:'ativo',late:'pendente',paused:'pausado',off:'cancelado'})[s.status]:' · sem plano'}</option>`}).join('');
  $('#demosel').onchange=e=>{ME=e.target.value;try{localStorage.setItem('athos_me',ME)}catch(x){}VIEW='inicio';render()}}
render();
// cliente sem nome (cadastro antigo/incompleto): pede o nome uma vez
if(!me().name||/^novo cliente$/i.test(me().name)){modal(`<h3>Como podemos te chamar?</h3><p>Seu nome aparece para o Athos na agenda.</p><input class="inp" id="nm" placeholder="Seu nome" style="margin-top:14px"><div class="mact"><button class="btn btn-primary" id="nm-ok">Salvar</button></div>`);
  $('#nm-ok').onclick=()=>{const v=$('#nm').value.trim();if(v.length<2)return toast('Digite seu nome');closeModal();act('clients',L=>{L.find(x=>x.id===ME).name=v},`${v}: nome cadastrado`,'Clientes')}}
