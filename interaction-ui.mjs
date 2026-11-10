export function buttonBusy(button,waiting,label){
  if(waiting){if(!button.dataset.idleLabel)button.dataset.idleLabel=button.textContent;button.textContent=label;}
  else if(button.dataset.idleLabel){button.textContent=button.dataset.idleLabel;delete button.dataset.idleLabel;}
  button.disabled=waiting;button.classList.toggle('is-busy',waiting);button.setAttribute('aria-busy',String(waiting));
}

