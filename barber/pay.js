/* Ícones animados das formas de pagamento (site, área do assinante e painel) */
window.PAYIC={
 pix:'<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2.6l3.3 3.3-2.2 2.2a1.6 1.6 0 0 1-2.2 0L8.7 5.9zM5.9 8.7l2.2 2.2a1.6 1.6 0 0 1 0 2.2l-2.2 2.2L2.6 12zM18.1 8.7l3.3 3.3-3.3 3.3-2.2-2.2a1.6 1.6 0 0 1 0-2.2zM12 21.4l-3.3-3.3 2.2-2.2a1.6 1.6 0 0 1 2.2 0l2.2 2.2z"/></svg>',
 card:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2.5" y="5" width="19" height="14" rx="2.5"/><path d="M2.5 9.5h19"/><rect class="chip" x="5.5" y="12.5" width="4.2" height="3.2" rx=".7" fill="currentColor" stroke="none"/></svg>',
 cash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5v5M18 9.5v5"/></svg>',
 pos:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="6" y="2.5" width="12" height="19" rx="2.5"/><rect x="8.5" y="5" width="7" height="4" rx="1"/><path d="M9 13h.01M12 13h.01M15 13h.01M9 16h.01M12 16h.01M15 16h.01"/></svg>'};
window.payKey=m=>/maquin|d[eé]bito/i.test(m)?'pos':/pix/i.test(m)?'pix':/dinheiro/i.test(m)?'cash':'card';
window.payIcon=m=>{const k=payKey(m);return `<span class="pay-ic ic-${k}">${PAYIC[k]}</span>`};
document.querySelectorAll('[data-payic]').forEach(el=>el.insertAdjacentHTML('afterbegin',payIcon(el.dataset.payic)));
/* ao escolher a forma de pagamento, o botão de confirmar troca o ícone */
document.addEventListener('click',e=>{const o=e.target.closest('.opt[data-payic]');if(!o)return;const box=o.closest('.mbox,.card,form,body');const b=box&&box.querySelector('[data-paybtn]');if(!b)return;const ic=b.querySelector('.pay-ic');if(ic)ic.outerHTML=payIcon(o.dataset.payic);else b.insertAdjacentHTML('afterbegin',payIcon(o.dataset.payic))});
