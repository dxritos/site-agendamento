/* Athos Barber — "banco de dados" do protótipo (salvo no navegador).
   Compartilhado entre o site e o painel: o que o admin altera aparece no site. */
(function(){
const KEY='athos_db_v1', IMGKEY='athos_img_v1';
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
      hero_tag:'Barbearia em Parauapebas',hero_t1:'Visual em dia',hero_t2:'o mês inteiro.',
      hero_lead:'Corte, barba e acabamento na navalha. Agende em segundos ou assine o Clube Athos e corte quantas vezes quiser por um valor fixo.',
      about:'Especialista em fade e acabamento na navalha. Agenda individual e em tempo real — você escolhe o horário direto com ele.',
      wa:'5594981248772',phone:'(94) 98124-8772',address:'Av. Bom Jardim, Parauapebas – PA',instagram:'athosbarber'},
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
      {id:uid(),q:'E se eu precisar remarcar ou faltar?',a:'Você remarca ou cancela pelo celular até 2 horas antes. Faltas sem aviso podem bloquear o agendamento online.'},
      {id:uid(),q:'Preciso criar senha para agendar?',a:'Não. Você entra com seu WhatsApp e confirma com um código que chega na hora.'}],
    reviews:[
      {id:uid(),name:'Lucas M.',info:'Assinante · Corte + Barba',text:'Assinei o ilimitado e corto toda semana. Agendo pelo celular em segundos e nunca mais esperei.'},
      {id:uid(),name:'Pedro H.',info:'Cliente',text:'Melhor fade da cidade. Pontual, caprichoso no acabamento e o ambiente é top.'},
      {id:uid(),name:'Gabriel S.',info:'Assinante · Corte Ilimitado',text:'O pagamento cai sozinho no Pix. Só chego, sento e corto. Prático demais.'}],
    gallery:[['cortes','Low fade','Acabamento na navalha'],['cortes','Taper','Clássico e alinhado'],['barba','Barba completa','Desenho e contorno'],['cortes','Mid fade','Com risco'],
      ['espaco','A barbearia','Av. Bom Jardim, Parauapebas'],['cortes','Pigmentação','Mais definição'],['barba','Barba e bigode','Alinhamento fino'],['cortes','Social','Tesoura e máquina'],
      ['espaco','A cadeira','Onde a mágica acontece'],['cortes','Moicano disfarçado','Volume no topo'],['barba','Cavanhaque','Desenho preciso'],['cortes','Corte infantil','Paciência e capricho']]
      .map(([cat,t,s])=>({id:uid(),cat,t,s,img:null})),
    messages:{
      code:{on:true,lock:true,name:'Código de acesso',txt:'Seu código de acesso à Athos Barber é {codigo}. Não compartilhe com ninguém.'},
      confirm:{on:true,name:'Confirmação de agendamento',txt:'Fala, {nome}! Horário confirmado: {servico} em {data} às {hora}. Até lá! — Athos Barber'},
      r24:{on:true,name:'Lembrete 24 h antes',txt:'Oi, {nome}! Lembrete: amanhã às {hora} você tem {servico} com o Athos. Precisa remarcar? {link}'},
      r2:{on:true,name:'Lembrete 2 h antes',txt:'{nome}, seu horário é hoje às {hora}. Te espero!'},
      bill:{on:true,name:'Aviso de cobrança (2 dias antes)',txt:'Oi, {nome}! Sua assinatura {plano} (R$ {valor}) será cobrada em {data}.'},
      fail:{on:true,name:'Pagamento recusado',txt:'{nome}, não conseguimos processar o pagamento do {plano}. Regularize aqui para manter seus benefícios: {link}'},
      daily:{on:false,name:'Resumo diário para o Athos (08:00)',txt:'Bom dia, Athos! Hoje você tem {qtd} atendimentos. Primeiro horário: {hora}.'}},
    team:[{id:'u1',name:'Athos',email:'athos@athosbarber.com.br',role:'admin',active:true}],
    roles:{
      perms:['Ver agenda','Editar agenda','Ver clientes','Editar clientes','Gerenciar assinaturas','Ver financeiro','Registrar pagamentos e estornos','Editar serviços e planos','Editar conteúdo do site','Editar mensagens','Equipe e permissões','Configurações e backup'],
      barbeiro:[1,1,1,0,0,0,0,0,0,0,0,0], recepcao:[1,1,1,1,1,0,1,0,0,0,0,0]},
    settings:{step:30,minAdv:60,cancelUntil:120,tolerance:15,noShow:3},
    clients:[],subs:[],appts:[],tx:[],log:[]
  };
  // clientes
  const CL=[['Lucas Martins','94981123344','Prefere máquina 1 na lateral.'],['Pedro Henrique','94992017788',''],['Gabriel Souza','94981550021','Alergia a pós-barba com álcool.'],['Rafael Costa','94991334510',''],
    ['Bruno Alves','94981776203',''],['Diego Ramos','94991882290',''],['Caio Mendes','94981209934',''],['Matheus Lima','94991741188',''],['Vinícius Araújo','94981665521','Novo assinante.'],
    ['Felipe Rocha','94991453302',''],['André Silva','94981997745',''],['Igor Pereira','94991106634',''],['João Vitor','94981302211',''],['Thiago Nunes','94991887765',''],
    ['Marcos Vieira','94981445566',''],['Renan Dias','94991223344',''],['Lucas M.','94981123344','Cadastro feito pelo site — parece duplicado.']];
  const since=['jan/26','fev/26','mar/26','abr/26','mai/26','jun/26','jul/26','ago/26','set/26','out/26','nov/26'];
  d.clients=CL.map(([name,phone,notes],i)=>({id:'c'+(i+1),name,phone,notes,blocked:false,misses:i===15?2:0,since:since[i%since.length]}));
  // assinaturas
  const SB=[['c1','cbi','ok',4],['c2','ci','ok',3],['c3','cbi','ok',2],['c4','c2','ok',1],['c5','cbi','ok',3],['c6','ci','late',0],['c7','cb2','late',0],['c8','cb2','ok',2],['c9','cb2','ok',0],['c10','ci','ok',2],['c11','c2','ok',2],['c12','ci','off',0]];
  d.subs=SB.map(([cid,plan,status,used],i)=>({id:'a'+(i+1),cid,plan,status,used,credit:0,day:i%3===2?1:7,method:i%4===3?'Cartão':'Pix automático',since:d.clients.find(c=>c.id===cid).since,pausedUntil:null,courtesyUntil:null,exempt:false}));
  // agenda: semana atual + próxima
  const monday=new Date(today);monday.setDate(monday.getDate()-((today.getDay()+6)%7));
  const now=new Date(),nowM=now.getHours()*60+now.getMinutes();
  for(let k=0;k<14;k++){
    const day=new Date(monday);day.setDate(monday.getDate()+k);const ds=iso(day),h=d.hours[day.getDay()];
    if(!h||d.holidays.some(x=>x.date===ds))continue;
    const r=rng(ds);let m=toMin(h[0]);const end=toMin(h[1]);
    while(m<end){
      if(day.getDay()<=5&&m===toMin(d.lunch[0])){m=toMin(d.lunch[1]);continue}
      const x=r();
      if(x<.6){
        const svc=x<.25?'Corte + Barba':['Corte','Barba','Combo Especial','Corte','Corte + Pigmentação'][Math.floor(x*100)%5];
        const dur=svc==='Corte + Barba'||svc==='Combo Especial'||svc==='Corte + Pigmentação'?60:svc==='Barba'?30:45;
        if(m+dur>end)break;
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
    {id:uid(),t:Date.now()-86400000*2,who:'Athos',area:'Serviços',desc:'Preço do Combo Especial alterado de R$ 95 para R$ 99'},
    {id:uid(),t:Date.now()-86400000,who:'Sistema',area:'Assinaturas',desc:'Assinatura de Diego Ramos suspensa por falta de pagamento'},
    {id:uid(),t:Date.now()-3600000*5,who:'Site',area:'Agenda',desc:'Novo agendamento pelo site: Renan Dias'}];
  return d;
}

function load(){try{const s=localStorage.getItem(KEY);if(s){const o=JSON.parse(s);if(o&&o.v===1)return o}}catch(e){}return null}
let data=load();if(!data){data=defaults();try{localStorage.setItem(KEY,JSON.stringify(data))}catch(e){}}
let imgs={};try{imgs=JSON.parse(localStorage.getItem(IMGKEY)||'{}')}catch(e){}

window.DB={
  data,iso,toMin,toHM,uid,
  save(){try{localStorage.setItem(KEY,JSON.stringify(this.data));return true}catch(e){return false}},
  /* toda alteração passa por aqui: grava o estado anterior para poder desfazer */
  mutate(key,fn,desc,area,who){
    const before=JSON.stringify(this.data[key]);fn(this.data[key]);
    this.data.log.push({id:uid(),t:Date.now(),who:who||'Athos',area:area||'Geral',desc,key,before});
    const L=this.data.log;if(L.length>120)L.splice(0,L.length-120);
    L.slice(0,-30).forEach(e=>{if(e.before){delete e.before;e.key=null}});
    return this.save();
  },
  undo(id){
    const e=this.data.log.find(x=>x.id===id);if(!e||!e.key||!e.before||e.undone)return false;
    const cur=JSON.stringify(this.data[e.key]);this.data[e.key]=JSON.parse(e.before);e.undone=true;
    this.data.log.push({id:uid(),t:Date.now(),who:'Athos',area:e.area,desc:'Desfeito: '+e.desc,key:e.key,before:cur});
    return this.save();
  },
  laterSameKey(id){const i=this.data.log.findIndex(x=>x.id===id),e=this.data.log[i];return e?this.data.log.slice(i+1).filter(x=>x.key===e.key).length:0},
  reset(){try{localStorage.removeItem(KEY);localStorage.removeItem(IMGKEY)}catch(e){}},
  exportAll(){return JSON.stringify({db:this.data,images:imgs},null,1)},
  importAll(txt){const o=JSON.parse(txt);if(!o.db||o.db.v!==1)throw new Error('Arquivo inválido');localStorage.setItem(KEY,JSON.stringify(o.db));localStorage.setItem(IMGKEY,JSON.stringify(o.images||{}))},
  img:{get:id=>imgs[id]||null,set(id,url){imgs[id]=url;try{localStorage.setItem(IMGKEY,JSON.stringify(imgs));return true}catch(e){delete imgs[id];return false}},del(id){delete imgs[id];try{localStorage.setItem(IMGKEY,JSON.stringify(imgs))}catch(e){}}},
  /* horários livres de um dia, respeitando funcionamento, almoço, feriados, agendamentos e bloqueios */
  freeSlots(date,dur){
    const dt=new Date(date+'T00:00:00'),h=this.data.hours[dt.getDay()];
    if(!h||this.data.holidays.some(x=>x.date===date))return[];
    const step=this.data.settings.step||30,busy=this.data.appts.filter(a=>a.date===date&&a.status!=='cancel').map(a=>[toMin(a.start),toMin(a.start)+a.dur]);
    if(dt.getDay()<=5&&this.data.lunch)busy.push([toMin(this.data.lunch[0]),toMin(this.data.lunch[1])]);
    const now=new Date(),isToday=date===iso(new Date()),lim=now.getHours()*60+now.getMinutes()+(this.data.settings.minAdv||0);
    const out=[];for(let m=toMin(h[0]);m+dur<=toMin(h[1]);m+=step){if(isToday&&m<lim)continue;if(busy.some(([a,b])=>m<b&&m+dur>a))continue;out.push(toHM(m))}
    return out;
  }
};
})();
