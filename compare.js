// @ts-check

const fs = require('fs').promises;
const { HttpClient } = require('typed-rest-client/HttpClient');
const { getPublicGalleryAPI } = require('vsce/out/util');
const { PublicGalleryAPI } = require('vsce/out/publicgalleryapi');
const { ExtensionQueryFlags, PublishedExtension } = require('azure-devops-node-api/interfaces/GalleryInterfaces');

const msGalleryApi = getPublicGalleryAPI();
msGalleryApi.client = new HttpClient(msGalleryApi.client.userAgent, undefined, {
    allowRetries: true,
    maxRetries: 5
});
const openGalleryApi = new PublicGalleryAPI('https://open-vsx.org/vscode', '3.0-preview.1');
openGalleryApi.client = new HttpClient(openGalleryApi.client.userAgent, undefined, {
    allowRetries: true,
    maxRetries: 5
});
openGalleryApi.post = (url, data, additionalHeaders) =>
    openGalleryApi.client.post(`${openGalleryApi.baseUrl}${url}`, data, additionalHeaders);

const flags = [
    ExtensionQueryFlags.IncludeStatistics,
    ExtensionQueryFlags.IncludeVersions,
];

(async () => {
    /**
     * @type {{
     *    extensions: {
     *        id: string,
     *    }[]
     * }}
     */
    const { extensions } = JSON.parse(await fs.readFile('./extensions.json', 'utf-8'));
    console.log('// @ts-check');
    console.log('exports.data = [');
    let first = true;
    for (const { id } of extensions) {
        if (!first) {
            console.log(',')
        }
        first = false;
        const [openExtension, msExtension] = await Promise.allSettled([openGalleryApi.getExtension(id, flags), msGalleryApi.getExtension(id, flags)]);
        let openVersion;
        let openLastUpdated;
        if (openExtension.status === 'fulfilled') {
            openVersion = openExtension.value?.versions[0]?.version;
            openLastUpdated = openExtension.value?.versions[0]?.lastUpdated?.toJSON()
        }
        let msVersion;
        let msLastUpdated;
        let msInstalls;
        let msPublisher;
        if (msExtension.status === 'fulfilled') {
            msVersion = msExtension.value?.versions[0]?.version;
            msLastUpdated = msExtension.value?.versions[0]?.lastUpdated?.toJSON()
            msInstalls = msExtension.value?.statistics?.find(s => s.statisticName === 'install')?.value;
            msPublisher = msExtension.value?.publisher.publisherName;
        }
        console.log({
            id,
            openVersion,
            msVersion,
            openLastUpdated,
            msLastUpdated,
            msInstalls,
            msPublisher
        });
    }
    console.log(']');
})();