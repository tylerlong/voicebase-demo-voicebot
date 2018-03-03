import RingCentral from 'ringcentral-ts';
import FileTokenStore from 'ringcentral-ts/FileTokenStore';
import { Connection } from 'jsforce';
import config from './config';
import VoiceBase from './voicebase/VoiceBaseApi';
import { handleVoicemailNotification } from './common/voicemail';


main();

async function main() {
    let voicebase = new VoiceBase(config.voicebaseToken);
    let rc = new RingCentral(config.RingCentral.app);
    let sf = await getSfClient();
    rc.tokenStore = new FileTokenStore('data/' + config.RingCentral.tokenFile);
    await rc.getToken().catch(e => {
        return rc.auth(config.RingCentral.user);
    })

    let cmd = process.argv[2];
    if (cmd === 'webhook') {
        registerWebHook(rc);
        return;
    }

    let fullSyncRes = await rc.get('/account/~/extension/~/message-sync', { messageType: 'VoiceMail', syncType: 'FSync' });
    let fullSync = await fullSyncRes.json();
    let syncInfo = fullSync.syncInfo;

    let ext = await rc.account().extension().get();
    if (fullSync.records.length < 1) {
        console.log('No voicemail at the moment')
    }
    // fullSync.records.forEach(m => onNewVoiceMail(m, ext));

    let subscription = rc.createSubscription();
    await subscription.subscribe(['/account/~/extension/~/message-store']);
    subscription.onMessage(async msg => {
        handleVoicemailNotification(msg, syncInfo.syncToken, rc, sf, voicebase);
    });
}

function getSfClient() {
    let sfOpts = config.Salesforce;
    let salesforceClient = new Connection(sfOpts.app);

    return new Promise((resolve, reject) => {
        salesforceClient.login(sfOpts.username, sfOpts.password, (err, info) => {
            err ? reject(err) : resolve(salesforceClient);
        });
    });
}


async function registerWebHook(rc) {
    let res = await rc.subscription().post({
        eventFilters: ['/restapi/v1.0/account/~/extension/~/message-store'],
        deliveryMode: {
            "transportType": "WebHook",
            "encryption": false,
            "address": "https://msnuhqu1hk.execute-api.us-east-1.amazonaws.com/dev/hook/new-voicemail"
        }
    })
    console.log('Webhook subscription', res)
}