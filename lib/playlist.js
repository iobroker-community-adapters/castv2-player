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
        let addedList = that._addItems (list, options);
        return Promise.resolve(addedList);

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
      }); 
    }

    insertPromise (url, options, disableCheck) {
      let that = this;

      let mediaInfo = MediaInfo.get(that._name, url);

      return mediaInfo.getInfoPromise()
      .then(function(list){

        //Close mediaInfo
        mediaInfo.close();

        //Add items
        let addedList = that._addItems (list, options, disableCheck);
        return Promise.resolve(addedList);

      })
      .catch (function (err) {
        //Close mediaInfo
        mediaInfo.close();
        //Raise error
        return Promise.reject(err);
      });
    }

    getAll () {
      let that = this;
      if (that._mediaList)
        return that._mediaList;
    }

    getItemWithId(itemId){
      let that = this;
      if (that._mediaListById)
        return that._mediaListById[itemId];
      else
        return undefined;
    }

    getItemWithIndex(index){
      let that = this;
      if (that._mediaList)
        return that._mediaList[index];
      else
        return undefined;
    }

    getIndexForId (itemId) {
      let that = this;
      if (that._IdToIndex)
        return that._IdToIndex[itemId];
      else
        return undefined;
    }



    /*
     * Private methods
     */
    _addItems (mediaInfo, options, disableCheck /*Need for playing announcement */) {

      let that = this;

      let addedItems = [];
      for (let i in mediaInfo) {
        let item = {
          autoplay : true,
          //preloadTime : 3,
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
        addedItems.push (item);

        if (disableCheck === undefined && JSON.stringify(that._mediaList).length > MAX_PLAYLIST_SIZE) {
          log.error("%s - playlist too long(%s): stopping at %s items", that._name, mediaInfo.length, that._mediaList.length);
          break;
        }
      }

      return addedItems;
    }

    _gotPlayerStatus(newStatus, oldStatus) {
      let that = this;
      if (newStatus && newStatus.items && JSON.stringify(that._mediaList) != JSON.stringify(newStatus.items)) {
        //Updated list
        that._mediaList = newStatus.items;
        that._mediaListById = {};
        that._IdToIndex = {};
        for (let i = 0; i <that._mediaList.length; i++){
          let itemId = that._mediaList[i].itemId;
          that._mediaListById [itemId] = that._mediaList[i];
          that._IdToIndex[itemId] = i;
        }
      }
    }


  } //end class

  //Export Playlist class
  return Playlist;
}
