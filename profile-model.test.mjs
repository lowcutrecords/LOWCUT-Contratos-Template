import test from 'node:test';
import assert from 'node:assert/strict';
import {profileValues,profileDocuments,canSign} from './profile-model.mjs';
const user={uid:'new',email:'artist@example.com',emailVerified:true};
const invite={status:'pending',active:true,artistId:'',authorizedUids:[],invitationEmail:'artist@example.com'};
test('profile prefill uses artist name and account email',()=>{assert.deepEqual(profileValues(user,{name:'Old',email:user.email},{name:'Edited'}),{name:'Edited',email:user.email});});
test('registration writes linked user and artist records',()=>{const d=profileDocuments(user,null,invite,'contract',' Artist ');assert.equal(d.user.role,'artist');assert.equal(d.user.artistId,user.uid);assert.deepEqual(d.artist,{name:'Artist',active:true});});
test('existing artist ID stays stable when correcting the name',()=>{const d=profileDocuments(user,{active:true,role:'artist',artistId:'lack'},invite,'contract','Edited');assert.equal(d.artistId,'lack');assert.deepEqual(d.user,{name:'Edited'});});
test('wrong, disabled, signed, unverified and mismatched artist invitations fail',()=>{assert.equal(canSign({...invite,active:false},user.uid,user.email),false);assert.equal(canSign({...invite,status:'signed'},user.uid,user.email),false);assert.equal(canSign(invite,'other','other@example.com'),false);assert.throws(()=>profileDocuments({...user,emailVerified:false},null,invite,'contract','Artist'));assert.throws(()=>profileDocuments(user,{active:false,role:'artist'},invite,'contract','Artist'));assert.throws(()=>profileDocuments(user,{active:true,role:'artist',artistId:'one'},{...invite,artistId:'two'},'contract','Artist'));});

