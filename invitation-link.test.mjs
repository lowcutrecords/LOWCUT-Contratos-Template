import test from 'node:test';
import assert from 'node:assert/strict';
import {registrationLink} from './invitation-link.mjs';
test('invitation keeps the contract and opens registration on the same service',()=>{const url=new URL(registrationLink('https://lowcutrecords.github.io/LOWCUT-Contratos-Template/?contract=release123'));assert.equal(url.searchParams.get('contract'),'release123');assert.equal(url.searchParams.get('mode'),'register');});
test('registration rejects missing, unrelated and external invitation links',()=>{for(const link of ['invalid','https://example.com/?contract=x','https://lowcutrecords.github.io/LOWCUT-Contratos-Template/','https://lowcutrecords.github.io/LOWCUT-Records-Portal/?contract=x','https://lowcutrecords.github.io/LOWCUT-Contratos-Template/?contract=a%2Fb'])assert.throws(()=>registrationLink(link));});

