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
      volume: 50,
    });
  })
  //playAnnouncementPromise again
  .then( function () {
    return mediaPlayer.playAnnouncementPromise(JSON.stringify({
      url: defines.urls.shortSingle,
      volume: 50,
    }));
  })
  //Final checks
  .then (function () {
    return common.finalizeOk(mediaPlayer);  
  })
  .catch (function (err) {
    return common.finalizeError(mediaPlayer, err);  
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
