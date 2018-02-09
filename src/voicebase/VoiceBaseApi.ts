import * as fetch from 'node-fetch';
import { Readable } from 'stream';
import * as FormData from 'form-data';
import delay from 'delay.ts';


export default class VoiceBase {

    baseUri = 'https://apis.voicebase.com/v3';

    constructor(public token: string) {
    }

    async recognize(dataSrc: Readable, config) {
        let body = new FormData()
        body.append('configuration', JSON.stringify(config))
        body.append('media', dataSrc)
        let res = await this.call('/media', {
            method: 'POST',
            body
        });
        /*
        { _links:
            { self: { href: '/v3/media/xxxx' },
                metadata:
                { href: '/v3/media/xxx/metadata' } },
            formatVersion: '3.0.2',
            mediaId: 'xxx',
            status: 'accepted',
            dateCreated: '2018-02-09T06:29:17.283Z',
            metadata: {},
            mediaContentType: 'audio/mp4',
            length: 2065 }
        */
        let resBody = await res.json()
        let { mediaId, status } = resBody;
        if (status !== 'accepted') {
            throw new Error('Media upload failed: ' + status);
        }
        while (true) {
            await delay(8 * 1000)
            res = await this.call(`/media/${mediaId}/transcript/text`);
            if (res.status != 200) {
                continue
            }
            let transcript = await res.text();
            return transcript;
        }
    }

    recognizeWithCustomTerms(dataSrc: Readable, terms: string[]) {
        return this.recognize(dataSrc, {
            "vocabularies": [
                {
                    terms: terms.map(name => ({ term: name }))
                }
            ]
        });
    }

    call(endpoint: string, opts?) {
        opts = opts || {};
        let headers = opts.headers = opts.headers || {};
        headers.Authorization = 'Bearer ' + this.token;
        return fetch(this.baseUri + endpoint, opts);
    }

}