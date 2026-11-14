/* Proteção de conteúdo: desliga seleção, arrastar, menu de contexto e atalhos de salvar/copiar.
   Campos de formulário continuam normais. É um desestímulo, não uma trava: captura de tela não dá para impedir. */
(function(){
const field=e=>e.target&&e.target.closest&&e.target.closest('input,textarea,select,[contenteditable="true"]');
['contextmenu','dragstart','selectstart','copy','cut'].forEach(ev=>document.addEventListener(ev,e=>{if(!field(e))e.preventDefault()}));
document.addEventListener('keydown',e=>{const k=(e.key||'').toLowerCase();
  if((e.ctrlKey||e.metaKey)&&(k==='s'||k==='u'||k==='p'||(!field(e)&&(k==='c'||k==='a'||k==='x'))))e.preventDefault()});
})();
