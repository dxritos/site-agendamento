/* entrar.html */
const $=s=>document.querySelector(s);
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2600)};
// marca o campo inválido e leva o foco até ele
const bad=el=>{el.setAttribute("aria-invalid","true");el.focus();el.addEventListener("input",()=>el.removeAttribute("aria-invalid"),{once:true})};
// vindo do "Agendar": mostra a opção de seguir sem login e, depois de entrar, volta para o agendamento
const Q=new URLSearchParams(location.search),NEXT=Q.get('next')==='agendar',SUBS=Q.get('next')==='assinar',PLANO=/^[\w-]{1,40}$/.test(Q.get('plano')||'')?Q.get('plano'):'';
const fwd=()=>{const p=new URLSearchParams();['d','t'].forEach(k=>{const v=Q.get(k)||'';if(/^[\d:]{1,5}$/.test(v))p.set(k,v)});const q=p.toString();return 'agendar.html'+(q?'?'+q:'')};
const dest=()=>NEXT?fwd():SUBS?'index.html'+(PLANO?'?assinar='+encodeURIComponent(PLANO):'')+'#planos':'assinante.html';
if(SUBS){$('.roles').hidden=true;$('#s1-t').textContent='Entre para assinar';$('#s1-l').textContent='Digite seu WhatsApp. Enviamos um código, sem senha. Depois você confirma o plano escolhido.'}
if(NEXT){$('.roles').hidden=true;$('#s1-t').textContent='Entre para agendar';$('#s1-l').textContent='Digite seu WhatsApp. Enviamos um código, sem senha. Se for sua primeira vez, fazemos seu cadastro na hora.'}
// bairros para a pesquisa do cadastro: lista do painel + os já usados por outros clientes
$('#bairros').innerHTML=[...new Set([...(DB.data.settings.bairros||[]),...DB.data.clients.map(c=>c.bairro).filter(Boolean)])].sort((a,b)=>a.localeCompare(b,'pt-BR')).map(b=>`<option value="${String(b).replace(/[&<>"]/g,'')}">`).join('');
// alterna cliente / equipe
document.querySelectorAll('.role').forEach(b=>b.onclick=()=>{
  document.querySelectorAll('.role').forEach(x=>x.classList.toggle('on',x===b));
  $('#mode-cli').classList.toggle('on',b.dataset.r==='cli');$('#mode-adm').classList.toggle('on',b.dataset.r==='adm');
});
if(location.hash==='#equipe')document.querySelector('[data-r=adm]').click();
// cliente: telefone + código
$("#tel").oninput=e=>{e.target.removeAttribute("aria-invalid");let d=e.target.value.replace(/\D/g,'').slice(0,11),o='';
  if(d.length>0)o='('+d.slice(0,2);if(d.length>=2)o+=') ';if(d.length>2)o+=d.slice(2,3)+' ';if(d.length>3)o+=d.slice(3,7);if(d.length>7)o+='-'+d.slice(7);e.target.value=o;$('#e1').textContent=''};
let timer;
function startTimer(){let s=30;const b=$('#resend');b.disabled=true;clearInterval(timer);
  timer=setInterval(()=>{s--;b.textContent=s>0?`Reenviar em ${s}s`:'Reenviar código';if(s<=0){b.disabled=false;clearInterval(timer)}},1000)}
$('#send').onclick=()=>{if($('#tel').value.replace(/\D/g,'').length!==11){$("#e1").textContent="Número inválido. Use DDD + 9 dígitos.";bad($("#tel"));return}
  $('#telshow').textContent=$('#tel').value;$('#s1').classList.remove('on');$('#s2').classList.add('on');ins[0].focus();startTimer();toast('Código enviado no WhatsApp')};
const ins=[...document.querySelectorAll('#code input')];
ins.forEach((el,i)=>{
  el.oninput=()=>{el.value=el.value.replace(/\D/g,'');$('#code').classList.remove('err');$('#e2').textContent='';if(el.value&&i<5)ins[i+1].focus();if(ins.every(x=>x.value))$('#verify').click()};
  el.onkeydown=e=>{if(e.key==='Backspace'&&!el.value&&i>0)ins[i-1].focus()};
  el.onpaste=e=>{const v=(e.clipboardData.getData('text')||'').replace(/\D/g,'').slice(0,6);if(v){e.preventDefault();v.split('').forEach((c,j)=>ins[j].value=c);if(v.length===6)$('#verify').click()}};
});
$('#verify').onclick=()=>{if(!ins.every(x=>x.value)){$('#code').classList.add('err');$("#e2").textContent="Digite os 6 dígitos.";(ins.find(x=>!x.value)||ins[0]).focus();return}
  $('#verify').textContent='Entrando…';
  const phone=$('#tel').value.replace(/\D/g,'');let c=DB.data.clients.find(x=>x.phone===phone);
  if(!c){$('#s2').classList.remove('on');$('#s3').classList.add('on');$('#nm').focus();$('#verify').textContent='Entrar';return}
  try{localStorage.setItem('farias_me',c.id)}catch(e){}
  setTimeout(()=>location.href=dest(),400)};
$('#nm-ok').onclick=()=>{const name=$('#nm').value.trim().replace(/\s+/g,' '),bairro=$('#bai').value.trim(),birth=$('#nasc').value,source=$('#src').value;
  if(name.split(' ').filter(w=>w.length>1).length<2){$("#e4").textContent="Digite nome e sobrenome.";bad($("#nm"));return}
  if(bairro.length<2){$("#e4").textContent="Informe o bairro onde você mora.";bad($("#bai"));return}
  if(birth&&(birth>DB.iso(new Date())||birth<'1920-01-01')){$("#e4").textContent="Confira a data de nascimento.";bad($("#nasc"));return}
  const phone=$('#tel').value.replace(/\D/g,''),c={id:'c'+DB.uid(),name,phone,bairro,birth:birth||null,source:source||null,notes:'',blocked:false,misses:0,since:['jan','fev','mar','abr','mai','jun','jul','ago','set','out','nov','dez'][new Date().getMonth()]+'/'+String(new Date().getFullYear()).slice(2)};
  DB.mutate('clients',L=>L.push(c),`${name} criou conta pelo site (${bairro})`,'Clientes','Site');try{localStorage.setItem('farias_me',c.id)}catch(e){}
  $('#nm-ok').textContent='Entrando…';setTimeout(()=>location.href=dest(),400)};
['#nm','#bai'].forEach(q=>$(q).onkeydown=e=>{if(e.key==='Enter')$('#nm-ok').click()});['#nm','#bai','#nasc'].forEach(q=>$(q).addEventListener('input',()=>$('#e4').textContent=''));
$('#change').onclick=()=>{$('#s2').classList.remove('on');$('#s1').classList.add('on');ins.forEach(x=>x.value='')};
$('#resend').onclick=()=>{startTimer();toast('Novo código enviado')};
// equipe: e-mail + senha
$('#forgot').onclick=()=>{const em=$('#em').value.trim();if(!/\S+@\S+\.\S+/.test(em)){$("#e3").textContent="Digite seu e-mail acima para receber o link.";bad($("#em"));return}$('#e3').textContent='';toast('Enviamos um link de redefinição para '+em)};
$('#eye').onclick=()=>{const p=$("#pw"),show=p.type==="password";p.type=show?"text":"password";$("#eye").setAttribute("aria-pressed",show);$("#eye").setAttribute("aria-label",show?"Ocultar senha":"Mostrar senha")};
$('#admin').onclick=()=>{if(!/\S+@\S+\.\S+/.test($('#em').value)||$('#pw').value.length<4){$("#e3").textContent="Informe e-mail e senha.";bad(/\S+@\S+\.\S+/.test($("#em").value)?$("#pw"):$("#em"));return}
  $('#admin').textContent='Entrando…';try{localStorage.setItem('farias_staff',JSON.stringify({exp:Date.now()+12*3600e3}))}catch(e){}setTimeout(()=>location.href='painel.html',500)};
