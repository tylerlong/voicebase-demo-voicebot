import RingCentral from 'ringcentral-ts';
import FileTokenStore from 'ringcentral-ts/FileTokenStore';
import { Connection } from 'jsforce';
import config from './config';

main();

async function main() {
    let rc = new RingCentral(config.RingCentral.app);
    rc.tokenStore = new FileTokenStore('data/' + config.RingCentral.tokenFile);
    await rc.getToken().catch(e => {
        return rc.auth(config.RingCentral.user);
    })

    let fullSyncRes = await rc.get('/account/~/extension/~/message-sync', { messageType: 'VoiceMail', syncType: 'FSync' });
    let fullSync = await fullSyncRes.json();
    let syncInfo = fullSync.syncInfo;

    let ext = await rc.account().extension().get();
    if (fullSync.records.length < 1) {
        console.log('No voicemail at the moment')
    }
    fullSync.records.forEach(m => onNewVoiceMail(m, ext));

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
        let ext = await rc.account().extension(evt.extensionId).get();
        msgList.records.forEach(m => onNewVoiceMail(m, ext));
    });
}

async function onNewVoiceMail(voiceMail, rcUser) {
    let customVocabulary = [];

    // Get names of callee from RC
    let ownerContact = rcUser.contact;
    customVocabulary.push(ownerContact.firstName, ownerContact.lastName);
    console.log('Voicemail got', voiceMail, ownerContact);

    // Get names of caller from salesforce
    let callerInfo = await getSfContactByNumber(voiceMail.from.phoneNumber);
    console.log('>>found sf ', callerInfo)
}

async function getSfContactByNumber(number) {
    let sf = await getSfClient();
    // TODO escape variables in SOSL
    number = number.replace(/[+}]/g, '\\$&');
    let res = await sf.search(`FIND {${number}} IN PHONE FIELDS RETURNING Contact(Id,FirstName,LastName limit 1),Lead`);
    return res.searchRecords[0];
}

let salesforceClient;
function getSfClient() {
    if (salesforceClient) {
        return Promise.resolve(salesforceClient);
    }
    let sfOpts = config.Salesforce;
    salesforceClient = new Connection(sfOpts.app);

    return new Promise((resolve, reject) => {
        salesforceClient.login(sfOpts.username, sfOpts.password, (err, info) => {
            err ? reject(err) : resolve(salesforceClient);
        });
    });
}
