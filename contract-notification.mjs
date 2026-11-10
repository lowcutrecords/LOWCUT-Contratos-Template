export const FORM_ENDPOINT='https://formspree.io/f/mvkoyllv';
const labels={legal_name:'Nombre legal',artist_name:'Nombre artístico',email:'Email de contacto',release_title:'Lanzamiento',release_type:'Tipo',main_artists:'Artistas principales',featuring:'Featuring',producers:'Productores',authors:'Autores / compositores',release_date:'Fecha prevista',genre:'Género',explicit:'Contenido explícito',master_owner:'Titular del master',credits:'Créditos adicionales'};
export function notificationPayload(id,c,stage='artist'){
  if(c.status!=='signed'||!c.signature?.name)throw Error('El contrato necesita una firma del artista registrada.');
  const url=new URL('https://lowcutrecords.github.io/LOWCUT-Contratos-Template/');url.searchParams.set('contract',id);
  const type=stage==='label'?'FIRMA DEL SELLO':stage==='resend'?'REENVÍO DE AVISO':'FIRMA DEL ARTISTA';
  const lines=[type,'Contrato: '+id,'Enlace privado: '+url.href,''];
  for(const [key,label] of Object.entries(labels))if(c.releaseData?.[key])lines.push(label+': '+c.releaseData[key]);
  lines.push('','Firma del artista: '+c.signature.name,'Email verificado: '+c.signature.email,'Fecha de firma del artista: '+(c.signedAt||''),'Revisión aceptada: '+c.signature.pageRevision);
  lines.push(c.labelSignature?'Firma del sello: '+c.labelSignature.name:'Firma del sello: PENDIENTE');
  if(c.labelSignature?.email)lines.push('Email del representante: '+c.labelSignature.email);
  return {_subject:'LOWCUT// CONTRATO · '+type+' · '+(c.title||id),email:c.signature.email,message:lines.join('\n'),contract_id:id,contract_url:url.href};
}
export async function sendContractNotification(id,c,stage='artist',fetchImpl=globalThis.fetch){
  const payload=notificationPayload(id,c,stage),abort=new AbortController();
  const timer=setTimeout(()=>abort.abort(),15000);
  try{
    const response=await fetchImpl(FORM_ENDPOINT,{method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},body:JSON.stringify(payload),signal:abort.signal});
    if(!response.ok){let details='';try{const body=await response.json();details=Array.isArray(body.errors)?body.errors.map(e=>e.message).filter(Boolean).join(' '):String(body.error||'');}catch{}
      throw Error('Formspree respondió '+response.status+(details?': '+details:'. Revisá la configuración del formulario.'));
    }
    return true;
  }catch(e){if(e.name==='AbortError')throw Error('Formspree tardó demasiado en responder. Podés reenviar el aviso desde el contrato firmado.');throw e;}
  finally{clearTimeout(timer);}
}

