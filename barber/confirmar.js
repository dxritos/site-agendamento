/* confirmar.html — link individual enviado pelo WhatsApp: confirmar presença, remarcar ou cancelar sem login.
   O token do link identifica o agendamento e, por ele, o cliente. */
(function(){
const $=s=>document.querySelector(s),db=DB.data;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const WD=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],WDF=['domingo','segunda','terça','quarta','quinta','sexta','sábado'],MO=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const NF=new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2});
const TOKEN=new URLSearchParams(location.search).get('t');
const dOf=a=>new Date(a.date+'T'+a.start+':00');
const dLabel=ds=>{const d=new Date(ds+'T00:00:00');return `${WDF[d.getDay()]}, ${d.getDate()} de ${MO[d.getMonth()]}`};
const short=ds=>ds.slice(8)+'/'+ds.slice(5,7);
const WHO='Link do cliente';
let mode='view',msg=null,pick={date:null,time:null};

function appt(){DB.refresh();return DB.byToken(TOKEN)}
function save(a,fn,desc){return DB.mutate('appts',L=>fn(L.find(x=>x.id===a.id)),desc,'Agenda',WHO)}
function render(){
  const a=appt(),box=$('#card');
  if(!a){box.innerHTML='<h1>Link inválido</h1><p>Este link não existe mais ou foi digitado errado. Abra o link mais recente que você recebeu no WhatsApp.</p><div class="cf-acts" style="margin-top:18px"><a class="btn btn-primary" href="agendar.html">Agendar um horário</a></div>';return}
  const c=db.clients.find(x=>x.id===a.cid)||{name:'cliente'},first=esc(c.name.split(' ')[0]);
  const mins=(dOf(a)-Date.now())/6e4,past=mins<0,active=['pend','conf'].includes(a.status)&&!past,canChange=active&&mins>=(db.settings.cancelUntil||120);
  const stTxt=a.status==='cancel'?['off','Cancelado']:a.status==='done'?['off','Concluído']:a.status==='miss'?['off','Não compareceu']:past?['off','Já passou']:a.status==='pend'?['pend','Aguardando sua confirmação']:['conf','Presença confirmada'];
  const rows=`<div class="cf-rows"><div><span>Serviço</span><b>${esc(a.svc)}</b></div><div><span>Quando</span><b>${dLabel(a.date)} · ${a.start}</b></div><div><span>Duração</span><b>${a.dur} min</b></div><div><span>Valor</span><b>${a.plan?'Incluso no plano':'R$ '+NF.format(a.price||0)}</b></div><div><span>Barbeiro</span><b>Farias</b></div></div>`;
  const head=`<span class="cf-st ${stTxt[0]}">${stTxt[1]}</span><h1>${a.status==='cancel'?'Horário cancelado':'Olá, '+first}</h1>`;
  const note=msg?`<div class="cf-msg ${msg.bad?'bad':''}" role="status">${esc(msg.t)}</div>`:'';
  if(mode==='cancel'&&canChange){box.innerHTML=`${head}${rows}<p>Cancelar este horário? Ele volta a ficar livre para outro cliente.</p><div class="cf-acts" style="margin-top:16px"><div class="two"><button class="btn btn-ghost" id="no">Voltar</button><button class="btn btn-bad" id="yes">Cancelar horário</button></div></div>`;
    $('#no').onclick=()=>{mode='view';render()};
    $('#yes').onclick=()=>{const x=appt();if(!x)return render();save(x,y=>{y.status='cancel'},`${c.name}: horário de ${short(x.date)} ${x.start} cancelado pelo link do WhatsApp`);
      DB.notify('cancel',x);DB.notifyStaff('evCancel',`Cancelado pelo cliente: ${c.name} · ${x.svc} · ${short(x.date)} às ${x.start}. O horário ficou livre.`);mode='view';msg={t:'Horário cancelado.'};render()};return}
  if(mode==='move'&&canChange){
    const days=Array.from({length:14},(_,i)=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+i);return DB.iso(d)}).map(ds=>({ds,free:DB.freeSlots(ds,a.dur,a.id).filter(t=>!(ds===a.date&&t===a.start)),why:a.plan?DB.planCheck(a.cid,ds,a.svc,a.id):null}));
    if(!pick.date||!days.find(d=>d.ds===pick.date&&d.free.length&&!d.why)){const f=days.find(d=>d.free.length&&!d.why);pick={date:f?f.ds:null,time:null}}
    const cur=days.find(d=>d.ds===pick.date);
    box.innerHTML=`${head}<p>Escolha o novo dia e horário para <b>${esc(a.svc)}</b>.</p><div class="cf-sub">Dia</div><div class="days">${days.map(d=>{const dt=new Date(d.ds+'T00:00:00'),ok=d.free.length&&!d.why;return `<button class="day ${d.ds===pick.date?'on':''}" data-d="${d.ds}" ${ok?'':'disabled'} aria-pressed="${d.ds===pick.date}" title="${d.why?esc(d.why):ok?'':'Sem horários'}"><small>${WD[dt.getDay()]}</small><b>${dt.getDate()}</b><small>${MO[dt.getMonth()]}</small></button>`}).join('')}</div>
      <div class="cf-sub">Horário</div><div class="slots">${cur?cur.free.map(t=>`<button class="slot ${t===pick.time?'on':''}" data-t="${t}" aria-pressed="${t===pick.time}">${t}</button>`).join(''):'<span style="color:var(--dim);font-size:14px">Sem horários livres nos próximos 14 dias.</span>'}</div>${note}
      <div class="cf-acts" style="margin-top:20px"><div class="two"><button class="btn btn-ghost" id="no">Voltar</button><button class="btn btn-primary" id="yes" ${pick.time?'':'disabled style="opacity:.5"'}>Remarcar</button></div></div>`;
    box.querySelectorAll('.day').forEach(b=>b.onclick=()=>{pick={date:b.dataset.d,time:null};msg=null;render()});
    box.querySelectorAll('.slot').forEach(b=>b.onclick=()=>{pick.time=b.dataset.t;msg=null;render()});
    $('#no').onclick=()=>{mode='view';msg=null;render()};
    $('#yes').onclick=()=>{const x=appt();if(!x||!pick.time)return render();
      if(!DB.freeSlots(pick.date,x.dur,x.id).includes(pick.time)){pick.time=null;msg={t:'Esse horário acabou de ser ocupado. Escolha outro.',bad:true};return render()}
      const old=`${short(x.date)} ${x.start}`;save(x,y=>{y.date=pick.date;y.start=pick.time;y.status='conf'},`${c.name}: remarcou de ${old} para ${short(pick.date)} ${pick.time} pelo link do WhatsApp`);
      const y=appt();DB.notify('move',y);DB.notifyStaff('evCancel',`Remarcado pelo cliente: ${c.name} · ${y.svc} · de ${old} para ${short(y.date)} às ${y.start}.`);mode='view';msg={t:'Horário remarcado e confirmado.'};render()};return}
  mode='view';
  let acts='';
  if(active){acts=`${a.status==='pend'?'<button class="btn btn-primary" id="ok">Confirmar presença</button>':''}${canChange?'<div class="two"><button class="btn btn-ghost" id="mv">Remarcar</button><button class="btn btn-bad" id="cn">Cancelar</button></div>':''}<button class="btn btn-ghost" id="ics">Adicionar à agenda do celular</button>`}
  else acts='<a class="btn btn-primary" href="agendar.html">Marcar outro horário</a>';
  const late=active&&!canChange?`<p class="cf-note">Faltam menos de ${DB.cancelText()} para o horário. Para remarcar ou cancelar agora, <a href="https://wa.me/${esc(db.content.wa)}">fale com o Farias no WhatsApp</a>.</p>`:'';
  box.innerHTML=`${head}${a.status==='cancel'?'<p>Este horário foi cancelado e não está mais reservado.</p>':active?`<p>${a.status==='pend'?'Confirme sua presença para garantir o horário.':'Tudo certo, te esperamos no horário.'}</p>`:''}${rows}${note}<div class="cf-acts">${acts}</div>${late}`;
  if($('#ok'))$('#ok').onclick=()=>{const x=appt();if(!x)return render();save(x,y=>{y.status='conf'},`${c.name}: presença confirmada pelo link do WhatsApp (${short(x.date)} ${x.start})`);
    DB.notifyStaff('evConfirm',`Presença confirmada: ${c.name} · ${x.svc} · ${short(x.date)} às ${x.start}.`);msg={t:'Presença confirmada. Até lá!'};render()};
  if($('#mv'))$('#mv').onclick=()=>{mode='move';msg=null;pick={date:null,time:null};render()};
  if($('#cn'))$('#cn').onclick=()=>{mode='cancel';msg=null;render()};
  if($('#ics'))$('#ics').onclick=()=>{const s=dOf(a),e=new Date(s.getTime()+a.dur*6e4),f=d=>d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0')+'T'+String(d.getHours()).padStart(2,'0')+String(d.getMinutes()).padStart(2,'0')+'00';
    const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Farias Barbearia//PT','BEGIN:VEVENT','UID:'+a.id+'@fariasbarbearia','DTSTAMP:'+f(new Date()),'DTSTART:'+f(s),'DTEND:'+f(e),'SUMMARY:'+a.svc+' — Farias Barbearia','LOCATION:'+String(db.content.address||'').replace(/[,;]/g,'\\$&'),'BEGIN:VALARM','TRIGGER:-PT2H','ACTION:DISPLAY','DESCRIPTION:Horário na Farias Barbearia','END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n');
    const u=URL.createObjectURL(new Blob([ics],{type:'text/calendar'})),l=document.createElement('a');l.href=u;l.download='farias-barbearia.ics';document.body.append(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),1000)};
}
window.onDBChange=render;render();
})();
