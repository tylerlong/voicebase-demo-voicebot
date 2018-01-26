import * as fetch from 'node-fetch'
import * as FormData from 'form-data'
import * as fs from 'fs'
import delay from 'delay.ts'

let mediaFile = process.argv[2]
let mediaConfig = {
    "speechModel": {
        "language": "en-US"
    },
    "transcript": {
        "formatting": {
            "enableNumberFormatting": false
        }
    },
    /*"vocabularies": [
        {
            "vocabularyName" :  "rc-vocab"
        }
    ]*/
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
    let {mediaId, status} = resJson
    console.log('Media upload status', status)

    while(true) {
        await delay(10*1000)
        console.log('Checking...')
        res = await fetch(`https://apis.voicebase.com/v3/media/${mediaId}/transcript/text`, {headers})
        if(res.status!=200) {
            continue
        }
        let transcript = await res.text();
        console.log('Transcript:\n', transcript)
        break
    }
}
