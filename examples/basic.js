"use strict"

//Default to dummyLogClass
var log            = require("../lib/dummyLogClass")("Main");
var defines        = require("./defines");
var common         = require("./common")(log);

function runPromise() {

  let mediaPlayer;

  //Setup
  return common.setupPromise()
  .then (function (mP) {
    mediaPlayer = mP;
    return Promise.resolve();
  })
  //Base single file
  .then( function () {return common.playAndCheckPromise(
    mediaPlayer,
    defines.urls.longSingle,
    defines.urls.longSingle);
  })

  //CLIENT ACTIONS
  //set volume
  .then( function () {return mediaPlayer.setVolumePromise(13);})
  //get volume from cache
  .then( function () {
    if (mediaPlayer.getVolume() == 13) {
      log.info("Got cached volume %s", mediaPlayer.getVolume());
      return Promise.resolve();
    } else
      return Promise.reject(Error("Unexpected volume: %s", mediaPlayer.getVolume()));
  })
  //get volume without cache
  .then( function () {return mediaPlayer.getVolumePromise();})
  //check getVolume response
  .then( function (vol) {
    if (vol == 13)
      return Promise.resolve();
    else {
      log.error("Invalid volume (%s) - expected 13", vol)
      return Promise.reject(Error("Invalid volume"));
    }
  })
  //get status
  .then( function () {
    if ("volume" in mediaPlayer.getClientStatus() && "volume" in mediaPlayer.getPreviousClientStatus())
      return Promise.resolve();
    else {
      log.error("Missing 'volume' in either current:\n  %s \nor previous:\n   %s \n",
        JSON.stringify(mediaPlayer.getClientStatus()),
        JSON.stringify(mediaPlayer.getPreviousClientStatus()));
      return Promise.reject(Error("getStatus"));
    }
  })
  //mute
  .then( function () {return mediaPlayer.mutePromise();})
  //check mutePromise response
  .then( function (muted) {
    if (muted)
      return Promise.resolve();
    else
      return Promise.reject(Error("Invalid mute (%s) - expected true", muted));
  })
  //unmute
  .then( function () {return mediaPlayer.unmutePromise();})
  //check unmutePromise via cached status
  .then( function () {
    if (mediaPlayer.getClientStatus().volume.muted)
      return Promise.reject(Error("Not muted"));
    else
      return Promise.resolve();
  })
  //PLAYER ACTIONS
  //pause
  .then( function () {return mediaPlayer.pausePromise();})
  //play
  .then( function () {return mediaPlayer.playPromise();})
  //seek
  .then( function () {return mediaPlayer.seekPromise(20);})
  //check unmutePromise via cached status
  .then( function () {
    let currentTime = mediaPlayer.getPlayerStatus().currentTime;
    if (currentTime >= 20)
      return Promise.resolve();
    else {
      log.error("Seek error: %s", currentTime);
      return Promise.reject(Error("Seek error"));
    }
  })
  //Final checks
  .then (function () {
    let mp = mediaPlayer;
    mediaPlayer=undefined;
    return common.finalizeOk(mp);
  })
  .catch (function (err) {
    let mp = mediaPlayer;
    mediaPlayer=undefined;
    return common.finalizeError(mp, err);
  });
}


//module for testcase
module.exports = runPromise;

//main
var main = function () {
  runPromise()
  .then (function()    {process.exit(0);})
  .catch(function(err) {process.exit(1);});
}
if (require.main === module) {
    main();
}
