import RingCentral from 'ringcentral-ts';

export async function handleVoicemailNotification(msg, syncToken: string, rc: RingCentral, sf, voicebase) {
    let evt = msg.body;
    if (!evt.changes.find(c => c.type === 'VoiceMail')) {
        return
    }
    let res = await rc.get('/account/~/extension/' + evt.extensionId + '/message-sync', { syncType: 'ISync', syncToken });
    let msgList = await res.json();
    let ext = await rc.account().extension(evt.extensionId).get();
    msgList.records.forEach(m => onNewVoiceMail(m, ext, rc, voicebase, sf));
    return msgList.syncInfo;
}

async function onNewVoiceMail(voiceMail, rcUser, rc: RingCentral, voicebase, sf) {
    let audioAttachment = voiceMail.attachments.find(atc => atc.type === 'AudioRecording');
    if (!audioAttachment) {
        return
    }
    let customVocabulary = [];
    // Get names of callee from RC
    let ownerContact = rcUser.contact;
    customVocabulary.push(ownerContact.firstName, ownerContact.lastName);

    // Get names of caller from salesforce
    let callerInfo = await getSfContactByNumber(voiceMail.from.phoneNumber, sf);
    customVocabulary.push(callerInfo.FirstName, callerInfo.LastName);

    console.log('Custom vocabulary', customVocabulary)

    let audioRes = await rc.get(audioAttachment.uri);
    let transcript = await voicebase.recognizeWithCustomTerms(<any>audioRes.body, customVocabulary)
    console.log('Voicemail transcript', transcript, '.')

    // Find sf user by rc user info: select id,name from User where (FirstName='Kevin' and LastName='Zeng') or UserName='kevin.zeng@ringcentral.com' or Email='kevin.zeng@ringcentral.com'

    let owner = await getSfUserByRcUser(ownerContact, sf);
    await createSfTask({
        Subject: `Missed call(${voiceMail.id}) with voicemail from ${callerInfo.FirstName} ${callerInfo.LastName} (${voiceMail.from.phoneNumber})`,
        OwnerId: owner.Id,    // Callee
        WhoId: callerInfo.Id,      // Caller
        Description: `Voicemail transcript: ${transcript}.

Link: ${audioAttachment.uri}.`
    }, sf)
}


async function createSfTask(task: { Subject, Description, OwnerId, WhoId }, sf) {
    await new Promise((resolve, reject) => {
        sf.sobject('Task').create(task, (err, ret) => {
            err ? reject(err) : resolve(ret);
        });
    });

}

async function getSfUserByRcUser(rcUser, sf) {
    let { firstName, lastName, email } = rcUser;
    let q = `select id,name from User where (FirstName='${firstName}' and LastName='${lastName}') or UserName='${email}' or Email='${email}'`;
    // TODO escape variables in SOSL
    let res = await sf.query(q);
    return res.records[0]
}

async function getSfContactByNumber(number, sf) {
    // TODO escape variables in SOSL
    number = number.replace(/[+}]/g, '\\$&');
    let res = await sf.search(`FIND {${number}} IN PHONE FIELDS RETURNING Contact(Id,FirstName,LastName limit 1),Lead`); // todo: improve this sosl
    return res.searchRecords[0];
}