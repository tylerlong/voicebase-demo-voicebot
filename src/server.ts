import RingCentral from 'ringcentral-ts';
import FileTokenStore from 'ringcentral-ts/FileTokenStore';
import { Connection } from 'jsforce';
import config from './config';
import VoiceBase from './voicebase/VoiceBaseApi';

let voicebase = new VoiceBase(config.voicebaseToken);
let rc = new RingCentral(config.RingCentral.app);

main();

async function main() {
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
    let audioAttachment = voiceMail.attachments.find(atc => atc.type === 'AudioRecording');
    if (!audioAttachment) {
        return
    }
    let customVocabulary = [];
    // Get names of callee from RC
    let ownerContact = rcUser.contact;
    customVocabulary.push(ownerContact.firstName, ownerContact.lastName);

    // Get names of caller from salesforce
    let callerInfo = await getSfContactByNumber(voiceMail.from.phoneNumber);
    customVocabulary.push(callerInfo.FirstName, callerInfo.LastName);

    console.log('Custom vocabulary', customVocabulary)

    let audioRes = await rc.get(audioAttachment.uri);
    let transcript = await voicebase.recognizeWithCustomTerms(<any>audioRes.body, customVocabulary)
    console.log('Voicemail transcript', transcript, '.')

    // Find sf user by rc user info: select id,name from User where (FirstName='Kevin' and LastName='Zeng') or UserName='kevin.zeng@ringcentral.com' or Email='kevin.zeng@ringcentral.com'

    let owner = await getSfUserByRcUser(ownerContact);

    await createSfTask({
        Subject: `Missed call with voicemail from ${callerInfo.FirstName} ${callerInfo.LastName} (${voiceMail.from.phoneNumber})`,
        OwnerId: owner.Id,    // Callee
        WhoId: callerInfo.Id,      // Caller
        Description: `Voicemail transcript: ${transcript}.

Link: ${audioAttachment.uri}.`
    })
}

async function createSfTask(task: { Subject, Description, OwnerId, WhoId }) {
    let sf = await getSfClient();
    await new Promise((resolve, reject) => {
        sf.sobject('Task').create(task, (err, ret) => {
            err ? reject(err) : resolve(ret);
        });
    });

}

async function getSfUserByRcUser(rcUser) {
    let sf = await getSfClient();
    let { firstName, lastName, email } = rcUser;
    let q = `select id,name from User where (FirstName='${firstName}' and LastName='${lastName}') or UserName='${email}' or Email='${email}'`;
    // TODO escape variables in SOSL
    let res = await sf.query(q);
    return res.records[0]
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
