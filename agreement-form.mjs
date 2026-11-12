import {isBandAgreement,parseMembers,serializeMembers,normalizedDni,validateAgreement,MAX_AUTHORITY_BYTES} from './agreement-model.mjs';
const copy={es:{heading:'INTEGRANTES Y REPRESENTACIÓN',lead:'Identificá a todos los integrantes. Quien firma debe contar con autorización de las personas que representa.',dni:'DNI de quien firma',role:'Carácter del firmante',choose:'Seleccionar',member:'Integrante autorizado',rep:'Representante autorizado',members:'Integrantes de la banda',name:'Nombre completo',add:'AGREGAR INTEGRANTE',remove:'QUITAR',file:'Autorización firmada · PDF de hasta 150 KB',help:'Obligatoria si firmás por otras personas. Adjuntá la autorización firmada por los integrantes representados. Se conserva en el contrato privado.',download:'DESCARGAR AUTORIZACIÓN',clear:'QUITAR ARCHIVO',confirm:'Confirmo que actúo por mí y/o con autorización escrita de los integrantes identificados para celebrar este acuerdo y otorgar las licencias previstas.',hero:'FIRMÁ EL ACUERDO.',intro:'Completá los integrantes y la representación, revisá las condiciones y firmá electrónicamente.',scope:'Este acuerdo comprende a la banda y el período establecido en su texto. No requiere identificar un lanzamiento.',annex:'ANEXO DE INTEGRANTES Y REPRESENTACIÓN',rights:'Confirmo que tengo facultades para celebrar el acuerdo y que cada grabación se entregará con los derechos y autorizaciones necesarios.',third:'Me comprometo a informar los materiales de terceros y aportar sus permisos antes de cada distribución.',accept:'He leído y acepto el acuerdo completo y los datos del anexo de integrantes y representación.'},en:{heading:'MEMBERS AND REPRESENTATION',lead:'Identify every band member. The signatory must hold authorization from the people they represent.',dni:'Signatory DNI number',role:'Signatory capacity',choose:'Select',member:'Authorized band member',rep:'Authorized representative',members:'Band members',name:'Full name',add:'ADD MEMBER',remove:'REMOVE',file:'Signed authorization · PDF up to 150 KB',help:'Required when signing for other people. Attach authorization signed by the represented members. It is retained within the private contract.',download:'DOWNLOAD AUTHORIZATION',clear:'REMOVE FILE',confirm:'I confirm that I act for myself and/or with written authorization from the identified members to enter into this agreement and grant the contemplated licences.',hero:'SIGN THE AGREEMENT.',intro:'Complete the members and representation details, review the terms and sign electronically.',scope:'This agreement covers the band and the period stated in its text. No individual release needs to be identified.',annex:'MEMBERS AND REPRESENTATION ANNEX',rights:'I confirm that I have authority to enter into the agreement and that every recording will be delivered with the necessary rights and permissions.',third:'I undertake to disclose third-party materials and provide their permissions before each distribution.',accept:'I have read and accept the full agreement and the members and representation annex.'}};
export function mountAgreementForm(form){
  let contract={},mode='loading',attachment={name:'',data:''},fileBusy=false,attachmentGeneration=0,bandWasRendered=false;
  const card=document.createElement('section');card.id='band-data';card.className='section-card';card.hidden=true;
  card.innerHTML=`<div class="index">02 / BANDA</div><h2 data-band-copy="heading"></h2><p class="lead" data-band-copy="lead"></p><div class="grid2"><div class="field"><label for="representativeDni" data-band-copy="dni"></label><input id="representativeDni" name="representative_dni" inputmode="numeric" maxlength="12" pattern="[0-9. ]{7,12}" required></div><div class="field"><label for="representativeRole" data-band-copy="role"></label><select id="representativeRole" name="representative_role" required><option value="" data-band-copy="choose"></option><option value="member" data-band-copy="member"></option><option value="representative" data-band-copy="rep"></option></select></div></div><h3 data-band-copy="members"></h3><div id="bandMembers"></div><button type="button" id="addBandMember" class="primary" data-band-copy="add"></button><div class="field" style="margin-top:24px"><label for="authorityFile" data-band-copy="file"></label><input id="authorityFile" type="file" accept="application/pdf,.pdf" aria-describedby="authorityHelp"><p class="help" id="authorityHelp" data-band-copy="help"></p><span id="authorityFileStatus" role="status"></span><button type="button" id="authorityDownload" data-band-copy="download" hidden></button><button type="button" id="authorityClear" data-band-copy="clear" hidden></button></div><div id="authorityDeclaration" class="check"><input name="authority_confirm" type="checkbox" required value="Sí" id="authorityConfirm"><label for="authorityConfirm" data-band-copy="confirm"></label></div>`;
  document.getElementById('release-data').after(card);
  const annex=document.createElement('div');annex.id='bandAnnex';annex.hidden=true;annex.className='annex';annex.style.whiteSpace='pre-wrap';document.getElementById('annex').append(annex);
  const rows=card.querySelector('#bandMembers'),file=card.querySelector('#authorityFile');
  const releaseControls=[...document.querySelectorAll('#release-data input,#release-data select,#release-data textarea')];
  const originalRequired=new Map(releaseControls.map(el=>[el,el.required]));
  const originalText=new Map();
  const remember=el=>{if(el&&!originalText.has(el))originalText.set(el,el.innerHTML);return el;};
  ['.hero h1','.hero-copy > p','#contract-text > .lead','#annex > h2','.side a[href="#release-data"]'].forEach(s=>remember(document.querySelector(s)));
  const checkNames=['rights_confirm','third_party_confirm','contract_accept'];
  const checkTexts=checkNames.map(name=>remember(form.elements[name].closest('.check').querySelector('span')));
  const language=()=>document.documentElement.lang==='en'?'en':'es';
  const text=()=>copy[language()];
  const editable=()=>mode==='artist'||mode==='draft';
  function getRows(){return [...rows.children].map(row=>({name:row.querySelector('[data-member-name]').value,dni:row.querySelector('[data-member-dni]').value}));}
  function row(name='',dni=''){
    const el=document.createElement('div');el.className='grid2';el.style.cssText='border-bottom:1px solid #bbb;padding:12px 0;margin-bottom:12px';
    el.innerHTML='<div class="field"><label data-band-copy="name"></label><input data-member-name required maxlength="150" autocomplete="off"></div><div class="field"><label>DNI</label><input data-member-dni required inputmode="numeric" maxlength="12" pattern="[0-9. ]{7,12}"></div><button type="button" data-member-remove data-band-copy="remove"></button>';
    el.querySelector('[data-member-name]').value=name;el.querySelector('[data-member-dni]').value=dni;
    rows.append(el);renumber();
    el.querySelector('[data-member-remove]').addEventListener('click',()=>{el.remove();if(!rows.children.length)row();renumber();translate();refresh();form.dispatchEvent(new Event('input',{bubbles:true}));});
    translate();refresh();
  }
  function renumber(){[...rows.children].forEach((el,i)=>{for(const [kind,key] of [['name','name'],['dni','dni']]){const input=el.querySelector('[data-member-'+kind+']');input.name='member_'+key+'_'+i;input.id='bandMember'+i+kind;input.previousElementSibling.htmlFor=input.id;}});}
  function values(strict=false){return {representative_dni:normalizedDni(form.elements.representative_dni.value),representative_role:form.elements.representative_role.value,band_members:strict?serializeMembers(getRows()):getRows().map(r=>r.name.trim()+'|'+normalizedDni(r.dni)).join('\n'),authority_file_name:attachment.name,authority_file_data:attachment.data,authority_confirm:form.elements.authority_confirm.checked?'Sí':''};}
  function refresh(){
    const band=isBandAgreement(contract),edit=editable();card.hidden=!band;
    document.getElementById('release-data').hidden=band;
    for(const el of releaseControls){el.disabled=band||mode==='signed'||mode==='loading';el.required=!band&&originalRequired.get(el);if(band)el.setCustomValidity('');}
    for(const el of card.querySelectorAll('input,select,textarea,button'))el.disabled=!band||!edit;
    const required=getRows().length>1||form.elements.representative_role.value==='representative';
    file.required=band&&required&&!attachment.data;file.setCustomValidity(fileBusy?'Esperá a que termine de cargarse el PDF.':'');
    document.getElementById('authorityDeclaration').hidden=mode==='draft';form.elements.authority_confirm.disabled=!band||mode!=='artist';
    document.getElementById('authorityDownload').hidden=!attachment.data;document.getElementById('authorityDownload').disabled=!band||!attachment.data;
    document.getElementById('authorityClear').hidden=!attachment.data||!edit;
    document.getElementById('authorityFileStatus').textContent=attachment.name;
    document.querySelector('#annex .annex').hidden=band;annex.hidden=!band;
    if(band){const t=text();annex.textContent=t.members+':\n'+getRows().map((r,i)=>(i+1)+'. '+(r.name||'—')+' · DNI '+(r.dni||'—')).join('\n')+'\n\n'+t.name+': '+(form.elements.legal_name.value||'—')+'\nDNI: '+(form.elements.representative_dni.value||'—')+'\n'+t.role+': '+(form.elements.representative_role.selectedOptions[0]?.textContent||'—')+'\nEmail: '+(form.elements.email.value||'—')+'\n'+t.file+': '+(attachment.name||'—');}
    form.dispatchEvent(new Event('contract-progress-render'));
  }
  function translate(){
    const t=text();for(const el of card.querySelectorAll('[data-band-copy]'))el.textContent=t[el.dataset.bandCopy];
    if(isBandAgreement(contract)){
      bandWasRendered=true;
      document.querySelector('.hero h1').textContent=t.hero;document.querySelector('.hero-copy > p').textContent=t.intro;
      document.querySelector('#contract-text > .lead').textContent=t.scope;document.querySelector('#annex > h2').textContent=t.annex;
      const link=document.querySelector('.side a[href="#release-data"],.side a[href="#band-data"]');link.href='#band-data';link.textContent=language()==='en'?'02 / BAND':'02 / BANDA';
      const keys=['rights','third','accept'];checkTexts.forEach((el,i)=>el.textContent=t[keys[i]]);
      document.querySelector('#contract-text .summary').hidden=true;
    }else{
      document.querySelector('#contract-text .summary').hidden=false;
      if(bandWasRendered){
        bandWasRendered=false;
        for(const [el,html] of originalText)el.innerHTML=html;
        const link=document.querySelector('.side a[href="#band-data"]');if(link)link.href='#release-data';
        if(typeof window.applyLang==='function')window.applyLang(language());
      }
    }
    refresh();
  }
  card.querySelector('#addBandMember').addEventListener('click',()=>{row();form.dispatchEvent(new Event('input',{bubbles:true}));});
  file.addEventListener('change',async()=>{
    const selected=file.files[0];if(!selected)return;const generation=++attachmentGeneration;fileBusy=true;refresh();
    try{
      if(selected.size>MAX_AUTHORITY_BYTES||selected.size===0||selected.name.length>160)throw Error('Usá un PDF de hasta 150 KB y nombre de hasta 160 caracteres.');
      const bytes=new Uint8Array(await selected.arrayBuffer());if(new TextDecoder().decode(bytes.slice(0,5))!=='%PDF-')throw Error('El archivo debe ser un PDF.');
      let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
      if(generation===attachmentGeneration)attachment={name:selected.name,data:btoa(binary)};
    }catch(e){if(generation===attachmentGeneration){file.value='';document.getElementById('formError').textContent=e.message;}}
    finally{if(generation===attachmentGeneration){fileBusy=false;refresh();form.dispatchEvent(new Event('input',{bubbles:true}));}}
  });
  document.getElementById('authorityClear').addEventListener('click',()=>{++attachmentGeneration;fileBusy=false;attachment={name:'',data:''};file.value='';refresh();form.dispatchEvent(new Event('input',{bubbles:true}));});
  document.getElementById('authorityDownload').addEventListener('click',()=>{if(!attachment.data)return;const bytes=Uint8Array.from(atob(attachment.data),c=>c.charCodeAt(0));const url=URL.createObjectURL(new Blob([bytes],{type:'application/pdf'}));const a=document.createElement('a');a.href=url;a.download=attachment.name||'autorizacion.pdf';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);});
  form.addEventListener('input',refresh);form.addEventListener('change',refresh);
  document.addEventListener('contract-language',translate);
  form.addEventListener('contract-mode',e=>{mode=e.detail;translate();});
  return {
    configure(c,saved={}){++attachmentGeneration;fileBusy=false;contract=c;rows.replaceChildren();for(const r of parseMembers(saved.band_members))row(r.name,r.dni);if(!rows.children.length)row();attachment={name:saved.authority_file_name||'',data:saved.authority_file_data||''};file.value='';for(const key of ['representative_dni','representative_role'])form.elements[key].value=saved[key]||'';form.elements.authority_confirm.checked=saved.authority_confirm==='Sí';translate();},
    collect(base,signing=false){if(!isBandAgreement(contract))return base;if(fileBusy)throw Error('Esperá a que termine de cargarse el PDF.');const data={...base,...values(signing)};for(const key of Object.keys(data))if(key.startsWith('member_')||releaseControls.some(el=>el.name===key))delete data[key];if(signing)validateAgreement(data);return data;},
    isBand:()=>isBandAgreement(contract)
  };
}
