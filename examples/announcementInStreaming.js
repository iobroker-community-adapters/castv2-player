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
  //Play streaming
  .then( function () {return common.playAndCheckPromise(
    mediaPlayer,
    defines.urls.mp3Streaming,
    defines.urls.mp3Streaming_firstItem);
  })
  //playAnnouncementPromise
  .then( function () {
    return mediaPlayer.playAnnouncementPromise({
      url: defines.urls.shortSingle,
      volume: 25,
    });
  })
  //playAnnouncementPromise again
  .then( function () {
    return mediaPlayer.playAnnouncementPromise(JSON.stringify({
      url: defines.urls.shortSingle,
      volume: 25,
    }));
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
