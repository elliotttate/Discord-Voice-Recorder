# Voice Chat AudioRecorder

## Requirements

- NodeJS V18 or above
- ffmpeg installed and usable in terminal
- nginx set up to proxy pass the domain in the .env file to the specified localhost port

## ENV

```
DISCORD_TOKEN - the token of your discord bot
FIREFLIES_TOKEN - the fireflies api token
API_PORT - the port of the api for providing the audio files
DOMAIN - the domain where you want to make the audio files availabe at (looking like: https://your.domain.com)
```

## Config

```
{
    "staff_roles": an array of role ids,
    "playIntroMessage": When set to true the bot will play an audio stating that it is recording
}

```
