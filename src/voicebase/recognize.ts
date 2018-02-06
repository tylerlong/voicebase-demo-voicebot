import * as fetch from 'node-fetch'
import * as FormData from 'form-data'
import * as fs from 'fs'
import delay from 'delay.ts'

let mediaFile = process.argv[2]
let customVocabularyFile = process.argv[3]

let customVocabularyTerms = fs.readFileSync(customVocabularyFile).toString().trim().split(/[^A-Za-z0-9_\-]+/).filter(w => !!w);
console.log('Custom vocabulary terms:\n' + customVocabularyTerms.join(', ') + '\n')

let mediaConfig = {
    "speechModel": {
        "language": "en-US"
    },
    "transcript": {
        "formatting": {
            "enableNumberFormatting": false
        }
    },
    "vocabularies": [
        {
            terms: customVocabularyTerms.map(name => ({ term: name }))
            // { term: 'Embbnux', soundsLike: ['em-nux'] },

        }
    ]/**/
}

let config = require('../data/config.json')
let headers = {
    Authorization: 'Bearer ' + config.voicebaseToken
};
let body = new FormData()
body.append('configuration', JSON.stringify(mediaConfig))
body.append('media', fs.createReadStream(mediaFile))

main()


async function main() {
    let res = await fetch('https://apis.voicebase.com/v3/media', {
        method: 'POST',
        headers,
        body
    })
    let resJson = await res.json()
    let { mediaId, status } = resJson
    console.log('Media upload status', status)

    while (true) {
        await delay(8 * 1000)
        console.log('Checking...')
        res = await fetch(`https://apis.voicebase.com/v3/media/${mediaId}/transcript/text`, { headers })
        if (res.status != 200) {
            continue
        }
        let transcript = await res.text();
        console.log('Transcript:\n', transcript)
        break
    }
}
