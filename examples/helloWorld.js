"use strict"
let playerName     = ".."; //Change to "catstv2-player to execute outside this folder
var ScannerPromise = require(playerName).ScannerPromise();
var MediaPlayer    = require(playerName).MediaPlayer();

let mediaPlayer;
  
//Find device
return ScannerPromise(/* device name - empty-> take first device found*/)
//Create mediaPlayer
.then (function (device) {
  mediaPlayer = new MediaPlayer(device);
  return Promise.resolve();
})
//Stop player
.then (function () {
  return mediaPlayer.stopClientPromise();
})
//Start playing
.then (function () {
  return mediaPlayer.playUrlPromise("http://commondatastorage.googleapis.com/gtv-videos-bucket/CastVideos/dash/BigBuckBunnyAudio.mp4")
 })
 //Wait for the player to start playing
.then( function() {
  return new Promise(function (resolve, reject) {
    mediaPlayer.once(mediaPlayer.EVENT_PLAYER_PLAYING, function(contentId){
      console.log("PLAYING: %s", contentId);
      resolve();
      process.exit(0);
    });
  });
});
