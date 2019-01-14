"use strict"
var ScannerPromise = require("..").ScannerPromise();
var MediaPlayer    = require("..").MediaPlayer();
var defines        = require("./defines");

module.exports = function(log) {

  let exports = {};

  var playAndCheckPromise = function (mediaPlayer, url, url2Check) {

    return mediaPlayer.playUrlPromise(url)
    .then( function() {
      if (mediaPlayer.getPlayerStatus().playerState == "PLAYING")
        return mediaPlayer;
      else
        return new Promise(function (resolve, reject) {
          mediaPlayer.once(mediaPlayer.EVENT_PLAYER_PLAYING, function(contentId){
            log.info("PLAYING: %s", contentId);
            if (url2Check && url2Check != contentId)
              reject();
            else
              resolve(mediaPlayer);
          });
          //TBD: add timeout check
        });
    });
  }
  exports.playAndCheckPromise = playAndCheckPromise;

  var setupPromise = function(){
    let mediaPlayer;

    //Setup
    log.info("Scan for : %s", defines.deviceName);
    return ScannerPromise(defines.deviceName)
    .then (function (device) {
      mediaPlayer = new MediaPlayer(device);
      return Promise.resolve();
    })
    .then (function () {
      return mediaPlayer.stopClientPromise();
    })
    .then (function () {
      return Promise.resolve(mediaPlayer);
    });
  }
  exports.setupPromise = setupPromise;

  var finalizeOk = function(mediaPlayer){
    log.info("ALL URLs played fine");
    mediaPlayer.close();
    return Promise.resolve();
  }
  exports.finalizeOk = finalizeOk;

  var finalizeError = function(mediaPlayer, err){
    log.error("ERROR");
    log.error("ERROR : %s", err.stack);

    mediaPlayer.close();

    if (err === undefined)
      err = Error("undefined");
    return Promise.reject(err);

  }
  exports.finalizeError = finalizeError;

  return exports;
}
