export const BAND_TYPE='band_agreement';
export const isBandAgreement=c=>c?.type===BAND_TYPE;
export const AGREEMENT_FIELDS=['representative_dni','representative_role','band_members','authority_file_name','authority_file_data'];
export const MAX_AUTHORITY_BYTES=150*1024;
export function normalizedDni(value){return String(value||'').replace(/[.\s]/g,'');}
export function serializeMembers(rows){
  const seen=new Set();
  if(!rows.length)throw Error('Agregá al menos un integrante.');
  const result=rows.map(row=>{
    const name=String(row.name||'').trim(),dni=normalizedDni(row.dni);
    if(!name||name.length>150||/[|\r\n]/.test(name))throw Error('Completá el nombre de cada integrante (hasta 150 caracteres).');
    if(!/^[0-9]{7,9}$/.test(dni))throw Error('Completá un DNI válido para cada integrante.');
    if(seen.has(dni))throw Error('Hay integrantes con el mismo DNI.');
    seen.add(dni);return name+'|'+dni;
  }).join('\n');
  if(result.length>40000)throw Error('La lista de integrantes supera el tamaño admitido por el contrato.');
  return result;
}
export function parseMembers(value){
  if(!value)return [];
  return String(value).split('\n').map(line=>{const [name,dni]=line.split('|');return {name:name||'',dni:dni||''};});
}
export function validateAgreement(values){
  const rows=parseMembers(values.band_members);serializeMembers(rows);
  const dni=normalizedDni(values.representative_dni);
  if(!/^[0-9]{7,9}$/.test(dni))throw Error('Completá el DNI de quien firma.');
  if(!['member','representative'].includes(values.representative_role))throw Error('Indicá en qué carácter firmás.');
  if(values.representative_role==='member'&&!rows.some(r=>r.dni===dni&&r.name===String(values.legal_name||'').trim()))throw Error('El nombre y DNI del firmante deben coincidir exactamente con un integrante.');
  const required=rows.length>1||values.representative_role==='representative';
  if(required&&!values.authority_file_data)throw Error('Adjuntá la autorización firmada por los integrantes representados.');
  if(values.authority_file_data&&(!String(values.authority_file_data).startsWith('JVBERi0')||values.authority_file_data.length>204800||!values.authority_file_name||values.authority_file_name.length>160))throw Error('La autorización debe ser un PDF de hasta 150 KB.');
  if(values.authority_confirm!=='Sí')throw Error('Confirmá tu autorización para firmar.');
  return true;
}
