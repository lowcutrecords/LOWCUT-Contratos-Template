export const LABEL_STATEMENT='Declaro que actúo como representante autorizado de LOWCUT// Records y acepto este contrato en nombre del sello.';
export function canCountersign(c){return c.status==='signed'&&c.active!==false&&!!c.signature?.acceptedText&&!c.labelSignature;}
export function labelSignatureData(name,user){
  const legalName=String(name||'').trim();if(!legalName||legalName.length>150)throw Error('Escribí el nombre legal completo del representante (hasta 150 caracteres).');
  return {name:legalName,uid:user.uid,email:user.email,statement:LABEL_STATEMENT};
}

