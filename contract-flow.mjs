import {initializeApp} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {getAuth,createUserWithEmailAndPassword,signInWithEmailAndPassword,onAuthStateChanged,signOut,sendEmailVerification} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {getFirestore,doc,getDoc,runTransaction,serverTimestamp,onSnapshot} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import {profileValues,profileDocuments,canSign} from './profile-model.mjs';
const app=initializeApp({apiKey:'AIzaSyDcLpCPu-3eNKtd3j8w51RdiqCvP6L8WlU',authDomain:'lowcut-artist-portal.firebaseapp.com',projectId:'lowcut-artist-portal',appId:'1:483516737605:web:0dc3012d3e1db7db39db2c'});
const auth=getAuth(app),db=getFirestore(app),$=id=>document.getElementById(id);
const form=$('contractForm'),fields=$('contractFields'),msg=$('accountMessage');
const contractId=new URLSearchParams(location.search).get('contract');
const validId=contractId&&contractId.length<=200&&!contractId.includes('/');
let loaded=null,profile=null,unsubscribe=()=>{},generation=0,busy=false;
const defaults=new Map([...document.querySelectorAll('[data-contract-lang]')].map(el=>[el.dataset.contractLang,el.innerHTML]));
function say(text){msg.textContent=text;}
function error(e){console.error(e.code||e.message);say(e.code==='permission-denied'?'No hay permiso para esta invitación. Verificá el email de tu cuenta; si coincide, LOWCUT debe revisar las reglas de Firebase.':e.code?.startsWith('auth/')?'No se pudo completar el acceso. Revisá tus datos o volvé a iniciar sesión.':e.message||'No se pudo completar la operación.');}
function resetAccess(){fields.disabled=true;profile=null;loaded=null;unsubscribe();unsubscribe=()=>{};}
function prefill(p,a){
  const values=profileValues(auth.currentUser,p,a);$('profileName').value=values.name;
  for(const [key,value] of Object.entries({artist_name:values.name,main_artists:values.name,email:values.email}))form.elements[key].value=value;
  form.dispatchEvent(new Event('input',{bubbles:true}));
}
function renderContract(c){
  const custom=!!(c.pageContent?.es||c.pageContent?.en);
  document.querySelector('.terms').style.display=custom?'none':'';
  for(const el of document.querySelectorAll('[data-contract-lang]')){
    const lang=el.dataset.contractLang,text=c.pageContent?.[lang];
    if(text){el.textContent=text;el.style.whiteSpace='pre-wrap';}
    else {el.innerHTML=defaults.get(lang);el.style.whiteSpace='';}
  }
  if(c.title)form.elements.release_title.value=c.title;
  form.dispatchEvent(new Event('input',{bubbles:true}));
}
function renderSavedSignature(c){
  if(c.signature?.acceptedText){for(const el of document.querySelectorAll('[data-contract-lang]')){el.textContent=c.signature.acceptedText;el.style.whiteSpace='pre-wrap';}}
  for(const [name,value] of Object.entries(c.releaseData||{})){const el=form.elements[name];if(!el)continue;if(el.type==='checkbox')el.checked=value==='Sí';else el.value=value;}
  form.dispatchEvent(new Event('input',{bubbles:true}));
}
async function loadAccount(user){
  const token=++generation;resetAccess();$('accountForm').hidden=!!user;$('profilePanel').hidden=!user;
  if(!validId){say('Este enlace necesita una invitación. Pedile a LOWCUT el enlace de tu contrato.');return;}
  if(!user){say('Iniciá sesión o creá tu cuenta para completar tu perfil.');return;}
  $('accountIdentity').textContent=user.email||'';
  $('accountVerify').hidden=user.emailVerified;$('accountRefresh').hidden=user.emailVerified;
  $('profileSave').disabled=!user.emailVerified;
  if(!user.emailVerified){say('Verificá tu email y después tocá «Ya verifiqué mi email».');return;}
  try{
    const snap=await getDoc(doc(db,'contracts',contractId));if(token!==generation)return;
    if(!snap.exists())throw Error('La invitación no existe.');
    loaded=snap.data();
    const userSnap=await getDoc(doc(db,'users',user.uid));if(token!==generation)return;
    profile=userSnap.exists()?userSnap.data():null;
    const admin=profile?.role==='admin'&&profile.active===true;
    if(profile&&(profile.active!==true||(!admin&&profile.role!=='artist')))throw Error('Esta cuenta no tiene acceso activo.');
    let artist=null;
    if(profile?.artistId){const a=await getDoc(doc(db,'artists',profile.artistId));if(token!==generation)return;artist=a.exists()?a.data():null;if(artist?.active===false)throw Error('El perfil artístico está desactivado.');}
    if(!admin)prefill(profile||{},artist||{});renderContract(loaded);
    if(loaded.status==='signed'){renderSavedSignature(loaded);say('CONTRATO FIRMADO · '+(loaded.signedAt||'')+' · '+(loaded.signature?.name||'Firma registrada')+'. Se muestra la aceptación guardada.');$('profileSave').disabled=true;return;}
    if(admin){say('VISTA ADMIN · Contrato '+(loaded.active===false?'desactivado':'pendiente')+'. Modificalo desde Gestión de contratos en el portal.');$('profileSave').disabled=true;return;}
    if(!canSign(loaded,user.uid,user.email))throw Error('La invitación está desactivada o corresponde a otra cuenta.');
    fields.disabled=!(profile&&artist?.active===true);
    say(fields.disabled?'Completá y guardá tu perfil para habilitar el contrato.':'Perfil cargado. Podés corregir los datos del contrato antes de firmar.');
    // Availability changes lock the form immediately. The transaction also checks at signing time.
    const seenRevision=loaded.pageRevision||1;
    unsubscribe=onSnapshot(doc(db,'contracts',contractId),s=>{
      if(token!==generation)return;
      const c=s.exists()?s.data():null;
      if(!c||!canSign(c,user.uid,user.email)){fields.disabled=true;say(c?.status==='signed'?'La firma ya quedó registrada.':'La invitación ya no está disponible.');}
      else if((c.pageRevision||1)!==seenRevision){fields.disabled=true;say('LOWCUT actualizó el texto. Recargá la página y revisalo antes de firmar.');}
    },e=>{fields.disabled=true;error(e);});
  }catch(e){fields.disabled=true;$('profileSave').disabled=true;error(e);}
}
onAuthStateChanged(auth,loadAccount);
$('accountForm').addEventListener('submit',async e=>{e.preventDefault();if(busy)return;busy=true;try{await signInWithEmailAndPassword(auth,$('accountEmail').value.trim(),$('accountPassword').value);$('accountPassword').value='';}catch(e){error(e);}finally{busy=false;}});
$('accountCreate').addEventListener('click',async()=>{
  if(busy||!validId)return;if(!$('accountForm').reportValidity())return;busy=true;
  try{const c=await createUserWithEmailAndPassword(auth,$('accountEmail').value.trim(),$('accountPassword').value);$('accountPassword').value='';await sendEmailVerification(c.user);say('Cuenta creada. Revisá tu correo para verificar el email.');}catch(e){error(e);}finally{busy=false;}
});
$('accountVerify').addEventListener('click',async()=>{try{await sendEmailVerification(auth.currentUser);say('Verificación enviada. Revisá tu correo.');}catch(e){error(e);}});
$('accountRefresh').addEventListener('click',async()=>{try{await auth.currentUser.reload();await auth.currentUser.getIdToken(true);await loadAccount(auth.currentUser);}catch(e){error(e);}});
$('accountLogout').addEventListener('click',async()=>{++generation;resetAccess();form.reset();$('profileName').value='';await signOut(auth);});
$('profileSave').addEventListener('click',async()=>{
  if(busy||!validId)return;const user=auth.currentUser;if(!user?.emailVerified)return;busy=true;$('profileSave').disabled=true;fields.disabled=true;
  try{
    const name=$('profileName').value;
    await runTransaction(db,async tx=>{
      const u=doc(db,'users',user.uid),c=await tx.get(doc(db,'contracts',contractId)),p=await tx.get(u);
      if(!c.exists())throw Error('La invitación no existe.');
      const values=profileDocuments(user,p.exists()?p.data():null,c.data(),contractId,name);
      tx.set(u,values.user,{merge:true});tx.set(doc(db,'artists',values.artistId),values.artist,{merge:true});
      tx.update(doc(db,'contracts',contractId),{artistId:values.artistId,artistIds:[values.artistId],authorizedUids:[...new Set([...(c.data().authorizedUids||[]),user.uid])],updatedAt:serverTimestamp()});
    });
    if(auth.currentUser?.uid===user.uid)await loadAccount(user);
  }catch(e){error(e);}finally{busy=false;$('profileSave').disabled=false;}
});
form.addEventListener('submit',async e=>{
  e.preventDefault();if(busy||fields.disabled)return;
  if(!form.checkValidity()){form.reportValidity();return;}
  const user=auth.currentUser;if(!user?.emailVerified)return;
  const values=Object.fromEntries(new FormData(form));
  if(values.legal_name.length>150||values.electronic_signature.length>150){$('formError').textContent='El nombre legal admite hasta 150 caracteres.';return;}
  if(values.electronic_signature.trim()!==values.legal_name.trim()){$('formError').textContent='La firma debe coincidir con tu nombre legal.';return;}
  const lang=document.documentElement.lang==='en'?'en':'es';
  const acceptedText=document.querySelector('[data-contract-lang="'+lang+'"]').innerText;
  const revision=loaded.pageRevision||1;
  busy=true;$('submitBtn').disabled=true;$('formError').textContent='';
  try{
    await runTransaction(db,async tx=>{
      const ref=doc(db,'contracts',contractId),snap=await tx.get(ref),u=await tx.get(doc(db,'users',user.uid));
      if(!snap.exists()||!canSign(snap.data(),user.uid,user.email))throw Error('La invitación ya no está disponible.');
      const c=snap.data(),p=u.data();
      if(!p||p.active!==true||p.role!=='artist')throw Error('Completá tu perfil antes de firmar.');
      const artist=await tx.get(doc(db,'artists',p.artistId));
      if(!artist.exists()||artist.data().active!==true)throw Error('Tu perfil artístico no está activo.');
      if((c.pageRevision||1)!==revision)throw Error('El texto cambió. Recargá y revisá la nueva versión.');
      tx.update(ref,{status:'signed',artistId:p.artistId,artistIds:[p.artistId],authorizedUids:[...new Set([...(c.authorizedUids||[]),user.uid])],signedAt:values.signature_date,signedAtTimestamp:serverTimestamp(),signedBy:user.uid,
        signature:{name:values.electronic_signature,legalName:values.legal_name,email:user.email,contactEmail:values.email,language:lang,acceptedText,pageRevision:revision},releaseData:values,updatedAt:serverTimestamp()});
    });
    fields.disabled=true;unsubscribe();document.querySelector('.shell').style.display='none';document.querySelector('.hero').style.display='none';$('success').style.display='grid';window.scrollTo(0,0);
  }catch(e){$('formError').textContent=e.message||'No se pudo guardar la firma. Intentá nuevamente.';}
  finally{busy=false;$('submitBtn').disabled=false;}
});

