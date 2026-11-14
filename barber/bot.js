/* Robô do WhatsApp da equipe — interpretador de comandos de texto.
   Recebe a mensagem do barbeiro e devolve a resposta, alterando a agenda quando for o caso.
   No protótipo roda no navegador (simulador do painel); no sistema definitivo o mesmo
   interpretador roda no servidor, chamado pelo webhook do WhatsApp. */
(function(){
const db=()=>DB.data,pad=n=>String(n).padStart(2,'0');
const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').trim();
const iso=d=>DB.iso(d),day0=n=>{const d=new Date();d.setHours(0,0,0,0);d.setDate(d.getDate()+(n||0));return d};
const TODAY=()=>iso(day0()),nowHM=()=>{const n=new Date();return pad(n.getHours())+':'+pad(n.getMinutes())};
const short=ds=>ds.slice(8)+'/'+ds.slice(5,7);
const WDF=['domingo','segunda','terça','quarta','quinta','sexta','sábado'],WD=['dom','seg','ter','qua','qui','sex','sáb'],MO=['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'];
const NF=new Intl.NumberFormat('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2}),brl=v=>'R$ '+NF.format(v||0);
const cli=id=>db().clients.find(c=>c.id===id),cname=id=>(cli(id)||{}).name||'—',first=c=>c.name.split(' ')[0];
const cap=s=>s.replace(/(^|\s)\S/g,m=>m.toUpperCase());
const WHO='WhatsApp da equipe';
const ST={conf:'confirmado',pend:'aguardando',now:'na cadeira',done:'concluído',miss:'faltou',block:'bloqueio'};
const OPEN=['conf','pend','now'];
const METS={pix:'Pix',dinheiro:'Dinheiro',debito:'Maquininha (débito)',credito:'Maquininha (crédito)',cartao:'Maquininha (crédito)'};
const services=()=>{const L=db().services.filter(s=>s.on).map(s=>({n:s.n,p:s.p,t:s.t})),c=L.find(s=>norm(s.n)==='corte'),b=L.find(s=>norm(s.n)==='barba');
  if(c&&b)L.push({n:'Corte + Barba',p:c.p+b.p,t:60});return L.sort((a,b)=>b.n.length-a.n.length)};

/* tira do texto a data (hoje, amanhã, dd/mm, dia da semana) e os horários (14:30, 14h, 14h30) */
function parse(text){
  let t=' '+norm(text)+' ',date=null;const times=[];
  t=t.replace(/\b(\d{1,2})\/(\d{1,2})\b/,(m,d,mo)=>{const y=new Date().getFullYear();let dt=new Date(y,+mo-1,+d);if(dt<day0(-1))dt=new Date(y+1,+mo-1,+d);date=iso(dt);return ' '});
  t=t.replace(/\b(\d{1,2})(?::|h)(\d{2})?\b/g,(m,h,mi)=>{if(+h<24)times.push(hm(+h,mi));return ' '});
  t=t.replace(/\b(?:as|a partir das)\s+(\d{1,2})\b/g,(m,h)=>{if(+h<24)times.push(hm(+h));return ' '});
  if(!date){if(/\bdepois de amanha\b/.test(t)){date=iso(day0(2));t=t.replace(/\bdepois de amanha\b/,' ')}
    else if(/\bamanha\b/.test(t)){date=iso(day0(1));t=t.replace(/\bamanha\b/,' ')}
    else if(/\bhoje\b/.test(t)){date=TODAY();t=t.replace(/\bhoje\b/,' ')}
    else{const i=WDF.findIndex(w=>new RegExp('\\b'+norm(w)+'(-feira)?\\b').test(t));if(i>-1){let k=(i-day0().getDay()+7)%7;if(!k)k=7;date=iso(day0(k));t=t.replace(new RegExp('\\b'+norm(WDF[i])+'(-feira)?\\b'),' ')}}}
  return {date,times,rest:t.replace(/\s+/g,' ').trim()};
}
/* "3" vira 15:00: hora menor que a abertura mais cedo da semana é entendida como da tarde */
const firstOpen=()=>Math.min(...Object.values(db().hours).filter(Boolean).map(h=>+h[0].slice(0,2)),12);
const hm=(h,mi)=>pad(h<firstOpen()&&h+12<24?h+12:h)+':'+(mi||'00');
/* comandos que pedem horário aceitam só o número: "agendar corte joao 15" */
const bare=p=>{if(p.times.length)return p;const m=/(?:^|\s)(\d{1,2})(?=\s|$)/.exec(p.rest);if(m&&+m[1]<24){p.times.push(hm(+m[1]));p.rest=(p.rest.slice(0,m.index)+' '+p.rest.slice(m.index+m[0].length)).replace(/\s+/g,' ').trim()}return p};
const FILL=new Set(['as','a','o','os','pra','pro','para','no','na','em','dia','com','do','da','de','e','cliente','horario','hora']);
const trimFill=t=>{const w=t.split(' ').filter(Boolean);while(w.length&&FILL.has(w[0]))w.shift();while(w.length&&FILL.has(w[w.length-1]))w.pop();return w.join(' ')};
const fone=p=>{const d=String(p||'').replace(/\D/g,'');return d.length===11?`(${d.slice(0,2)}) ${d[2]} ${d.slice(3,7)}-${d.slice(7)}`:d?p:'sem telefone'};
const takeMet=p=>{const m=/\b(pix|dinheiro|debito|credito|cartao)\b/.exec(p.rest);if(!m)return null;p.rest=p.rest.replace(m[0],'').replace(/\s+/g,' ').trim();return METS[m[1]]};
const dayList=ds=>db().appts.filter(a=>a.date===ds&&a.status!=='cancel').sort((a,b)=>a.start.localeCompare(b.start));
const line=a=>a.status==='block'?`${a.start} · bloqueado${a.note?' ('+a.note+')':''}`:`${a.start} · ${cname(a.cid)} · ${a.svc} · ${a.plan?'assinante':brl(a.price)} · ${ST[a.status]||a.status}`;
const closed=ds=>db().holidays.find(h=>h.date===ds);
function agenda(ds){const L=dayList(ds),d=new Date(ds+'T00:00:00'),hol=closed(ds),tt=`${WDF[d.getDay()]}, ${short(ds)}`;
  if(hol&&!L.length)return `${tt}: fechado (${hol.name}).`;
  if(!L.length)return `${tt}: nenhum horário marcado.`;
  const n=L.filter(a=>a.status!=='block').length;return `*Agenda de ${tt}*${hol?' · FECHADO: '+hol.name:''} (${n} ${n===1?'atendimento':'atendimentos'})\n`+L.map(line).join('\n')}
/* acha o agendamento pelo horário (ou pelo nome do cliente) no dia informado, hoje por padrão */
function find(p,sts,ex){bare(p);p.rest=trimFill(p.rest);const ds=p.date||TODAY(),L=dayList(ds).filter(a=>a.status!=='block'&&(!sts||sts.includes(a.status)));
  const hit=p.times[0]?L.filter(a=>a.start===p.times[0]):p.rest?L.filter(a=>norm(cname(a.cid)).includes(p.rest)):[];
  if(hit.length===1)return {a:hit[0]};
  // pelo nome e sem dia informado: vale o próximo horário desse cliente nos dias seguintes
  if(!hit.length&&!p.times[0]&&p.rest&&!p.date){const F=db().appts.filter(a=>a.date>ds&&a.status!=='block'&&(!sts||sts.includes(a.status))&&norm(cname(a.cid)).includes(p.rest)).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
    if(F.length&&new Set(F.map(a=>a.cid)).size===1)return {a:F[0]}}
  if(!p.times[0]&&!p.rest)return {err:`Diga o horário ou o nome. Ex.: *${ex||'concluir 14:30'}*`};
  if(!hit.length)return {err:`Não achei ${p.times[0]?'horário às '+p.times[0]:'cliente "'+p.rest+'"'} em ${short(ds)}.\n\n${agenda(ds)}`};
  return {err:'Achei mais de um. Diga o horário:\n'+hit.map(line).join('\n')}}
/* conversa em andamento com cada remetente: menu aberto, formulário aguardando ou escolha entre homônimos */
const STATE={};let CUR='equipe';
const setSt=v=>{STATE[CUR]=v},getSt=()=>STATE[CUR]||null;
/* acha o cliente pelo nome. Se houver mais de um, pergunta "Qual João?" e continua quando a pessoa responder o número */
function withClient(nm,cont,ifNone){nm=trimFill(nm);const hits=db().clients.filter(c=>norm(c.name).includes(nm)),ex=hits.filter(c=>norm(c.name)===nm);
  if(ex.length===1)return cont(ex[0]);if(hits.length===1)return cont(hits[0]);
  if(!hits.length)return ifNone?ifNone():`Não achei cliente "${nm}".`;
  setSt({pick:hits.slice(0,9).map(c=>c.id),cont});
  return `Qual ${cap(nm)}?\n`+hits.slice(0,9).map((c,i)=>`${i+1}. ${c.name} · ${fone(c.phone)}`).join('\n')+'\n\nResponda com o número.'}
const mut=(keys,fn,desc,area)=>DB.mutateMany(keys,fn,desc,area||'Agenda',WHO);
const current=()=>{const L=dayList(TODAY()).filter(a=>OPEN.includes(a.status));return L.find(a=>a.status==='now')||L[0]||null};
function proximo(){const a=current();if(!a)return 'Não há mais clientes hoje.';const c=cli(a.cid)||{},s=c.id&&DB.activeSub(c.id);
  return `*${a.status==='now'?'Na cadeira':'Próximo'}: ${a.start} · ${cname(a.cid)}*\n${a.svc} · ${a.plan?'assinante':brl(a.price)} · ${ST[a.status]}${s?'\nPlano: '+DB.plan(s.plan).n+(s.status==='late'?' (pagamento pendente)':''):''}${c.notes?'\nObs.: '+c.notes:''}${c.misses?'\nFaltas: '+c.misses:''}\n\nTerminou? Envie *ok pix* (ou dinheiro, débito, crédito).`}
function finish(a,met){const pay=!a.plan&&a.price>0;
  mut(['appts','tx'],d=>{d.appts.find(x=>x.id===a.id).status='done';if(pay&&met)d.tx.unshift({id:DB.uid(),date:a.date,cid:a.cid,desc:a.svc,method:met,value:a.price,kind:'avulso',status:'ok'})},`${cname(a.cid)}: atendimento concluído pelo WhatsApp${pay&&met?` e ${brl(a.price)} recebido (${met})`:''}`);
  const th=DB.notify('thanks',a);const nx=current();return `Concluído: ${a.start} · ${cname(a.cid)}.${th?' Agradecimento enviado.':''}${pay?met?` ${brl(a.price)} em ${met}.`:` Pagamento não registrado. Envie *pago ${a.start} pix* para registrar.`:' Pelo plano.'}\n\n${nx?proximo():'Era o último de hoje. Envie *caixa* para ver o total.'}`}
/* separa serviço e nome do cliente no texto */
function svcAndName(rest){rest=trimFill(rest);const sv=services().find(s=>(' '+rest+' ').includes(' '+norm(s.n)+' '))||services().find(s=>norm(s.n)==='corte');
  return {sv,nm:trimFill(sv?(' '+rest+' ').replace(' '+norm(sv.n)+' ',' ').replace(/\s+/g,' ').trim():rest)}}
function book(nm,sv,ds,tm){
  const go=c=>{const isNew=!c;
    if(c&&DB.isBlocked(c))return `${c.name} está bloqueado para agendar (${c.misses||0} faltas). Libere na ficha do cliente.`;
    if(!DB.freeSlots(ds,sv.t).includes(tm))return `${tm} acabou de ser ocupado em ${short(ds)}.`;
    if(isNew){const d=new Date();c={id:'c'+DB.uid(),name:cap(trimFill(nm)),phone:'',notes:'Cadastrado pelo WhatsApp. Falta o telefone.',blocked:false,misses:0,since:MO[d.getMonth()]+'/'+String(d.getFullYear()).slice(2)}}
    const usePlan=!isNew&&/^corte( \+ barba)?$/i.test(sv.n)&&!DB.planCheck(c.id,ds,sv.n),aid=DB.uid();
    mut(['clients','appts'],d=>{if(isNew)d.clients.push(c);d.appts.push({id:aid,date:ds,start:tm,dur:sv.t,cid:c.id,svc:sv.n,price:usePlan?0:sv.p,plan:usePlan,status:'conf',note:'',origin:'whatsapp'})},`${c.name}: ${sv.n} marcado para ${short(ds)} ${tm} pelo WhatsApp`);
    const sent=c.phone&&DB.notify('confirm',db().appts.find(x=>x.id===aid));
    return `Marcado: ${c.name} · ${sv.n} · ${short(ds)} às ${tm} · ${usePlan?'pelo plano':brl(sv.p)}.${isNew?'\nCliente novo, sem telefone. Envie *tel '+first(c).toLowerCase()+' 94999990000* para cadastrar.':sent?'\nO cliente recebeu a confirmação. O link de presença sai 2 h antes.':''}`};
  return withClient(nm,go,()=>go(null))}
const range=(k)=>{const t=day0();if(k==='semana'){const m=new Date(t);m.setDate(m.getDate()-((t.getDay()+6)%7));return [iso(m),iso(t),'desta semana']}if(k==='mes')return [iso(t).slice(0,8)+'01',iso(t),'deste mês'];return [iso(t),iso(t),'de hoje']};

const HELP=`*Todos os comandos*
Prefere escolher numa lista? Envie *menu*.

*No atendimento*
*próximo* — quem vem agora, com observações
*chegou 15:00* — cliente sentou na cadeira
*ok pix* — conclui o cliente atual e registra o pagamento
*faltou 15:00* — registra falta
*atraso 20* — avisa os próximos clientes que você atrasou

*Agenda*
*hoje* · *amanhã* · *agenda 20/11* · *semana*
*livres amanhã* — horários vagos
*agendar corte João às 15* (hoje) · *agendar João barba amanhã 10*
*encaixe João barba* — primeira vaga de hoje
*remarcar 15:00 para amanhã 16:30*
*cancelar 15:00* · *cancelar dia amanhã*
*bloquear 12:00 13:00 almoço* · *desbloquear 12:00*
*fechar hoje* · *fechar hoje resto* · *fechar hoje às 15* · *fechar 20/11 feriado*
*abrir hoje* — reabre a agenda

*Clientes*
*cliente João* — ficha, plano, faltas e próximo horário
*obs João: prefere máquina 2*
*tel João 94999990000*
*pendentes* — quem não confirmou · *lembrar* — reenvia o link

*Dinheiro*
*caixa* · *caixa semana* · *caixa mês*
*pago 15:00 pix* — registra pagamento que ficou pendente
*assinantes* — ativos e atrasados · *cobrar* — avisa os atrasados

*Outros*
*aviso Fechado sábado* — faixa no site · *aviso off*
*desfazer* — volta o último comando`;

const CMD={
  ajuda:()=>HELP,
  hoje:()=>agenda(TODAY()),
  agenda:p=>agenda(p.date||TODAY()),
  amanha:()=>agenda(iso(day0(1))),
  proximo,
  semana(){return '*Próximos 7 dias*\n'+Array.from({length:7},(_,i)=>{const d=day0(i),ds=iso(d),h=closed(ds),n=dayList(ds).filter(a=>a.status!=='block').length;
    return `${WD[d.getDay()]} ${short(ds)} · `+(h?'fechado ('+h.name+')':!db().hours[d.getDay()]?'não abre':`${n} ${n===1?'cliente':'clientes'} · ${(v=>v+(v===1?' vaga':' vagas'))(DB.freeSlots(ds,30).length)}`)}).join('\n')},
  livres(p){const ds=p.date||TODAY(),f=DB.freeSlots(ds,30);return f.length?`*Livres em ${short(ds)}*\n${f.join(' · ')}`:`Sem horários livres em ${short(ds)}.`},
  agendar(p){bare(p);const ds=p.date||TODAY(),tm=p.times[0];if(!tm)return 'Faltou o horário. Ex.: *agendar corte João às 15*\nSem horário certo? Use *encaixe João corte*.';
    const {sv,nm}=svcAndName(p.rest);if(!sv)return 'Não achei o serviço.';if(nm.length<2)return 'Faltou o nome do cliente. Ex.: *agendar corte João às 15*';
    if(!DB.freeSlots(ds,sv.t).includes(tm)){const f=DB.freeSlots(ds,sv.t);return `${tm} não está livre em ${short(ds)} para ${sv.n} (${sv.t} min).`+(f.length?` Livres: ${f.slice(0,8).join(' · ')}`:` Não há vaga de ${sv.t} min nesse dia.`)}
    return book(nm,sv,ds,tm)},
  encaixe(p){const {sv,nm}=svcAndName(p.rest);if(!sv)return 'Não achei o serviço.';if(nm.length<2)return 'Diga o nome. Ex.: *encaixe João barba*';
    const ds=p.date||TODAY(),f=DB.freeSlots(ds,sv.t);
    if(!f.length){for(let i=1;i<8;i++){const d2=iso(day0(i)),f2=DB.freeSlots(d2,sv.t);if(f2.length)return `Não há vaga de ${sv.t} min em ${short(ds)}. A próxima é ${WDF[day0(i).getDay()]}, ${short(d2)} às ${f2[0]}.\nPara marcar: *agendar ${nm} ${norm(sv.n)} ${short(d2)} ${f2[0]}*`}return 'Não há vaga nos próximos 7 dias.'}
    return book(nm,sv,ds,f[0])},
  remarcar(p,raw){const parts=norm(raw).split(/\s+para\s+/);if(parts.length!==2)return 'Use: *remarcar 15:00 para 16:30* ou *remarcar João para amanhã 10:00*';
    const from=parse(parts[0]),to=bare(parse(parts[1])),r=find(from,OPEN,'remarcar 15:00 para 16:30');if(r.err)return r.err;const a=r.a,nd=to.date||a.date,nt=to.times[0];
    if(!nt)return 'Faltou o novo horário. Ex.: *remarcar 15:00 para 16:30*';
    if(!DB.freeSlots(nd,a.dur,a.id).includes(nt)){const f=DB.freeSlots(nd,a.dur,a.id);return `${nt} não está livre em ${short(nd)}.`+(f.length?` Livres: ${f.slice(0,8).join(' · ')}`:'')}
    if(a.plan){const e=DB.planCheck(a.cid,nd,a.svc,a.id);if(e)return `Não dá pelo plano: ${e}`}
    const old=`${short(a.date)} ${a.start}`;mut(['appts'],d=>{const x=d.appts.find(y=>y.id===a.id);x.date=nd;x.start=nt},`${cname(a.cid)}: remarcado de ${old} para ${short(nd)} ${nt} pelo WhatsApp`);
    const sent=DB.notify('move',db().appts.find(x=>x.id===a.id));return `Remarcado: ${cname(a.cid)} · de ${old} para ${short(nd)} às ${nt}.${sent?' O cliente foi avisado.':''}`},
  chegou(p){const r=p.times[0]||p.rest?find(p,OPEN):{a:current()};if(r.err)return r.err;if(!r.a)return 'Não há cliente na fila hoje.';const a=r.a;
    mut(['appts'],d=>{d.appts.forEach(x=>{if(x.date===a.date&&x.status==='now')x.status='conf'});d.appts.find(x=>x.id===a.id).status='now'},`${cname(a.cid)}: em atendimento (${a.start})`);return `${cname(a.cid)} está na cadeira. Quando terminar: *ok pix*.`},
  ok(p){const met=takeMet(p),a=current();if(!a)return 'Não há cliente aberto hoje.';return finish(a,met)},
  confirmar(p){const r=find(p,OPEN,'confirmar 15:00');if(r.err)return r.err;const a=r.a;if(a.status!=='pend')return `${a.start} · ${cname(a.cid)} já está ${ST[a.status]}.`;
    mut(['appts'],d=>{d.appts.find(x=>x.id===a.id).status='conf'},`${cname(a.cid)}: presença confirmada pelo WhatsApp (${short(a.date)} ${a.start})`);return `Confirmado: ${a.start} · ${cname(a.cid)}.`},
  concluir(p){const met=takeMet(p),r=find(p,OPEN);if(r.err)return r.err;return finish(r.a,met)},
  pago(p){const met=takeMet(p);if(!met)return 'Diga a forma. Ex.: *pago 15:00 pix*';const r=find(p,['done'],'pago 15:00 pix');if(r.err)return r.err;const a=r.a;
    if(a.plan||!a.price)return `${cname(a.cid)} às ${a.start} foi pelo plano, não há o que cobrar.`;
    if(db().tx.some(t=>t.date===a.date&&t.cid===a.cid&&t.desc===a.svc&&t.status==='ok'))return `O pagamento de ${cname(a.cid)} (${a.start}) já está registrado.`;
    mut(['tx'],d=>{d.tx.unshift({id:DB.uid(),date:a.date,cid:a.cid,desc:a.svc,method:met,value:a.price,kind:'avulso',status:'ok'})},`${cname(a.cid)}: ${brl(a.price)} recebido (${met}) pelo WhatsApp`,'Financeiro');return `Registrado: ${brl(a.price)} de ${cname(a.cid)} em ${met}.`},
  faltou(p){const r=p.times[0]||p.rest?find(p,OPEN):{a:current()};if(r.err)return r.err;if(!r.a)return 'Não há cliente aberto hoje.';const a=r.a;
    mut(['appts','clients'],d=>{d.appts.find(x=>x.id===a.id).status='miss';const c=d.clients.find(x=>x.id===a.cid);if(c)c.misses=(c.misses||0)+1},`${cname(a.cid)}: falta registrada pelo WhatsApp (${short(a.date)} ${a.start})`);
    const c=cli(a.cid),lim=db().settings.noShow||99;return `Falta registrada: ${a.start} · ${cname(a.cid)} (${c.misses} ${c.misses===1?'falta':'faltas'}${lim<99&&c.misses>=lim?', agendamento online bloqueado':''}).\n\n${proximo()}`},
  cancelar(p){
    if(/^(dia|todos|tudo)\b/.test(p.rest)){const ds=p.date||TODAY(),L=dayList(ds).filter(a=>OPEN.includes(a.status));if(!L.length)return `Não há horários abertos em ${short(ds)}.`;
      mut(['appts'],d=>{L.forEach(a=>{d.appts.find(x=>x.id===a.id).status='cancel'})},`${L.length} horários de ${short(ds)} cancelados pelo WhatsApp`);const n=L.filter(a=>DB.notify('cancel',a)).length;
      return `Cancelados ${L.length} horários de ${short(ds)}: ${L.map(a=>cname(a.cid)).join(', ')}.\n${n} ${n===1?'cliente foi avisado':'clientes foram avisados'} com o link para remarcar.`}
    const r=find(p,OPEN,'cancelar 15:00');if(r.err)return r.err;const a=r.a;mut(['appts'],d=>{d.appts.find(x=>x.id===a.id).status='cancel'},`${cname(a.cid)}: horário de ${short(a.date)} ${a.start} cancelado pelo WhatsApp`);
    const sent=DB.notify('cancel',a);return `Cancelado: ${short(a.date)} às ${a.start} · ${cname(a.cid)}. O horário ficou livre.${sent?' O cliente foi avisado.':''}`},
  atraso(p){const m=/\b(\d{1,3})\b/.exec(p.rest),n=m?+m[1]:0;if(!n)return 'Diga quantos minutos. Ex.: *atraso 20*';
    const L=dayList(TODAY()).filter(a=>['conf','pend'].includes(a.status)&&a.start>=nowHM());if(!L.length)return 'Não há clientes à frente hoje para avisar.';
    const sent=L.filter(a=>{const c=cli(a.cid);return c&&DB.sendClient(c,'atraso',`${first(c)}, o Farias está com cerca de ${n} min de atraso hoje. Seu horário das ${a.start} deve começar perto das ${DB.toHM(DB.toMin(a.start)+n)}. Obrigado pela compreensão!`)});
    return `Aviso de ${n} min de atraso enviado para ${sent.length} de ${L.length} clientes: ${L.map(a=>a.start+' '+first(cli(a.cid)||{name:'—'})).join(', ')}.`},
  bloquear(p,raw){const ds=p.date||TODAY(),[a,b]=p.times;if(!a||!b||b<=a)return 'Diga início e fim. Ex.: *bloquear 12:00 13:00 almoço*';
    const dur=DB.toMin(b)-DB.toMin(a),clash=dayList(ds).find(x=>x.status!=='block'&&DB.toMin(x.start)<DB.toMin(b)&&DB.toMin(x.start)+x.dur>DB.toMin(a));
    if(clash)return `Há cliente nesse intervalo: ${line(clash)}. Cancele ou remarque antes.`;
    mut(['appts'],d=>{d.appts.push({id:DB.uid(),date:ds,start:a,dur,cid:null,svc:'',price:0,plan:false,status:'block',note:cap(p.rest)||'Bloqueio pelo WhatsApp'})},`Bloqueio criado pelo WhatsApp (${short(ds)} ${a}–${b})`);
    return `Bloqueado: ${short(ds)} das ${a} às ${b}.`},
  desbloquear(p){const ds=p.date||TODAY(),L=dayList(ds).filter(a=>a.status==='block'),b=p.times[0]?L.find(a=>a.start===p.times[0]):L.length===1?L[0]:null;
    if(!b)return L.length?'Qual bloqueio? '+L.map(a=>a.start).join(', '):`Não há bloqueio em ${short(ds)}.`;
    mut(['appts'],d=>{d.appts.splice(d.appts.findIndex(x=>x.id===b.id),1)},`Bloqueio removido pelo WhatsApp (${short(ds)} ${b.start})`);return `Bloqueio das ${b.start} removido. O horário voltou para o site.`},
  fechar(p){const ds=p.date||TODAY(),part=/\bresto\b/.test(p.rest)||p.times.length>0,why=cap(trimFill(p.rest.replace(/\bresto\b/,'').replace(/^ferias$/,'férias')))||'Fechado';
    if(closed(ds))return `${short(ds)} já está fechado (${closed(ds).name}). Para reabrir: *abrir ${short(ds)}*`;
    const wd=WDF[new Date(ds+'T00:00').getDay()],tail=L=>L.length?`\n\nAinda há ${L.length} ${L.length===1?'cliente marcado':'clientes marcados'}: ${L.map(a=>a.start+' '+cname(a.cid)).join(', ')}.\nPara cancelar todos e avisar: *cancelar dia ${short(ds)}*`:'';
    if(part){const h=db().hours[new Date(ds+'T00:00').getDay()];if(!h)return `A barbearia não abre em ${short(ds)}.`;
      const from=p.times[0]||(ds===TODAY()?DB.toHM(Math.ceil(DB.toMin(nowHM())/15)*15):h[0]);if(from>=h[1])return `Depois das ${h[1]} a agenda já está encerrada.`;
      mut(['appts'],d=>{d.appts.push({id:DB.uid(),date:ds,start:from,dur:DB.toMin(h[1])-DB.toMin(from),cid:null,svc:'',price:0,plan:false,status:'block',closed:true,note:why})},`Agenda de ${short(ds)} fechada a partir das ${from} pelo WhatsApp: ${why}`,'Configurações');
      return `Agenda de ${wd}, ${short(ds)} fechada das ${from} em diante (${why}). Antes disso segue normal.\nPara reabrir: *abrir ${short(ds)}*`+tail(dayList(ds).filter(a=>OPEN.includes(a.status)&&a.start>=from))}
    mut(['holidays'],d=>{d.holidays.push({id:DB.uid(),date:ds,name:why})},`Agenda de ${short(ds)} fechada pelo WhatsApp: ${why}`,'Configurações');
    return `Agenda de ${wd}, ${short(ds)} fechada o dia todo (${why}).\nPara reabrir: *abrir ${short(ds)}*`+tail(dayList(ds).filter(a=>OPEN.includes(a.status)))},
  abrir(p){const ds=p.date||TODAY(),h=closed(ds),B=dayList(ds).filter(a=>a.status==='block'&&a.closed);if(!h&&!B.length)return `${short(ds)} não está fechado.`;
    mut(['holidays','appts'],d=>{if(h)d.holidays.splice(d.holidays.findIndex(x=>x.id===h.id),1);B.forEach(b=>d.appts.splice(d.appts.findIndex(x=>x.id===b.id),1))},`Agenda de ${short(ds)} reaberta pelo WhatsApp`,'Configurações');return `Agenda de ${short(ds)} reaberta. Os horários voltaram para o site.`},
  cliente(p){if(!p.rest)return 'Diga o nome. Ex.: *cliente João*';return withClient(p.rest,c=>{const s=DB.activeSub(c.id),A=db().appts.filter(a=>a.cid===c.id),t=TODAY();
    const last=A.filter(a=>a.status==='done').sort((a,b)=>b.date.localeCompare(a.date))[0],nx=A.filter(a=>OPEN.includes(a.status)&&a.date>=t).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start))[0];
    return `*${c.name}*\nTelefone: ${fone(c.phone)}\n${s?`Plano: ${DB.plan(s.plan).n} · ${({ok:'em dia',late:'pagamento pendente',paused:'pausado'})[s.status]}`:'Sem assinatura (avulso)'}\nAtendimentos: ${A.filter(a=>a.status==='done').length} · Faltas: ${c.misses||0}${DB.isBlocked(c)?' · BLOQUEADO':''}\nÚltima vez: ${last?short(last.date)+' · '+last.svc:'—'}\nPróximo: ${nx?short(nx.date)+' às '+nx.start+' · '+nx.svc:'nada marcado'}${c.notes?'\nObs.: '+c.notes:''}`})},
  obs(p,raw){const m=/^(.+?)\s*:\s*(.+)$/.exec(raw);if(!m)return 'Use dois-pontos. Ex.: *obs João: prefere máquina 2*';return withClient(norm(m[1]),c=>{mut(['clients'],d=>{d.clients.find(x=>x.id===c.id).notes=m[2].trim()},`${c.name}: observação atualizada pelo WhatsApp`,'Clientes');return `Anotado na ficha de ${c.name}: ${m[2].trim()}`})},
  tel(p,raw){const d=raw.replace(/\D/g,''),nm=norm(raw.replace(/[\d()\-+.]/g,' '));if(d.length!==11)return 'Telefone com DDD e 9 dígitos. Ex.: *tel João 94999990000*';return withClient(nm,c=>{mut(['clients'],x=>{const y=x.clients.find(z=>z.id===c.id);y.phone=d;if(/Falta o telefone/.test(y.notes))y.notes=''},`${c.name}: telefone cadastrado pelo WhatsApp`,'Clientes');return `Telefone de ${c.name} salvo. Ele passa a receber confirmação e o link de presença.`})},
  pendentes(){const t=TODAY(),L=db().appts.filter(a=>a.status==='pend'&&a.date>=t).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
    return L.length?`*Ainda não confirmaram (${L.length})*\n`+L.map(a=>`${short(a.date)} ${a.start} · ${cname(a.cid)} · ${a.svc}`).join('\n')+'\n\nEnvie *lembrar* para mandar o link de novo.':'Todos os clientes marcados já confirmaram.'},
  lembrar(){const t=TODAY(),L=db().appts.filter(a=>a.status==='pend'&&a.date>=t),S=L.filter(a=>{const c=cli(a.cid);return c&&DB.sendClient(c,'lembrete',`${first(c)}, você confirma seu horário de ${a.svc} em ${short(a.date)} às ${a.start}? Confirme, remarque ou cancele por aqui: ${DB.link(a)}`)});
    return L.length?`Lembrete enviado para ${S.length} de ${L.length}: ${L.map(a=>first(cli(a.cid)||{name:'—'})).join(', ')}.`:'Não há ninguém aguardando confirmação.'},
  caixa(p){const [a,b,lb]=range(/\bmes\b/.test(p.rest)?'mes':/\bsemana\b/.test(p.rest)?'semana':'hoje'),T=db().tx.filter(t=>t.status==='ok'&&t.date>=a&&t.date<=b),sum=L=>L.reduce((s,t)=>s+t.value,0),av=T.filter(t=>t.kind!=='plano'),pl=T.filter(t=>t.kind==='plano');
    const by={};av.forEach(t=>by[t.method]=(by[t.method]||0)+t.value);const open=db().appts.filter(x=>x.date>=a&&x.date<=b&&x.status==='done'&&!x.plan&&x.price>0&&!db().tx.some(t=>t.date===x.date&&t.cid===x.cid&&t.desc===x.svc&&t.status==='ok'));
    return `*Caixa ${lb}*\nAvulso: ${brl(sum(av))} (${av.length})\nPlanos: ${brl(sum(pl))} (${pl.length})\n*Total: ${brl(sum(T))}*`+(Object.keys(by).length?'\n\n'+Object.entries(by).map(([m,v])=>`${m}: ${brl(v)}`).join('\n'):'')+(open.length?`\n\nSem pagamento registrado: ${open.map(x=>x.start+' '+cname(x.cid)).join(', ')}`:'')},
  assinantes(){const S=db().subs,ok=S.filter(s=>s.status==='ok'),late=S.filter(s=>s.status==='late'),pa=S.filter(s=>s.status==='paused');
    return `*Assinantes*\nEm dia: ${ok.length} · ${brl(ok.reduce((t,s)=>t+DB.subPrice(s),0))} por mês\nPausados: ${pa.length}\nPagamento pendente: ${late.length}`+(late.length?'\n'+late.map(s=>`${cname(s.cid)} · ${DB.plan(s.plan).n} · ${brl(DB.subPrice(s))}`).join('\n')+'\n\nEnvie *cobrar* para avisar os atrasados.':'')},
  cobrar(){const L=db().subs.filter(s=>s.status==='late'),S=L.filter(s=>{const c=cli(s.cid);return c&&DB.sendClient(c,'cobranca',`${first(c)}, o pagamento do plano ${DB.plan(s.plan).n} (${brl(DB.subPrice(s))}) está pendente. Regularize para continuar usando: ${location.origin+location.pathname.replace(/[^/]*$/,'')}entrar.html`)});
    return L.length?`Cobrança enviada para ${S.length} de ${L.length}: ${L.map(s=>cname(s.cid)).join(', ')}.`:'Nenhum assinante com pagamento pendente.'},
  aviso(p,raw){const off=!raw.trim()||/^(off|desligar|tirar|remover)$/.test(norm(raw));
    mut(['content'],d=>{d.content.notice_on=!off;if(!off)d.content.notice=raw.trim()},off?'Aviso do site desligado pelo WhatsApp':`Aviso do site: ${raw.trim()}`,'Conteúdo');return off?'Aviso do site desligado.':`Aviso no topo do site: "${raw.trim()}"\nPara tirar: *aviso off*`},
  resumo(){const ds=TODAY(),L=dayList(ds).filter(a=>a.status!=='block'),got=db().tx.filter(t=>t.date===ds&&t.kind!=='plano'&&t.status==='ok').reduce((s,t)=>s+t.value,0);
    return `*Resumo de hoje*\n${L.length} atendimentos · ${L.filter(a=>a.status==='done').length} concluídos · ${L.filter(a=>a.status==='miss').length} faltas\nRecebido (avulso): ${brl(got)}\nAguardando confirmação: ${L.filter(a=>a.status==='pend').length}`},
  desfazer(){const e=db().log.slice().reverse().find(x=>x.who===WHO&&!x.undone&&!/^Desfeito/.test(x.desc));if(!e||!DB.canUndo(e))return 'Não há comando recente para desfazer.';
    if(DB.laterSameKey(e.id))return `Não dá para desfazer "${e.desc}": a agenda mudou depois disso. Ajuste pelo painel.`;return DB.undo(e.id)?`Desfeito: ${e.desc}`:'Não consegui desfazer.'}
};
const ALIAS={help:'ajuda','?':'ajuda',comandos:'ajuda',prox:'proximo',proxima:'proximo',vagas:'livres',horarios:'livres',marcar:'agendar',encaixar:'encaixe',mudar:'remarcar',remarca:'remarcar',
  confirma:'confirmar',conclui:'concluir',concluido:'concluir',finalizar:'concluir',pronto:'ok',feito:'ok',terminei:'ok',falta:'faltou',cancela:'cancelar',desmarcar:'cancelar',bloqueio:'bloquear',desbloqueio:'desbloquear',
  folga:'fechar',reabrir:'abrir',ficha:'cliente',nota:'obs',telefone:'tel',pendente:'pendentes',lembrete:'lembrar',dinheiro:'caixa',faturamento:'caixa',planos:'assinantes',atrasei:'atraso',atrasado:'atraso',dia:'resumo',voltar:'desfazer'};

/* ===== menu "selecione uma opção" e formulários prontos para preencher ===== */
const MENU=[['Agendar um cliente','f:agendar'],['Próximo cliente','c:proximo'],['Concluir o atendimento atual','m:pagar'],['Agenda de hoje','c:hoje'],['Remarcar um horário','f:remarcar'],['Cancelar um horário','f:cancelar'],['Fechar a agenda','m:fechar'],['Caixa','m:caixa'],['Quem não confirmou','c:pendentes'],['Todos os comandos','c:ajuda']];
const SUB={
  pagar:['Como o cliente pagou?',[['Pix','c:ok pix'],['Dinheiro','c:ok dinheiro'],['Débito','c:ok debito'],['Crédito','c:ok credito'],['Concluir sem registrar pagamento','c:ok']]],
  fechar:['Fechar quando?',[['Hoje, o dia todo','c:fechar hoje'],['O resto de hoje, a partir de agora','c:fechar hoje resto'],['Outro dia','f:fechar'],['Reabrir hoje','c:abrir hoje']]],
  caixa:['Caixa de qual período?',[['Hoje','c:caixa'],['Esta semana','c:caixa semana'],['Este mês','c:caixa mes']]]};
const FORM={
  agendar:{t:'Novo agendamento',f:[['Nome',''],['Horário',''],['Serviço','corte'],['Dia','hoje']],ex:'Nome: João Silva\nHorário: 15\nServiço: corte\nDia: amanhã',cmd:v=>`agendar ${v.servico||'corte'} ${v.nome||''} ${v.dia||'hoje'} as ${v.horario||''}`,free:t=>'agendar '+t},
  remarcar:{t:'Remarcar',f:[['Cliente',''],['Novo dia','hoje'],['Novo horário','']],ex:'Cliente: João\nNovo dia: amanhã\nNovo horário: 16',cmd:v=>`remarcar ${v.cliente||''} para ${v.novodia||v.dia||''} as ${v.novohorario||v.horario||''}`,free:t=>'remarcar '+t},
  cancelar:{t:'Cancelar horário',f:[['Cliente',''],['Dia','hoje']],ex:'Cliente: João\nDia: hoje',cmd:v=>`cancelar ${v.cliente||''} ${v.dia||''}`,free:t=>'cancelar '+t},
  fechar:{t:'Fechar a agenda',f:[['Dia',''],['A partir de','dia todo'],['Motivo','folga']],ex:'Dia: 20/11\nA partir de: dia todo\nMotivo: feriado',cmd:v=>`fechar ${v.dia||''} ${/\d/.test(v.apartirde||'')?'as '+v.apartirde:''} ${v.motivo||''}`,free:t=>'fechar '+t}};
const showMenu=(title,items)=>{setSt({menu:items});return `${title}\n`+items.map(([n],i)=>`${i+1}. ${n}`).join('\n')+'\n\nResponda com o número.'};
const showForm=k=>{setSt({form:k});const F=FORM[k];return `*${F.t}*\nCopie, preencha e envie:\n\n${F.f.map(([l,d])=>`${l}: ${d}`).join('\n')}\n\nExemplo:\n${F.ex}\n\nOu escreva direto, em uma linha.`};
const act=code=>{const [k,v]=[code[0],code.slice(2)];return k==='f'?showForm(v):k==='m'?showMenu(SUB[v][0],SUB[v][1]):exec(v)};
/* formulário preenchido: linhas "Campo: valor" viram o comando correspondente */
function readForm(k,raw){const v={};let n=0;raw.split('\n').forEach(l=>{const m=/^\s*([^:]{2,20}):\s*(.*)$/.exec(l);if(m&&m[2].trim()){v[norm(m[1]).replace(/\s+/g,'')]=m[2].trim();n++}});return exec(n?FORM[k].cmd(v):FORM[k].free(raw))}
function exec(raw){const n=norm(raw),w=n.split(/\s+/)[0],k=CMD[w]?w:ALIAS[w],rest=raw.replace(/^\S+\s*/,'');
  if(!k)return `Não entendi "${raw}". Envie *menu* para escolher uma opção ou *ajuda* para ver os comandos.`;
  try{return CMD[k](parse(rest),rest)}catch(e){return 'Não consegui fazer isso agora. Tente de novo.'}}
const isTeam=from=>{if(!from)return true;const d=String(from).replace(/\D/g,'').slice(-11);return db().team.some(u=>u.active&&String(u.phone||'').replace(/\D/g,'').slice(-11)===d)};

window.Bot={
  help:HELP,
  /* devolve a resposta do robô. `from` é o número de quem escreveu (vazio = equipe, no simulador).
     Toda resposta começa com "Bot:" em uma linha própria. */
  run(text,from){DB.refresh();const raw=String(text||'').trim(),n=norm(raw);
    if(!isTeam(from))return DB.welcome();
    CUR=from?String(from).replace(/\D/g,''):'equipe';
    const out=r=>'Bot:\n'+r;
    if(!db().bot.staff)return out('O robô da equipe está desligado. Ligue em Painel › WhatsApp.');
    const st=getSt();setSt(null);
    if(!n||['menu','oi','ola','inicio','opcoes','bom dia','boa tarde','boa noite'].includes(n))return out(showMenu('Selecione uma opção:',MENU));
    if(st&&/^(0|sair|voltar)$/.test(n))return out(showMenu('Selecione uma opção:',MENU));
    if(st&&st.pick){const i=/^\d$/.test(n)?+n-1:-1,c=i>=0?cli(st.pick[i]):null;if(c)return out(st.cont(c));if(/^\d+$/.test(n)){setSt(st);return out('Responda com um dos números da lista, ou *sair*.')}}
    if(st&&st.menu&&/^\d{1,2}$/.test(n)){const it=st.menu[+n-1];if(it)return out(act(it[1]));setSt(st);return out('Opção inválida. Responda com um dos números da lista.')}
    if(st&&st.form&&!CMD[n.split(/\s+/)[0]]&&!ALIAS[n.split(/\s+/)[0]]){const r=readForm(st.form,raw);if(!getSt()&&/^(Faltou|Não achei|\d\d:\d\d não|Use:|Diga)/.test(r))setSt(st);return out(r)}
    if(/^\d{1,2}$/.test(n))return out(showMenu('Selecione uma opção:',MENU));
    // formulário enviado fora de hora: reconhece pelos campos
    if(/^\s*nome\s*:/m.test(n))return out(readForm('agendar',raw));if(/^\s*cliente\s*:/m.test(n))return out(readForm(/novo/.test(n)?'remarcar':'cancelar',raw));
    return out(exec(raw))},
  next:proximo,daily:()=>agenda(TODAY())
};
})();
