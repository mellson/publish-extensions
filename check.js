// @ts-check

const semver = require('semver');
const data = require('./data').data.sort((a, b) => {
  if (typeof b.msInstalls === 'number' && typeof a.msInstalls === 'number') {
    return b.msInstalls - a.msInstalls;
  }
  if (typeof b.msInstalls === 'number') {
    return b.msInstalls;
  }
  return -1;
});

//#region mismatches
console.log('Mismatches:')
let notInOpen = 0;
let notInMS = 0;
let mismatchGt = 0;
let mismatchLt = 0;
let match = 0;
for (const r of data) {
  if (r.openVersion === undefined) {
    console.log(`${r.id} (installs: ${r.msInstalls}): not in OpenVSX`)
    notInOpen++;
  }
  if (r.msVersion === undefined) {
    console.log(`${r.id}: not in marketplace`)
    notInMS++;
  }
  if (r.openVersion && r.msVersion) {
    const daysInBetween = ((new Date(r.openLastUpdated).getTime() - new Date(r.msLastUpdated).getTime()) / (1000 * 3600 * 24)).toFixed(0);
    if (semver.gt(r.msVersion, r.openVersion)) {
      console.log(`${r.id} (installs: ${r.msInstalls}, daysInBetween: ${daysInBetween}): marketplace (${r.msVersion}) > Open VSX (${r.openVersion})`);
      mismatchGt++;
    } else if (semver.lt(r.msVersion, r.openVersion)) {
      console.log(`${r.id} (installs: ${r.msInstalls}, daysInBetween: ${daysInBetween}): marketplace (${r.msVersion}) < Open VSX (${r.openVersion})`);
      mismatchLt++;
    } else {
      match++;
    }
  }
}
console.log('');
//#endregion

//#region days in between for recently updated in MS
console.log('Published withing 2 days for extensions updated in 30 days:')
let total = 0;
let hit = 0;
let miss = 0;
for (const r of data) {
  if (r.openVersion && r.msVersion) {
    const monthAgo = new Date()
    monthAgo.setMonth(monthAgo.getMonth() - 1);

    if (monthAgo.getTime() > new Date(r.msLastUpdated).getTime()) {
      continue;
    }

    total++;

    const daysInBetween = ((new Date(r.openLastUpdated).getTime() - new Date(r.msLastUpdated).getTime()) / (1000 * 3600 * 24));
    const ontime = 0 < daysInBetween && daysInBetween <= 2;
    console.log(`${ontime ? '+' : '-'} ${r.id}: installs: ${r.msInstalls}; daysInBetween: ${daysInBetween}; marketplace: ${r.msVersion}; Open VSX: ${r.openVersion}`)
    if (ontime) {
      hit++;
    } else {
      miss++;
    }
  }
}
console.log('')
//#endregion

//#region published by MS
console.log('MS publish:')
let msPublished = 0;
const otherPublishers = new Set();
const msPublishers = new Set(['ms-python', 'ms-toolsai', 'ms-vscode', 'dbaeumer', 'GitHub', 'Tyriar', 'ms-azuretools', 'msjsdiag', 'ms-mssql', 'vscjava', 'ms-vsts']);
for (const r of data) {
  if (msPublishers.has(r.msPublisher)) {
    console.log(`${r.id} (installs: ${r.msInstalls})`);
    msPublished++;
  } else {
    otherPublishers.add(r.msPublisher);
  }
}
console.log(`Other publishers: ${[...otherPublishers]}`);
console.log('')
//#endregion

console.log('Summary')
console.log(`Not in OpenVSX: ${notInOpen} (${(notInOpen / data.length * 100).toFixed(0)}%)`);
console.log(`Not in marketplace: ${notInMS} (${(notInMS / data.length * 100).toFixed(0)}%)`);
console.log(`Marketplace > Open VSX: ${mismatchGt} (${(mismatchGt / data.length * 100).toFixed(0)}%)`);
console.log(`Marketplace < Open VSX: ${mismatchLt} (${(mismatchLt / data.length * 100).toFixed(0)}%)`);
console.log(`Marketplace == Open VSX: ${match} (${(match / data.length * 100).toFixed(0)}%)`);
console.log(`MS is publisher: ${msPublished} (${(msPublished / data.length * 100).toFixed(0)}%)`);
console.log(`Published to OpenVSX within 2 days after MS for last 30 days: ${hit} (${(hit / total * 100).toFixed(0)}%)`);
console.log(`Not published to OpenVSX within 2 days after MS for last 30 days: ${miss} (${(miss / total * 100).toFixed(0)}%)`);