# VoiceBase Demo VoiceBot

## VoiceBase command

A node.js command line app to convert audio to text by VoiceBase API.

### Quick Start

1. Clone this repo and cd to the root directory.
2. Install dependencies: `yarn`.
3. Build: `yarn build`.
4. Create the app config file [`./data/config.json`](configuration-file) .
5. Run the command: `node build/recognize.js {audio-file} {custom-vocabulary-text-file}`.

#### Custom vocabulary text file

A text file containing a comma(space or new line) separated string.

#### Configuration file

```json
{
    "voicebaseToken": "{yourVoiceBaseAPIToken}"
}
```