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
  //PLAYLIST with many elements
  .then( function () {return common.playAndCheckPromise(
    mediaPlayer,
    defines.urls.longPlaylist,
    defines.urls.longPlaylist_firstItem);
  })
  //JumpInPlaylist
  .then( function () {
    log.info("Jump 5 items in the playlist");
    return mediaPlayer.jumpInPlaylistPromise(5);
  })
  //getCurrentPlaylistIndex
  //getCurrentPlaylistId
  //getPlaylistItemWithId
  .then( function () {
    if (mediaPlayer.getCurrentPlaylistIndex() == 5){
      let item = mediaPlayer.getPlaylistItemWithId(mediaPlayer.getCurrentPlaylistId());
      log.info("Got item %s", JSON.stringify(item));
      return Promise.resolve(item);
    }
    else {
      log.error("Expected getCurrentItemId = 5 but got %s - status.media: %s",
        mediaPlayer.getCurrentPlaylistIndex(),
        JSON.stringify(mediaPlayer.getPlayerStatus().media));
      return Promise.reject(Error("Unexpected getCurrentItemId"));
    }
  })
  //seekPromise
  .then( function (item) {
    log.info("Seek 1 minute");
    return mediaPlayer.seekPromise(60)
    .then(function() {return Promise.resolve(item);});
  })
  //updateItemPromise
/*  .then( function (item) {
    log.info("Update item to TEST");
    item = JSON.parse(JSON.stringify(item));
    item.media.metadata.title = "Test titte";
    return mediaPlayer.updatePlaylistPromise(
      [item],
      {
        currentTime: mediaPlayer.getPlayerStatus().currentTime,
        jump: 0, //Force reload of new metadata
      });
  })
  //getPlayerStatus
  .then( function () {
    let status = mediaPlayer.getPlayerStatus();
    log.info("Updated metadata"+
      "\n - Current Time: "+status.currentTime+
      "\n - Current Item: "+status.currentItemId+
      "\n - Media: "+ JSON.stringify(status.media)+
      "\n - Extended Status: "+ JSON.stringify(status.extendedStatus)+
      "\n - First item: "+ JSON.stringify(status.items[1]));
    if (status.media.metadata.title == "Test titte")
      return Promise.resolve();
    else
      return Promise.reject(Error("Unexpected title "+status.media.metadata.title));
  })*/
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
