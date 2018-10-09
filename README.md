# VoiceBase Demo VoiceBot

## VoiceBase command

A node.js command line app to convert audio to text by VoiceBase API.

### Quick Start

1. Clone this repo and cd to the root directory.
2. Install dependencies: `yarn`.
3. Build: `yarn build`.
4. Create the app config file [`./data/config.json`](configuration-file) .
5. Run the command: `node build/voicebase/recognize.js {audio-file} {custom-vocabulary-text-file}`.

#### Custom vocabulary text file

A text file containing a comma(space or new line) separated string.

#### Configuration file

```json
{
    "voicebaseToken": "{yourVoiceBaseAPIToken}"
}
```


## Clear viocebase uploaded media files

```
node src/voicebase/clearMedia.js
```


## salesforce credentials

Register a SF dev account.

Create a connected app. Enable OAuth Settings. Scope: Full access.

salesforce dev account oauth password in `config.js`: `${dev-password}${dev-security-token}`


## Run server

```
node build/server.js
```


## todo

- if no customer found in SF, should not throw exception: `TypeError: Cannot read property 'FirstName' of undefined`

- 4 SF task records were created for a single voicemail
    Root cause: message-sync token not saved. So it will treat the message as new again and again.


## In progress

- Move to Lambda, some work is done but not finished.
