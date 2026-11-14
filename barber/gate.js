/* agendar.html: quem não entrou escolhe antes entre entrar (assinante) ou agendar avulso */
(function(){let me=null,guest=null;try{me=localStorage.getItem('farias_me');guest=sessionStorage.getItem('farias_guest')}catch(e){}
const q=new URLSearchParams(location.search);
if(q.get('avulso')==='1'){try{sessionStorage.setItem('farias_guest','1')}catch(e){}return}
if(me||guest)return;
q.set('next','agendar');location.replace('entrar.html?'+q.toString())})();
