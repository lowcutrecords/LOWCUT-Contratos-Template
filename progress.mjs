export function completionPercent(controls,reviewed,signed=false){
  if(signed)return 100;
  const active=controls.filter(c=>!c.disabled&&!c.automatic);if(!active.length)return 0;
  const done=active.filter(c=>reviewed.has(c.name)&&c.valid&&(c.type==='checkbox'?c.checked:String(c.value||'').trim()!==''));
  return Math.round(done.length/active.length*100);
}
export function mountProgress(form,bar,label){
  const reviewed=new Set();let signed=false;
  function render(){
    const controls=[...form.querySelectorAll('[required]')].map(el=>({name:el.name,type:el.type,value:el.value,checked:el.checked,disabled:el.disabled,automatic:el.readOnly,valid:el.validity.valid}));
    const percent=completionPercent(controls,reviewed,signed);bar.style.width=percent+'%';bar.parentElement.setAttribute('aria-valuenow',String(percent));
    label.textContent=percent+'% '+(document.documentElement.lang==='en'?'COMPLETE':'COMPLETADO');
  }
  function review(event){const el=event.target;if(el?.matches?.('[required]')&&!el.disabled)reviewed.add(el.name);render();}
  for(const event of ['input','change','focusout'])form.addEventListener(event,review);
  form.addEventListener('contract-progress-render',render);
  form.addEventListener('contract-mode',event=>{reviewed.clear();signed=event.detail==='signed';render();});
  render();return render;
}

