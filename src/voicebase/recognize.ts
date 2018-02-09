import * as fs from 'fs'
import VoiceBase from './VoiceBaseApi';
import config from '../config';

let mediaFile = process.argv[2]
let customVocabularyFile = process.argv[3]

let customVocabularyTerms = fs.readFileSync(customVocabularyFile).toString().trim().split(/[^A-Za-z0-9_\-]+/).filter(w => !!w);
console.log('Custom vocabulary terms:\n' + customVocabularyTerms.join(', ') + '\n')

main()


async function main() {
    let voicebase = new VoiceBase(config.voicebaseToken);
    let transcript = await voicebase.recognizeWithCustomTerms(fs.createReadStream(mediaFile), customVocabularyTerms);
    console.log('Transcript', transcript);
}
