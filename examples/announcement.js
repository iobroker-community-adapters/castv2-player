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
  //PLAYLIST with ogg
  .then( function () {return common.playAndCheckPromise(
    mediaPlayer,
    defines.urls.oggPlaylist,
    defines.urls.oggPlaylist_firstItem);
  })
  //seekPromise
  .then( function (item) {
    log.info("Seek 1 minute");
    return mediaPlayer.seekPromise(60)
    .then(function() {return Promise.resolve(item);});
  })
  //playAnnouncementPromise
  .then( function () {
    return mediaPlayer.playAnnouncementPromise(defines.urls.shortSingle);
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
