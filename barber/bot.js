/* Robô do WhatsApp da equipe — interpretador de comandos de texto.
   Recebe a mensagem do barbeiro e devolve a resposta, alterando a agenda quando for o caso.
   No protótipo roda no navegador (simulador do painel); no sistema definitivo o mesmo
   interpretador roda no servidor, chamado pelo webhook do WhatsApp. */
(function(){
const db=()=>DB.data,pad=n=>String(n).padStart(2,'0');
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
const iso=d=>DB.iso(d),day0=n=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+(n||0));return d};
const short=ds=>ds.slice(8)+'/'+ds.slice(5,7);
const WDF=['domingo','segunda','terça','quarta','quinta','sexta','sábado'];
const NF=new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}),brl=v=>'R$ '+NF.format(v||0);
const cname=id=>(db().clients.find(c=>c.id===id)||{}).name||'—';
const WHO='WhatsApp da equipe';
const ST={conf:'confirmado',pend:'aguardando',now:'em atendimento',done:'concluído',miss:'faltou',block:'bloqueio'};
const services=()=>{const L=db().services.filter(s=>s.on).map(s=>({n:s.n,p:s.p,t:s.t})),c=L.find(s=>norm(s.n)==='corte'),b=L.find(s=>norm(s.n)==='barba');
  if(c&&b)L.push({n:'Corte + Barba',p:c.p+b.p,t:60});return L.sort((a,b)=>b.n.length-a.n.length)};

/* tira do texto a data (hoje, amanhã, dd/mm, dia da semana) e os horários (14:30, 14h, 14h30) */
function parse(text){
  let t=' '+norm(text)+' ',date=null;const times=[];
  t=t.replace(/\b(\d{1,2})\/(\d{1,2})\b/,(m,d,mo)=>{const n=new Date(),y=n.getFullYear();let dt=new Date(y,+mo-1,+d);if(dt<day0(-1))dt=new Date(y+1,+mo-1,+d);date=iso(dt);return ' '});
  t=t.replace(/\b(\d{1,2})(?::|h)(\d{2})?\b/g,(m,h,mi)=>{if(+h<24)times.push(pad(+h)+':'+(mi||'00'));return ' '});
  if(!date){if(/\bdepois de amanha\b/.test(t)){date=iso(day0(2));t=t.replace(/\bdepois de amanha\b/,' ')}
    else if(/\bamanha\b/.test(t)){date=iso(day0(1));t=t.replace(/\bamanha\b/,' ')}
    else if(/\bhoje\b/.test(t)){date=iso(day0());t=t.replace(/\bhoje\b/,' ')}
    else{const i=WDF.findIndex(w=>new RegExp('\\b'+norm(w)+'(-feira)?\\b').test(t));if(i>-1){const d=day0();let k=(i-d.getDay()+7)%7;if(!k)k=7;date=iso(day0(k));t=t.replace(new RegExp('\\b'+norm(WDF[i])+'(-feira)?\\b'),' ')}}}
  return {date,times,rest:t.replace(/\s+/g,' ').trim()};
}
const dayList=ds=>db().appts.filter(a=>a.date===ds&&a.status!=='cancel').sort((a,b)=>a.start.localeCompare(b.start));
const line=a=>a.status==='block'?`${a.start} · bloqueado${a.note?' ('+a.note+')':''}`:`${a.start} · ${cname(a.cid)} · ${a.svc} · ${a.plan?'assinante':brl(a.price)} · ${ST[a.status]||a.status}`;
function agenda(ds){const L=dayList(ds),d=new Date(ds+'T00:00:00'),hol=db().holidays.find(h=>h.date===ds),tt=`${WDF[d.getDay()]}, ${short(ds)}`;
  if(hol)return `${tt}: fechado (${hol.name}).`;
  if(!L.length)return `${tt}: nenhum horário marcado.`;
  const n=L.filter(a=>a.status!=='block').length;return `*Agenda de ${tt}* (${n} ${n===1?'atendimento':'atendimentos'})\n`+L.map(line).join('\n')}
/* acha o agendamento pelo horário (ou pelo nome do cliente) no dia informado, hoje por padrão */
function find(p,open){const ds=p.date||iso(day0()),L=dayList(ds).filter(a=>a.status!=='block'&&(!open||['conf','pend','now'].includes(a.status)));
  let hit=p.times[0]?L.filter(a=>a.start===p.times[0]):p.rest?L.filter(a=>norm(cname(a.cid)).includes(p.rest)):[];
  if(hit.length===1)return {a:hit[0]};
  if(!p.times[0]&&!p.rest)return {err:'Diga o horário. Ex.: *concluir 14:30*'};
  if(!hit.length)return {err:`Não achei ${p.times[0]?'horário às '+p.times[0]:'cliente "'+p.rest+'"'} em ${short(ds)}.\n\n${agenda(ds)}`};
  return {err:'Achei mais de um. Diga o horário:\n'+hit.map(line).join('\n')}}
const mut=(keys,fn,desc)=>DB.mutateMany(keys,fn,desc,'Agenda',WHO);
const HELP=`*Comandos do robô*
*hoje* · *amanhã* · *agenda 20/11* — ver a agenda
*próximo* — quem é o próximo cliente
*livres amanhã* — horários vagos
*agendar João corte amanhã 15:00* — marcar
*confirmar 15:00* — confirmar presença
*concluir 15:00 pix* — fechar o atendimento (pix, dinheiro, débito, crédito)
*faltou 15:00* — registrar falta
*cancelar 15:00* — cancelar e liberar o horário
*bloquear 12:00 13:00 almoço* — fechar um intervalo
*resumo* — números do dia`;

const CMD={
  ajuda:()=>HELP,menu:()=>HELP,
  hoje:()=>agenda(iso(day0())),
  agenda:p=>agenda(p.date||iso(day0())),
  amanha:()=>agenda(iso(day0(1))),
  proximo(){const now=new Date(),hm=pad(now.getHours())+':'+pad(now.getMinutes()),L=dayList(iso(day0())).filter(a=>['conf','pend','now'].includes(a.status)),a=L.find(x=>x.status==='now')||L.find(x=>x.start>=hm)||L[0];
    if(!a)return 'Não há mais clientes hoje.';const c=db().clients.find(x=>x.id===a.cid)||{};
    return `*Próximo: ${a.start} · ${cname(a.cid)}*\n${a.svc} · ${a.plan?'assinante':brl(a.price)} · ${ST[a.status]}${c.notes?'\nObs.: '+c.notes:''}${c.misses?'\nFaltas: '+c.misses:''}`},
  livres(p){const ds=p.date||iso(day0()),f=DB.freeSlots(ds,30);return f.length?`*Livres em ${short(ds)}*\n${f.join(' · ')}`:`Sem horários livres em ${short(ds)}.`},
  agendar(p){
    const ds=p.date||iso(day0()),tm=p.times[0];if(!tm)return 'Faltou o horário. Ex.: *agendar João corte amanhã 15:00*';
    const sv=services().find(s=>(' '+p.rest+' ').includes(' '+norm(s.n)+' '))||services().find(s=>norm(s.n)==='corte');if(!sv)return 'Não achei o serviço.';
    const nm=(' '+p.rest+' ').replace(' '+norm(sv.n)+' ',' ').replace(/\s+/g,' ').trim();if(nm.length<2)return 'Faltou o nome do cliente. Ex.: *agendar João corte amanhã 15:00*';
    const hits=db().clients.filter(c=>norm(c.name).includes(nm));if(hits.length>1&&!hits.find(c=>norm(c.name)===nm))return 'Achei mais de um cliente: '+hits.slice(0,5).map(c=>c.name).join(', ')+'. Escreva o nome completo.';
    if(!DB.freeSlots(ds,sv.t).includes(tm)){const f=DB.freeSlots(ds,sv.t);return `${tm} não está livre em ${short(ds)} para ${sv.n} (${sv.t} min).`+(f.length?` Livres: ${f.slice(0,8).join(' · ')}`:` Não há vaga de ${sv.t} min nesse dia.`)}
    let c=hits.find(x=>norm(x.name)===nm)||hits[0];const isNew=!c;if(isNew){const d=new Date();c={id:'c'+DB.uid(),name:nm.replace(/(^|\s)\S/g,m=>m.toUpperCase()),phone:'',notes:'Cadastrado pelo WhatsApp. Falta o telefone.',blocked:false,misses:0,since:['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][d.getMonth()]+'/'+String(d.getFullYear()).slice(2)}}
    const aid=DB.uid();mut(['clients','appts'],d=>{if(isNew)d.clients.push(c);d.appts.push({id:aid,date:ds,start:tm,dur:sv.t,cid:c.id,svc:sv.n,price:sv.p,plan:false,status:'conf',note:'',origin:'whatsapp'})},`${c.name}: ${sv.n} marcado para ${short(ds)} ${tm} pelo WhatsApp`);
    const a=db().appts.find(x=>x.id===aid);if(c.phone)DB.notify('confirm',a);
    return `Marcado: ${c.name} · ${sv.n} · ${short(ds)} às ${tm} · ${brl(sv.p)}.${isNew?'\nCliente novo, cadastrado sem telefone.':c.phone?'\nO cliente recebeu a confirmação com o link dele.':''}`},
  confirmar(p){const r=find(p,true);if(r.err)return r.err;const a=r.a;if(a.status!=='pend')return `${a.start} · ${cname(a.cid)} já está ${ST[a.status]}.`;
    mut(['appts'],d=>{d.appts.find(x=>x.id===a.id).status='conf'},`${cname(a.cid)}: presença confirmada pelo WhatsApp (${short(a.date)} ${a.start})`);return `Confirmado: ${a.start} · ${cname(a.cid)}.`},
  concluir(p){const m=/\b(pix|dinheiro|debito|credito|cartao)\b/.exec(p.rest);if(m)p.rest=p.rest.replace(m[0],'').trim();const r=find(p,true);if(r.err)return r.err;const a=r.a;
    const met=m&&{pix:'Pix',dinheiro:'Dinheiro',debito:'Maquininha (débito)',credito:'Maquininha (crédito)',cartao:'Maquininha (crédito)'}[m[1]],pay=!a.plan&&a.price>0;
    mut(['appts','tx'],d=>{d.appts.find(x=>x.id===a.id).status='done';if(pay&&met)d.tx.unshift({id:DB.uid(),date:a.date,cid:a.cid,desc:a.svc,method:met,value:a.price,kind:'avulso',status:'ok'})},`${cname(a.cid)}: atendimento concluído pelo WhatsApp${pay&&met?` e ${brl(a.price)} recebido (${met})`:''}`);
    const nx=CMD.proximo();return `Concluído: ${a.start} · ${cname(a.cid)}.${pay?met?` ${brl(a.price)} em ${met}.`:` Pagamento não registrado. Para registrar: *concluir ${a.start} pix*`:''}\n\n${nx}`},
  faltou(p){const r=find(p,true);if(r.err)return r.err;const a=r.a;mut(['appts','clients'],d=>{d.appts.find(x=>x.id===a.id).status='miss';const c=d.clients.find(x=>x.id===a.cid);if(c)c.misses=(c.misses||0)+1},`${cname(a.cid)}: falta registrada pelo WhatsApp (${short(a.date)} ${a.start})`);
    return `Falta registrada: ${a.start} · ${cname(a.cid)}.`},
  cancelar(p){const r=find(p,true);if(r.err)return r.err;const a=r.a;mut(['appts'],d=>{d.appts.find(x=>x.id===a.id).status='cancel'},`${cname(a.cid)}: horário de ${short(a.date)} ${a.start} cancelado pelo WhatsApp`);
    const sent=DB.notify('cancel',a);return `Cancelado: ${short(a.date)} às ${a.start} · ${cname(a.cid)}. O horário ficou livre.${sent?' O cliente foi avisado.':''}`},
  bloquear(p){const ds=p.date||iso(day0()),[a,b]=p.times;if(!a||!b||b<=a)return 'Diga início e fim. Ex.: *bloquear 12:00 13:00 almoço*';
    const dur=DB.toMin(b)-DB.toMin(a),clash=dayList(ds).find(x=>x.status!=='block'&&DB.toMin(x.start)<DB.toMin(b)&&DB.toMin(x.start)+x.dur>DB.toMin(a));
    if(clash)return `Há cliente nesse intervalo: ${line(clash)}. Cancele ou remarque antes.`;
    mut(['appts'],d=>{d.appts.push({id:DB.uid(),date:ds,start:a,dur,cid:null,svc:'',price:0,plan:false,status:'block',note:p.rest||'Bloqueio pelo WhatsApp'})},`Bloqueio criado pelo WhatsApp (${short(ds)} ${a}–${b})`);
    return `Bloqueado: ${short(ds)} das ${a} às ${b}.`},
  resumo(){const ds=iso(day0()),L=dayList(ds).filter(a=>a.status!=='block'),got=db().tx.filter(t=>t.date===ds&&t.kind!=='plano'&&t.status==='ok').reduce((s,t)=>s+t.value,0);
    return `*Resumo de hoje*\n${L.length} atendimentos · ${L.filter(a=>a.status==='done').length} concluídos · ${L.filter(a=>a.status==='miss').length} faltas\nRecebido (avulso): ${brl(got)}\nAguardando confirmação: ${L.filter(a=>a.status==='pend').length}`}
};
const ALIAS={help:'ajuda','?':'ajuda',comandos:'ajuda',oi:'ajuda',ola:'ajuda',prox:'proximo',proxima:'proximo',vagas:'livres',horarios:'livres',marcar:'agendar',agenda:'agenda',confirma:'confirmar',conclui:'concluir',concluido:'concluir',finalizar:'concluir',falta:'faltou',cancela:'cancelar',desmarcar:'cancelar',bloqueio:'bloquear',fechar:'bloquear',dia:'resumo'};

window.Bot={
  help:HELP,
  /* devolve a resposta do robô para uma mensagem da equipe */
  run(text){DB.refresh();const raw=norm(text);if(!raw)return HELP;
    if(!db().bot.staff)return 'O robô da equipe está desligado. Ligue em Painel › WhatsApp.';
    const [w,...r]=raw.split(/\s+/),k=CMD[w]?w:ALIAS[w];
    if(!k)return `Não entendi "${text.trim()}". Envie *ajuda* para ver os comandos.`;
    try{return CMD[k](parse(r.join(' ')))}catch(e){return 'Não consegui fazer isso agora. Tente de novo.'}},
  next:()=>CMD.proximo(),daily:()=>agenda(iso(day0()))
};
})();
