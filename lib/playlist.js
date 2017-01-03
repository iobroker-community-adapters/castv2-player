"use strict"

//module initialization
module.exports = function (logClass) {

  //Constants
  const MAX_PLAYLIST_SIZE   = 50000; //Playlists are included in status messages. Messages have to stay bellow 64K

  //Includes
  var MediaInfo             = require("./mediaInfo")(logClass);
  var EventEmitter          = require('events').EventEmitter;
  var util                  = require("util");

  var log = logClass ? logClass : require("./dummyLogClass")("Playlist");
  
  //Playlist class
  class Playlist extends EventEmitter {
  
    constructor (name, player) {
    
      super()
      let that = this;
    
      that._name      = name;
      that._player    = player
      that._mediaList = [];
      
      //List of events triggered by Playlist:
      //this.EVENT_STATUS       = "playerStatus";
      
      player.on(player.EVENT_STATUS, that._gotPlayerStatus.bind(that));
          
    }
    
    
    /*
     * Public methods
     */
     
    close() {
      
    }
     
    addUrlPromise (url, options) {
      let that = this;
      
      let mediaInfo = MediaInfo.get(that._name, url);
      
      let playlistPromise = mediaInfo.getInfoPromise()
      .then(function(list){      
        
        //Close mediaInfo
        mediaInfo.close();
        
        //Add items 
        that._addItems (list, options)
        return Promise.resolve(that._mediaList);
        
      })
      .catch (function (err) {
        //Close mediaInfo
        mediaInfo.close();
        //Raise error
        return Promise.reject(err);
      });
      
      return Promise.all(
      [
        that._player.getDefaultPlayerPromise(),
        playlistPromise
      ])           
      .then  (function (values) {
        let player = values[0];
        let list   = values[1];
        return player.queueLoadPromise (
          player,
          list,
          {
            startIndex: 0,
            repeatMode: "REPEAT_OFF"
          }          
        );
      }) 
    }
    
    getItem(itemId){
      let that = this;
      if (that._mediaListById)
        return that._mediaListById[itemId];
      else
        return undefined;
    }
     
     
    
    /*
     * Private methods
     */  
    _addItems (mediaInfo, options) {
      
      let that = this;
      
      for (let i in mediaInfo) {
        let item = {
          autoplay : true,
          preloadTime : 3,
          //startTime : 1,
          //activeTrackIds : [],
          //playbackDuration: 2,
          media: {
            contentId: mediaInfo[i].url,
            //contentType: "audio/mpeg",
            //streamType: 'BUFFERED',
            metadata: {
            //  metadataType: 0,
            //  title: "Original title",
            //  images: [
            //    { url: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/sample/images/BigBuckBunny.jpg' }
            //  ]
            }
          }
        }
        if (mediaInfo[i].contentType)
          item.media.contentType = mediaInfo[i].contentType;
        
        if (mediaInfo[i].metadata)
          item.media.metadata = Object.assign(item.media.metadata, mediaInfo[i].metadata);
        
        if (options)
          item = Object.assign(item, options);
        
        that._mediaList.push (item);
        
        if (JSON.stringify(that._mediaList).length > MAX_PLAYLIST_SIZE) {
          log.error("%s - playlist too long(%s): stopping at %s items", that._name, mediaInfo.length, that._mediaList.length);
          break;
        }
      }      
    }
    
    _gotPlayerStatus(newStatus, oldStatus) {
      let that = this;
      if (newStatus && newStatus.items && JSON.stringify(that._mediaList) != JSON.stringify(newStatus.items)) {
        //Updated list
        that._mediaList = newStatus.items;
        that._mediaListById = {};
        for (let i in that._mediaList){
          let itemId = that._mediaList[i].itemId;
          that._mediaListById [itemId] = that._mediaList[i];
        }
      }
    }
    
    
  } //end class  
  
  //Export Playlist class
  return Playlist;
}
