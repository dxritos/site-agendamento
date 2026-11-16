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
const ST={conf:'confirmado',pend:'aguardando',now:'em atendimento',done:'concluído',miss:'faltou',block:'bloqueio'};
const OPEN=['conf','pend','now'];
const METS={pix:'Pix',dinheiro:'Dinheiro',debito:'Maquininha (débito)',credito:'Maquininha (crédito)',cartao:'Maquininha (crédito)'};
const services=()=>{const L=db().services.filter(s=>s.on).map(s=>({n:s.n,p:s.p,t:s.t})),c=L.find(s=>norm(s.n)==='corte'),b=L.find(s=>norm(s.n)==='barba');
  if(c&&b)L.push({n:'Corte + Barba',p:c.p+b.p,t:60});return L.sort((a,b)=>b.n.length-a.n.length)};

/* tira do texto a data (hoje, amanhã, dd/mm, dia da semana) e os horários (14:30, 14h, 14h30) */
function parse(text){
  let t=' '+norm(text)+' ',date=null;const times=[];
  t=t.replace(/\b(\d{1,2})\/(\d{1,2})\b/,(m,d,mo)=>{const y=new Date().getFullYear();let dt=new Date(y,+mo-1,+d);if(dt<day0(-1))dt=new Date(y+1,+mo-1,+d);date=iso(dt);return ' '});
  /* "dia 20" (mês atual, ou o próximo se já passou) */
  if(!date)t=t.replace(/\bdia (\d{1,2})\b/,(m,d)=>{const n0=day0();let dt=new Date(n0.getFullYear(),n0.getMonth(),+d);if(dt<n0)dt=new Date(n0.getFullYear(),n0.getMonth()+1,+d);if(+d>=1&&+d<=31)date=iso(dt);return ' '});
  /* "3 da tarde", "8 da noite", "10 da manha", "9 e meia", "meio dia" */
  t=t.replace(/\bmeio[ -]?dia( e meia)?\b/g,(m,mm)=>{times.push(mm?'12:30':'12:00');return ' '});
  t=t.replace(/\b(\d{1,2})(?:h|:00)?(?:\s*e meia)?\s+(?:da|de)\s+(manha|tarde|noite)\b/g,(m,h,per)=>{h=+h;if(per!=='manha'&&h<12)h+=12;if(h<24)times.push(pad(h)+':'+(/e meia/.test(m)?'30':'00'));return ' '});
  t=t.replace(/\b(\d{1,2})(?:h)?\s+e meia\b/g,(m,h)=>{if(+h<24)times.push(hm(+h,'30'));return ' '});
  t=t.replace(/\b(\d{1,2})(?::|h)(\d{2})?\b/g,(m,h,mi)=>{if(+h<24)times.push(hm(+h,mi));return ' '});
  t=t.replace(/\b(?:as|das|a partir das|apos as)\s+(\d{1,2})\b/g,(m,h)=>{if(+h<24)times.push(hm(+h));return ' '});
  if(!date&&/\b(semana que vem|proxima semana)\b/.test(t)){date=iso(day0((8-day0().getDay())%7||7));t=t.replace(/\b(semana que vem|proxima semana)\b/,' ')}
  if(!date&&/\b(fim de semana|final de semana)\b/.test(t)){date=iso(day0((6-day0().getDay()+7)%7));t=t.replace(/\b(fim de semana|final de semana)\b/,' ')}
  if(!date){if(/\bdepois de amanha\b/.test(t)){date=iso(day0(2));t=t.replace(/\bdepois de amanha\b/,' ')}
    else if(/\bamanha\b/.test(t)){date=iso(day0(1));t=t.replace(/\bamanha\b/,' ')}
    else if(/\bhoje\b/.test(t)){date=TODAY();t=t.replace(/\bhoje\b/,' ')}
    else{const i=WDF.findIndex(w=>new RegExp('\\b'+norm(w)+'(-feira)?\\b').test(t));if(i>-1){let k=(i-day0().getDay()+7)%7;if(!k)k=7;date=iso(day0(k));t=t.replace(new RegExp('\\b'+norm(WDF[i])+'(-feira)?\\b'),' ')}}}
  return {date,times,rest:t.replace(/\s+/g,' ').trim()};
}
/* período do dia citado na mensagem ("de manhã", "à tarde", "à noite", "depois do almoço"); saudações não contam */
const PER={manha:[0,720,'de manhã'],tarde:[720,1080,'à tarde'],noite:[1080,1440,'à noite']};
function periodOf(x){const t=' '+norm(x).replace(/[^a-z0-9\s]/g,' ').replace(/\b(bom dia|boa tarde|boa noite|bom fim de semana)\b/g,' ')+' ';
  if(/ (depois do almoco|pos almoco|apos o almoco) /.test(t))return PER.tarde;if(/ (antes do almoco|cedo|cedinho) /.test(t))return PER.manha;
  const m=/ (manha|tarde|tardinha|noite) /.exec(t);return m?PER[m[1]==='tardinha'?'tarde':m[1]]:null}
/* "depois das 17" / "antes das 10": limite dos horários livres */
const bound=x=>/\b(depois das|a partir das|apos as|depois de)\b/.test(x)?'after':/\b(antes das|ate as|no maximo as)\b/.test(x)?'before':null;
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
const val=a=>a.plan?'assinante'+(a.price?' + '+brl(a.price):''):brl(a.price);
const line=a=>a.status==='block'?`${a.start} · bloqueado${a.note?' ('+a.note+')':''}`:`${a.start} · ${cname(a.cid)} · ${a.svc} · ${val(a)} · ${ST[a.status]||a.status}`;
const closed=ds=>db().holidays.find(h=>h.date===ds);
function agenda(ds){const L=dayList(ds),d=new Date(ds+'T00:00:00'),hol=closed(ds),tt=`${WDF[d.getDay()]}, ${short(ds)}`;
  if(hol&&!L.length)return `${tt}: fechado (${hol.name}).`;
  if(!L.length)return `${tt}: nenhum horário marcado.`;
  const n=L.filter(a=>a.status!=='block').length;return `*Agenda de ${tt}*${hol?' · FECHADO: '+hol.name:''} (${n} ${n===1?'atendimento':'atendimentos'})\n`+L.map(line).join('\n')}
/* acha o agendamento pelo horário (ou pelo nome do cliente) no dia informado, hoje por padrão */
function find(p,sts,ex,onlyDay){bare(p);p.rest=trimFill(p.rest);const ds=p.date||TODAY(),L=dayList(ds).filter(a=>a.status!=='block'&&(!sts||sts.includes(a.status)));
  const hit=p.times[0]?L.filter(a=>a.start===p.times[0]):p.rest?L.filter(a=>norm(cname(a.cid)).includes(p.rest)):[];
  if(hit.length===1)return {a:hit[0]};
  // pelo nome e sem dia informado: vale o próximo horário desse cliente nos dias seguintes
  if(!onlyDay&&!hit.length&&!p.times[0]&&p.rest&&!p.date){const F=db().appts.filter(a=>a.date>ds&&a.status!=='block'&&(!sts||sts.includes(a.status))&&norm(cname(a.cid)).includes(p.rest)).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
    if(F.length&&new Set(F.map(a=>a.cid)).size===1)return {a:F[0]}}
  if(!p.times[0]&&!p.rest)return {err:`Diga o horário ou o nome. Ex.: *${ex||'concluir 14:30'}*`};
  if(!hit.length)return {err:`Não achei ${p.times[0]?'horário às '+p.times[0]:'cliente "'+p.rest+'"'} em ${short(ds)}.\n\n${agenda(ds)}`};
  return {err:'Achei mais de um. Diga o horário:\n'+hit.map(line).join('\n')}}
/* conversa em andamento com cada remetente: menu aberto, formulário aguardando ou escolha entre homônimos */
const STATE={};let CUR='equipe',ME=null,INT='';
/* quem da equipe está falando. Sem número = titular (simulador); "@barbeiro" = simulação de barbeiro sem acesso ao financeiro */
const memberOf=from=>{if(!from)return db().team.find(u=>u.id==='u1')||{id:'u1',role:'admin'};if(from==='@barbeiro')return {id:'sim',name:'Barbeiro',role:'barbeiro',perms:db().roles.barbeiro||[]};
  const d=String(from).replace(/\D/g,'').slice(-11);return db().team.find(u=>u.active&&String(u.phone||'').replace(/\D/g,'').slice(-11)===d)||null};
/* dados financeiros: só o titular, administradores ou quem tem "Ver financeiro" no painel */
const canFin=()=>!!ME&&(ME.id==='u1'||ME.role==='admin'||!!(ME.perms||[])[5]);
const FIN_DENY='Essa informação é restrita ao titular e a quem tem a permissão "Ver financeiro" no painel.';
const setSt=v=>{STATE[CUR]=v},getSt=()=>STATE[CUR]||null;
/* acha o cliente pelo nome. Se houver mais de um, pergunta "Qual João?" e continua quando a pessoa responder o número */
function withClient(nm,cont,ifNone){nm=trimFill(nm);const hits=db().clients.filter(c=>norm(c.name).includes(nm)),ex=hits.filter(c=>norm(c.name)===nm);
  if(ex.length===1)return cont(ex[0]);if(hits.length===1)return cont(hits[0]);
  if(!hits.length)return ifNone?ifNone():`Não achei cliente "${nm}".`;
  setSt({pick:hits.slice(0,9).map(c=>c.id),cont});
  return `Qual ${cap(nm)}?\n`+hits.slice(0,9).map((c,i)=>`${i+1}. ${c.name} · ${fone(c.phone)}`).join('\n')+'\n\nResponda com o número.'}
const mut=(keys,fn,desc,area)=>DB.mutateMany(keys,fn,desc,area||'Agenda',WHO);
const current=()=>{const L=dayList(TODAY()).filter(a=>OPEN.includes(a.status));return L.find(a=>a.status==='now')||L[0]||null};
const valTxt=a=>a.plan?'pelo plano'+(a.price?' + '+brl(a.price):''):brl(a.price);
const PAYS=['pix','dinheiro','debito','credito'];
const payAsk=a=>a.price>0?'Ao terminar, escolha a forma de pagamento:\n1. Pix\n2. Dinheiro\n3. Débito\n4. Crédito':'Ao terminar, envie *ok* (atendimento pelo plano).\n1. Concluir';
/* depois de concluir ou registrar falta: só uma linha sobre o próximo. Os detalhes dele chegam na hora marcada */
const nextLine=()=>{const a=current();return a?`Próximo: ${a.start} · ${cname(a.cid)} · ${a.svc}${a.status==='pend'?' (ainda não confirmou)':''}.`:'Era o último de hoje. Envie *caixa* para ver o total.'};
const extra=c=>`${c.notes?'\nObs.: '+c.notes:''}${c.misses?'\nFaltas: '+c.misses:''}`;
function proximo(){const a=current();if(!a)return 'Não há mais clientes hoje.';const c=cli(a.cid)||{},s=c.id&&DB.activeSub(c.id);
  return `*${a.status==='now'?'Em atendimento':'Próximo'}: ${a.start} · ${cname(a.cid)}*\n${a.svc} · ${valTxt(a)} · ${ST[a.status]}${s?'\nPlano: '+DB.plan(s.plan).n+(canFin()&&s.status==='late'?' (pagamento pendente)':''):''}${extra(c)}\n\n${a.status==='now'?payAsk(a):'Quando ele chegar, envie *chegou*.'}`}
/* início do atendimento: mesma mensagem pelo comando "chegou" e pela resposta 👍 na hora marcada */
function started(a){const c=cli(a.cid)||{};setSt({pay:a.id});return `*Atendimento iniciado.* 👍\nCliente: ${cname(a.cid)}\n${a.svc} · ${valTxt(a)}${extra(c)}\n\n${payAsk(a)}`}
function finish(a,met){const pay=a.price>0;
  mut(['appts','tx'],d=>{d.appts.find(x=>x.id===a.id).status='done';if(pay&&met)d.tx.unshift({id:DB.uid(),date:a.date,cid:a.cid,desc:a.svc,method:met,value:a.price,kind:'avulso',status:'ok'})},`${cname(a.cid)}: atendimento concluído pelo WhatsApp${pay&&met?` e ${brl(a.price)} recebido (${met})`:''}`);
  const th=DB.notify('thanks',a);return `*Atendimento concluído.* 👌\nCliente: ${cname(a.cid)}\n${pay?met?`Recebido: ${brl(a.price)} em ${met}.`:`Pagamento não registrado. Para registrar: *pago ${a.start} pix*`:'Pelo plano.'}${th?'\nAgradecimento enviado ao cliente.':''}\n\n${nextLine()}${offerNext(a)}`}
/* aviso "você é o próximo" pelo WhatsApp: automático, perguntando à equipe, ou desligado (Painel › WhatsApp) */
const canWarn=a=>{const c=a&&cli(a.cid),m=db().messages.next;return !!(a&&a.date===TODAY()&&!a.nextSent&&c&&c.phone&&db().bot.client&&m&&m.on)};
function warnNext(a){if(!canWarn(a))return a&&a.nextSent?`${first(cli(a.cid))} já foi avisado.`:'Não dá para avisar: o cliente não tem telefone ou a mensagem está desligada.';
  DB.notify('next',a);const x=db().appts.find(y=>y.id===a.id);if(x){x.nextSent=true;DB.save()}return `${first(cli(a.cid))} foi avisado pelo WhatsApp que é o próximo. 🤙`}
function offerNext(done){const nx=current(),mode=db().bot.nextNotify||'ask';if(!nx||nx.id===done.id||mode==='off'||!canWarn(nx))return '';
  if(mode==='auto')return '\n'+warnNext(nx);setSt({warn:nx.id});return `\n\nAvisar ${first(cli(nx.cid))} pelo WhatsApp que ele é o próximo?\n1. Sim, avisar\n2. Não`}
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
    return `Marcado 👍 ${c.name} · ${sv.n} · ${short(ds)} às ${tm} · ${usePlan?'pelo plano':brl(sv.p)}.${isNew?'\nCliente novo, sem telefone. Envie *tel '+first(c).toLowerCase()+' 94999990000* para cadastrar.':sent?'\nO cliente recebeu a confirmação. O link de presença sai 2 h antes.':''}`};
  return withClient(nm,go,()=>go(null))}
const range=(k)=>{const t=day0();if(k==='semana'){const m=new Date(t);m.setDate(m.getDate()-((t.getDay()+6)%7));return [iso(m),iso(t),'desta semana']}if(k==='mes')return [iso(t).slice(0,8)+'01',iso(t),'deste mês'];return [iso(t),iso(t),'de hoje']};

const HELP=`*Todos os comandos*
Prefere escolher numa lista? Envie *menu*.

*No atendimento*
*próximo* — quem vem agora, com observações
*chegou 15:00* — inicia o atendimento
*pix* · *dinheiro* · *débito* · *crédito* — conclui o atendimento e registra o pagamento
*faltou 15:00* ou *João faltou* — registra falta
*fila* — quem ainda vem hoje
*pausa 20* — tira os próximos 20 min do site
*serviço 15:00 para barba* — troca o serviço
*atraso 20* — avisa os próximos clientes que você atrasou

*Agenda*
*hoje* · *amanhã* · *agenda 20/11* · *semana*
*livres amanhã* — horários vagos
*agendar* — o robô pergunta nome, horário e serviço
*agendar corte João às 15* — tudo de uma vez
*encaixe João barba* — primeira vaga de hoje
*remarcar 15:00 para amanhã 16:30*
*cancelar 15:00* · *cancelar dia amanhã*
*bloquear 12:00 13:00 almoço* · *desbloquear 12:00*
*fechar hoje* · *fechar hoje resto* · *fechar hoje às 15* · *fechar 20/11 feriado*
*abrir hoje* — reabre a agenda

*Clientes*
*cliente João* — ficha, plano, faltas e próximo horário
*histórico João* — últimos atendimentos
*faltosos* · *liberar João* — faltas e desbloqueio
*sumidos* — quem não volta há 30 dias (*sumidos 60*)
*novos* · *aniversariantes* · *avaliações*
*obs João: prefere máquina 2*
*tel João 94999990000*
*pendentes* — quem não confirmou · *lembrar* — reenvia o link
*responder João: mensagem* — responde o cliente pelo robô
*avisar* — avisa o próximo cliente que é a vez dele
*recados* — mensagens do site sem resposta

*Dinheiro*
*caixa* · *caixa semana* · *caixa mês*
*pago 15:00 pix* — registra pagamento que ficou pendente
*assinantes* — ativos e atrasados · *cobrar* — avisa os atrasados

*Outros*
*aviso Fechado sábado* — faixa no site · *aviso off*
*desfazer* — volta o último comando`;

const CMD={
  ajuda:()=>canFin()?HELP:HELP.replace(/\*Dinheiro\*[\s\S]*?\n\n/,'*Pagamento*\n*pago 15:00 pix* — registra pagamento que ficou pendente\n\n'),
  hoje:()=>agenda(TODAY()),
  agenda:p=>agenda(p.date||TODAY()),
  amanha:()=>agenda(iso(day0(1))),
  proximo,
  semana(){return '*Próximos 7 dias*\n'+Array.from({length:7},(_,i)=>{const d=day0(i),ds=iso(d),h=closed(ds),n=dayList(ds).filter(a=>a.status!=='block').length;
    return `${WD[d.getDay()]} ${short(ds)} · `+(h?'fechado ('+h.name+')':!db().hours[d.getDay()]?'não abre':`${n} ${n===1?'cliente':'clientes'} · ${(v=>v+(v===1?' vaga':' vagas'))(DB.freeSlots(ds,30).length)}`)}).join('\n')},
  livres(p,raw){const ds=p.date||TODAY(),per=periodOf(raw||''),f=DB.freeSlots(ds,30).filter(x=>!per||(DB.toMin(x)>=per[0]&&DB.toMin(x)<per[1]));return f.length?`*Livres em ${short(ds)}${per?' '+per[2]:''}*\n${f.join(' · ')}`:`Sem horários livres em ${short(ds)}${per?' '+per[2]:''}.`},
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
  chegou(p){const r=p.times[0]||p.rest?find(p,OPEN,'chegou João',true):{a:current()};if(r.err)return r.err;if(!r.a)return 'Não há cliente na fila hoje.';const a=r.a;
    if(a.status==='now')return started(a);mut(['appts'],d=>{d.appts.forEach(x=>{if(x.date===a.date&&x.status==='now')x.status='conf'});d.appts.find(x=>x.id===a.id).status='now'},`${cname(a.cid)}: atendimento iniciado (${a.start})`);return started(a)},
  /* conclui quem está em atendimento; se ninguém foi marcado, só aceita cliente cujo horário já chegou */
  ok(p){const met=takeMet(p),L=dayList(TODAY()),a=L.find(x=>x.status==='now')||L.find(x=>['conf','pend'].includes(x.status)&&x.start<=nowHM());
    if(!a){const nx=current();return nx?`Nenhum atendimento em andamento. O próximo é ${nx.start} · ${cname(nx.cid)}.\nQuando ele chegar, envie *chegou*.`:'Não há cliente aberto hoje.'}return finish(a,met)},
  confirmar(p){const r=find(p,OPEN,'confirmar 15:00');if(r.err)return r.err;const a=r.a;if(a.status!=='pend')return `${a.start} · ${cname(a.cid)} já está ${ST[a.status]}.`;
    mut(['appts'],d=>{d.appts.find(x=>x.id===a.id).status='conf'},`${cname(a.cid)}: presença confirmada pelo WhatsApp (${short(a.date)} ${a.start})`);return `Confirmado: ${a.start} · ${cname(a.cid)}.`},
  concluir(p){if(!p.times[0]&&!trimFill(p.rest).replace(/\b(pix|dinheiro|debito|credito|cartao)\b/,'').trim())return CMD.ok(p);const met=takeMet(p),r=find(p,OPEN,'concluir João',true);if(r.err)return r.err;return finish(r.a,met)},
  pago(p){const met=takeMet(p);if(!met)return 'Diga a forma. Ex.: *pago 15:00 pix*';const r=find(p,['done'],'pago 15:00 pix');if(r.err)return r.err;const a=r.a;
    if(!a.price)return `${cname(a.cid)} às ${a.start} foi pelo plano, não há o que cobrar.`;
    if(db().tx.some(t=>t.date===a.date&&t.cid===a.cid&&t.desc===a.svc&&t.status==='ok'))return `O pagamento de ${cname(a.cid)} (${a.start}) já está registrado.`;
    mut(['tx'],d=>{d.tx.unshift({id:DB.uid(),date:a.date,cid:a.cid,desc:a.svc,method:met,value:a.price,kind:'avulso',status:'ok'})},`${cname(a.cid)}: ${brl(a.price)} recebido (${met}) pelo WhatsApp`,'Financeiro');return `Registrado: ${brl(a.price)} de ${cname(a.cid)} em ${met}.`},
  faltou(p){const r=p.times[0]||p.rest?find(p,OPEN,'faltou João',true):{a:current()};if(r.err)return r.err;if(!r.a)return 'Não há cliente aberto hoje.';const a=r.a;
    mut(['appts','clients'],d=>{d.appts.find(x=>x.id===a.id).status='miss';const c=d.clients.find(x=>x.id===a.cid);if(c)c.misses=(c.misses||0)+1},`${cname(a.cid)}: falta registrada pelo WhatsApp (${short(a.date)} ${a.start})`);
    const c=cli(a.cid),lim=db().settings.noShow||99;return `Falta registrada: ${a.start} · ${cname(a.cid)} (${c.misses} ${c.misses===1?'falta':'faltas'}${lim<99&&c.misses>=lim?', agendamento online bloqueado':''}).\n\n${nextLine()}${offerNext(a)}`},
  cancelar(p){
    if(/^(dia|todos|tudo)\b/.test(p.rest)){const ds=p.date||TODAY(),L=dayList(ds).filter(a=>OPEN.includes(a.status));if(!L.length)return `Não há horários abertos em ${short(ds)}.`;
      mut(['appts'],d=>{L.forEach(a=>{d.appts.find(x=>x.id===a.id).status='cancel'})},`${L.length} horários de ${short(ds)} cancelados pelo WhatsApp`);const n=L.filter(a=>DB.notify('cancel',a)).length;
      return `Cancelados ${L.length} horários de ${short(ds)}: ${L.map(a=>cname(a.cid)).join(', ')}.\n${n} ${n===1?'cliente foi avisado':'clientes foram avisados'} com o link para remarcar.`}
    const r=find(p,OPEN,'cancelar 15:00');if(r.err)return r.err;const a=r.a;mut(['appts'],d=>{d.appts.find(x=>x.id===a.id).status='cancel'},`${cname(a.cid)}: horário de ${short(a.date)} ${a.start} cancelado pelo WhatsApp`);
    const sent=DB.notify('cancel',a);return `Cancelado: ${short(a.date)} às ${a.start} · ${cname(a.cid)}. O horário ficou livre.${sent?' O cliente foi avisado.':''}`+(a.date===TODAY()&&current()?`\n\n${nextLine()}${offerNext(a)}`:'')},
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
    return `*${c.name}*\nTelefone: ${fone(c.phone)}\n${s?`Plano: ${DB.plan(s.plan).n}${canFin()?' · '+({ok:'em dia',late:'pagamento pendente',paused:'pausado'})[s.status]:s.status==='paused'?' · pausado':''}`:'Sem assinatura (avulso)'}\nAtendimentos: ${A.filter(a=>a.status==='done').length} · Faltas: ${c.misses||0}${DB.isBlocked(c)?' · BLOQUEADO':''}\nÚltima vez: ${last?short(last.date)+' · '+last.svc:'—'}\nPróximo: ${nx?short(nx.date)+' às '+nx.start+' · '+nx.svc:'nada marcado'}${c.notes?'\nObs.: '+c.notes:''}`})},
  obs(p,raw){const m=/^(.+?)\s*:\s*(.+)$/.exec(raw);if(!m)return 'Use dois-pontos. Ex.: *obs João: prefere máquina 2*';return withClient(norm(m[1]),c=>{mut(['clients'],d=>{d.clients.find(x=>x.id===c.id).notes=m[2].trim()},`${c.name}: observação atualizada pelo WhatsApp`,'Clientes');return `Anotado na ficha de ${c.name}: ${m[2].trim()}`})},
  tel(p,raw){const d=raw.replace(/\D/g,''),nm=norm(raw.replace(/[\d()\-+.]/g,' '));if(d.length!==11)return 'Telefone com DDD e 9 dígitos. Ex.: *tel João 94999990000*';return withClient(nm,c=>{mut(['clients'],x=>{const y=x.clients.find(z=>z.id===c.id);y.phone=d;if(/Falta o telefone/.test(y.notes))y.notes=''},`${c.name}: telefone cadastrado pelo WhatsApp`,'Clientes');return `Telefone de ${c.name} salvo. Ele passa a receber confirmação e o link de presença.`})},
  pendentes(){const t=TODAY(),L=db().appts.filter(a=>a.status==='pend'&&a.date>=t).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start));
    return L.length?`*Ainda não confirmaram (${L.length})*\n`+L.map(a=>`${short(a.date)} ${a.start} · ${cname(a.cid)} · ${a.svc}`).join('\n')+'\n\nEnvie *lembrar* para mandar o link de novo.':'Todos os clientes marcados já confirmaram.'},
  lembrar(){const t=TODAY(),L=db().appts.filter(a=>a.status==='pend'&&a.date>=t),S=L.filter(a=>{const c=cli(a.cid);return c&&DB.sendClient(c,'lembrete',`${first(c)}, você confirma seu horário de ${a.svc} em ${short(a.date)} às ${a.start}? Confirme, remarque ou cancele por aqui: ${DB.link(a)}`)});
    return L.length?`Lembrete enviado para ${S.length} de ${L.length}: ${L.map(a=>first(cli(a.cid)||{name:'—'})).join(', ')}.`:'Não há ninguém aguardando confirmação.'},
  caixa(p){if(!canFin())return FIN_DENY;const [a,b,lb]=range(/\bmes\b/.test(p.rest)?'mes':/\bsemana\b/.test(p.rest)?'semana':'hoje'),T=db().tx.filter(t=>t.status==='ok'&&t.date>=a&&t.date<=b),sum=L=>L.reduce((s,t)=>s+t.value,0),av=T.filter(t=>t.kind!=='plano'),pl=T.filter(t=>t.kind==='plano');
    const by={};av.forEach(t=>by[t.method]=(by[t.method]||0)+t.value);const open=db().appts.filter(x=>x.date>=a&&x.date<=b&&x.status==='done'&&!x.plan&&x.price>0&&!db().tx.some(t=>t.date===x.date&&t.cid===x.cid&&t.desc===x.svc&&t.status==='ok'));
    return `*Caixa ${lb}*\nAvulso: ${brl(sum(av))} (${av.length})\nPlanos: ${brl(sum(pl))} (${pl.length})\n*Total: ${brl(sum(T))}*`+(Object.keys(by).length?'\n\n'+Object.entries(by).map(([m,v])=>`${m}: ${brl(v)}`).join('\n'):'')+(open.length?`\n\nSem pagamento registrado: ${open.map(x=>x.start+' '+cname(x.cid)).join(', ')}`:'')},
  assinantes(){if(!canFin())return FIN_DENY;const S=db().subs,ok=S.filter(s=>s.status==='ok'),late=S.filter(s=>s.status==='late'),pa=S.filter(s=>s.status==='paused');
    return `*Assinantes*\nEm dia: ${ok.length} · ${brl(ok.reduce((t,s)=>t+DB.subPrice(s),0))} por mês\nPausados: ${pa.length}\nPagamento pendente: ${late.length}`+(late.length?'\n'+late.map(s=>`${cname(s.cid)} · ${DB.plan(s.plan).n} · ${brl(DB.subPrice(s))}`).join('\n')+'\n\nEnvie *cobrar* para avisar os atrasados.':'')},
  cobrar(){if(!canFin())return FIN_DENY;const L=db().subs.filter(s=>s.status==='late'),S=L.filter(s=>{const c=cli(s.cid);return c&&DB.sendClient(c,'cobranca',`${first(c)}, o pagamento do plano ${DB.plan(s.plan).n} (${brl(DB.subPrice(s))}) está pendente. Regularize para continuar usando: ${location.origin+location.pathname.replace(/[^/]*$/,'')}entrar.html`)});
    return L.length?`Cobrança enviada para ${S.length} de ${L.length}: ${L.map(s=>cname(s.cid)).join(', ')}.`:'Nenhum assinante com pagamento pendente.'},
  aviso(p,raw){const off=!raw.trim()||/^(off|desligar|tirar|remover)$/.test(norm(raw));
    mut(['content'],d=>{d.content.notice_on=!off;if(!off)d.content.notice=raw.trim()},off?'Aviso do site desligado pelo WhatsApp':`Aviso do site: ${raw.trim()}`,'Conteúdo');return off?'Aviso do site desligado.':`Aviso no topo do site: "${raw.trim()}"\nPara tirar: *aviso off*`},
  fila(){const L=dayList(TODAY()).filter(a=>OPEN.includes(a.status));if(!L.length)return 'Não há mais clientes hoje.';
    return `*Ainda hoje (${L.length})*\n`+L.map(a=>`${a.start} · ${cname(a.cid)} · ${a.svc}${a.status==='now'?' · em atendimento':a.status==='pend'?' · não confirmou':''}`).join('\n')},
  historico(p){if(!p.rest)return 'Diga o nome. Ex.: *histórico João*';return withClient(p.rest,c=>{const L=db().appts.filter(a=>a.cid===c.id&&['done','miss','cancel'].includes(a.status)).sort((a,b)=>(b.date+b.start).localeCompare(a.date+a.start)).slice(0,6);
    return L.length?`*Últimos de ${c.name}*\n`+L.map(a=>`${short(a.date)} · ${a.svc} · ${({done:'veio',miss:'faltou',cancel:'cancelou'})[a.status]}`).join('\n'):`${c.name} ainda não tem atendimentos.`})},
  aniversariantes(p){const mes=/\bmes\b/.test(p.rest),t0=day0(),L=db().clients.filter(c=>c.birth&&c.name!=='Cliente removido').map(c=>{const b=c.birth.slice(5);let d=new Date(t0.getFullYear()+'-'+b+'T00:00');if(d<t0)d=new Date((t0.getFullYear()+1)+'-'+b+'T00:00');return {c,d}})
      .filter(x=>mes?x.d.getMonth()===t0.getMonth()&&x.d.getFullYear()===t0.getFullYear():(x.d-t0)/864e5<=7).sort((a,b)=>a.d-b.d);
    return L.length?`*Aniversariantes ${mes?'do mês':'dos próximos 7 dias'}*\n`+L.map(x=>`${short(iso(x.d))} · ${x.c.name}`).join('\n')+'\n\nPara mandar parabéns: *responder Nome: mensagem*':`Nenhum aniversariante ${mes?'este mês':'nos próximos 7 dias'}.`},
  faltosos(){const L=db().clients.filter(c=>c.misses>0).sort((a,b)=>b.misses-a.misses).slice(0,10);return L.length?'*Clientes com faltas*\n'+L.map(c=>`${c.name} · ${c.misses} ${c.misses===1?'falta':'faltas'}${DB.isBlocked(c)?' · BLOQUEADO':''}`).join('\n')+'\n\nPara liberar: *liberar João*':'Nenhum cliente com faltas.'},
  liberar(p){if(!p.rest)return 'Diga o nome. Ex.: *liberar João*';return withClient(p.rest,c=>{if(!DB.isBlocked(c)&&!c.misses)return `${c.name} não está bloqueado.`;mut(['clients'],d=>{const x=d.clients.find(y=>y.id===c.id);x.misses=0;x.blocked=false},`${c.name}: liberado para agendar pelo WhatsApp (faltas zeradas)`,'Clientes');return `${c.name} liberado. As faltas foram zeradas e ele já pode agendar pelo site.`})},
  sumidos(p){const dias=+(/(\d{2,3})/.exec(p.rest)||[0,30])[1],lim=iso(day0(-dias)),t0=TODAY();
    const L=db().clients.filter(c=>c.name!=='Cliente removido'&&!db().appts.some(a=>a.cid===c.id&&a.date>=t0&&OPEN.includes(a.status))).map(c=>({c,l:db().appts.filter(a=>a.cid===c.id&&a.status==='done').map(a=>a.date).sort().pop()})).filter(x=>x.l&&x.l<lim).sort((a,b)=>a.l.localeCompare(b.l)).slice(0,12);
    return L.length?`*Sem voltar há mais de ${dias} dias*\n`+L.map(x=>`${x.c.name} · última vez ${short(x.l)}`).join('\n')+'\n\nPara chamar: *responder Nome: mensagem*':`Todos os clientes voltaram nos últimos ${dias} dias.`},
  novos(){const lb=MO[day0().getMonth()]+'/'+String(day0().getFullYear()).slice(2),L=db().clients.filter(c=>c.since===lb&&c.name!=='Cliente removido');return L.length?`*Clientes novos em ${lb} (${L.length})*\n`+L.map(c=>`${c.name}${c.source?' · '+c.source:''}`).join('\n'):'Nenhum cliente novo este mês.'},
  servicos(){return '*Serviços*\n'+db().services.filter(x=>x.on).map(x=>`${x.n} · ${brl(x.p)} · ${x.t} min`).join('\n')},
  avaliacoes(){const L=db().clients.filter(c=>c.rating);if(!L.length)return 'Nenhuma avaliação ainda. Elas chegam quando o cliente responde à mensagem de agradecimento.';const m=L.reduce((t,c)=>t+c.rating,0)/L.length,low=L.filter(c=>c.rating<=3);
    return `*Avaliações*\nMédia: ${m.toFixed(1).replace('.',',')} de 5 (${L.length})`+(low.length?'\nNotas baixas: '+low.map(c=>`${c.name} (${c.rating})`).join(', '):'')},
  pausa(p){const alm=/almoc/.test(norm(p.rest)),L0=db().lunch,n=+(/(\d{1,3})/.exec(p.rest)||[0,alm?(L0?DB.toMin(L0[1])-DB.toMin(L0[0]):60):15])[1],ds=TODAY(),a=DB.toHM(Math.ceil(DB.toMin(nowHM())/5)*5),b=DB.toHM(DB.toMin(a)+n);
    const clash=dayList(ds).find(x=>x.status!=='block'&&OPEN.includes(x.status)&&DB.toMin(x.start)<DB.toMin(b)&&DB.toMin(x.start)+x.dur>DB.toMin(a));if(clash)return `Há cliente nesse intervalo: ${line(clash)}. Para avisar atraso: *atraso ${n}*`;
    mut(['appts'],d=>{d.appts.push({id:DB.uid(),date:ds,start:a,dur:n,cid:null,svc:'',price:0,plan:false,status:'block',note:alm?'Almoço':'Pausa'})},`${alm?'Almoço':'Pausa'} de ${n} min pelo WhatsApp (${a}–${b})`);return `${alm?'Almoço':'Pausa'} das ${a} às ${b}. Esse horário saiu do site.\nPara desfazer: *desbloquear ${a}*`},
  servico(p,raw){const m=/^(.*?)\s+(?:para|pra|por)\s+(.+)$/.exec(norm(raw))||[null,p.rest,''];const r=find(parse(m[1]),OPEN,'serviço 15:00 para barba');if(r.err)return r.err;const a=r.a;
    const sv=services().find(x=>norm(x.n)===trimFill(norm(m[2]||''))||(' '+norm(m[2]||'')+' ').includes(' '+norm(x.n)+' '));if(!sv)return 'Qual serviço? Ex.: *serviço 15:00 para barba*\n'+services().map(x=>x.n).join(' · ');
    if(sv.t>a.dur&&!DB.freeSlots(a.date,sv.t,a.id).includes(a.start))return `${sv.n} leva ${sv.t} min e não cabe às ${a.start} (o horário seguinte está ocupado).`;
    mut(['appts'],d=>{const x=d.appts.find(y=>y.id===a.id);x.svc=sv.n;x.dur=sv.t;if(!x.plan)x.price=sv.p},`${cname(a.cid)}: serviço trocado para ${sv.n} pelo WhatsApp (${short(a.date)} ${a.start})`);return `Trocado: ${a.start} · ${cname(a.cid)} agora é ${sv.n}${a.plan?'':' · '+brl(sv.p)}.`},
  resumo(p){const k=/\bmes\b/.test((p&&p.rest)||'')?'mes':/\bsemana\b/.test((p&&p.rest)||'')?'semana':'hoje';
    if(k!=='hoje'){const [a,b,lb]=range(k),L=db().appts.filter(x=>x.date>=a&&x.date<=b&&x.cid&&x.status!=='block');return `*Resumo ${lb}*\n${L.filter(x=>x.status==='done').length} atendimentos concluídos · ${L.filter(x=>x.status==='miss').length} faltas · ${L.filter(x=>x.status==='cancel').length} cancelamentos\nClientes diferentes: ${new Set(L.filter(x=>x.status==='done').map(x=>x.cid)).size}`}
    const ds=TODAY(),L=dayList(ds).filter(a=>a.status!=='block'),got=db().tx.filter(t=>t.date===ds&&t.kind!=='plano'&&t.status==='ok').reduce((s,t)=>s+t.value,0);
    return `*Resumo de hoje*\n${L.length} atendimentos · ${L.filter(a=>a.status==='done').length} concluídos · ${L.filter(a=>a.status==='miss').length} faltas${canFin()?'\nRecebido (avulso): '+brl(got):''}\nAguardando confirmação: ${L.filter(a=>a.status==='pend').length}`},
  avisar(){const a=current();if(!a)return 'Não há próximo cliente hoje.';if(a.status==='now')return `${cname(a.cid)} já está em atendimento.`;return warnNext(a)},
  responder(p,raw){const m=/^(.+?)\s*:\s*([\s\S]+)$/.exec(raw);if(!m)return 'Use dois-pontos. Ex.: *responder João: chego em 10 min*';const txt=m[2].trim(),dg=m[1].replace(/\D/g,'');
    const send=c=>{if(!c.phone)return `${c.name} não tem telefone cadastrado. Envie *tel ${first(c).toLowerCase()} 94999990000*.`;if(!DB.sendClient(c,'resposta',txt))return 'As mensagens para o cliente estão desligadas em Painel › WhatsApp.';return `Enviado para ${c.name}: "${txt}"`};
    if(dg.length>=10){const k=dg.slice(-11),c=db().clients.find(x=>x.phone&&telKey(x.phone)===k);return send(c||{name:fone(k),phone:k})}
    return withClient(norm(m[1]),send)},
  recados(p){const L=db().contacts.filter(x=>!x.done);
    if(/\b(lidos?|respondidos?|limpar)\b/.test(p.rest)){if(!L.length)return 'Não há recados pendentes.';mut(['contacts'],d=>{d.contacts.forEach(x=>x.done=true)},`${L.length} recados do site marcados como respondidos pelo WhatsApp`,'Contato');return `${L.length} ${L.length===1?'recado marcado':'recados marcados'} como respondido.`}
    return L.length?`*Recados do site (${L.length})*\n`+L.slice(0,10).map(x=>`• ${x.name} · ${fone(x.phone)}\n  "${String(x.msg||'').slice(0,120)}"`).join('\n')+'\n\nPara responder: *responder 94999990000: sua mensagem*\nDepois: *recados lidos*':'Nenhum recado do site sem resposta.'},
  desfazer(){const e=db().log.slice().reverse().find(x=>x.who===WHO&&!x.undone&&!/^Desfeito/.test(x.desc));if(!e||!DB.canUndo(e))return 'Não há comando recente para desfazer.';
    if(DB.laterSameKey(e.id))return `Não dá para desfazer "${e.desc}": a agenda mudou depois disso. Ajuste pelo painel.`;return DB.undo(e.id)?`Desfeito: ${e.desc}`:'Não consegui desfazer.'}
};
const ALIAS={hj:'hoje',amnh:'amanha',agd:'agendar',canc:'cancelar',help:'ajuda','?':'ajuda',comandos:'ajuda',prox:'proximo',proxima:'proximo',vagas:'livres',horarios:'livres',marcar:'agendar',encaixar:'encaixe',mudar:'remarcar',remarca:'remarcar',
  confirma:'confirmar',conclui:'concluir',concluido:'concluir',finalizar:'concluir',pronto:'ok',feito:'ok',terminei:'ok',falta:'faltou',cancela:'cancelar',desmarcar:'cancelar',bloqueio:'bloquear',desbloqueio:'desbloquear',
  folga:'fechar',reabrir:'abrir',ficha:'cliente',nota:'obs',telefone:'tel',pendente:'pendentes',lembrete:'lembrar',dinheiro:'caixa',faturamento:'caixa',planos:'assinantes',atrasei:'atraso',atrasado:'atraso',dia:'resumo',restantes:'fila',hist:'historico',historia:'historico',niver:'aniversariantes',aniversario:'aniversariantes',aniversarios:'aniversariantes',faltas:'faltosos',faltantes:'faltosos',libera:'liberar',sumido:'sumidos',inativos:'sumidos',sumiram:'sumidos',novatos:'novos',precos:'servicos',tabela:'servicos',avaliacao:'avaliacoes',notas:'avaliacoes',intervalo:'pausa',status:'resumo',acabou:'ok',acabei:'ok',finalizado:'ok',finalizei:'ok',terminou:'ok',desfaz:'desfazer',desfaca:'desfazer',almoco:'pausa',almocar:'pausa',responde:'responder',resposta:'responder',recado:'recados',contatos:'recados',mensagens:'recados'};

/* ===== menu "selecione uma opção" e conversas guiadas (uma pergunta de cada vez) ===== */
const MENU=[['Agendar um cliente','w:agendar'],['Próximo cliente','c:proximo'],['Concluir o atendimento atual','m:pagar'],['Agenda de hoje','c:hoje'],['Remarcar um horário','w:remarcar'],['Cancelar um horário','w:cancelar'],['Fechar a agenda','m:fechar'],['Caixa (titular)','m:caixa'],['Quem não confirmou','c:pendentes'],['Recados do site','c:recados'],['Todos os comandos','c:ajuda']];
const SUB={
  pagar:['Como o cliente pagou?',[['Pix','c:ok pix'],['Dinheiro','c:ok dinheiro'],['Débito','c:ok debito'],['Crédito','c:ok credito'],['Concluir sem registrar pagamento','c:ok']]],
  fechar:['Fechar quando?',[['Hoje, o dia todo','c:fechar hoje'],['O resto de hoje, a partir de agora','c:fechar hoje resto'],['Outro dia','w:fechar'],['Reabrir hoje','c:abrir hoje']]],
  caixa:['Caixa de qual período?',[['Hoje','c:caixa'],['Esta semana','c:caixa semana'],['Este mês','c:caixa mes']]]};
const showMenu=(title,items)=>{if(!canFin())items=items.filter(x=>x[1]!=='m:caixa');setSt({menu:items});return `${title}\n`+items.map(([n],i)=>`${i+1}. ${n}`).join('\n')+'\n\nResponda com o número.'};
const hh=t=>t.slice(3)==='00'?+t.slice(0,2)+'h':+t.slice(0,2)+'h'+t.slice(3);
const dayTxt=ds=>ds===TODAY()?'hoje':ds===iso(day0(1))?'amanhã':WDF[new Date(ds+'T00:00').getDay()]+', '+short(ds);
const YES=/^(sim|s|isso|pode|ok|confirmo|confirma|confirmado)$/,NOPE=/^(nao|n|nao quero|deixa)$/;
const svcList=()=>services().slice().sort((a,b)=>a.p-b.p);
/* cada conversa guarda o passo atual e o que já foi respondido; no fim executa a ação */
const WIZ={
  agendar:{
    start(){return ask('agendar','nome',{},'Qual o nome do cliente?')},
    nome(d,raw){const nm=trimFill(norm(raw));if(nm.length<2)return ask('agendar','nome',d,'Não entendi o nome. Qual o nome do cliente?');
      const hits=db().clients.filter(c=>norm(c.name).includes(nm)),ex=hits.filter(c=>norm(c.name)===nm),one=ex.length===1?ex[0]:hits.length===1?hits[0]:null;
      if(one)return this.gotClient(d,one);
      if(!hits.length)return ask('agendar','novo',{...d,nm:cap(raw.trim().toLowerCase())},`Não achei "${cap(raw.trim().toLowerCase())}" no cadastro. É cliente novo?\nResponda *sim* para cadastrar, ou envie outro nome.`);
      return ask('agendar','qual',{...d,opts:hits.slice(0,9).map(c=>c.id)},`Qual ${cap(nm)}?\n`+hits.slice(0,9).map((c,i)=>`${i+1}. ${c.name} · ${fone(c.phone)}`).join('\n')+'\n\nResponda com o número ou o nome completo.')},
    qual(d,raw){const n=norm(raw),c=/^\d$/.test(n)?cli(d.opts[+n-1]):d.opts.map(cli).find(x=>norm(x.name)===n)||(l=>l.length===1?l[0]:null)(d.opts.map(cli).filter(x=>norm(x.name).includes(n)));
      return c?this.gotClient(d,c):ask('agendar','qual',d,'Não identifiquei. Responda com o número da lista ou o nome completo.')},
    novo(d,raw){const n=norm(raw);if(YES.test(n))return this.askTime({...d,cid:null,name:d.nm});if(NOPE.test(n))return this.start();return this.nome(d,raw)},
    gotClient(d,c){if(DB.isBlocked(c)){setSt(null);return `${c.name} está bloqueado para agendar (${c.misses||0} faltas). Libere na ficha do cliente.`}return this.askTime({...d,cid:c.id,name:c.name})},
    askTime(d,pre){return ask('agendar','horario',d,(pre||`Ok, ${d.name}.`)+' Qual o horário? (Ex.: 15 ou 3. Outro dia: amanhã 15)')},
    horario(d,raw){const p=bare(parse(raw)),tm=p.times[0],ds=p.date||d.ds||TODAY();if(!tm)return ask('agendar','horario',d,'Não entendi o horário. Envie só a hora, como 15 ou 15:30.');
      if(closed(ds)||!db().hours[new Date(ds+'T00:00').getDay()])return ask('agendar','horario',d,`A agenda está fechada ${dayTxt(ds)}${closed(ds)?' ('+closed(ds).name+')':''}. Qual outro dia e horário?`);
      const nd={...d,ds,tm};if(d.sv)return this.finish(nd);
      return ask('agendar','servico',nd,`Certo, ${hh(tm)}${ds===TODAY()?'':' de '+dayTxt(ds)}. Qual o serviço?\nServiços disponíveis:\n`+svcList().map((s,i)=>`${i+1}. ${s.n} · ${brl(s.p)} · ${s.t} min`).join('\n')+'\n\nResponda com o número ou o nome.')},
    servico(d,raw){const n=norm(raw).replace(/\s+e\s+/g,' + ').replace(/\s*\+\s*/g,' + '),L=svcList(),sv=/^\d{1,2}$/.test(n)?L[+n-1]:L.find(s=>norm(s.n)===n)||services().find(s=>n.includes(norm(s.n)))||L.find(s=>norm(s.n).includes(n));
      return sv?this.finish({...d,sv}):ask('agendar','servico',d,'Não achei esse serviço. Responda com o número da lista ou o nome.')},
    finish(d){const {sv,ds,tm}=d;if(!DB.freeSlots(ds,sv.t).includes(tm)){const f=DB.freeSlots(ds,sv.t);
        return ask('agendar','horario',d,`${hh(tm)} não está livre ${dayTxt(ds)} para ${sv.n} (${sv.t} min).`+(f.length?`\nLivres: ${f.slice(0,10).map(hh).join(' · ')}\nQual horário?`:'\nNão há vaga nesse dia. Qual outro dia e horário?'))}
      setSt(null);let c=d.cid?cli(d.cid):null;const isNew=!c;
      if(isNew){const x=new Date();c={id:'c'+DB.uid(),name:d.name,phone:'',notes:'Cadastrado pelo WhatsApp. Falta o telefone.',blocked:false,misses:0,since:MO[x.getMonth()]+'/'+String(x.getFullYear()).slice(2)}}
      const usePlan=!isNew&&/^corte( \+ barba)?$/i.test(sv.n)&&!DB.planCheck(c.id,ds,sv.n),aid=DB.uid();
      mut(['clients','appts'],x=>{if(isNew)x.clients.push(c);x.appts.push({id:aid,date:ds,start:tm,dur:sv.t,cid:c.id,svc:sv.n,price:usePlan?0:sv.p,plan:usePlan,status:'conf',note:'',origin:'whatsapp'})},`${c.name}: ${sv.n} marcado para ${short(ds)} ${tm} pelo WhatsApp`);
      const sent=c.phone&&DB.notify('confirm',db().appts.find(x=>x.id===aid));
      return `Combinado! 👌 ${c.name} agendado para ${dayTxt(ds)} às ${hh(tm)}.\n${sv.n} · ${usePlan?'pelo plano':brl(sv.p)} · ${sv.t} min.`+(isNew?`\n\nCliente novo, sem telefone. Envie *tel ${first(c).toLowerCase()} 94999990000* para ele receber as mensagens.`:sent?'\n\nO cliente recebeu a confirmação. O link de presença sai 2 h antes.':'')}},
  cancelar:{
    start(){return ask('cancelar','quem',{},'Cancelar o horário de quem? Envie o nome do cliente ou a hora. (Ex.: João ou 15)')},
    quem(d,raw){const r=find(parse(raw),OPEN,'João ou 15');if(r.err)return ask('cancelar','quem',d,r.err.split('\n')[0]+'\nEnvie o nome ou a hora de novo, ou *sair*.');const a=r.a;
      return ask('cancelar','conf',{aid:a.id},`Cancelar ${a.svc} de ${cname(a.cid)}, ${dayTxt(a.date)} às ${hh(a.start)}?\nResponda *sim* ou *não*.`)},
    conf(d,raw){const n=norm(raw),a=db().appts.find(x=>x.id===d.aid);setSt(null);if(!YES.test(n)||!a)return 'Ok, não cancelei nada.';return exec(`cancelar ${a.start} ${short(a.date)}`)}},
  remarcar:{
    start(){return ask('remarcar','quem',{},'Remarcar o horário de quem? Envie o nome do cliente ou a hora atual. (Ex.: João ou 15)')},
    quem(d,raw){const r=find(parse(raw),OPEN,'João ou 15');if(r.err)return ask('remarcar','quem',d,r.err.split('\n')[0]+'\nEnvie o nome ou a hora de novo, ou *sair*.');const a=r.a;
      return ask('remarcar','quando',{aid:a.id},`${cname(a.cid)} está ${dayTxt(a.date)} às ${hh(a.start)} (${a.svc}).\nPara quando? (Ex.: 16, ou amanhã 10)`)},
    quando(d,raw){const a=db().appts.find(x=>x.id===d.aid);if(!a){setSt(null);return 'Esse horário não existe mais.'}const r=exec(`remarcar ${a.start} ${short(a.date)} para ${raw}`);
      if(!/^Remarcado/.test(r))return ask('remarcar','quando',d,r.split('\n')[0]+'\nQual outro dia e horário? (ou *sair*)');setSt(null);return r}},
  fechar:{
    start(){return ask('fechar','dia',{},'Fechar a agenda de qual dia? (Ex.: hoje, amanhã, 20/11)')},
    dia(d,raw){const p=parse(raw);if(!p.date)return ask('fechar','dia',d,'Não entendi o dia. Envie hoje, amanhã ou uma data como 20/11.');
      return ask('fechar','parte',{ds:p.date},`${cap(dayTxt(p.date))}: o dia todo ou a partir de que horas? (Ex.: dia todo, ou 15)`)},
    parte(d,raw){const p=bare(parse(raw));return ask('fechar','motivo',{...d,tm:p.times[0]||null},'Qual o motivo? (Ex.: feriado, folga, imprevisto)')},
    motivo(d,raw){setSt(null);return exec(`fechar ${short(d.ds)} ${d.tm?'as '+d.tm:''} ${raw.trim()}`)}}};
const ask=(w,step,d,q)=>{setSt({wiz:w,step,d});return q};
const act=code=>{const [k,v]=[code[0],code.slice(2)];return k==='w'?WIZ[v].start():k==='m'?showMenu(SUB[v][0],SUB[v][1]):exec(v)};
/* frases do dia a dia da equipe viram comandos: "joão faltou", "quem é o próximo", "quanto fiz hoje", "agenda de sexta" */
function staffNL(raw){const n=norm(raw).replace(/[?!.,]/g,' ').replace(/\s+/g,' ').trim(),r0=String(raw).trim();let m;
  /* comandos com texto livre: usa a mensagem original para manter acentos e maiúsculas */
  if((m=/^(?:manda|envia|mande|envie)\s+(?:uma\s+)?(?:mensagem|msg|recado)\s+(?:pro|pra|para|ao|à|a)\s+(?:o\s+|a\s+)?(.+)$/i.exec(r0)))return 'responder '+(m[1].includes(':')?m[1]:m[1].replace(/^(\S+)\s+(?:que\s+|dizendo\s+)?/,'$1: '));
  if((m=/^(?:anota|anote|registra|salva)\s+(?:que\s+)?(?:o\s+|a\s+)?(\S+)\s+(.+)$/i.exec(r0))&&!/^(numero|número|telefone|whats|zap)$/i.test(m[1]))return 'obs '+m[1]+': '+m[2];
  if((m=/^(?:salva|cadastra|anota|guarda|registra)\s+(?:o\s+)?(?:numero|número|telefone|whats|zap)\s+(?:d[oae]\s+)?(.+)$/i.exec(r0)))return 'tel '+m[1];
  if((m=/^(?:o\s+|a\s+)?(?:cliente\s+)?pagou\s+(?:no|na|em|com|de|via)?\s*(pix|dinheiro|debito|credito|cartao)/.exec(n)))return 'ok '+(m[1]==='cartao'?'credito':m[1]);
  if(/^((o |a )?(cliente|ele|ela) (nao veio|faltou|furou)|ninguem veio|nao veio ninguem)$/.test(n))return 'faltou';
  if(/^(o |a )?(proximo|cliente) (ja )?(chegou|ta aqui|esta aqui)$/.test(n))return 'chegou';
  if((m=/^(?:joga|passa|muda|move|empurra|troca)\s+(?:o |a )?(.+?)\s+(?:pra|para|pro)\s+(.+)$/.exec(n))&&!/servico/.test(n))return 'remarcar '+m[1]+' para '+m[2];
  if(/\b(livre|livres|vaga|vagas)\b/.test(n)&&!/^livres\b/.test(n))return 'livres '+n.replace(/\b(quais|qual|tem|que|horarios?|livres?|vagas?|ha|existe|os|as)\b/g,' ').replace(/\s+/g,' ').trim();
  if((m=/^(?:vou )?folgar (.+)$/.exec(n)))return 'fechar '+m[1]+' folga';
  if((m=/^(.+?) nao vou (?:trabalhar|abrir|atender)$/.exec(n))||(m=/^nao vou (?:trabalhar|abrir|atender) (.+)$/.exec(n)))return 'fechar '+m[1];
  if((m=/^(?:abre|abrir|reabre|reabrir|libera)\s+(?:a\s+)?agenda\s+(?:de |do |da )?(.+)$/.exec(n)))return 'abrir '+m[1];
  if(/^(vou )?(almocar|almoco|sair pro almoco|parar pro almoco)( agora)?$/.test(n))return 'pausa almoco';
  if(/^quem (ainda )?nao confirmou$|^(quem falta|faltam) confirmar$/.test(n))return 'pendentes';
  if(/^(manda|envia|mande|envie|dispara) (o |os )?lembretes?( pra quem falta)?$/.test(n))return 'lembrar';
  if((m=/^quant[oa]s (clientes|atendimentos|cortes)( hoje)?( (essa|esta|na) semana| (esse|este|no) mes)?$/.exec(n)))return 'resumo '+(m[3]?(/semana/.test(m[3])?'semana':'mes'):'');
  if(/^((quem sao|lista|lista de|lista dos) (os )?)?assinantes$/.test(n))return 'assinantes';
  if(/^(tira|remove|apaga|desliga|tirar) (o )?aviso( do site)?$/.test(n))return 'aviso off';
  if(/^(volta|desfaz|desfazer) (o |a )?ultim[oa]( comando| coisa)?$/.test(n))return 'desfazer';
  if(/^(quem (e|eh|é) o proximo|quem vem agora|quem e agora|quem ta na cadeira|proximo cliente|quem e o cliente agora)$/.test(n))return 'proximo';
  if(/^(quem falta( hoje)?|quem ainda vem( hoje)?|quantos faltam( hoje)?|fila( de hoje)?|quem vem hoje)$/.test(n))return 'fila';
  if(/^(como (ta|esta) (a agenda|o dia)( hoje)?|o que tem (pra )?hoje|resumo do dia|como foi (o dia|hoje))$/.test(n))return 'resumo';
  if(/^(quanto (eu )?(fiz|faturei|entrou|ganhei)|quanto deu)( hoje)?$/.test(n))return 'caixa';
  if(/^(quanto (eu )?(fiz|faturei|entrou|ganhei)|quanto deu) (essa|esta|na) semana$/.test(n))return 'caixa semana';
  if(/^(quanto (eu )?(fiz|faturei|entrou|ganhei)|quanto deu) (esse|este|no) mes$/.test(n))return 'caixa mes';
  if((m=/^(?:o |a )?(.+?) (faltou|nao veio|furou|chegou|veio|ta aqui|esta aqui|cancelou|desmarcou)$/.exec(n))&&!CMD[m[1].split(' ')[0]])return ({faltou:'faltou',furou:'faltou','nao veio':'faltou',chegou:'chegou',veio:'chegou','ta aqui':'chegou','esta aqui':'chegou',cancelou:'cancelar',desmarcou:'cancelar'})[m[2]]+' '+m[1];
  if((m=/^(?:tem )?(?:vaga|vagas|horario livre|horarios livres)\s*(.*)$/.exec(n)))return 'livres '+m[1];
  if((m=/^(?:marca|marque|agenda|agende|bota|coloca)\s+(?:o |a |um |uma )?(.+)$/.exec(n))&&(parse(m[1]).times.length||/\d/.test(m[1])))return 'agendar '+m[1];
  if((m=/^(?:vou (?:dar|fazer) uma )?pausa(?: de)? ?(\d{1,3})?(?: ?min\w*)?$/.exec(n)))return 'pausa '+(m[1]||'');
  if((m=/^(?:troca|trocar|muda|mudar) (?:o )?servico (?:d[eao]s? )?(.+)$/.exec(n)))return 'servico '+m[1];
  if(/^(agenda )?(de |da |do )?(hoje|amanha|segunda|terca|quarta|quinta|sexta|sabado|domingo|dia \d{1,2}|\d{1,2}\/\d{1,2})( feira)?$/.test(n)&&!CMD[n])return 'agenda '+n.replace(/^agenda /,'');
  return null}
function exec(raw){{const nl=staffNL(raw);if(nl)raw=nl}const n=norm(raw),w=n.split(/\s+/)[0],k=CMD[w]?w:ALIAS[w],rest=raw.replace(/^\S+\s*/,'');
  const g=k||guess(w);
  if(!g)return /^(obrigad\w*|valeu|vlw|show|blz|beleza|top)$/.test(n)?'Por nada!':/^(sim|s|nao|n|ok)$/.test(n)?'Não há nada aguardando resposta. Envie *menu* para escolher uma opção.':`Não entendi "${raw}".
Envie *menu* para escolher uma opção ou *ajuda* para ver os comandos.`;
  try{return CMD[g](parse(rest),rest)}catch(e){return 'Não consegui fazer isso agora. Tente de novo.'}}
/* distância de edição, para entender comando com erro de digitação ("agendr", "proxmo") */
const lev=(a,b)=>{const d=Array.from({length:a.length+1},(_,i)=>[i]);for(let j=1;j<=b.length;j++)d[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[a.length][b.length]};
const guess=w=>{if(w.length<4)return null;const all=[...Object.keys(CMD),...Object.keys(ALIAS)],lim=w.length>=7?2:1,hit=all.map(k=>[k,lev(w,k)]).filter(x=>x[1]<=lim).sort((x,y)=>x[1]-y[1]||y[0].length-x[0].length)[0];return hit?(CMD[hit[0]]?hit[0]:ALIAS[hit[0]]):null};

/* ===== quem escreve e não é da equipe: respostas objetivas, sem mexer na agenda de outros clientes ===== */
const telKey=x=>String(x||'').replace(/\D/g,'').slice(-11);
/* respostas ao cliente terminam com "0. Voltar ao menu", exceto quando a própria resposta já é uma lista de opções */
/* escrita de WhatsApp: abreviações e erros comuns viram a palavra certa antes de interpretar ("vc", "qnt", "orario", "cansela") */
const ABBR={vc:'voce',vcs:'voces',pq:'porque',pqp:'',qnt:'quanto',qnto:'quanto',qto:'quanto',qt:'quanto',qndo:'quando',qd:'quando',obg:'obrigado',obgd:'obrigado',obgda:'obrigada',vlw:'valeu',hj:'hoje',amnh:'amanha',tbm:'tambem',tb:'tambem',td:'tudo',msg:'mensagem',oq:'o que',q:'que',ñ:'nao',nn:'nao',naum:'nao',eh:'e',ta:'esta',to:'estou',pfv:'por favor',pf:'por favor',pls:'por favor',agd:'agendar',cmg:'comigo',ctg:'contigo',blz:'beleza',flw:'falou',sab:'sabado',dom:'domingo',seg:'segunda',qua:'quarta',qui:'quinta',sex:'sexta',end:'endereco',hr:'horario',hrs:'horarios',min:'minutos'};
const VOCAB='agendar agendamento marcar horario horarios cancelar cancela cancelamento desmarcar desmarca apagar excluir remarcar endereco localizacao preco precos valor valores plano planos assinatura assinar pagamento pagar obrigado obrigada elogio elogiar reclamacao reclamar sugestao sugerir barbeiro funcionamento funciona aberto fechado fotos instagram galeria infantil crianca codigo dados cadastro atrasado atrasar atraso confirmar confirmo mensalidade cartao dinheiro parcelar emprego curriculo parceria demora quanto tempo sabado domingo segunda terca quarta quinta sexta amanha hoje corte cortar barba sobrancelha pigmentacao hidratacao selagem acabamento lavagem cavanhaque disponivel vaga vagas atendimento atendente'.split(' ');
/* palavras comuns que parecem com o vocabulário mas não devem ser trocadas ("quando" não vira "quanto") */
const KEEP=new Set('agenda agendas quando quanto quantos quanta quantas queria quero gostaria preciso precisa precisava consigo consegue depois antes agora ainda sempre semana cabelo cabeleireiro barbearia cliente numero minutos mensagem pessoa pessoas primeira primeiro marcado marcou marquei cancelado cancelei cancelou remarcado remarquei confirmado confirmei obrigada amanha horrivel ontem tarde noite manha domingo sabado tambem nenhum nenhuma alguem alguma algum melhor pior passado proximo proxima voces porque comigo contigo mesmo verdade pagando pagou paguei atendeu atende atender atendem chegando chegou cheguei funciona funcionam aberto abrem fechado fecham demorou demora corte cortes cortar cortou barba barbas'.split(' '));
function fixText(n){return n.split(/\s+/).map(w=>{const b=w.replace(/[^a-z0-9ñ]/g,''),p=w.slice(b.length&&w.indexOf(b)>=0?w.indexOf(b)+b.length:w.length);if(!b)return w;if(ABBR[b]!==undefined)return ABBR[b]+p;
  if(b.length<6||/\d/.test(b)||VOCAB.includes(b)||KEEP.has(b))return w;const lim=1;let best=null,bd=9;VOCAB.forEach(v=>{if(v.length<6||Math.abs(v.length-b.length)>lim)return;const d=lev(b,v);if(d<bd){bd=d;best=v}});return bd<=lim?best+p:w}).join(' ').replace(/\s+/g,' ').trim()}
function clientBot(raw,n,from){n=fixText(n);const r=clientCore(raw,n,from);return /Responda com o número[^\n]*$|Responda \*sim\* ou \*não\*\.?$|\n\d{1,2}\. [^\n]+$/.test(r)?r:r+'\n\n0. Voltar ao menu'}
/* dúvida que bate com uma pergunta do FAQ do site (editável no painel) recebe a resposta de lá */
const STOPW=new Set('como para pelo pela voce voces posso pode podem tenho minha meu qual quais quando onde porque sobre fazer esta isso essa esse esses umas uns dos das com sem mais muito tambem gostaria queria saber'.split(' '));
const toks=x=>norm(x).replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>=4&&!STOPW.has(w)).map(w=>w.slice(0,5));
function faqHit(n){const q=[...new Set(toks(n))];if(!q.length)return null;let best=null,bs=0;
  db().faq.forEach(f=>{const T=new Set(toks(f.q+' '+f.a)),sc=q.filter(w=>T.has(w)).length;if(sc>bs){bs=sc;best=f}});
  return best&&(bs>=2||(bs===1&&q.length<=2))?best.a.replace(/\{prazo_cancelamento\}/g,DB.cancelText()):null}
function clientCore(raw,n,from){
  const SYN=[[/raspar|zerar|maquina zero|cabelo grande|cabeludo/,'corte'],[/combo/,'combo'],[/degrade|fade|disfarcad|navalhad|social|tesoura|maquina|corte americano|moicano|undercut|cacheado|crespo|black power|taper/,'corte'],[/pezinho|contorno/,'acabamento'],[/bigode/,'barba'],[/pigment/,'pigmentacao'],[/hidrat/,'hidratacao'],[/lavar/,'lavagem']];
  const svcIn=x=>{const q=' '+norm(x).replace(/\s*\+\s*/g,' e ').replace(/\s+/g,' ')+' ',key=s0=>' '+norm(s0).replace(/\s*\+\s*/g,' e ')+' ';
    const L=services().map(s0=>db().services.find(y=>y.n===s0.n)||{...s0,d:''}).sort((a,b)=>b.n.length-a.n.length);
    let hit=L.find(s0=>q.includes(key(s0.n)));if(hit)return hit;const h=SYN.find(([re])=>re.test(q));if(h){hit=db().services.find(y=>y.on&&norm(y.n).startsWith(h[1]));if(hit)return hit}
    return db().services.filter(y=>y.on).find(y=>norm(y.n).split(/[^a-z]+/).some(w=>w.length>=6&&q.includes(' '+w+' ')))||null};
  const key=telKey(from),c=db().clients.find(x=>x.phone&&telKey(x.phone)===key)||null;CUR='c'+key;const st=getSt();setSt(null);
  const site=DB.site(),t=TODAY(),up=c?db().appts.filter(a=>a.cid===c.id&&OPEN.includes(a.status)&&a.date>=t).sort((a,b)=>(a.date+a.start).localeCompare(b.date+b.start)):[];
  const when=a=>`${a.svc}, ${dayTxt(a.date)} às ${hh(a.start)}`,mins=a=>(new Date(a.date+'T'+a.start+':00')-Date.now())/6e4,lim=db().settings.cancelUntil??120;
  const tell=(ev,txt)=>DB.notifyStaff(ev,txt),who=c?c.name:'Número '+fone(key);
  /* recado para a equipe com o atalho de resposta pelo robô */
  const tellC=txt=>tell('evContact',txt+`\nPara responder: *responder ${c?first(c).toLowerCase():key}: sua mensagem*`);
  /* última mensagem que o robô mandou para este número (até 3 dias): dá contexto a respostas curtas como "sim", "não" ou uma nota */
  const last=db().outbox.filter(o=>o.to==='client'&&telKey(o.phone)===key&&(o.at||o.t)<=Date.now()).sort((x,y)=>(y.at||y.t)-(x.at||x.t))[0],ctx=last&&Date.now()-(last.at||last.t)<3*864e5?last.kind:null;
  const hi=c?`Olá, ${first(c)}! 👋 Aqui é o assistente da Farias Barbearia.`:(db().messages.welcome||{}).txt?db().messages.welcome.txt.replace(/\{site\}/g,site):'Olá! 👋 Aqui é o assistente da Farias Barbearia.';
  /* já conversou nas últimas 12 h: "oi" de novo mostra só as opções, sem repetir as boas-vindas */
  const greeted=(db().convos||[]).some(x=>x.role==='cliente'&&x.num===key&&Date.now()-x.t<12*36e5);
  const menu=pre=>{setSt({cmenu:1});INT=INT||'menu';const head=pre||(greeted?'':hi);return `${head?head+'\n\n':''}Como posso ajudar?\n1. Agendar um horário\n2. Meus horários\n3. Remarcar ou cancelar\n4. Preços e planos\n5. Horário e endereço\n6. Falar com o barbeiro\n7. Fotos dos trabalhos\n\nResponda com o número.`};
  const A={
    agendar(){const p=parse(n),per=periodOf(n),bd=bound(n),tm=p.times[0],exact=tm&&!bd?tm:null,go=`\nPara agendar: ${site}agendar.html`;
      if(/\b(agora|daqui a pouco|ainda hoje|hoje ainda|ja ja)\b/.test(n)&&!p.date)p.date=t;
      /* "qualquer horário", "o primeiro livre": responde direto com a próxima vaga */
      if(/\b(proximo|primeiro|mais cedo|qualquer|preferencia|tanto faz)\b/.test(n)&&!p.date&&!tm&&!per){for(let i=0;i<7;i++){const ds=iso(day0(i)),f=DB.freeSlots(ds,45);if(f.length)return `O próximo horário livre é ${dayTxt(ds)} às ${hh(f[0])}. 😉\n\n`+CB.svc({ds,tm:f[0],sv:(svcIn(n)||{}).n})}return `Sem vagas nos próximos 7 dias.\nPara ver todos os horários: ${site}horarios.html`}
      /* "e de tarde?" depois de perguntar de um dia: continua no mesmo dia */
      const pd=p.date||(st&&st.cdate&&(per||tm)?st.cdate:null);
      if(pd||tm||per){const opn=ds=>!closed(ds)&&db().hours[new Date(ds+'T00:00').getDay()];
        const ok=x=>{const m=DB.toMin(x);if(per&&(m<per[0]||m>=per[1]))return false;if(tm&&bd==='after'&&x<tm)return false;if(tm&&bd==='before'&&x>=tm)return false;return true};
        const lbl=(per?' '+per[2]:'')+(tm&&bd?(bd==='after'?' depois das ':' antes das ')+hh(tm):'');
        if(pd&&!opn(pd))return `Não abrimos ${dayTxt(pd)}${closed(pd)?' ('+closed(pd).name+')':''}.\nPara ver outros dias: ${site}horarios.html`;
        for(const ds of pd?[pd]:Array.from({length:7},(_,i)=>iso(day0(i)))){if(!opn(ds))continue;const f=DB.freeSlots(ds,45);
          if(exact){if(f.includes(exact))return `${hh(exact)} ${dayTxt(ds)} está livre! 😉\n\n`+CB.svc({ds,tm:exact,sv:(svcIn(n)||{}).n});if(pd){const g=f.filter(ok);setSt({cdate:ds});return `${hh(exact)} ${dayTxt(ds)} não está livre.`+(f.length?` Livres: ${f.slice(0,6).map(hh).join(' · ')}`:'')+go}continue}
          const g=f.filter(ok);if(g.length)return CB.hora({ds,slots:g.slice(0,9),lbl,sv:(svcIn(n)||{}).n})
          if(pd){setSt({cdate:ds});return `Sem vagas ${dayTxt(ds)}${lbl}.`+(f.length?` Livres no dia: ${f.slice(0,6).map(hh).join(' · ')}`:'')+go}}
        return `Sem vagas${lbl} nos próximos 7 dias.\nPara ver todos os horários: ${site}horarios.html`}
      let free='';for(let i=0;i<7&&!free;i++){const ds=iso(day0(i)),f=DB.freeSlots(ds,45);if(f.length)free=`\nPróximas vagas (${dayTxt(ds)}): ${f.slice(0,5).map(hh).join(' · ')}`}
      if(!free)return `Não há vagas nos próximos 7 dias.\nPara ver todos os horários: ${site}horarios.html`;const sv0=(svcIn(n)||{}).n;
      return /(agendar|marcar|marca|agenda pra|me agenda|quero cortar|preciso cortar)/.test(n)?'Vamos agendar! 😉\n\n'+CB.start({sv:sv0}):CB.dia({sv:sv0,avail:1})},
    meus(){return up.length?(up.length===1?`Você está marcado para ${dayTxt(up[0].date)} às ${hh(up[0].start)} · ${up[0].svc}${up[0].status==='pend'?' (falta confirmar)':' (confirmado 👍)'}.`:`Você tem ${up.length} horários marcados:\n`+up.map(a=>`• ${cap(dayTxt(a.date))} às ${hh(a.start)} · ${a.svc}${a.status==='pend'?' (falta confirmar)':''}`).join('\n'))+`\n\nPara confirmar, remarcar ou cancelar: ${DB.link(up[0])}`:`Você não tem horário marcado${c?'':' neste número'}.\nPara agendar: ${site}agendar.html`},
    confirmar(){const a=up.find(x=>x.status==='pend');if(!a)return up.length?`Seu horário já está confirmado: ${when(up[0])}. Até lá! 👍`:A.meus();
      mut(['appts'],d=>{d.appts.find(x=>x.id===a.id).status='conf'},`${c.name}: presença confirmada pelo WhatsApp (${short(a.date)} ${a.start})`);tell('evConfirm',`Presença confirmada: ${c.name} · ${a.svc} · ${short(a.date)} às ${a.start}.`);
      return `Presença confirmada: ${when(a)}. Até lá! 👍`},
    cancelar(){if(!up.length)return A.meus();const a=up[0];
      if(mins(a)<lim){tell('evContact',`${c.name} quer cancelar ${a.svc} de ${short(a.date)} às ${a.start}, mas já passou do prazo. Fale com ele.`);return `Faltam menos de ${DB.cancelText()} para ${when(a)}, então não consigo cancelar por aqui. Já avisei o barbeiro, ele fala com você.`}
      setSt({ccancel:a.id});return `Cancelar ${when(a)}?\nResponda *sim* ou *não*.`+(up.length>1?`\n\nSeus outros horários: ${DB.link(up[1])}`:'')},
    remarcarLink(){return up.length?`Para remarcar ${when(up[0])}, escolha o novo dia e horário por aqui:\n${DB.link(up[0])}`:A.meus()},
    atraso(){const a=up.find(x=>x.date===t);tellC(`${who} avisou atraso: "${raw.slice(0,140)}"${a?' (horário das '+a.start+')':''}`);const tol=db().settings.tolerance;
      return `Avisei o barbeiro.`+(tol?` A tolerância é de ${tol} minutos; depois disso o horário pode ser liberado.`:'')},
    precos(){const sv=svcIn(nn);if(sv)return `${sv.n}: ${brl(sv.p)} · ${sv.t} min.\nPara agendar: ${site}agendar.html\nTabela completa: envie *preços*.`;
      const L=db().services.filter(s=>s.on).sort((x,y)=>x.p-y.p);return `Nossos preços:\n`+L.map(s=>`• ${s.n}: ${brl(s.p)}`).join('\n')+`\n\nNo plano mensal o corte sai por R$ 0. Planos a partir de ${brl(Math.min(...db().plans.filter(x=>x.on).map(x=>x.p)))}/mês: ${site}index.html#planos`},
    planos(){const s=c&&DB.activeSub(c.id);if(s)return `Seu plano: ${DB.plan(s.plan).n} · ${({ok:'em dia',late:'pagamento pendente',paused:'pausado'})[s.status]}.`+(s.cancelAt?`\nVale até ${short(s.cancelAt)} (cancelamento agendado).`:s.paidUntil?`\nPago até ${short(s.paidUntil)}.`:'')+`\nPara ver, trocar ou regularizar: ${site}entrar.html`;
      return `Planos mensais:\n`+db().plans.filter(x=>x.on).map(x=>`• ${x.n}: ${brl(x.p)}/mês`).join('\n')+`\n\nPara assinar: ${site}index.html#planos`},
    funcionamento(){const H=db().hours,d=day0().getDay(),cl=closed(t),ord=[1,2,3,4,5,6,0],pd=parse(n).date;
      if(/\bferiado/.test(n)){const L=db().holidays.filter(h=>h.date>=t).sort((a,b)=>a.date.localeCompare(b.date)).slice(0,6);return L.length?'Nos feriados ficamos fechados. Próximos dias fechados:\n'+L.map(h=>`• ${short(h.date)} · ${h.name}`).join('\n'):'Nenhum feriado fechado marcado por enquanto. Nos outros dias, o horário é o normal.'}
      if(/\bagora\b/.test(n)&&!pd){const h=!cl&&H[d],nw=nowHM();return h&&nw>=h[0]&&nw<h[1]?`Estamos abertos agora, até as ${h[1]}. 👍`:`Agora estamos fechados.`+(h&&nw<h[0]?` Hoje abrimos às ${h[0]}.`:'')+`\nPara ver os horários: ${site}horarios.html`}
      /* perguntou de um dia ("abre sábado?", "amanhã abre?"): responde só aquele dia */
      if(pd){const w=new Date(pd+'T00:00').getDay(),h=closed(pd);return h?`${cap(dayTxt(pd))} estamos fechados (${h.name}).`:H[w]?`${cap(dayTxt(pd))} abrimos das ${H[w][0]} às ${H[w][1]}.`:`${cap(dayTxt(pd))} não abrimos.`}
      return `Horário de funcionamento:\n`+ord.map(k=>`• ${cap(WDF[k])}: ${H[k]?H[k][0]+' às '+H[k][1]:'fechado'}`).join('\n')+`\n\nHoje: ${cl?'fechado ('+cl.name+')':H[d]?'aberto das '+H[d][0]+' às '+H[d][1]:'fechado'}.\nEndereço: ${db().content.address}`},
    endereco(){return `Estamos em: ${db().content.address}\nMapa: https://maps.google.com/?q=${encodeURIComponent(db().content.address)}`},
    pagamento(){return `O atendimento avulso é pago na barbearia: Pix, dinheiro, débito ou crédito.\nA mensalidade do plano é cobrada automaticamente; para regularizar: ${site}entrar.html`},
    humano(){tellC(`${who} pediu para falar com você: "${raw.slice(0,160)}"`);return 'Avisei o barbeiro. 👍 Ele responde assim que terminar o atendimento.'},
    gerirPlano(){const s=c&&DB.activeSub(c.id);if(!s)return `Não encontrei plano ativo neste número.\nPara conhecer os planos: ${site}index.html#planos`;
      return `Seu plano: ${DB.plan(s.plan).n}.\nPara trocar ou cancelar, entre na sua área: ${site}entrar.html\nO cancelamento vale no fim do mês já pago, e os benefícios continuam até lá.`},
    paguei(){const s=c&&DB.activeSub(c.id);tellC(`${who} diz que já pagou${s?' o plano '+DB.plan(s.plan).n+(s.status==='late'?' (consta pendente)':''):''}. Confira o pagamento.`);
      return 'Obrigado! Avisei o barbeiro para conferir o pagamento. Se tiver o comprovante, pode mandar aqui mesmo.'},
    codigo(){if(has(/ (nao pedi|nao fui eu|nao solicitei|quem pediu|nao reconheco) /)){tell('evContact',`${who} recebeu um código de acesso que diz não ter pedido.`);
        return 'Pode ignorar: sem o código ninguém entra na sua conta. Nunca passe o código para ninguém, nem para a gente.'}
      return `O código chega aqui no WhatsApp quando você entra pelo site: ${site}entrar.html\nNão chegou? Na tela do código, toque em "Reenviar". Nunca passe o código para ninguém.`},
    dados(){tellC(`${who} pediu a exclusão dos dados pessoais. Responder em até 15 dias.`);
      return `Pedido registrado. O responsável pela barbearia vai confirmar que o número é seu e responder em até 15 dias. Horários futuros serão cancelados.\nComo tratamos seus dados: ${site}privacidade.html`},
    meusdados(){if(!c)return 'Não encontrei cadastro neste número.';return `Seu cadastro:\nNome: ${c.name}\nWhatsApp: ${fone(c.phone)}${c.bairro?'\nBairro: '+c.bairro:''}${c.birth?'\nNascimento: '+c.birth.split('-').reverse().join('/'):''}\n\nPara corrigir algo, responda aqui o que mudou que eu repasso para o barbeiro.`},
    elogio(){tell('evContact',`Elogio de ${who}: "${raw.slice(0,200)}"`);return 'Que bom ler isso! 😁 Obrigado, vou repassar para o barbeiro.'},
    sugestao(){tellC(`Sugestão de ${who}: "${raw.slice(0,200)}"`);return 'Obrigado pela sugestão! 👊 Repassei para o barbeiro.'},
    /* "quero fazer um elogio" sem dizer qual: o robô pede o texto e repassa a próxima mensagem */
    pedeTexto(k){setSt({cnote:k});return {elogio:'Que bom! Pode escrever o elogio aqui que eu repasso para o barbeiro.',reclamacao:'Sinto muito. Conte aqui o que aconteceu que eu repasso para o barbeiro.',sugestao:'Pode mandar a sugestão aqui que eu repasso para o barbeiro.'}[k]},
    reclamacao(){tellC(`Reclamação de ${who}: "${raw.slice(0,200)}"`);return 'Sinto muito por isso. Já repassei para o barbeiro, ele vai falar com você.'},
    infantil(){const sv=db().services.find(x=>x.on&&/infantil|crianca/.test(norm(x.n)));if(sv)return `${sv.n}: ${brl(sv.p)} · ${sv.t} min.\nPara agendar: ${site}agendar.html`;return A.outro('corte infantil')},
    duracao(){const sv=svcIn(nn);if(sv)return `${sv.n} leva cerca de ${sv.t} minutos.`;const L=db().services.filter(x=>x.on).sort((x,y)=>x.t-y.t);return `Tempo de cada serviço:\n`+L.map(x=>`• ${x.n}: ${x.t} min`).join('\n')},
    emprego(){tellC(`${who} quer trabalhar na barbearia: "${raw.slice(0,200)}"`);return 'Obrigado pelo interesse! Repassei sua mensagem para o responsável.'},
    parceria(){tellC(`Proposta comercial de ${who}: "${raw.slice(0,200)}"`);return 'Obrigado! Repassei sua proposta para o responsável.'},
    faq(){return faqHit(n)},
    quem(){const T=db().team.filter(u=>u.active&&['admin','barbeiro'].includes(u.role)).map(u=>u.name);return `Quem atende: ${T.length?T.join(', '):'o Farias'}.\nPara agendar: ${site}agendar.html`},
    antecedencia(){const m=db().settings.minAdv||0;return m?`Dá para agendar até ${m>=60?m/60+' h':m+' min'} antes do horário, se a vaga estiver livre.\nPara agendar: ${site}agendar.html`:`Dá para agendar até em cima da hora, se a vaga estiver livre.\nPara agendar: ${site}agendar.html`},
    prazo(){return `Você pode cancelar ou remarcar até ${DB.cancelText()} antes do horário, sem custo, pelo link que chega no WhatsApp ou por aqui. A remarcação pode ser feita 1 vez a cada 2 h.`+(up.length?`\nSeu próximo horário: ${DB.link(up[0])}`:'')},
    tolerancia(){const t0=db().settings.tolerance;return t0?`A tolerância de atraso é de ${t0} minutos. Depois disso o horário pode ser liberado.`:'Avise se for atrasar, que eu repasso para o barbeiro.'},
    falta(){const l=db().settings.noShow||99;return `Se faltar sem avisar, a falta fica registrada.`+(l<99?` Com ${l} faltas, o agendamento pelo site fica bloqueado até falar com o barbeiro.`:'')+' Se não puder ir, cancele pelo link do WhatsApp.'},
    bloqueado(){if(c&&DB.isBlocked(c)){tellC(`${who} está bloqueado para agendar (${c.misses||0} faltas) e pediu ajuda.`);return `Seu agendamento pelo site está bloqueado por faltas (${c.misses||0}). Avisei o barbeiro para falar com você.`}
      tellC(`${who} relatou problema para agendar pelo site: "${raw.slice(0,160)}"`);return `Tente por aqui: ${site}agendar.html\nSe der erro de novo, me diga o que aparece na tela. Já avisei o barbeiro.`},
    contato(){const C=db().content;return `WhatsApp: ${C.phone}\nEndereço: ${C.address}\nPor aqui eu respondo na hora. Para falar com o barbeiro, envie *barbeiro*.`},
    uso(){const s=c&&DB.activeSub(c.id);if(!s)return `Não encontrei plano ativo neste número.\nPlanos: ${site}index.html#planos`;const pl=DB.plan(s.plan),q=DB.quota(pl),u=DB.usage(c.id,t.slice(0,7));
      return `Plano ${pl.n}, este mês: `+(q?`${u.corte} de ${q.corte} cortes${q.barba?` e ${u.barba} de ${q.barba} barbas`:''}`:`${u.total} ${u.total===1?'atendimento':'atendimentos'} (ilimitado)`)+`.\nVale ${pl.days.map(x=>WD[x]).join(', ')}.\nPróxima cobrança: ${short(DB.nextBill(s))}.`},
    vencimento(){const s=c&&DB.activeSub(c.id);if(!s)return `Não encontrei plano ativo neste número.\nPlanos: ${site}index.html#planos`;
      return s.cancelAt?`Seu plano termina em ${short(s.cancelAt)} (cancelamento agendado).`:`${s.paidUntil?`Pago até ${short(s.paidUntil)}. `:''}Próxima cobrança: ${short(DB.nextBill(s))}, por ${s.method}.`},
    cheguei(){const a=up.find(x=>x.date===t);tell('evContact',`${who} avisou que chegou${a?' (horário das '+a.start+')':''}.`);return a?'Avisei que você chegou. Já já te chamam.':'Avisei o barbeiro que você chegou.'},
    oQueE(){const sv=svcIn(nn);return sv?`${sv.n}${sv.d?' ('+sv.d.toLowerCase()+')':''}: ${brl(sv.p)} · ${sv.t} min.\nPara agendar: ${site}agendar.html`:null},
    lembrete(){return 'Você recebe a confirmação ao marcar e, 2 h antes, uma mensagem com o link para confirmar presença, remarcar ou cancelar.'},
    trocarNumero(){tellC(`${who} quer trocar o número de WhatsApp do cadastro: "${raw.slice(0,160)}"`);return 'Avisei o barbeiro para atualizar o seu cadastro. Se ainda não enviou, mande aqui o número novo com DDD.'},
    promo(){const L=db().plans.filter(x=>x.on);return `A forma de economizar é o plano mensal:\n`+L.map(x=>`• ${x.n}: ${brl(x.p)}/mês`).join('\n')+`\nDetalhes: ${site}index.html#planos`},
    outro(tema){tellC(`${who} perguntou sobre ${tema}: "${raw.slice(0,160)}"`);return 'Vou confirmar com o barbeiro e ele te responde por aqui.'},
    robo(){return 'Sou o assistente automático da Farias Barbearia. Respondo na hora sobre horários, preços e planos. Para falar com o barbeiro, envie *barbeiro*.'},
    papo(){return menu('Tudo certo por aqui! 😁')},
    movimento(){const f=DB.freeSlots(t,30),best=Array.from({length:7},(_,i)=>iso(day0(i))).filter(ds=>!closed(ds)&&db().hours[new Date(ds+'T00:00').getDay()]).map(ds=>[ds,DB.freeSlots(ds,30).length]).sort((a,b)=>b[1]-a[1])[0];
      return `Aqui é com hora marcada, sem fila: você chega e é atendido no seu horário.\n`+(f.length?`Hoje ainda há ${f.length} horários livres, o próximo às ${hh(f[0])}.`:'Hoje não há mais horários livres.')+(best?`\nO dia com mais vagas nesta semana é ${dayTxt(best[0])}.`:'')+`\nPara agendar: ${site}agendar.html`},
    caminho(){const a=up.find(x=>x.date===t);tell('evContact',`${who} está a caminho${a?' (horário das '+a.start+')':''}.`);return 'Beleza, avisei o barbeiro. Até já! 🤙'},
    combo(){const L=db().services.filter(x=>x.on&&(/\+|combo/i.test(x.n)));return L.length?'Combos:\n'+L.map(x=>`• ${x.n}: ${brl(x.p)} · ${x.t} min`).join('\n')+`\nNo agendamento você também pode escolher mais de um serviço: ${site}agendar.html`:`No agendamento você pode escolher mais de um serviço juntos: ${site}agendar.html`},
    fazem(){const sv=svcIn(nn);
      if(sv)return `Fazemos, sim! 😎 ${sv.n} · ${brl(sv.p)} · ${sv.t} min.\nPara agendar: ${site}agendar.html`;return null},
    despedida(){return 'Até mais! 🤙'},
    ack(){return st&&st.cdate?`Combinado! 👌 Para garantir o horário, agende por aqui: ${site}agendar.html`:'Combinado! 👌'},
    espera(){tellC(`${who} quer entrar na lista de espera: "${raw.slice(0,160)}"`);return `As vagas que abrem aparecem na hora no site: ${site}horarios.html\nTambém avisei o barbeiro que você quer um encaixe.`},
    desistiu(){return 'Tudo bem! Se precisar, é só chamar.'},
    optout(){if(c){mut(['clients'],d=>{const x=d.clients.find(y=>y.id===c.id);x.optout=true},`${c.name}: pediu para não receber mensagens automáticas`,'Clientes')}tell('evContact',`${who} pediu para não receber mais mensagens automáticas.`);
      return 'Pronto, você não vai mais receber mensagens automáticas. 👌 Se agendar de novo e quiser os lembretes, envie *voltar a receber*.'},
    optin(){if(c){mut(['clients'],d=>{const x=d.clients.find(y=>y.id===c.id);x.optout=false},`${c.name}: voltou a receber mensagens automáticas`,'Clientes')}return 'Pronto, você volta a receber a confirmação e os lembretes dos seus horários.'},
    login(){return `Para entrar: ${site}entrar.html\nDigite seu WhatsApp e o código que chega aqui. Não precisa de senha.`},
    siteLink(){return `Nosso site: ${site}\nPara agendar: ${site}agendar.html`},
    semMarcar(){const f=DB.freeSlots(t,30);return `O atendimento é com hora marcada, para você não esperar.`+(f.length?` Hoje o próximo horário livre é às ${hh(f[0])}.`:' Hoje não há mais horários livres.')+`\nPara agendar: ${site}agendar.html`},
    planosDetalhe(){return 'Nossos planos:\n'+db().plans.filter(x=>x.on).map(x=>{const q=DB.quota(x);return `• ${x.n}: ${brl(x.p)}/mês · ${q?x.quota:'ilimitado'} · ${x.days.map(d0=>WD[d0]).join(', ')}${x.perks&&x.perks!=='—'?' · '+x.perks:''}`}).join('\n')+`\nDetalhes e assinatura: ${site}index.html#planos`},
    mensalidade(){return `A mensalidade é cobrada sozinha todo mês, no dia 1 ou 7, por Pix automático ou cartão. Você escolhe ao assinar e pode ver na sua área: ${site}entrar.html`},
    falhaPag(){tellC(`${who} relatou problema no pagamento: "${raw.slice(0,160)}"`);return `Para regularizar, entre na sua área e tente de novo: ${site}entrar.html\nAvisei o barbeiro para conferir também.`},
    formaPag(){tellC(`${who} quer mudar a forma de pagamento do plano.`);return `Avisei o barbeiro para trocar a forma de pagamento do seu plano. Ele confirma por aqui. 👍`},
    refazer(){tellC(`${who} quer ajuste/refazer o corte: "${raw.slice(0,160)}"`);return 'Poxa, sinto muito. Avisei o barbeiro para combinar o ajuste com você.'},
    comprovante(){return A.outro('comprovante/recibo')},
    aguardando(){const a=up.find(x=>x.date===t);tell('evContact',`${who} está aguardando na barbearia${a?' (horário das '+a.start+')':''}.`);return (a?`Seu horário é às ${hh(a.start)}. `:'')+'Avisei o barbeiro que você está aguardando. 👍'},
    almoco(){const L0=db().lunch;return L0?`Fazemos pausa para almoço das ${L0[0]} às ${L0[1]}. Nesse horário não há agendamento.`:'Não fechamos para almoço. 😉'},
    feriadoNome(){const h=db().holidays.find(x=>x.date>=t&&n.includes(norm(x.name).split(' ')[0]));return h?`${cap(dayTxt(h.date))} (${h.name}) estaremos fechados.`:A.funcionamento()},
    pausar(){tellC(`${who} quer pausar o plano: "${raw.slice(0,160)}"`);return 'A pausa do plano é feita pelo barbeiro. Avisei ele, que confirma por aqui. 👍'},
    fidelidade(){const f=db().faq.find(x=>/fidelidade/i.test(x.q));return f?f.a.replace(/\{prazo_cancelamento\}/g,DB.cancelText()):'Não tem fidelidade. Você cancela quando quiser pela sua área do cliente.'},
    cobranca(){tellC(`${who} relatou problema na cobrança: "${raw.slice(0,160)}"`);return 'Sinto muito pelo transtorno. Avisei o barbeiro para conferir a cobrança, ele te responde por aqui.'},
    chavePix(){tellC(`${who} pediu a chave Pix.`);return 'O pagamento do avulso é feito na barbearia, e a chave Pix é passada na hora. Se precisar agora, já avisei o barbeiro. 😉'},
    audio(){return 'Por enquanto eu só leio texto. Pode escrever que eu respondo na hora. 😉'},
    sobre(){const T=db().team.filter(u=>u.active&&['admin','barbeiro'].includes(u.role)).map(u=>u.name);return `${db().content.about||''}\nQuem atende: ${T.join(', ')||'o Farias'}.\nVeja os trabalhos: ${site}galeria.html`},
    depois(){return 'Tranquilo! Quando quiser, é só chamar. 😉'},
    comoSite(){return `É rápido:\n1. Abra ${site}agendar.html\n2. Escolha o serviço, o dia e o horário\n3. Digite seu WhatsApp e o código que chega aqui\nOu, se preferir, agende por aqui mesmo: envie *agendar*.`},
    atualizar(){tellC(`${who} quer atualizar o cadastro: "${raw.slice(0,160)}"`);return 'Me diga aqui o dado correto que eu repasso para o barbeiro atualizar. 👍'},
    historicoC(){if(!c)return 'Não encontrei cadastro neste número.';const D=db().appts.filter(a=>a.cid===c.id&&a.status==='done').sort((a,b)=>b.date.localeCompare(a.date));
      return D.length?`Você já veio ${D.length} ${D.length===1?'vez':'vezes'}. Última: ${short(D[0].date)} · ${D[0].svc}.`+(up.length?`\nPróximo: ${when(up[0])}.`:''):'Ainda não encontrei atendimentos concluídos no seu cadastro.'},
    privacidade(){return `Guardamos só o necessário para o atendimento: cadastro, horários, pagamentos e as conversas com este assistente (as mais antigas são apagadas).\nDetalhes: ${site}privacidade.html\nPara apagar seus dados, envie *apagar meus dados*.`},
    avaliar(){setSt({crate:1});return 'Pode avaliar aqui mesmo: envie uma nota de 1 a 5. 😉'},
    multi(){const L=db().services.filter(x=>x.on).sort((a,b)=>b.n.length-a.n.length);let q=' '+norm(nn).replace(/\s*\+\s*/g,' ')+' ';const got=[];
      L.forEach(x=>{const k=' '+norm(x.n).replace(/\s*\+\s*/g,' ')+' ';if(q.includes(k)){got.push(x);q=q.replace(k,' ')}});if(got.length<2)return null;
      return `${got.map(x=>x.n).join(' + ')}: ${brl(got.reduce((a,x)=>a+x.p,0))} · cerca de ${got.reduce((a,x)=>a+x.t,0)} min.\nPara agendar: envie *agendar* ou acesse ${site}agendar.html`},
    risada(){return '😄 Precisa de algo? Envie *menu* para ver as opções.'},
    fotos(){const ig=db().content.instagram;return `Veja nossos trabalhos: ${site}galeria.html`+(ig?`\nInstagram: https://instagram.com/${encodeURIComponent(ig)}`:'')},
    obrigado(){return 'Por nada! 😉 Qualquer coisa é só chamar.'}};
  /* remarcar pela conversa: mesmo caminho do agendamento, respeitando o prazo de alteração */
  A.remarcar=()=>{if(!up.length)return A.meus();const a=up[0];{const why=DB.clientMoveBlock(a);if(why)return why+'\nSe precisar antes, envie *barbeiro*.'}if(mins(a)<lim){tellC(`${who} quer remarcar ${a.svc} de ${short(a.date)} às ${a.start}, mas já passou do prazo.`);return `Faltam menos de ${DB.cancelText()} para ${when(a)}, então não consigo remarcar por aqui. Já avisei o barbeiro, ele fala com você.`}
    return `Vamos remarcar ${when(a)}.\n\n`+CB.dia({move:a.id,sv:a.svc})};
  Object.keys(A).forEach(k=>{const f=A[k];A[k]=(...x)=>{INT=INT||k;return f(...x)}});
  /* ===== agendamento pela conversa: serviço → dia → horário → confirmação ===== */
  const svObj=nm=>services().find(x=>x.n===nm);
  const opn=ds=>!closed(ds)&&db().hours[new Date(ds+'T00:00').getDay()];
  const YESC=/^(1|sim|s|isso|pode|confirmo|confirma|confirmar|quero|ok|bora|fechado|agendar|pode agendar|sim pode)$/,NOC=/^(2|nao|n|nao quero|melhor nao)$/;
  const CB={
    ask(step,d,q){setSt({cbook:{step,d}});return q},
    start(d){d=d||{};if(c&&DB.isBlocked(c)){tellC(`${who} tentou agendar, mas está bloqueado por faltas.`);return `Seu agendamento está bloqueado por faltas (${c.misses||0}). Avisei o barbeiro para falar com você.`}return CB.svc(d)},
    nome(d){const nm=raw.trim().replace(/\s+/g,' ');if(/\d/.test(nm)||nm.split(' ').filter(w=>w.length>1).length<2)return CB.ask('nome',d,'Me diga nome e sobrenome, por favor. (Ex.: João Silva)');return CB.conf({...d,name:cap(nm.toLowerCase())})},
    svc(d){if(d.sv&&svObj(d.sv))return d.ds&&d.tm?CB.conf(d):d.ds?CB.hora(d):CB.dia(d);const L=svcList();return CB.ask('servico',d,'Qual serviço?\n'+L.map((x,i)=>`${i+1}. ${x.n} · ${brl(x.p)}`).join('\n')+'\n\nResponda com o número.')},
    servico(d){const L=svcList(),sv=/^\d{1,2}$/.test(n)?L[+n-1]:svcIn(n);if(!sv)return /^\d+$/.test(n)?CB.ask('servico',d,'Responda com um dos números da lista.'):null;
      /* "barba sexta 15h": a mensagem também trouxe outro dia ou hora */
      const p0=/^\d{1,2}$/.test(n)?{date:null,times:[]}:parse(n);if(p0.date){if(!opn(p0.date))return `Não abrimos ${dayTxt(p0.date)}${closed(p0.date)?' ('+closed(p0.date).name+')':''}.\n\n`+CB.dia({...d,sv:sv.n,ds:null,tm:null});return p0.times[0]?CB.hR({...d,sv:sv.n,ds:p0.date},p0.times[0]):CB.hora({...d,sv:sv.n,ds:p0.date,slots:null})}
      if(p0.times[0]&&d.ds)return CB.hR({...d,sv:sv.n},p0.times[0]);return CB.svc({...d,sv:sv.n})},
    dia(d){const sv=svObj(d.sv)||{n:'atendimento',t:30},days=[];for(let i=0;i<21&&days.length<6;i++){const ds=iso(day0(i));if(opn(ds)&&DB.freeSlots(ds,sv.t,d.move).length)days.push(ds)}
      if(!days.length)return `Não há vagas para ${sv.n} nos próximos dias. Avisei o barbeiro.`+(tellC(`${who} não achou vaga para ${sv.n}.`)?'':'');
      /* cada dia já mostra os primeiros horários livres */
      const prev=x=>{const f=DB.freeSlots(x,sv.t,d.move);return f.slice(0,3).map(hh).join(', ')+(f.length>3?` (+${f.length-3})`:'')};
      return CB.ask('diaR',{...d,days},(d.avail?'Horários disponíveis:':'Qual dia?')+'\n'+days.map((x,i)=>`${i+1}. ${cap(dayTxt(x))} · ${prev(x)}`).join('\n')+`\n\n${d.avail?'Quer agendar? Responda com o número do dia.':'Responda com o número (ou escreva, como "sexta à tarde").'}`)},
    diaR(d){const p0=parse(n),sv0=(svcIn(n)||{}).n;if(sv0)d={...d,sv:sv0};let ds=/^\d$/.test(n)?d.days[+n-1]:p0.date;if(!ds)return /^\d+$/.test(n)?CB.ask('diaR',d,'Responda com um dos números da lista.'):null;
      if(!opn(ds))return CB.ask('diaR',d,`Não abrimos ${dayTxt(ds)}. Escolha outro dia da lista.`);const per=periodOf(n),tm=p0.times[0];return tm?CB.hR({...d,ds},tm):CB.hora({...d,ds,per})},
    hora(d){const sv=svObj(d.sv)||{t:30};let f=DB.freeSlots(d.ds,sv.t,d.move);if(d.per)f=f.filter(x=>DB.toMin(x)>=d.per[0]&&DB.toMin(x)<d.per[1]);if(d.slots)f=d.slots.filter(x=>f.includes(x));
      if(!f.length)return d.days?CB.ask('diaR',d,`Sem vagas ${dayTxt(d.ds)}${d.per?' '+d.per[2]:''}. Escolha outro dia:\n`+d.days.map((x,i)=>`${i+1}. ${cap(dayTxt(x))}`).join('\n')+'\n\nResponda com o número.'):CB.dia(d);
      const show=f.slice(0,9);return CB.ask('horaR',{...d,slots:show},`Horários ${dayTxt(d.ds)}${d.lbl||(d.per?' '+d.per[2]:'')}:\n`+show.map((x,i)=>`${i+1}. ${hh(x)}`).join('\n')+'\n\nResponda com o número.')},
    horaR(d){const p0=parse(n),sv0=(svcIn(n)||{}).n;if(p0.date)return CB.diaR({...d,sv:sv0||d.sv,days:d.days||[]});if(sv0&&sv0!==d.sv)d={...d,sv:sv0};const tm=/^\d$/.test(n)?d.slots[+n-1]:p0.times[0];if(!tm){const pd=parse(n).date,per=periodOf(n);if(pd||per)return CB.diaR({...d,days:d.days||[]});return /^\d+$/.test(n)?CB.ask('horaR',d,'Responda com um dos números da lista.'):null}return CB.hR(d,tm)},
    hR(d,tm){const sv=svObj(d.sv);if(!sv)return `${hh(tm)} ${dayTxt(d.ds)}. 👍\n\n`+CB.svc({...d,tm});const f=DB.freeSlots(d.ds,sv.t,d.move);if(!f.includes(tm))return `${hh(tm)} não está livre ${dayTxt(d.ds)}.\n\n`+CB.hora({...d,slots:null});return CB.conf({...d,tm})},
    conf(d){const sv=svObj(d.sv);if(!DB.freeSlots(d.ds,sv.t,d.move).includes(d.tm))return `${sv.n} leva ${sv.t} min e não cabe às ${hh(d.tm)} ${dayTxt(d.ds)}.\n\n`+CB.hora({...d,slots:null});if(!c&&!d.name&&!d.move)return CB.ask('nome',d,'Para finalizar, me diga seu nome e sobrenome.');const old=d.move&&db().appts.find(x=>x.id===d.move),plan=old?old.plan:!!(c&&DB.activeSub(c.id)&&/^corte( \+ barba)?$/i.test(sv.n)&&!DB.planCheck(c.id,d.ds,sv.n));
      return CB.ask('confR',{...d,plan},`${d.move?'Remarcar para':'Confirma?'}\n${sv.n} · ${dayTxt(d.ds)} às ${hh(d.tm)} · ${plan?'pelo plano':brl(sv.p)}\n1. Sim, ${d.move?'remarcar':'agendar'}\n2. Não`)},
    confR(d){if(NOC.test(n)||THUMB_DOWN.test(raw))return 'Ok, não '+(d.move?'remarquei':'agendei')+'. Se quiser outro horário, é só pedir. 😉';if(!YESC.test(n)&&!THUMB_UP.test(raw))return /^\d+$/.test(n)?CB.conf(d):null;
      const sv=svObj(d.sv);if(!DB.freeSlots(d.ds,sv.t,d.move).includes(d.tm))return `Esse horário acabou de ser ocupado. 😕\n\n`+CB.hora({...d,slots:null});
      if(d.move){const a=db().appts.find(x=>x.id===d.move);if(!a)return 'Esse horário não existe mais.';const old=`${short(a.date)} ${a.start}`;
        mut(['appts'],x=>{const y=x.appts.find(z=>z.id===a.id);y.date=d.ds;y.start=d.tm;y.status='conf';y.asked=false;y.nextSent=false;y.cmovedAt=Date.now()},`${cname(a.cid)}: remarcado pelo WhatsApp do cliente de ${old} para ${short(d.ds)} ${d.tm}`);DB.notify('move',db().appts.find(x=>x.id===a.id));
        tell('evCancel',`Remarcado pelo cliente: ${cname(a.cid)} · ${a.svc} · de ${old} para ${short(d.ds)} às ${d.tm}.`);return `Remarcado! 👍 ${a.svc} ${dayTxt(d.ds)} às ${hh(d.tm)}.`}
      let cl=c;const isNew=!cl;if(isNew){const x=new Date();cl={id:'c'+DB.uid(),name:d.name,phone:key,bairro:'',birth:null,source:'WhatsApp',notes:'',blocked:false,misses:0,since:MO[x.getMonth()]+'/'+String(x.getFullYear()).slice(2)}}
      const aid=DB.uid();mut(['clients','appts'],x=>{if(isNew)x.clients.push(cl);x.appts.push({id:aid,date:d.ds,start:d.tm,dur:sv.t,cid:cl.id,svc:sv.n,price:d.plan?0:sv.p,plan:d.plan,status:'conf',note:'',origin:'whatsapp'})},`${cl.name}: ${sv.n} agendado pelo WhatsApp do cliente para ${short(d.ds)} ${d.tm}`);
      const ap=db().appts.find(x=>x.id===aid);DB.notify('confirm',ap);tell('evNew',`Novo agendamento pelo WhatsApp: ${cl.name} · ${sv.n} · ${short(d.ds)} às ${d.tm}${d.plan?' (assinante)':' · '+brl(sv.p)}`);
      return `Agendado! 😎 ${sv.n} ${dayTxt(d.ds)} às ${hh(d.tm)}${d.plan?' (pelo plano)':' · '+brl(sv.p)}.\nDuas horas antes chega o link para confirmar presença. Para remarcar ou cancelar: ${DB.link(ap)}`}};
  if(/^(0|voltar|menu|inicio)$/.test(n))return menu();
  if(st&&st.cbook){if(/^(sair|parar|cancela|cancelar|desisto|deixa)$/.test(n))return 'Ok, parei o agendamento. Quando quiser, é só chamar. 😉';const r=CB[st.cbook.step](st.cbook.d);if(r)return r}
  if(!raw){INT='midia';return menu('Ainda não consigo ouvir áudio nem ver imagem. Escreva sua dúvida ou escolha uma opção.')}
  if(st&&st.ccancel){const a=db().appts.find(x=>x.id===st.ccancel);
    if(a&&OPEN.includes(a.status)&&(/^(sim|s|pode|isso|confirmo|confirma|ok|quero)$/.test(n)||THUMB_UP.test(raw))){mut(['appts'],d=>{d.appts.find(x=>x.id===a.id).status='cancel'},`${c.name}: horário de ${short(a.date)} ${a.start} cancelado pelo WhatsApp do cliente`);DB.data.outbox=db().outbox.filter(o=>!(o.aid===a.id&&o.kind==='r2'&&o.at>Date.now()));DB.save();
      tell('evCancel',`Cancelado pelo cliente: ${c.name} · ${a.svc} · ${short(a.date)} às ${a.start}. O horário ficou livre.`);return `Cancelado: ${when(a)}. 👍\nQuando quiser marcar outro: ${site}agendar.html`}
    if(/^(nao|n|deixa|esquece)$/.test(n)||THUMB_DOWN.test(raw))return 'Ok, seu horário continua marcado.'}
  if(st&&st.cchoice){const a=up.find(x=>x.id===st.cchoice);if(a){if(/^1$|cancel/.test(n))return A.cancelar();if(/^2$|remarc/.test(n))return A.remarcar();if(/^3$|mant|deixa|fica/.test(n))return `Ok, seu horário continua marcado: ${when(a)}.`}}
  if(st&&st.cmenu&&/^[1-7]$/.test(n))return [()=>CB.start({}),A.meus,()=>up.length?(setSt({cchoice:up[0].id}),`O que deseja fazer com ${when(up[0])}?\n1. Cancelar\n2. Remarcar\n3. Manter como está`):A.meus(),()=>A.precos(),()=>A.funcionamento(),A.humano,A.fotos][+n-1]();
  if(!n||/^(oi+|ola+|opa+|eae|eai|e ai|iae|salve|fala|fala ai|fala mano|fala parceiro|coe|bom dia|boa tarde|boa noite|menu|inicio|ajuda|me ajuda|socorro|help|comecar|\?)[!.?]*$/.test(n))return menu();
  if(/^(nao entendi|como assim|o que|oque|que|hein|ha|han|hã|nao sei|nao entendo)[?!.]*$/.test(n)){INT='confuso';return menu('Sem problema, vou facilitar. 😉')}
  /* resposta curta a uma mensagem que o robô mandou */
  const ACK=/^(ok|okay|certo|ta bom|ta|tudo bem|blz|beleza|sem problema|de boa|tranquilo|combinado|entendi|show)$/;
  if(!c&&/^(nota\s*)?[1-5]\s*estrelas?$|^⭐+$/.test(n)){tell('evContact',`Avaliação de ${who}: ${n}`);return 'Obrigado pela avaliação! 😎'}
  if((ctx==='thanks'||(st&&st.crate)||/estrela|nota/.test(n))&&c){const nm=/^(?:nota\s*)?([1-5])(?:\s*estrelas?)?$/.exec(n),k=(raw.match(/⭐|★/g)||[]).length,r=nm?+nm[1]:k>=1&&k<=5?k:0;
    if(r){mut(['clients'],d=>{const x=d.clients.find(y=>y.id===c.id);x.rating=r;x.ratingAt=t},`${c.name}: avaliou o atendimento com nota ${r}`,'Clientes');
      if(r<=3){tellC(`Avaliação de ${c.name}: nota ${r} de 5. Vale falar com ele.`);setSt({cwhy:1});return 'Obrigado por avisar, e sentimos muito. O que podemos melhorar? Pode contar aqui que eu repasso para o barbeiro.'}
      tell('evContact',`Avaliação de ${c.name}: nota ${r} de 5.`);return `Obrigado pela nota ${r}! 😎 Até a próxima.\nPara marcar: ${site}agendar.html`}}
  if(ctx==='thanks'&&(ACK.test(n)||THUMB_UP.test(raw)))return A.obrigado();
  if(st&&st.cnote&&!/elogi|reclam|sugest/.test(n)){INT=st.cnote;const k=st.cnote,lb={elogio:'Elogio',reclamacao:'Reclamação',sugestao:'Sugestão'}[k];(k==='elogio'?m=>tell('evContact',m):tellC)(`${lb} de ${who}: "${raw.slice(0,300)}"`);
    return {elogio:'Obrigado! Já repassei para o barbeiro.',reclamacao:'Obrigado por contar. Já repassei para o barbeiro, ele vai falar com você.',sugestao:'Obrigado! Já repassei para o barbeiro.'}[k]}
  if(st&&st.cwhy){tellC(`Comentário de ${who} sobre o atendimento: "${raw.slice(0,200)}"`);return 'Obrigado pelo retorno. Já repassei para o barbeiro.'}
  if(['confirm','r24','r2','move','lembrete'].includes(ctx)&&up.length&&(/^(nao|n)$/.test(n)||THUMB_DOWN.test(raw))){setSt({cchoice:up[0].id});
    return `Tudo bem. O que prefere fazer com ${when(up[0])}?\n1. Cancelar\n2. Remarcar\n3. Manter como está\n\nResponda com o número.`}
  if(ctx==='cancel'&&(/^(sim|s|quero|pode|remarcar|marcar|outro|outro horario)$/.test(n)||THUMB_UP.test(raw)))return A.agendar();
  if(ctx==='cancel'&&/(por que|porque|motivo|o que houve|aconteceu)/.test(n))return A.humano();
  if(ctx==='atraso'&&(ACK.test(n)||THUMB_UP.test(raw)))return 'Obrigado pela compreensão! Te esperamos. 👍';
  if(['cobranca','fail','bill'].includes(ctx)&&(ACK.test(n)||THUMB_UP.test(raw)))return `Combinado. Para ver ou pagar o plano: ${site}entrar.html`;
  /* pontuação vira espaço: "tem fotos?" e "quanto custa, amigo" também são entendidos */
  const nn=' '+n.replace(/[^a-z0-9\s]/g,' ').replace(/\s+/g,' ').trim()+' ',has=re=>re.test(nn);
  if(has(/ (plano|assinatura|clube|mensalidade) /)&&has(/ (cancelar|cancela|cancelo|cancelamento|trocar|troca|mudar|sair) /))return A.gerirPlano();
  /* pergunta que bate forte com o FAQ (2+ palavras em comum) tem prioridade sobre as respostas genéricas: "posso usar o plano no sábado?" */
  {const q=[...new Set(toks(n))];const f=q.length>=2&&db().faq.find(x=>{const T=new Set(toks(x.q)),k=q.filter(w=>T.has(w)).length;return k>=2&&k/q.length>=.6});if(f){INT='faq';return f.a.replace(/\{prazo_cancelamento\}/g,DB.cancelText())}}
  if(has(/ (ja paguei|paguei|ja pago|segue o comprovante|mandei o comprovante|ta o comprovante|fiz o pix|ja fiz o pix|ja fiz o pagamento|transferi|ja transferi) /))return A.paguei();
  if(has(/ (codigo|cod) /))return A.codigo();
  if(has(/ (instagram|insta|foto|fotos|galeria|trabalhos) /))return A.fotos();
  if(has(/ (lgpd|apagar|excluir|deletar|remover|apaguem) /)&&has(/ (dados|conta|cadastro|numero|informacoes) /)||has(/ lgpd /))return A.dados();
  if(has(/ (meus dados|meu cadastro|minhas informacoes) /))return A.meusdados();
  if(has(/ (emprego|curriculo|contratando|trabalhar ai|trabalhar com voces|vaga de barbeiro|vaga de emprego) /))return A.emprego();
  if(has(/ (parceria|fornecedor|patrocinio|divulgacao|divulgar|representante comercial|orcamento) /))return A.parceria();
  {const k=has(/ (elogio|elogiar) /)?'elogio':has(/ (reclamacao|reclamar) /)?'reclamacao':has(/ (sugestao|sugerir|sugestoes) /)?'sugestao':null;
    /* só a intenção ("quero fazer um elogio ao Farias"): pede o texto. Com conteúdo, repassa direto */
    if(k){const rest=toks(n).filter(w=>!/^(elogi|recla|suges|sugir|quero|fazer|farias|barbe|gosta|queri|deixa)/.test(w));INT=k;return rest.length?A[k]():A.pedeTexto(k)}}
  if(has(/ (pessimo|horrivel|ruim|insatisfeito|absurdo|descaso|desrespeito) /))return A.reclamacao();
  if(has(/ (parabens|excelente|otimo atendimento|adorei|amei|gostei muito|melhor barbearia|nota 10|recomendo|caprichou|ficou top|ficou show) /))return A.elogio();
  if(has(/ (crianca|criancas|infantil|meu filho|minha filha|menino|bebe) /))return A.infantil();
  if(has(/ (antecedencia|com quanto tempo antes|quanto tempo antes) /)&&!has(/ (remarcar|cancelar|desmarcar) /))return A.antecedencia();
  if(has(/ (quanto tempo|demora|duracao|leva quanto) /)&&!has(/ (atraso|atrasar|tolerancia|espera|fila|atender) /))return A.duracao();
  if(has(/ (parcela|parcelar|parcelado|maquininha|maquina de cartao|aceita cartao|aceitam cartao) /))return A.pagamento();
  if(has(/ (pare de mandar|nao quero receber|nao me mande|nao mande mais|descadastrar|descadastra|parar de receber|cancelar as mensagens|bloquear mensagens) /))return A.optout();
  if(has(/ (voltar a receber|quero receber de novo|reativar mensagens) /))return A.optin();
  if(has(/ (fila|cheio|lotado|movimento|movimentado|espera|esperar|mais vazio|menos movimento) /)&&!has(/ (lista de espera) /))return A.movimento();
  if(has(/ (lista de espera|me avisa se abrir|avisa se vagar|se surgir vaga|se abrir vaga) /))return A.espera();
  if(has(/ (saindo de casa|to indo|estou indo|indo ai|ja vou|ja to indo|saindo agora|to saindo) /))return A.caminho();
  if(has(/ (combo|combos|pacote) /)&&!has(/ plano /))return A.combo();
  if(has(/ (perto de|referencia|ponto de referencia|qual bairro|em que bairro|fica onde) /))return A.endereco();
  if(has(/ (numero de voces|numero da barbearia|telefone|qual o numero|whatsapp de voces|contato) /))return A.contato();
  if(has(/ (dono|responsavel|gerente|ninguem me respondeu|ninguem responde|ninguem atende) /))return A.humano();
  if(has(/ (esqueci|perdi|deixei) /)&&has(/ (ai|na barbearia|carteira|celular|chave|oculos|bone|objeto|documento|fone) /))return A.outro('objeto esquecido');
  if(has(/ (domicilio|em casa|vem ate|vir aqui|atende em casa) /))return A.outro('atendimento em domicílio');
  if(has(/ (nota fiscal|emitem nota|emite nota|cnpj|recibo|comprovante de pagamento) /))return A.outro('nota fiscal/recibo');
  if(has(/ (como faco login|como entro|minha conta|acessar minha|entrar na conta|fazer login|login) /))return A.login();
  if(has(/ (manda o site|qual o site|link do site|site de voces|tem site) /))return A.siteLink();
  if(has(/ (faz|fazem|faze|da pra fazer|tem como fazer|corta|cortam|trabalha com|trabalham com|voces fazem) /)){const r0=A.fazem();if(r0)return r0;
    if(has(/ (luzes|platinado|nevou|reflexo|progressiva|alisamento|relaxamento|coloracao|tintura|pintar|descolorir|tranca|trancas|dread|implante|depilacao) /))return A.outro('um serviço que não está na tabela')}
  if(/^(ate mais|ate logo|ate amanha|ate depois|tchau|tchau tchau|falou|falou mano|falou parceiro|flw|fui|abraco|abracos|vlw falou|valeu falou|ate)$/.test(nn.trim()))return A.despedida();
  if(/^(massa|combinado|pode ser|fechado|ta bom|esta bom|ta certo|esta certo|beleza entao|ok entao|perfeito|otimo|show|joia|demorou|certo|entendi|entendido|ah ta|ah esta|okay|ok ok|aham|uhum|hum|humm|sei|ta|esta)$/.test(nn.trim()))return A.ack();
  if(/^(desisti|deixa pra la|deixa|esquece|nao quero mais|deixa quieto|nao precisa|nao precisa mais)$/.test(nn.trim()))return A.desistiu();
  if(/^(sair|parar|chega)$/.test(nn.trim()))return 'Ok! Quando precisar, é só chamar.';
  if(has(/ (trato no visual|dar um trato|cabeludo|cabelo grande|cabelo ta grande|cabelo esta grande|raspar|zerar|fazer agendamento|novo agendamento|quero um horario|preciso de um horario|bora cortar|partiu) /))return A.agendar();
  if(svcIn(n)&&(has(/ (quero|queria|fazer|so|marcar|preciso|tirar|aparar) /)||toks(n).length<=2)&&!has(/ (quanto|valor|preco|custa|tempo|demora|o que e) /))return A.agendar();
  if(has(/ (nao tenho preferencia|qualquer horario|tanto faz|o mais cedo|primeiro horario|proximo horario livre|horario mais proximo|qualquer um) /))return A.agendar();
  /* ---- mais assuntos ---- */
  /* disponibilidade (sem falar do próprio horário) vem antes de "meus horários" */
  if(has(/ (vago|vaga|vagas|livre|livres|disponivel|disponiveis|disponibilidade|espaco na agenda|agenda cheia|agenda lotada|como ta a agenda|como esta a agenda) /)&&!has(/ (meu|minha|meus|minhas) /))return A.agendar();
  if(has(/ (trocar|mudar|remarcar|reagendar|adiar|antecipar|passar pra|passar para) /)&&has(/ (meu|minha) (horario|agendamento|marcacao|corte) /))return A.remarcar();
  if(has(/ (desisto do horario|desisti do horario|desisto do agendamento|nao quero mais o horario) /))return c?A.cancelar():A.meus();
  if(has(/ (multa|sem pagar|taxa|cobra pra cancelar|cobra para cancelar|pagar pra cancelar) /)&&has(/ (cancelar|cancelamento|desmarcar|remarcar) /))return A.prazo();
  if(has(/ (remarcar|cancelar|desmarcar) /)&&has(/ (antes|antecedencia|prazo|ate quando) /))return A.prazo();
  if(has(/ (meus? (agendamentos?|horarios?|marcac\w*|cortes marcados)|minhas? (marcac\w*|agendamentos?)|tenho algum horario|tenho horario|eu tinha marcado|tinha marcado|marquei|ta marcado|esta marcado|to marcado|estou marcado) /))return A.meus();
  if(has(/ (meu proximo horario|meu horario|meus horarios|que dia eu marquei|eu marquei|que horas eu marquei|meu agendamento|meus agendamentos|minha marcacao|minhas marcacoes|minha agenda|quando estou marcado|pra quando estou marcado|pra quando e|quando e meu|tenho algo marcado|to marcado|estou marcado|quando eu tenho) /))return A.meus();
  if(!c&&(has(/ (estarei ai|estarei la|to confirmado|pode contar comigo|confirmo minha presenca) /)||/^(confirmado|confirmo|vou sim)[!.]*$/.test(nn.trim())))return A.meus();
  if(/^(qual )?(o )?horario (de |do |da |no |na )?(funcionamento|hoje|amanha|segunda|terca|quarta|quinta|sexta|sabado|domingo)( feira)?$/.test(nn.trim().replace(/^qual o /,'qual o ')))return A.funcionamento();
  if(has(/ (quanto|valor|preco|custa) /)&&has(/ (plano|planos|assinatura) /))return A.planosDetalhe();
  if(c&&has(/ (estarei ai|estarei la|to confirmado|confirmadissimo|pode contar comigo|conta comigo|vou estar ai|vou estar la) /)||/^(confirmado|confirmadissimo|vou sim|com certeza)[!.]*$/.test(nn.trim())&&c)return A.confirmar();
  if(has(/ (quanto falta pra me atender|falta pra me atender|demora pra me atender|vai demorar|quantas pessoas na minha frente|pessoas na frente|estou na frente|to na frente|aqui esperando|estou esperando|to esperando|ja estou aqui) /))return A.aguardando();
  if(has(/ (almoco) /)&&has(/ (fecha|fecham|horario|pausa|para|param|intervalo) /))return A.almoco();
  if(has(/ (natal|ano novo|reveillon|carnaval|pascoa|finados|tiradentes|consciencia) /))return A.feriadoNome();
  if(has(/ (pausar|pausa|congelar|suspender|trancar) /)&&has(/ (plano|assinatura|mensalidade) /))return A.pausar();
  if(has(/ fidelidade /)&&!has(/ cartao fidelidade /))return A.fidelidade();
  if(has(/ (perco|perder|perde) /)&&has(/ (cancelar|cancelo|cancelamento) /))return A.gerirPlano();
  if(has(/ (dia cobra|cobra a mensalidade|dia da mensalidade|quando debita|dia do debito) /))return A.vencimento();
  if(has(/ (cobraram duas|cobrado duas|cobranca duplicada|cobrado errado|cobraram errado|cobranca errada|dinheiro de volta|reembolso|estorno|devolucao) /))return A.cobranca();
  if(has(/ (mandei o pix|fiz o pagamento|segue comprovante|segue o comprovante|ta pago|esta pago|pago ja) /))return A.paguei();
  if(has(/ (chave pix|chave do pix|qual o pix|passa o pix|manda o pix) /))return A.chavePix();
  if(has(/ (vale refeicao|vale alimentacao|ticket|sodexo|alelo|vr|va) /))return A.pagamento();
  if(has(/ (onde voces ficam|onde ficam|onde fica|como chego|chegar ai|como chegar|perto do|perto da|qual o bairro|que bairro) /))return A.endereco();
  if(has(/ (facebook|face|tiktok|tik tok|postam|redes sociais|rede social|youtube) /))return A.fotos();
  if(has(/ (me liga|liga pra mim|pode ligar|me ligar) /))return A.contato();
  if(has(/ (audio|audios|mandar voz|mensagem de voz) /))return A.audio();
  if(has(/ (quem e o barbeiro|o barbeiro e bom|e bom mesmo|experiencia|quem corta|quem vai cortar|sobre o barbeiro|conhece o barbeiro) /))return A.sobre();
  if(has(/ (ta atendendo|esta atendendo|vai atender hoje|atendendo hoje) /))return A.funcionamento();
  if(has(/ (nao curti|achei caro|muito caro|grosso|grossa|mal educado|demorou muito|fiquei esperando|esperei muito|atrasou meu|me atendeu mal) /))return A.reclamacao();
  if(has(/ (foi otimo|foi excelente|foi muito bom|atendimento otimo|atendimento excelente|nota mil|voltarei|volto com certeza|vou voltar|melhor corte|cara bom demais|mandou bem) /))return A.elogio();
  if(has(/ (vou deixar uma avaliacao|onde avalio|como avalio|avaliar voces|google meu negocio|deixar avaliacao|dar nota) /))return A.avaliar();
  if(has(/ (vou pensar|depois eu marco|depois marco|qualquer coisa te chamo|qualquer coisa eu chamo|te falo|vou ver e te aviso|mais tarde eu vejo|vou ver minha agenda|depois te falo|outro dia eu marco) /))return A.depois();
  if(has(/ (como uso o site|como usar o site|como funciona o site|como agenda pelo site) /))return A.comoSite();
  if(has(/ (me manda o link|manda o link|passa o link|qual o link) /))return A.siteLink();
  if(has(/ (atualizar|corrigir|alterar) /)&&has(/ (nome|cadastro|dados|email|endereco|nascimento) /))return A.atualizar();
  if(has(/ (meu historico|quantas vezes|ultimo corte|ultima vez que|ja cortei|ja vim) /))return A.historicoC();
  if(has(/ (tenho credito|meu saldo|saldo do plano) /))return A.uso();
  if(has(/ (privacidade|guardam minhas|guardam meus|meus dados sao|seguranca dos dados) /))return A.privacidade();
  if(has(/ (bebida|cerveja|cafe|agua|cachorro|pet|animal|tv|televisao|ar condicionado|banheiro) /))return A.outro('a estrutura da barbearia');
  if(has(/ (idade|anos de idade) /))return A.infantil();
  if(has(/ (estudante|idoso|aposentado|meia|universitario) /))return A.promo();
  if(has(/ (barboterapia|terapia|tratamento|massagem|limpeza de pele|spa|depilacao|unha|manicure) /))return A.outro('um serviço que não está na tabela');
  if(has(/ (quanto|valor|preco|custa|fica) /)){const r0=A.multi();if(r0)return r0}
  if(has(/ (nao gostei|ficou torto|ficou errado|estragou|mal feito|nao ficou bom|ficou ruim|cortou demais|ficou feio|faltou acabar) /))return A.reclamacao();
  if(has(/ (refazer|arrumar o corte|ajustar o corte|retocar|retoque) /))return A.refazer();
  if(has(/ (ficou muito bom|ficou bom|ficou otimo|ficou lindo|ficou perfeito|ficou show|ficou top|curti|gostei|amei o corte) /))return A.elogio();
  if(has(/ (ir direto|ordem de chegada|sem marcar|sem agendar|precisa marcar|preciso marcar|tem que marcar|chegar e cortar|posso ir agora|posso passar ai) /))return A.semMarcar();
  if(has(/ (melhor horario|melhor dia|dia mais tranquilo|horario mais tranquilo|tempo de espera|demora pra atender) /))return A.movimento();
  if(has(/ (diferenca|compensa|vale a pena|da direito|inclui|incluso|qual plano|quais planos|qual o melhor plano) /)&&has(/ (plano|planos|assinatura) /))return A.planosDetalhe();
  if(has(/ (mensalidade|plano) /)&&has(/ (como pago|como pagar|como e cobrad|como cobra|forma de pagamento|pagar o plano|pago o plano) /)&&!has(/ (mudar|trocar|alterar) /))return A.mensalidade();
  if(has(/ (nao passou|nao foi|recusado|recusou|falhou|nao caiu|deu erro no pagamento|pagamento pendente) /)&&has(/ (pagamento|pix|cartao|plano|mensalidade|cobranca) /))return A.falhaPag();
  if(has(/ (forma de pagamento|trocar cartao|mudar cartao|trocar o cartao|mudar o pagamento|mudar pagamento) /))return A.formaPag();
  if(has(/ (cartao fidelidade|fidelidade de cortes|programa de pontos|pontos) /))return A.promo();
  if(has(/ (agendamento online|agendar online|agendar pelo site|onde agendo|onde marco|como agendo|como marco|como faco pra agendar|como faco para agendar|link pra agendar|link para agendar) /))return A.agendar();
  if(has(/ (quero meu comprovante|preciso do comprovante|manda o comprovante|me manda o recibo) /))return A.comprovante();
  if(has(/ (senha) /))return A.login();
  if(has(/ (confirma|confirmar|confirmo) /)&&has(/ (horario|agendamento|presenca) /)&&c)return A.confirmar();
  if(has(/ (adiantar|antecipar|mais cedo o meu|passar pra mais cedo) /))return A.remarcar();
  if(has(/ (ligar|ligacao|posso te ligar|liga pra mim) /))return A.contato();
  if(has(/ (cheguei|to na porta|estou na porta|to ai fora|estou aqui fora|ja estou ai|ja to ai|ja cheguei) /))return A.cheguei();
  if(has(/ (bloqueado|bloquearam|nao consigo agendar|nao consigo marcar|site nao abre|site com erro|deu erro|nao funciona o site|nao carrega|nao consigo entrar|site ta fora|site esta fora|site fora|fora do ar|link nao abre|link nao funciona) /))return A.bloqueado();
  if(has(/ (antecedencia|com quanto tempo antes|quanto tempo antes) /)&&!has(/ (remarcar|cancelar|desmarcar) /))return A.antecedencia();
  if(has(/ (ate quando posso cancelar|prazo para cancelar|prazo de cancelamento|ate que horas posso cancelar|posso cancelar ate) /))return A.prazo();
  if(has(/ (tolerancia|quanto tempo de atraso|posso atrasar|minutos de atraso) /))return A.tolerancia();
  if(has(/ (se eu faltar|se faltar|faltar o que|multa|penalidade) /))return A.falta();
  if(has(/ (quantos cortes|quanto ja usei|quanto falta do plano|cortes restantes|ja usei|uso do plano|saldo do plano) /))return A.uso();
  if(has(/ (vence|vencimento|proxima cobranca|quando cobra|quando vai cobrar|dia da cobranca|renova) /))return A.vencimento();
  if(has(/ (trocar meu numero|mudar meu numero|numero novo|troquei de numero|mudei de numero|outro numero) /))return A.trocarNumero();
  if(has(/ (quem atende|quem vai me atender|qual barbeiro|quais barbeiros|quantos barbeiros|com quem) /))return A.quem();
  if(has(/ (me lembra|lembrete|vai me avisar|voces avisam|avisa antes) /))return A.lembrete();
  if(has(/ (promocao|desconto|cupom|primeira vez tem|mais barato) /))return A.promo();
  if(has(/ (o que e|o que seria|como e feit\w*|como funciona a|como funciona o) /)){const r0=A.oQueE();if(r0)return r0}
  if(has(/ (pomada|produto|produtos|minoxidil|shampoo|cera|oleo de barba|vende|vendem) /))return A.outro('produtos');
  if(has(/ (feminino|mulher|mulheres|cabelo longo) /))return A.outro('corte feminino');
  if(has(/ (vale presente|presente|gift) /))return A.outro('vale-presente');
  if(has(/ (estacionamento|estacionar|wifi|wi fi|acessibilidade|cadeirante) /))return A.outro('a estrutura da barbearia');
  if(has(/ (pra outra pessoa|para outra pessoa|meu irmao|meu pai|meu amigo|dois cortes|duas pessoas|2 pessoas) /))return 'Cada pessoa agenda com o próprio WhatsApp pelo site, para receber a confirmação e o link de presença.\nSe for criança ou alguém sem WhatsApp, envie *barbeiro* que ele marca para você.';
  if(has(/ (robo|bot|automatico|e uma pessoa|e gente|quem e voce|quem ta falando|quem esta falando|voce e humano|e humano|e de verdade|como voce funciona|o que voce faz|o que voce sabe) /))return A.robo();
  if(/^(oi|ola|opa|e ai|bom dia|boa tarde|boa noite)?\s*(tudo bem|tudo bom|tudo certo|tudo joia|tudo tranquilo|tudo em paz|como vai|como voce esta|beleza|suave)\s*\??$/.test(n.replace(/[,!.]/g,''))&&/\?|oi|ola|opa|dia|tarde|noite|joia|tranquilo|suave/.test(raw.toLowerCase()))return A.papo();
  if(/^(k{3,}|(ha){2,}h?|(rs)+|kkk+\w*|hahah\w*|hehe\w*)$/.test(nn.trim()))return A.risada();
  /* só emoji (❤️🔥👏): agradece; 👍 e 👎 seguem para confirmação e respostas */
  if(!nn.trim()&&!THUMB_UP.test(raw)&&!THUMB_DOWN.test(raw))return A.obrigado();
  if(has(/ (cancelar|cancela|cancelo|desmarcar|desmarca|nao vou|nao posso ir|nao consigo ir|nao vou poder) /))return c?A.cancelar():A.meus();
  if(has(/ (remarcar|remarca|mudar|trocar|adiar|outro horario|outro dia|reagendar) /))return A.remarcar();
  if(has(/ (atras\w*|vou chegar|chego em|to chegando|estou chegando|a caminho|transito) /))return A.atraso();
  if(c&&(THUMB_UP.test(raw)||/^(sim|s|confirmo|confirmar|confirma|confirmado|ok|vou sim|estarei la|pode confirmar)$/.test(n)))return A.confirmar();
  if(has(/ (meu horario|meus horarios|meu agendamento|que horas e|quando e|tenho horario|minha agenda) /))return A.meus();
  if(has(/ (plano|planos|assinatura|assinar|clube|mensal|mensalidade) /))return A.planos();
  if(has(/ (preco|precos|valor|valores|quanto|custa|tabela) /))return A.precos();
  if(has(/ (pix|pagamento|pagar|cartao|boleto|debito|credito) /))return A.pagamento();
  if(has(/ (endereco|onde fica|onde e|localizacao|local|como chegar|mapa) /))return A.endereco();
  if(has(/ (funciona|funcionamento|aberto|aberta|abre|abrem|fecha|fecham|atende|atendem|expediente|que horas) /))return A.funcionamento();
  if(has(/ (agendar|agenda|marcar|marca|vaga|vagas|horario|horarios|livre|disponivel|cortar|corte|barba|encaixe) /))return A.agendar();
  /* mensagem curta só com dia, hora ou período ("pode ser de manhã?", "e amanhã?", "sexta 3 da tarde") */
  {const pp=parse(n);if((pp.date||pp.times.length||periodOf(n))&&toks(n).length<=4&&!has(/ (abre|abrem|aberto|fecha|fecham|funciona|que horas) /))return A.agendar()}
  if(has(/ (atendente|humano|pessoa|barbeiro|falar com|problema) /))return A.humano();
  if(has(/ (obrigad\w*|valeu|vlw|brigad\w*|show|blz|beleza|top|tmj) /)||/^(ok|certo|ta bom|tudo bem)$/.test(n)||THUMB_UP.test(raw))return A.obrigado();
  if(/^(sim|s|nao|n|ok)$/.test(n)||THUMB_DOWN.test(raw))return menu('Não há nada aguardando sua resposta.');
  if(ctx!=='resposta'){const f=A.faq();if(f)return f}
  INT='nao_entendido';tellC(`Mensagem de ${who}: "${raw.slice(0,200)}"`);
  if(ctx==='resposta')return 'Recebido! Repassei para o barbeiro.';
  return menu('Não entendi sua mensagem, mas já repassei para o barbeiro.')}

const isTeam=from=>{if(!from||from==='@barbeiro')return true;const d=String(from).replace(/\D/g,'').slice(-11);return db().team.some(u=>u.active&&String(u.phone||'').replace(/\D/g,'').slice(-11)===d)};

/* ===== na hora marcada: o robô pergunta ao responsável se o cliente veio ===== */
function promptFor(a){a.asked=true;DB.save();setSt({ask:a.id});const c=cli(a.cid)||{};
  return `Chegou a hora: *${hh(a.start)} · ${cname(a.cid)}*\n${a.svc} · ${a.plan?'assinante':brl(a.price)}${c.notes?'\nObs.: '+c.notes:''}\n\nO cliente veio? (também vale 👍 ou 👎)\n1. Veio\n2. Não veio\n3. Cancelou`}
const THUMB_UP=/👍|✅|👌/,THUMB_DOWN=/👎|❌/;
function onAsk(st,raw,n){const a=db().appts.find(x=>x.id===st.ask);if(!a||!OPEN.includes(a.status))return null;n=({1:'veio',2:'faltou',3:'cancelou'})[n]||n;
  if(THUMB_UP.test(raw)||/^(ok|okay|sim|s|veio|chegou|confirma|confirmo|confirmado|presente|ta aqui|esta aqui)$/.test(n)){
    mut(['appts'],d=>{d.appts.forEach(x=>{if(x.date===a.date&&x.status==='now')x.status='conf'});d.appts.find(x=>x.id===a.id).status='now'},`${cname(a.cid)}: atendimento iniciado (${a.start})`);
    return started(a)}
  if(THUMB_DOWN.test(raw)||/^(nao|n|nao veio|faltou|falta|furou)$/.test(n))return exec(`faltou ${a.start} ${short(a.date)}`);
  if(/^(cancelou|cancelado|cancelar|desmarcou|desmarcado)$/.test(n))return exec(`cancelar ${a.start} ${short(a.date)}`);
  return null}
function onPay(st,raw,n){const a=db().appts.find(x=>x.id===st.pay);if(!a||a.status!=='now')return null;if(/^[1-4]$/.test(n))n=a.price>0?PAYS[+n-1]:(n==='1'?'ok':n);const p={rest:n},met=takeMet(p);
  if(met)return finish(a,met);
  if(THUMB_UP.test(raw)||/^(ok|okay|pronto|feito|terminei|terminou|acabou|concluido|plano)$/.test(n)){if(!a.price)return finish(a,null);return showMenu('Como o cliente pagou?',SUB.pagar[1])}
  return null}

/* cada mensagem recebida e a resposta ficam guardadas (até 1.000): número, quem é, o assunto entendido e o que o robô respondeu */
function logConvo(from,role,text,intent,reply){const d=DB.data;if(!Array.isArray(d.convos))d.convos=[];const num=telKey(from)||'equipe',c=role==='cliente'?db().clients.find(x=>x.phone&&telKey(x.phone)===num):null;
  d.convos.push({t:Date.now(),num,role,cid:c?c.id:null,text:String(text).slice(0,500),intent:intent||'outro',reply:String(reply).replace(/^Bot:\n/,'').slice(0,800)});if(d.convos.length>1000)d.convos.splice(0,d.convos.length-1000);DB.save()}
window.Bot={
  help:HELP,
  /* devolve a resposta do robô. `from` é o número de quem escreveu (vazio = equipe, no simulador).
     Toda resposta começa com "Bot:" em uma linha própria. */
  run(text,from){INT='';const raw=String(text||'').trim(),r=this._run(raw,from),team=isTeam(from);
    logConvo(from,team?'equipe':'cliente',raw,team?(norm(raw).split(/\s+/)[0]||'vazio'):INT,r);return r},
  _run(raw,from){DB.refresh();const n=norm(raw);
    if(!isTeam(from)){ME=null;return db().bot.client?'Bot:\n'+clientBot(raw,n,from):DB.welcome()}
    ME=memberOf(from);CUR=from?String(from).replace(/\D/g,'')||'barbeiro':'equipe';
    const out=r=>'Bot:\n'+r+(/Responda com o número\.$|\n\d{1,2}\. [^\n]+$/.test(r)?'':'\n\n0. Voltar ao menu');
    if(!db().bot.staff)return out('O robô da equipe está desligado. Ligue em Painel › WhatsApp.');
    const st=getSt();setSt(null);
    /* a pergunta "o cliente veio?" continua valendo enquanto não for respondida */
    const keep=r=>{if(!getSt()&&st&&(st.ask||st.pay)){const a=db().appts.find(x=>x.id===(st.ask||st.pay));if(a&&OPEN.includes(a.status))setSt(st)}return out(r)};
    if(st&&st.wiz){if(/^(0|voltar|menu)$/.test(n))return keep(showMenu('Ok, parei por aqui. Selecione uma opção:',MENU));if(/^(sair|cancela|parar)$/.test(n))return out('Ok, parei por aqui. Envie *menu* quando precisar.');return out(WIZ[st.wiz][st.step](st.d,raw))}
    if(st&&st.warn){const a=db().appts.find(x=>x.id===st.warn);if(/^(1|sim|s|avisar|avisa|pode)$/.test(n)||THUMB_UP.test(raw))return keep(warnNext(a));if(/^(2|nao|n)$/.test(n)||THUMB_DOWN.test(raw))return keep('Ok, não avisei. Para avisar depois: *avisar*.')}
    if(st&&st.ask){const r=onAsk(st,raw,n);if(r)return out(r)}
    if(st&&st.pay){const r=onPay(st,raw,n);if(r)return out(r)}
    if(!n||['0','voltar','menu','oi','ola','inicio','opcoes','bom dia','boa tarde','boa noite'].includes(n))return keep(showMenu('Selecione uma opção:',MENU));
    if(st&&st.pick){const i=/^\d$/.test(n)?+n-1:-1,c=i>=0?cli(st.pick[i]):st.pick.map(cli).find(x=>norm(x.name)===n);if(c)return keep(st.cont(c));if(/^\d+$/.test(n)){setSt(st);return out('Responda com um dos números da lista, ou *sair*.')}}
    if(st&&st.menu&&/^\d{1,2}$/.test(n)){const it=st.menu[+n-1];if(it)return keep(act(it[1]));setSt(st);return out('Opção inválida. Responda com um dos números da lista.')}
    if(/^\d{1,2}$/.test(n))return keep(showMenu('Selecione uma opção:',MENU));
    // comando sem nada depois: o robô conduz pelas perguntas
    const solo={agendar:'w:agendar',marcar:'w:agendar',remarcar:'w:remarcar',cancelar:'w:cancelar',desmarcar:'w:cancelar',fechar:'m:fechar',concluir:'m:pagar',caixa:'m:caixa'}[n];if(solo&&solo!=='m:caixa')return keep(act(solo));
    if(/^(pix|dinheiro|debito|credito|cartao)$/.test(n))return keep(exec('ok '+n));
    /* 👍 solto responde a um aviso (novo agendamento, confirmação): não mexe na agenda */
    if(THUMB_UP.test(raw))return keep('Anotado 👍. Envie *menu* se precisar de algo.');
    if(THUMB_DOWN.test(raw))return keep('Quem não veio? Envie *faltou 15* (a hora) ou *faltou João*.');
    return keep(exec(raw))},
  /* chamado a cada minuto (no servidor, pelo agendador): se chegou a hora de um cliente, devolve a pergunta ao responsável */
  tick(force){DB.refresh();const b=db().bot;if(!b.staff||b.evNext===false)return null;CUR='equipe';ME=memberOf('');const st=getSt();
    if(st&&(st.ask||st.pay||st.wiz)){const a=db().appts.find(x=>x.id===(st.ask||st.pay));if(st.wiz||(a&&OPEN.includes(a.status)))return null}
    const L=dayList(TODAY()).filter(a=>['conf','pend'].includes(a.status)&&(force||(!a.asked&&a.start<=nowHM()))),a=L[0];if(!a)return null;
    const txt=promptFor(a);DB.notifyStaff('evNext',txt);return 'Bot:\n'+txt},
  next:proximo,daily:()=>agenda(TODAY())
};
})();
