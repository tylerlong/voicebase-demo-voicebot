let fetch = require('node-fetch')

let config = require('../../data/config.json')
let headers = {
    Authorization: 'Bearer ' + config.voicebaseToken
};

fetch('https://apis.voicebase.com/v3/media', { headers }).then(res => res.json()).then(data => {
    for (let media of data.media) {
        fetch('https://apis.voicebase.com/v3/media/' + media.mediaId, { headers, method: 'delete' }).then(res => {
            console.log('Delete result', res.status, res.url)
        })
    }
})