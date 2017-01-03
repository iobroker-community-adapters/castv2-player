"use strict"
//Default to dummyLogClass
var log         = require("../lib/dummyLogClass")("Main");
var Scanner     = require("..").Scanner();
var MediaPlayer = require("..").MediaPlayer();

function run(callback) {
  let players = {};
  new Scanner(function (device) {

    if (device.name != "audio-livingroom")
      return;

    let mediaPlayer = new MediaPlayer(device); 
    players[device.name] = mediaPlayer;
    
    mediaPlayer.stopClientPromise()
    
    //Base single file
    .then( function () {return playAndCheckPromise(
      mediaPlayer,
      "http://commondatastorage.googleapis.com/gtv-videos-bucket/CastVideos/dash/BigBuckBunnyAudio.mp4",
      "http://commondatastorage.googleapis.com/gtv-videos-bucket/CastVideos/dash/BigBuckBunnyAudio.mp4");
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
    
    //ICY STREAMING
    .then( function () {return mediaPlayer.stopPromise();})
    .then( function () {return playAndCheckPromise(
      mediaPlayer,
      "http://edge.live.mp3.mdn.newmedia.nacamar.net/ps-dieneue_rock/livestream_hi.mp3",
      "http://edge.live.mp3.mdn.newmedia.nacamar.net/ps-dieneue_rock/livestream_hi.mp3");
    })
    .then( function () {return mediaPlayer.stopPromise();})
    .then( function () {return playAndCheckPromise(
      mediaPlayer,
      "https://www.internet-radio.com/servers/tools/playlistgenerator/?u=http://uk5.internet-radio.com:8278/live.m3u&t=.pls",
      "http://uk5.internet-radio.com:8278/live");
    })
    
    //PLAYLIST with many elements
    .then( function () {return mediaPlayer.stopPromise();})
    .then( function () {return playAndCheckPromise(
      mediaPlayer,
      "http://192.168.2.3/musica/?option=recursive&action=playall",
      "http://192.168.2.3:80/musica/Cantaautor/BREL/BREL___JACQUES___LA_QU_TE.mp3");
    })
    .then( function () {
      if (mediaPlayer.getCurrentPlaylistId() >= 0){
        let item = mediaPlayer.getPlaylistItem(mediaPlayer.getCurrentPlaylistId());
        log.info("Got item %s", JSON.stringify(item));
        return Promise.resolve(item);
      }
      else {
        log.error("Expected getCurrentItemId >= 0 but got %s - status.media: %s",
          mediaPlayer.getCurrentItemId(),
          JSON.stringify(mediaPlayer.getPlayerStatus().media));
        return Promise.reject(Error("Unexpected getCurrentItemId"));
      }
    })
    .then( function (item) {item.media.metadata.title = "TEST"; return mediaPlayer.updateItemPromise([item], {currentItemId: mediaPlayer.getCurrentPlaylistId()});})
    /*.then( function () {
      let metadata = mediaPlayer.getPlayerStatus().media.metadata;
      log.info("Updated metadata %s", JSON.stringify(metadata));
      if (metadata.title == "TEST")
        return Promise.resolve();
      else
        return Promise.reject(Error("Unexpected title "+metadata.title));
    })*/
    //PLAYLIST with ogg
    .then( function () {return mediaPlayer.stopPromise();})
    .then( function () {return playAndCheckPromise(
      mediaPlayer,
      "http://192.168.2.3/musica/Pop/Juanes%20-%20Mi%20Sangre%20(Special%20Edition)/?option=recursive&action=playall",
      "http://192.168.2.3:80/musica/Pop/Juanes%20-%20Mi%20Sangre%20(Special%20Edition)/01%20-%20Amame.ogg");
    })
    
    //Final checks
    .then( function () {return mediaPlayer.stopPromise();})
    .then (function () {
      log.error("ALL URLs played fine");
      callback (0);  
    })
    .catch (function (err) {
      log.error("ERROR");
      if (err === undefined)
        err = Error("undefined");
      log.error("ERROR : %s", err.stack);
      callback(1);
     });
    
    

    return function updateWrapper(updatedDevice){
      mediaPlayer.updateDevice(updatedDevice);
      return updateWrapper;
    };
  });
}

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

//module for testcase
module.exports = run;

//main
var main = function () { 
  run(function(rc){
    process.exit(rc);
  });
} 
if (require.main === module) { 
    main(); 
}
