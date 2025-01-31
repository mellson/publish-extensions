/********************************************************************************
 * Copyright (c) 2021 Gitpod and others
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * SPDX-License-Identifier: EPL-2.0
 ********************************************************************************/

// @ts-check
const fs = require('fs');

/**
 * @param {{ [id: string]: (import('./types').ExtensionStat | import('./types').ExtensionStat) }} s 
 */
function sortedKeys(s) {
    return Object.keys(s).sort((a, b) => {
        if (typeof s[b].msInstalls === 'number' && typeof s[a].msInstalls === 'number') {
            return s[b].msInstalls - s[a].msInstalls;
        }
        if (typeof s[b].msInstalls === 'number') {
            return s[b].msInstalls;
        }
        return -1;
    })
}

(async () => {
    /** @type{import('./types').PublishStat}*/
    const stat = JSON.parse(await fs.promises.readFile("/tmp/stat.json", { encoding: 'utf8' }));

    const upToDate = Object.keys(stat.upToDate).length;
    const unstable = Object.keys(stat.unstable).length;
    const outdated = Object.keys(stat.outdated).length;
    const notInOpen = Object.keys(stat.notInOpen).length;
    const notInMS = stat.notInMS.length;
    const total = upToDate + notInOpen + outdated + unstable + notInMS;
    const hitMiss = Object.keys(stat.hitMiss).length;
    const hit = Object.keys(stat.hitMiss).filter(id => stat.hitMiss[id].hit).length;
    const msPublished = Object.keys(stat.msPublished).length;

    let summary = '----- Summary -----\r\n';
    summary += `Up-to-date (MS Marketplace == Open VSX): ${upToDate} (${(upToDate / total * 100).toFixed(0)}%)\r\n`;
    summary += `Outdated (Not in OpenVSX, but in MS marketplace): ${notInOpen} (${(notInOpen / total * 100).toFixed(0)}%)\r\n`;
    summary += `Outdated (MS marketplace > Open VSX): ${outdated} (${(outdated / total * 100).toFixed(0)}%)\r\n`;
    summary += `Unstable (MS marketplace < Open VSX): ${unstable} (${(unstable / total * 100).toFixed(0)}%)\r\n`;
    summary += `Not in MS marketplace: ${notInMS} (${(notInMS / total * 100).toFixed(0)}%)\r\n`;
    summary += `MS is publisher: ${msPublished} (${(msPublished / total * 100).toFixed(0)}%)\r\n`;
    summary += `Published to OpenVSX within 2 days after in MS for last 30 days: ${hit} (${(hit / hitMiss * 100).toFixed(0)}%)\r\n`;
    if (stat.failed.length) {
        process.exitCode = -1;
        summary += 'Following extensions failed to publish:\r\n';
        summary += stat.failed.join(', ') + '\r\n';
    } else {
        summary += 'All extensions published successfully.\r\n';
    }
    summary += '-------------------\r\n\r\n';
    console.log(summary);

    let content = summary;
    if (outdated) {
        process.exitCode = -1;
        content += '----- Outdated (MS marketplace > Open VSX version) -----\r\n';
        for (const id of sortedKeys(stat.outdated)) {
            const r = stat.outdated[id];
            content += `${id} (installs: ${r.msInstalls}, daysInBetween: ${r.daysInBetween.toFixed(0)}): ${r.msVersion} > ${r.openVersion}\r\n`;
        }
        content += '-------------------\r\n\r\n';
    }

    if (notInOpen) {
        process.exitCode = -1;
        content += '----- Not published to Open VSX, but in MS marketplace -----\r\n';
        for (const id of Object.keys(stat.notInOpen).sort((a, b) => stat.notInOpen[b].msInstalls - stat.notInOpen[a].msInstalls)) {
            const r = stat.notInOpen[id];
            content += `${id} (installs: ${r.msInstalls}): ${r.msVersion}\r\n`;
        }
        content += '-------------------\r\n\r\n';
    }

    if (unstable) {
        process.exitCode = -1;
        content += '----- Unstable (Open VSX > MS marketplace version) -----\r\n';
        for (const id of sortedKeys(stat.unstable)) {
            const r = stat.unstable[id];
            content += `${id} (installs: ${r.msInstalls}, daysInBetween: ${r.daysInBetween.toFixed(0)}): ${r.openVersion} > ${r.msVersion}\r\n`;
        }
        content += '-------------------\r\n\r\n';
    }

    if (notInMS) {
        process.exitCode = -1;
        content += '----- Not published to MS marketplace -----\r\n';
        content += stat.notInMS.join(', ') + '\r\n';
        content += '-------------------\r\n\r\n';
    }

    if (msPublished) {
        content += '----- MS extensions -----\r\n'
        for (const id of Object.keys(stat.msPublished).sort((a, b) => stat.msPublished[b].msInstalls - stat.msPublished[a].msInstalls)) {
            const r = stat.msPublished[id];
            content += `${id} (installs: ${r.msInstalls})\r\n`;
        }
        content += '-------------------\r\n\r\n';
    }

    if (hitMiss) {
        content += '----- Published to OpenVSX within 2 days after in MS for last 30 days -----\r\n';
        for (const id of sortedKeys(stat.hitMiss)) {
            const r = stat.hitMiss[id];
            content += `${r.hit ? '+' : '-'} ${id}: installs: ${r.msInstalls}; daysInBetween: ${r.daysInBetween?.toFixed(0)}; MS marketplace: ${r.msVersion}; Open VSX: ${r.openVersion}\r\n`;
        }
        content += '-------------------\r\n\r\n';
    }

    if (upToDate) {
        content += '----- Up-to-date (Open VSX = MS marketplace version) -----\r\n';
        for (const id of Object.keys(stat.upToDate).sort((a, b) => stat.upToDate[b].msInstalls - stat.upToDate[a].msInstalls)) {
            const r = stat.upToDate[id];
            content += `${id} (installs: ${r.msInstalls}, daysInBetween: ${r.daysInBetween.toFixed(0)}): ${r.openVersion}\r\n`;
        }
        content += '-------------------\r\n\r\n';
    }

    await fs.promises.writeFile("/tmp/result.log", content, { encoding: 'utf8' });
    console.log('See /tmp/result.log for detailed report.')
})();