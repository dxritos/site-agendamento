/* agendar.html: só agenda quem entrou com o WhatsApp. Sem login, vai para a tela de entrada e volta depois. */
(function(){let me=null;try{me=localStorage.getItem('farias_me');sessionStorage.removeItem('farias_guest')}catch(e){}
if(me)return;const q=new URLSearchParams(location.search);q.delete('avulso');q.set('next','agendar');location.replace('entrar.html?'+q.toString())})();
