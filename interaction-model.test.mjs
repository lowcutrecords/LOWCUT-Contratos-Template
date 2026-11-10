import test from 'node:test';
import assert from 'node:assert/strict';
import {completionPercent} from './progress.mjs';
import {pickDraftData} from './draft-data.mjs';
const fields=[{name:'email',type:'email',value:'artist@example.com',valid:true,disabled:false},{name:'title',type:'text',value:'Release',valid:true,disabled:false},{name:'accept',type:'checkbox',checked:false,valid:false,disabled:false}];
test('autofilled fields start at zero until reviewed',()=>{assert.equal(completionPercent(fields,new Set()),0);});
test('progress advances as valid fields are completed or reviewed',()=>{assert.equal(completionPercent(fields,new Set(['email'])),33);assert.equal(completionPercent(fields,new Set(['email','title'])),67);assert.equal(completionPercent([...fields.slice(0,2),{...fields[2],checked:true,valid:true}],new Set(['email','title','accept'])),100);});
test('cleared, invalid and disabled fields are handled correctly',()=>{assert.equal(completionPercent([{...fields[0],value:''}],new Set(['email'])),0);assert.equal(completionPercent([{...fields[0],valid:false}],new Set(['email'])),0);assert.equal(completionPercent([{...fields[0],disabled:true}],new Set(['email'])),0);});
test('signed contracts display complete progress',()=>{assert.equal(completionPercent(fields,new Set(),true),100);});
test('draft data keeps artist and release fields and excludes signature and permissions',()=>{const d=pickDraftData({legal_name:' Name ',email:'artist@example.com',release_title:'Release',electronic_signature:'Forged',contract_accept:'Sí',role:'admin',status:'signed'});assert.equal(d.legal_name,'Name');assert.equal(d.release_title,'Release');for(const key of ['electronic_signature','contract_accept','role','status'])assert.equal(key in d,false);});

