/* painel.html: só abre com a sessão da equipe (vale 12 h). ?demo libera para apresentação.
   PROTÓTIPO: a trava é no navegador e pode ser contornada. A proteção real será a sessão por cookie conferida no servidor. */
(function(){if(new URLSearchParams(location.search).has('demo'))return;let ok=false;
try{const s=JSON.parse(localStorage.getItem('farias_staff')||'null');ok=!!(s&&typeof s.exp==='number'&&s.exp>Date.now());if(!ok)localStorage.removeItem('farias_staff')}catch(e){}
if(!ok)location.replace('entrar.html#equipe')})();
