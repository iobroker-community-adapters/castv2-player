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
  //ICY STREAMING
  .then( function () {return common.playAndCheckPromise(
    mediaPlayer,
    defines.urls.mp3Streaming,
    defines.urls.mp3Streaming_firstItem);
  })
  .then( function () {return mediaPlayer.stopPromise();})
  .then( function () {return common.playAndCheckPromise(
    mediaPlayer,
    defines.urls.plsStreaming,
    defines.urls.plsStreamin_firstItem);
  })//Final checks
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
