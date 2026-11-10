export function registrationLink(value){
  let url;try{url=new URL(value);}catch{throw Error('Pegá el enlace completo de tu invitación.');}
  if(url.origin!=='https://lowcutrecords.github.io'||!url.pathname.startsWith('/LOWCUT-Contratos-Template/'))throw Error('Usá el enlace de contrato que te envió LOWCUT.');
  const id=url.searchParams.get('contract');
  if(!id||id.length>200||id.includes('/'))throw Error('El enlace necesita el identificador de tu contrato.');
  const target=new URL('https://lowcutrecords.github.io/LOWCUT-Contratos-Template/');target.searchParams.set('contract',id);target.searchParams.set('mode','register');return target.href;
}

