import test from 'node:test';
import assert from 'node:assert/strict';
import {dateKey,minimumReleaseDate,validReleaseDate} from './contract-dates.mjs';
test('signature calendar date uses Buenos Aires rather than UTC',()=>{assert.equal(dateKey(new Date('2026-11-11T01:30:00Z')),'2026-11-10');assert.equal(dateKey(new Date('2026-11-11T03:00:00Z')),'2026-11-11');});
test('minimum release is fourteen calendar days after reference, including year and month boundaries',()=>{assert.equal(minimumReleaseDate(new Date('2026-11-10T15:00:00Z')),'2026-11-24');assert.equal(minimumReleaseDate(new Date('2026-12-25T15:00:00Z')),'2027-01-08');assert.equal(minimumReleaseDate(new Date('2028-02-20T15:00:00Z')),'2028-03-05');});
test('early and invalid release dates fail and the boundary is accepted',()=>{assert.equal(validReleaseDate('2026-11-23','2026-11-24'),false);assert.equal(validReleaseDate('2026-11-24','2026-11-24'),true);assert.equal(validReleaseDate('2026-02-31','2026-01-01'),false);});

