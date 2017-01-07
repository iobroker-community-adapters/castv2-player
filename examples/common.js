"use strict"
var ScannerPromise = require("..").ScannerPromise();
var MediaPlayer    = require("..").MediaPlayer();
var defines        = require("./defines");

module.exports = function(log) {

  let exports = {};

  var playAndCheckPromise = function (mediaPlayer, url, url2Check) {
    
    return mediaPlayer.playUrlPromise(url)
    .then( function() {
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
    return Promise.resolve();  
  }
  exports.finalizeOk = finalizeOk;
  
  var finalizeError = function(mediaPlayer, err){
    log.error("ERROR");
    if (err === undefined)
      err = Error("undefined");
    log.error("ERROR : %s", err.stack);
    return Promise.reject(err);  
  }
  exports.finalizeError = finalizeError;
  
  return exports;
}
