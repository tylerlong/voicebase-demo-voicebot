import RingCentral from 'ringcentral-ts';
import FileTokenStore from 'ringcentral-ts/FileTokenStore';

main();

async function main() {
    let config = require('../data/config.json');
    let rc = new RingCentral(config.RingCentral.app);
    rc.tokenStore = new FileTokenStore('data/' + config.RingCentral.tokenFile);
    await rc.getToken().catch(e => {
        return rc.auth(config.RingCentral.user);
    })

    let fullSyncRes = await rc.get('/account/~/extension/~/message-sync', { messageType: 'VoiceMail', syncType: 'FSync' });
    let fullSync = await fullSyncRes.json();
    let syncInfo = fullSync.syncInfo;

    fullSync.records.forEach(onNewVoiceMail)

    let subscription = rc.createSubscription();
    await subscription.subscribe(['/account/~/extension/~/message-store']);
    subscription.onMessage(async msg => {
        let evt = msg.body;
        if (!evt.changes.find(c => c.type === 'VoiceMail')) {
            return
        }
        let res = await rc.get('/account/~/extension/' + evt.extensionId + '/message-sync', { syncType: 'ISync', syncToken: syncInfo.syncToken });
        let msgList = await res.json();
        syncInfo = msgList.syncInfo;
        msgList.records.forEach(onNewVoiceMail)
    });
}

function onNewVoiceMail(voiceMail) {
    console.log('Voicemail got', voiceMail)
}