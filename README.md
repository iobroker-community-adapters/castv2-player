cast2-player
============

[![NPM version](http://img.shields.io/npm/v/castv2-player.svg)](https://www.npmjs.com/package/castv2-player)
[![Downloads](https://img.shields.io/npm/dm/castv2-player.svg)](https://www.npmjs.com/package/castv2-player)

[![NPM](https://nodei.co/npm/castv2-player.png?downloads=true)](https://nodei.co/npm/castv2-player/)

### A Node.js Chromecast player library
A player based on the new (CASTV2) protocol used by Chromecast

Built as wrapper of the [node-castv2-client](https://github.com/thibauts/node-castv2-client) library.

##Features
* Scanner
  * for each device: name, IP, port, type (audio, video, audio group) 
  * periodically scans for new devices
  * report updates in device such as new IP or port
* Media Player
  * Automatically (re-) connects to device
  * Return live and cached status
  * Can start playing with an URL -> all required info is derived from it
    * detect media type
    * detect playlists (m3u, pls, etc)
  * Can play announcements
    * announcements are inserted in currently playing playlist
    * announcements can be played with a different volume (check the [announcement](examples/announcementInStreaming.js) example)
    * currently playing track is resumed at the same location it was before
  * Can jump between the playlist
  * Can update the playlist


##Examples
Check the [examples folder](examples/). The [helloWorld.js](examples/helloWorld.js) should work out of the box. For the remaining testcases you will need to adjust the [defines.js](examples/defines.js) to point to your setup.

You can run all examples as testcases with `npm test`

## Intefaces

Check the [main class](lib/mediaPlayer.js).


## Changelog
### 2.1.3 (2022-08-19)
* (Bjoern3003) set album name as song if provided in icy-name
* (Apollon77/aortmannm) Make compatible with Node.js 16+
