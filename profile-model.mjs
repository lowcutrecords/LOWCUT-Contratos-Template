export function profileValues(user, profile={},artist={}){
  return {name:artist.name||profile.name||'',email:profile.email||user.email||''};
}
export function canSign(contract,uid,email){
  return contract.active!==false&&['pending','pending-signature'].includes(contract.status)&&
    ((contract.authorizedUids||[]).includes(uid)||String(contract.invitationEmail||'').toLowerCase()===String(email||'').toLowerCase());
}
export function profileDocuments(user,previous,contract,contractId,name){
  if(!user.emailVerified)throw new Error('Verificá tu email para continuar.');
  if(!name.trim())throw new Error('Completá tu nombre artístico.');
  if(previous&& (previous.active!==true||previous.role!=='artist'))throw new Error('Esta cuenta no tiene un perfil de artista activo.');
  if(!canSign(contract,user.uid,user.email))throw new Error('La invitación no está disponible para esta cuenta.');
  if(previous&&contract.artistId&&contract.artistId!==previous.artistId)throw new Error('La invitación está asignada a otro perfil artístico.');
  const artistId=previous?.artistId||contract.artistId||user.uid;
  return {artistId,user:previous?{name:name.trim()}:{active:true,artistId,email:user.email,name:name.trim(),role:'artist',registrationContractId:contractId},artist:{active:true,name:name.trim()}};
}

