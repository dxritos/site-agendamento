/* Farias Barbearia — "banco de dados" do protótipo (salvo no navegador).
   Compartilhado entre o site e o painel: o que o admin altera aparece no site. */
(function(){
const KEY='farias_db_v1', IMGKEY='farias_img_v1';
const pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
const toMin=s=>+s.slice(0,2)*60+ +s.slice(3,5);
const toHM=m=>`${pad(m/60|0)}:${pad(m%60)}`;
const uid=()=>Math.random().toString(36).slice(2,9);
function rng(seed){let a=0;for(const c of seed)a=(a*31+c.charCodeAt(0))|0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

function defaults(){
  const today=new Date();today.setHours(0,0,0,0);
  const d={v:1,created:Date.now(),
    content:{notice_on:false,notice:'Fechado no feriado de 20/11. Agende para outro dia!',
      hero_tag:'Barbearia na sua cidade',hero_t1:'Visual em dia',hero_t2:'o mês inteiro.',
      hero_lead:'Corte, barba e acabamento na navalha. Agende em segundos ou assine o Clube Farias e corte quantas vezes quiser por um valor fixo.',
      about:'Especialista em fade e acabamento na navalha. Agenda individual e em tempo real — você escolhe o horário direto com ele.',
      wa:'5500900000000',phone:'(00) 90000-0000',address:'Rua das Tesouras, 123 – Centro',instagram:'fariasbarbearia',ig_on:false,ig_token:''},
    hours:{0:null,1:['09:00','19:00'],2:['09:00','19:00'],3:['09:00','19:00'],4:['09:00','19:00'],5:['09:00','20:00'],6:['08:00','12:00']},
    lunch:['12:00','13:00'],
    holidays:[{id:uid(),date:'2026-11-20',name:'Consciência Negra'},{id:uid(),date:'2026-12-25',name:'Natal'}],
    services:[
      {id:'corte',cat:'cab',n:'Corte',d:'Lavagem inclusa',p:50,t:45,mp:null,on:true},
      {id:'barba',cat:'cab',n:'Barba',d:'Alinhamento e desenho',p:45,t:30,mp:null,on:true},
      {id:'cavanhaque',cat:'cab',n:'Cavanhaque',d:'Desenho e acabamento',p:20,t:15,mp:10,on:true},
      {id:'sobrancelha',cat:'cab',n:'Sobrancelha',d:'Acabamento na navalha',p:15,t:5,mp:5,on:true},
      {id:'combo',cat:'com',n:'Combo Especial',d:'Corte, barba, sobrancelha, lavagem e escova',p:99,t:60,mp:null,on:true},
      {id:'pigm',cat:'com',n:'Corte + Pigmentação',d:'Mais definição',p:75,t:60,mp:null,on:true},
      {id:'selagem',cat:'ext',n:'Selagem',d:'A partir de',p:119.9,t:60,mp:null,on:true},
      {id:'hidrat',cat:'ext',n:'Hidratação',d:'Lavagem + escova',p:30,t:15,mp:null,on:true},
      {id:'lavagem',cat:'ext',n:'Lavagem + Escova',d:'Curto e médio',p:20,t:10,mp:null,on:true},
      {id:'acab',cat:'ext',n:'Acabamento',d:'Pezinho e contorno',p:15,t:5,mp:null,on:true}],
    plans:[
      {id:'ci',n:'Corte Ilimitado',p:120,days:[1,2,3,4],quota:'Ilimitado',gap:7,perks:'—',on:true},
      {id:'cbi',n:'Corte + Barba Ilimitado',p:200,days:[1,2,3,4],quota:'Ilimitado',gap:7,perks:'1 hidratação + 1 sobrancelha por mês',on:true},
      {id:'c2',n:'2 Cortes',p:80,days:[1,2,3,4],quota:'2 por mês',gap:0,perks:'—',on:true},
      {id:'cb2',n:'2 Cortes + 2 Barbas',p:130,days:[1,2,3,4],quota:'2 + 2 por mês',gap:0,perks:'—',on:true}],
    faq:[
      {id:uid(),q:'Como funciona a assinatura?',a:'Você escolhe um plano e paga automaticamente todo mês, por Pix ou cartão, no dia 01 ou 07. Com o plano ativo, os serviços inclusos saem por R$ 0 no agendamento.'},
      {id:uid(),q:'Posso usar o plano na sexta e no sábado?',a:'Os planos valem de segunda a quinta. Na sexta e no sábado você agenda normalmente, pagando o valor avulso.'},
      {id:uid(),q:'Tem fidelidade? Como cancelo?',a:'Não tem fidelidade. Você cancela pela sua área do cliente e os benefícios continuam até o fim do mês já pago.'},
      {id:uid(),q:'E se eu precisar remarcar ou faltar?',a:'Você remarca ou cancela pelo celular até {prazo_cancelamento} antes. Faltas sem aviso podem bloquear o agendamento online.'},
      {id:uid(),q:'Preciso criar senha para agendar?',a:'Não. Você entra com seu WhatsApp e confirma com um código que chega na hora.'}],
    reviews:[
      {id:uid(),name:'Lucas M.',info:'Assinante · Corte + Barba',text:'Assinei o ilimitado e corto toda semana. Agendo pelo celular em segundos e nunca mais esperei.'},
      {id:uid(),name:'Pedro H.',info:'Cliente',text:'Melhor fade da cidade. Pontual, caprichoso no acabamento e o ambiente é top.'},
      {id:uid(),name:'Gabriel S.',info:'Assinante · Corte Ilimitado',text:'O pagamento cai sozinho no Pix. Só chego, sento e corto. Prático demais.'}],
    gallery:[['cortes','Low fade','Acabamento na navalha','Low fade de perfil, mostrando a transição na nuca e o acabamento na navalha.'],['cortes','Taper','Clássico e alinhado','Taper fade de lado, com pezinho e costeleta bem definidos.'],['barba','Barba completa','Desenho e contorno','Barba desenhada, de frente, com as linhas do rosto e do pescoço marcadas.'],['cortes','Mid fade','Com risco','Mid fade com risco lateral feito na navalha, visto de lado.'],['espaco','A barbearia','Rua das Tesouras, 123','Fachada da barbearia de dia, com o letreiro e a porta de entrada.'],['cortes','Pigmentação','Mais definição','Antes e depois da pigmentação, mostrando o contorno mais escuro e definido.'],['barba','Barba e bigode','Alinhamento fino','Close de perfil do bigode e da barba alinhados.'],['cortes','Social','Tesoura e máquina','Corte social na tesoura, cliente de frente com o cabelo penteado.'],['espaco','A cadeira','Onde a mágica acontece','A cadeira de barbeiro com as ferramentas na bancada e a luz do ambiente.'],['cortes','Moicano disfarçado','Volume no topo','Moicano disfarçado de costas, mostrando o volume no topo.'],['barba','Cavanhaque','Desenho preciso','Cavanhaque de frente, com o contorno simétrico.'],['cortes','Corte infantil','Paciência e capricho','Criança na cadeira depois do corte, sorrindo (com autorização dos pais).']]
      .map(([cat,t,s,hint])=>({id:uid(),cat,t,s,hint,img:null})),
    messages:{
      code:{on:true,lock:true,name:'Código de acesso',txt:'Seu código de acesso à Farias Barbearia é {codigo}. Não compartilhe com ninguém.'},
      confirm:{on:true,name:'Confirmação de agendamento',txt:'Fala, {nome}! Horário confirmado: {servico} em {data} às {hora}. Até lá! — Farias Barbearia'},
      r24:{on:true,name:'Lembrete 24 h antes',txt:'Oi, {nome}! Lembrete: amanhã às {hora} você tem {servico} com o Farias. Precisa remarcar? {link}'},
      r2:{on:true,name:'Lembrete 2 h antes',txt:'{nome}, seu horário é hoje às {hora}. Te espero!'},
      bill:{on:true,name:'Aviso de cobrança (2 dias antes)',txt:'Oi, {nome}! Sua assinatura {plano} (R$ {valor}) será cobrada em {data}.'},
      fail:{on:true,name:'Pagamento recusado',txt:'{nome}, não conseguimos processar o pagamento do {plano}. Regularize aqui para manter seus benefícios: {link}'},
      daily:{on:false,name:'Resumo diário para o Farias (08:00)',txt:'Bom dia, Farias! Hoje você tem {qtd} atendimentos. Primeiro horário: {hora}.'}},
    team:[{id:'u1',name:'Farias',email:'contato@fariasbarbearia.com.br',role:'admin',active:true}],
    roles:{
      perms:['Ver agenda','Editar agenda','Ver clientes','Editar clientes','Gerenciar assinaturas','Ver financeiro','Registrar pagamentos e estornos','Editar serviços e planos','Editar conteúdo do site','Editar mensagens','Equipe e permissões','Configurações e backup'],
      barbeiro:[1,1,1,0,0,0,0,0,0,0,0,0], recepcao:[1,1,1,1,1,0,1,0,0,0,0,0]},
    settings:{step:30,minAdv:60,cancelUntil:120,tolerance:15,noShow:3},
    clients:[],subs:[],appts:[],tx:[],log:[]
  };
  // clientes
  const CL=[['Lucas Martins','94900000001','Prefere máquina 1 na lateral.'],['Pedro Henrique','94900000002',''],['Gabriel Souza','94900000003','Prefere tesoura no topo.'],['Rafael Costa','94900000004',''],
    ['Bruno Alves','94900000005',''],['Diego Ramos','94900000006',''],['Caio Mendes','94900000007',''],['Matheus Lima','94900000008',''],['Vinícius Araújo','94900000009','Novo assinante.'],
    ['Felipe Rocha','94900000010',''],['André Silva','94900000011',''],['Igor Pereira','94900000012',''],['João Vitor','94900000013',''],['Thiago Nunes','94900000014',''],
    ['Marcos Vieira','94900000015',''],['Renan Dias','94900000016',''],['Lucas M.','94900000001','Cadastro feito pelo site — parece duplicado.']];
  const since=['jan/26','fev/26','mar/26','abr/26','mai/26','jun/26','jul/26','ago/26','set/26','out/26','nov/26'];
  d.clients=CL.map(([name,phone,notes],i)=>({id:'c'+(i+1),name,phone,notes,blocked:false,misses:i===15?2:0,since:since[i%since.length]}));
  // assinaturas
  const SB=[['c1','cbi','ok',4],['c2','ci','ok',3],['c3','cbi','ok',2],['c4','c2','ok',1],['c5','cbi','ok',3],['c6','ci','late',0],['c7','cb2','late',0],['c8','cb2','ok',2],['c9','cb2','ok',0],['c10','ci','ok',2],['c11','c2','ok',2],['c12','ci','off',0]];
  d.subs=SB.map(([cid,plan,status,used],i)=>({id:'a'+(i+1),cid,plan,price:d.plans.find(x=>x.id===plan).p,status,used,credit:0,creditMonth:null,cancelAt:null,nextPlan:null,paidUntil:null,day:i%3===2?1:7,method:i%4===3?'Cartão':'Pix automático',since:d.clients.find(c=>c.id===cid).since,pausedUntil:null,courtesyUntil:null,exempt:false}));
  // agenda: semana atual + próxima
  const monday=new Date(today);monday.setDate(monday.getDate()-((today.getDay()+6)%7));
  const now=new Date(),nowM=now.getHours()*60+now.getMinutes();
  for(let k=0;k<14;k++){
    const day=new Date(monday);day.setDate(monday.getDate()+k);const ds=iso(day),h=d.hours[day.getDay()];
    if(!h||d.holidays.some(x=>x.date===ds))continue;
    const r=rng(ds);let m=toMin(h[0]);const end=toMin(h[1]);
    while(m<end){
      const L0=toMin(d.lunch[0]),L1=toMin(d.lunch[1]);if(day.getDay()<=5&&m>=L0&&m<L1){m=L1;continue}
      const x=r();
      if(x<.6){
        const svc=x<.25?'Corte + Barba':['Corte','Barba','Combo Especial','Corte','Corte + Pigmentação'][Math.floor(x*100)%5];
        const dur=svc==='Corte + Barba'||svc==='Combo Especial'||svc==='Corte + Pigmentação'?60:svc==='Barba'?30:45;
        if(m+dur>end)break;
        if(day.getDay()<=5&&m<L1&&m+dur>L0){m=L1;continue}
        const c=d.clients[Math.floor(r()*16)];
        const sub=d.subs.find(s=>s.cid===c.id&&s.status==='ok');
        const plan=!!sub&&day.getDay()>=1&&day.getDay()<=4&&(svc==='Corte'||svc==='Corte + Barba');
        const price=plan?0:({'Corte':50,'Barba':45,'Corte + Barba':95,'Combo Especial':99,'Corte + Pigmentação':75})[svc];
        let status='conf';
        if(ds<iso(today)||(ds===iso(today)&&m+dur<=nowM))status=r()<.07?'miss':'done';
        else if(ds===iso(today)&&m<=nowM)status='now';
        d.appts.push({id:uid(),date:ds,start:toHM(m),dur,cid:c.id,svc,price,plan,status,note:'',origin:'site'});
        m+=Math.ceil(dur/15)*15;
      }else m+=30;
    }
  }
  const fut=d.appts.filter(a=>a.status==='conf');if(fut[2])fut[2].status='pend';
  // financeiro
  const ym=iso(today).slice(0,7);
  d.subs.forEach(s=>{if(s.status==='off')return;const p=d.plans.find(x=>x.id===s.plan);
    d.tx.push({id:uid(),date:`${ym}-${pad(s.day)}`,cid:s.cid,desc:'Plano '+p.n,method:s.method,value:p.p,kind:'plano',status:s.status==='late'?'failed':'ok'})});
  d.appts.filter(a=>a.status==='done'&&!a.plan&&a.date.slice(0,7)===ym).forEach(a=>d.tx.push({id:uid(),date:a.date,cid:a.cid,desc:a.svc,method:['Pix','Dinheiro','Maquininha (débito)','Maquininha (crédito)'][a.start.charCodeAt(1)%4],value:a.price,kind:'avulso',status:'ok'}));
  d.tx.sort((a,b)=>b.date.localeCompare(a.date));
  d.log=[
    {id:uid(),t:Date.now()-86400000*2,who:'Farias',area:'Serviços',desc:'Preço do Combo Especial alterado de R$ 95 para R$ 99'},
    {id:uid(),t:Date.now()-86400000,who:'Sistema',area:'Assinaturas',desc:'Assinatura de Diego Ramos suspensa por falta de pagamento'},
    {id:uid(),t:Date.now()-3600000*5,who:'Site',area:'Agenda',desc:'Novo agendamento pelo site: Renan Dias'}];
  return d;
}

function load(){try{const s=localStorage.getItem(KEY);if(s){const o=JSON.parse(s);if(o&&o.v===1)return o}}catch(e){}return null}
/* link individual de cada agendamento: token aleatório, impossível de adivinhar */
const tok=()=>{const a=new Uint8Array(15);crypto.getRandomValues(a);return [...a].map(b=>'abcdefghijkmnpqrstuvwxyz23456789'[b%32]).join('')};
const CONFIRM_OLD='Fala, {nome}! Horário confirmado: {servico} em {data} às {hora}. Até lá! — Farias Barbearia';
/* completa bancos antigos com o que veio depois: robô do WhatsApp, caixa de saída, links e mensagens novas */
function ensure(d){let ch=false;
  if(!d.bot){d.bot={staff:true,client:true,evNew:true,evCancel:true,evNext:true,evDaily:true};ch=true}
  if(!Array.isArray(d.outbox)){d.outbox=[];ch=true}
  const M=d.messages,add=(k,v)=>{if(!M[k]){M[k]=v;ch=true}};
  if(M.confirm&&M.confirm.txt===CONFIRM_OLD){M.confirm.txt='Fala, {nome}! Horário marcado: {servico} em {data} às {hora}. Confirme sua presença, remarque ou cancele por aqui: {link}';ch=true}
  add('move',{on:true,name:'Horário remarcado',txt:'{nome}, seu horário foi remarcado para {data} às {hora}. Para confirmar, remarcar ou cancelar: {link}'});
  add('cancel',{on:true,name:'Cancelamento',txt:'{nome}, seu horário de {data} às {hora} foi cancelado. Quando quiser, marque outro: {link}'});
  (d.appts||[]).forEach(a=>{if(!a.tok&&a.status!=='block'){a.tok=tok();ch=true}});
  return ch}
let data=load();if(!data)data=defaults();if(ensure(data)||!load()){try{localStorage.setItem(KEY,JSON.stringify(data))}catch(e){}}
let imgs={};try{imgs=JSON.parse(localStorage.getItem(IMGKEY)||'{}')}catch(e){}
const addMonth=(ds,n=1)=>{const d=new Date(ds+'T00:00:00');d.setMonth(d.getMonth()+n);return iso(d)};
const todayIso=()=>iso(new Date());

window.DB={
  data,iso,toMin,toHM,uid,addMonth,
  save(){ensure(this.data);try{localStorage.setItem(KEY,JSON.stringify(this.data));return true}catch(e){return false}},
  /* traz para a memória o que outra aba gravou (sem trocar o objeto, as telas continuam apontando para ele) */
  refresh(){const f=load();if(!f)return false;ensure(f);Object.keys(this.data).forEach(k=>{if(!(k in f))delete this.data[k]});Object.assign(this.data,f);return true},
  /* estados que vencem com o tempo: pausa, cancelamento e troca de plano agendados */
  normalize(){
    const t=todayIso();let ch=false;
    (this.data.subs||[]).forEach(s=>{
      if(s.status==='paused'&&s.pausedUntil&&s.pausedUntil<=t){s.status='ok';s.pausedUntil=null;ch=true}
      if(s.cancelAt&&s.cancelAt<=t&&s.status!=='off'){s.status='off';s.cancelAt=null;s.nextPlan=null;ch=true}
      if(s.nextPlan&&s.nextPlanAt&&s.nextPlanAt<=t){const p=this.data.plans.find(x=>x.id===s.nextPlan);if(p){s.plan=p.id;s.price=p.p}s.nextPlan=null;s.nextPlanAt=null;ch=true}
      if(s.price==null){const p=this.data.plans.find(x=>x.id===s.plan);s.price=p?p.p:0;ch=true}
    });
    if(ch)this.save();return ch;
  },
  _log(entry){const L=this.data.log;L.push(entry);if(L.length>120)L.splice(0,L.length-120);L.slice(0,-30).forEach(e=>{delete e.before;delete e.keys;e.key=null})},
  /* toda alteração passa por aqui: lê o banco atualizado, grava o estado anterior (para desfazer) e salva */
  mutate(key,fn,desc,area,who){return this.mutateMany([key],d=>fn(d[key]),desc,area,who)},
  mutateMany(keys,fn,desc,area,who){
    this.refresh();
    const before={};keys.forEach(k=>before[k]=JSON.stringify(this.data[k]));
    fn(this.data);
    this._log({id:uid(),t:Date.now(),who:who||'Farias',area:area||'Geral',desc,keys:before,key:keys.join(',')});
    return this.save();
  },
  undo(id){
    this.refresh();
    const e=this.data.log.find(x=>x.id===id);if(!e||e.undone)return false;
    const keys=e.keys||(e.key&&e.before?{[e.key]:e.before}:null);if(!keys)return false;
    const cur={};Object.keys(keys).forEach(k=>{cur[k]=JSON.stringify(this.data[k]);this.data[k]=JSON.parse(keys[k])});
    e.undone=true;
    this._log({id:uid(),t:Date.now(),who:'Farias',area:e.area,desc:'Desfeito: '+e.desc,keys:cur,key:Object.keys(cur).join(',')});
    return this.save();
  },
  canUndo(e){return !!(e&&!e.undone&&(e.keys||(e.key&&e.before)))},
  laterSameKey(id){const i=this.data.log.findIndex(x=>x.id===id),e=this.data.log[i];if(!e)return 0;const ks=(e.key||'').split(',');return this.data.log.slice(i+1).filter(x=>(x.key||'').split(',').some(k=>ks.includes(k))).length},
  /* referências que ficariam quebradas se esta alteração fosse desfeita */
  undoOrphans(id){const e=this.data.log.find(x=>x.id===id);if(!e||!e.keys||!e.keys.clients)return 0;const ids=new Set(JSON.parse(e.keys.clients).map(c=>c.id));
    return this.data.appts.filter(a=>a.cid&&!ids.has(a.cid)).length+this.data.subs.filter(s=>!ids.has(s.cid)).length+this.data.tx.filter(t=>t.cid&&!ids.has(t.cid)).length},
  reset(){try{localStorage.removeItem(KEY);localStorage.removeItem(IMGKEY);localStorage.removeItem('farias_me')}catch(e){}},
  exportAll(){return JSON.stringify({db:this.data,images:imgs},null,1)},
  importAll(txt){const o=JSON.parse(txt);if(!o.db||o.db.v!==1)throw new Error('Arquivo inválido');
    const d=o.db,arr=['services','plans','faq','reviews','gallery','team','holidays','clients','subs','appts','tx','log'],HM=/^\d{2}:\d{2}$/,DT=/^\d{4}-\d{2}-\d{2}$/,IMG=/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/;
    const bad=m=>{throw new Error('Backup inválido: '+m)};
    arr.forEach(k=>{if(!Array.isArray(d[k]))bad(k)});['content','hours','messages','roles','settings'].forEach(k=>{if(!d[k]||typeof d[k]!=='object')bad(k)});
    Object.values(d.hours).forEach(h=>{if(h!==null&&!(Array.isArray(h)&&HM.test(h[0])&&HM.test(h[1])))bad('horários')});
    if(d.lunch!==null&&!(Array.isArray(d.lunch)&&HM.test(d.lunch[0])&&HM.test(d.lunch[1])))bad('almoço');
    d.appts.forEach(a=>{if(!DT.test(a.date)||!HM.test(a.start)||typeof a.dur!=='number')bad('agenda')});
    d.holidays.forEach(h=>{if(!DT.test(h.date))bad('feriados')});
    d.gallery.forEach(g=>{if(!['cortes','barba','espaco'].includes(g.cat))bad('galeria')});
    d.subs.forEach(s=>{if(!['ok','late','paused','off'].includes(s.status)||![1,7].includes(s.day)||!['Pix automático','Cartão'].includes(s.method))bad('assinaturas')});
    d.tx.forEach(t=>{if(!DT.test(t.date)||typeof t.value!=='number'||!['ok','failed','refunded','waived'].includes(t.status))bad('financeiro')});
    if(!Array.isArray(d.roles.perms))bad('permissões');
    const im=o.images||{};Object.values(im).forEach(u=>{if(!IMG.test(u))bad('imagens')});localStorage.setItem(KEY,JSON.stringify(o.db));localStorage.setItem(IMGKEY,JSON.stringify(o.images||{}))},
  img:{get:id=>imgs[id]||null,set(id,url){imgs[id]=url;try{localStorage.setItem(IMGKEY,JSON.stringify(imgs));return true}catch(e){delete imgs[id];return false}},del(id){delete imgs[id];try{localStorage.setItem(IMGKEY,JSON.stringify(imgs))}catch(e){}}},

  /* ===== WhatsApp: links individuais e caixa de saída (o envio real é feito pelo servidor) ===== */
  link(a){return location.origin+location.pathname.replace(/[^/]*$/,'')+'confirmar.html?t='+a.tok},
  byToken(t){return /^[a-z2-9]{15}$/.test(t||'')?this.data.appts.find(a=>a.tok===t)||null:null},
  _out(m){const O=this.data.outbox;O.push({id:uid(),t:Date.now(),...m});if(O.length>80)O.splice(0,O.length-80);this.save()},
  /* mensagem ao cliente a partir do modelo editável no painel: confirm, move, cancel, r24, r2 */
  notify(kind,a){const d=this.data,m=d.messages[kind],c=d.clients.find(x=>x.id===a.cid);if(!d.bot.client||!m||!m.on||!c)return null;
    const v={nome:c.name.split(' ')[0],servico:a.svc,data:a.date.slice(8)+'/'+a.date.slice(5,7),hora:a.start,link:this.link(a)};
    const txt=m.txt.replace(/\{(\w+)\}/g,(x,k)=>v[k]??x);this._out({to:'client',name:c.name,phone:c.phone,kind,txt,aid:a.id});return txt},
  /* aviso para o WhatsApp do barbeiro/equipe (desligável quando há recepção) */
  notifyStaff(ev,txt){const b=this.data.bot;if(!b.staff||b[ev]===false)return null;this._out({to:'staff',name:'Equipe',kind:ev,txt});return txt},

  /* ===== regras de negócio compartilhadas (site, área do cliente e painel usam as mesmas) ===== */
  plan(id){return this.data.plans.find(p=>p.id===id)||{id,n:'(plano excluído)',p:0,days:[],quota:'',gap:0,perks:'—',on:false}},
  activeSub(cid){return this.data.subs.find(s=>s.cid===cid&&s.status!=='off')||null},
  subPrice(s){return s.price!=null?s.price:this.plan(s.plan).p},
  nextBill(s){const t=new Date(todayIso()+'T00:00:00');let d=new Date(t.getFullYear(),t.getMonth(),s.day);if(d<=t)d=new Date(t.getFullYear(),t.getMonth()+1,s.day);
    if(s.paidUntil){while(iso(d)<s.paidUntil)d=new Date(d.getFullYear(),d.getMonth()+1,s.day)}return iso(d)},
  credit(s,ym){return s.creditMonth===ym?(s.credit||0):0},
  isBlocked(c){if(!c)return false;const lim=this.data.settings.noShow||99;return !!c.blocked||(lim<99&&(c.misses||0)>=lim)},
  quota(p){const m=/^(\d+)(?: \+ (\d+))?/.exec(p.quota||'');return m?{corte:+m[1],barba:m[2]?+m[2]:0}:null},
  usage(cid,ym,ignoreId){const L=this.data.appts.filter(a=>a.cid===cid&&a.plan&&a.id!==ignoreId&&a.date.slice(0,7)===ym&&!['cancel','miss'].includes(a.status));
    return {total:L.length,corte:L.filter(a=>/corte/i.test(a.svc)).length,barba:L.filter(a=>/barba/i.test(a.svc)).length}},
  /* null = pode usar o plano; texto = motivo de não poder */
  planCheck(cid,date,svc,ignoreId){
    const c=this.data.clients.find(x=>x.id===cid);
    if(this.isBlocked(c))return 'Agendamento online indisponível para este número. Fale com o Farias pelo WhatsApp.';
    const s=c&&this.activeSub(c.id);
    if(!s)return 'Este número não tem assinatura ativa.';
    if(s.status==='late')return 'Sua assinatura está com o pagamento pendente. Regularize na sua área do cliente para usar o plano.';
    if(s.status==='paused')return `Sua assinatura está pausada${s.pausedUntil?' até '+s.pausedUntil.slice(8)+'/'+s.pausedUntil.slice(5,7):''}.`;
    if(s.cancelAt&&date>=s.cancelAt)return `Sua assinatura termina em ${s.cancelAt.slice(8)}/${s.cancelAt.slice(5,7)}. Depois dessa data o atendimento é avulso.`;
    const p=this.plan(s.plan),d=new Date(date+'T00:00:00'),WDS=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'],WDF=['Domingo','Segunda','Terça','Quarta','Quinta','Sexta','Sábado'];
    const wantsBarba=/barba/i.test(svc),wantsCorte=/corte/i.test(svc);
    if(wantsBarba&&!/barba/i.test(p.n))return `Seu plano (${p.n}) não inclui barba.`;
    if(!p.days.includes(d.getDay()))return `Seu plano vale só ${p.days.map(x=>WDS[x]).join(', ')}. ${WDF[d.getDay()]} é atendimento avulso.`;
    const ym=date.slice(0,7),q=this.quota(p),u=this.usage(c.id,ym,ignoreId),cr=this.credit(s,ym);
    if(q){if(wantsCorte&&u.corte>=q.corte+cr)return `Você já usou ${q.corte+cr===1?'o corte':'os '+(q.corte+cr)+' cortes'} do plano neste mês. O saldo renova no dia 1º.`;
      if(wantsBarba&&u.barba>=q.barba+cr)return `Você já usou ${q.barba+cr===1?'a barba':'as '+(q.barba+cr)+' barbas'} do plano neste mês. O saldo renova no dia 1º.`}
    if(p.gap){const t=d.getTime(),near=this.data.appts.find(a=>a.cid===c.id&&a.plan&&a.id!==ignoreId&&!['cancel','miss'].includes(a.status)&&Math.abs(new Date(a.date+'T00:00').getTime()-t)<p.gap*864e5);
      if(near){const nx=new Date(near.date+'T00:00');nx.setDate(nx.getDate()+p.gap);return `Seu plano pede ${p.gap} dias entre um corte e outro (você tem horário em ${near.date.slice(8)}/${near.date.slice(5,7)}). Pelo plano, o próximo é a partir de ${pad(nx.getDate())}/${pad(nx.getMonth()+1)}.`}}
    return null;
  },
  /* horários livres de um dia, respeitando funcionamento, almoço, feriados, agendamentos, bloqueios e o passado */
  freeSlots(date,dur,ignoreId){
    if(date<todayIso())return[];
    const dt=new Date(date+'T00:00:00'),h=this.data.hours[dt.getDay()];
    if(!h||this.data.holidays.some(x=>x.date===date))return[];
    const step=this.data.settings.step||30,busy=this.data.appts.filter(a=>a.date===date&&a.status!=='cancel'&&a.id!==ignoreId).map(a=>[toMin(a.start),toMin(a.start)+a.dur]);
    if(dt.getDay()<=5&&this.data.lunch)busy.push([toMin(this.data.lunch[0]),toMin(this.data.lunch[1])]);
    const now=new Date(),isToday=date===todayIso(),lim=now.getHours()*60+now.getMinutes()+(this.data.settings.minAdv||0);
    const out=[];for(let m=toMin(h[0]);m+dur<=toMin(h[1]);m+=step){if(isToday&&m<lim)continue;if(busy.some(([a,b])=>m<b&&m+dur>a))continue;out.push(toHM(m))}
    return out;
  },
  cancelText(){const m=this.data.settings.cancelUntil||120;return m>=1440?(m/1440)+(m/1440>1?' dias':' dia'):m>=60?(m/60)+(m/60>1?' horas':' hora'):m+' minutos'}
};
DB.normalize();
/* outra aba gravou: atualiza a memória e avisa a tela (cada página define window.onDBChange) */
addEventListener('storage',e=>{if(e.key===KEY&&e.newValue){DB.refresh();DB.normalize();if(typeof window.onDBChange==='function')window.onDBChange()}});
})();
