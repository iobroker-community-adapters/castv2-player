"use strict"

//module initialization
module.exports = function (logClass) {

  //Constants
  const STATUS_QUERY_TIME = 30000; // 30 seconds

  //Includes 
  var Playlist              = require("./playlist")(logClass);
  var DefaultMediaReceiver  = require('castv2-client').DefaultMediaReceiver;;
  var EventEmitter          = require('events').EventEmitter;
  var util                  = require("util");

  var log = logClass ? logClass : require("./dummyLogClass")("PersistentPlayer");
  
  //PersistentPlayer class
  class PersistentPlayer extends EventEmitter {
  
    constructor (name, client) {
    
      super();
      let that = this;
      
      that._name = name;
      that._client = client;
      
      //List of events triggered by PersistentPlayer:
      that.EVENT_CONNECTED    = "playerConnected";
      that.EVENT_DISCONNECTED = "playerDisconnected";
      that.EVENT_PLAYING      = "playerPlaying";
      that.EVENT_STOPPED      = "playerStopped";
      that.EVENT_STATUS       = "playerStatus";
      
      
      //Register for client events
      that._client.on(that._client.EVENT_STATUS,       that._clientStatus.bind(that));
      that._client.on(that._client.EVENT_DISCONNECTED, that._clientDisconnected.bind(this));
      
      //Create playlist
      that._playlist = new Playlist(that._name, that);    
    }
    
    
    //Play URL -> playlist.addUrl(arguments)
    playUrl (url, options) {
    
      let that = this;
      
      log.info ("%s - Try to play url - %s", that._name, url);
      
      if (that._playlist)
        delete that._playlist;
      that._playlist = new Playlist(that._name, that);
      
      return that._playlist.addUrlPromise(url, options)
      .catch (function(err) {
        log.error("%s - Error playing playlist - %s", that._name, err.stack);
        return Promise.reject(err);
      });
    }
    
    
    //pause
    pausePromise () {
      let that = this;
      
      return that._getConnectedPlayerPromise()
      .then (function (player) {return that._playerActionPromise ("pause", player.pause.bind(player));});
    }
    
    //play
    playPromise () {
      let that = this;
      
      return that._getConnectedPlayerPromise()
      .then (function (player) {return that._playerActionPromise ("play", player.play.bind(player));})
      .then(function () {return that.getStatusPromise(); });
    }
    
    //stop
    stopPromise () {
      let that = this;
      
      return that._getConnectedPlayerPromise()
      .then (function (player) {return that._playerActionPromise ("stop", player.stop.bind(player));})
      .then(function () {return that.getStatusPromise(); });
    }
    
    //seek
    seekPromise (currentTime) {
      let that = this;
      
      return that._getConnectedPlayerPromise()
      .then (function (player) {return that._playerActionPromise ("seek", player.seek.bind(player, currentTime));})
      .then(function () {return that.getStatusPromise(); });
    }
    
    //getStatusPromise
    getStatusPromise () {
      let that = this;
      
      return that._getConnectedPlayerPromise()
      .then (function (player) {return that._playerActionPromise ("getStatus", player.getStatus.bind(player));});
    }
    
    //getStatus
    getStatus () {
      let that = this;
      return that._status;
    }
    
    //getPreviousStatus    
    getPreviousStatus () {
      let that = this;
      return that._previousStatus;
    }
    
    //PLAYLIST
    //get current playlist index
    getCurrentPlaylistIndex() {
      let that = this;
      if (that._playlist)
        return that._playlist.getIndexForId(that.getCurrentPlaylistId());
      else
        return undefined;
    }
       
    //get current playlist itemID
    getCurrentPlaylistId() {
      let that = this;
      return that._status.currentItemId;
    }
       
    //get full playlist
    getPlaylist(id) {
      let that = this;
      if (that._playlist)
        return that._playlis.getAll;
      else
        return undefined;
    } 
    
    //get playlist item with itemID
    getPlaylistItemWithId(id) {
      let that = this;
      if (that._playlist)
        return that._playlist.getItemWithId(id);
      else
        return undefined;
    }   
    
    //get playlist item with playlist index
    getPlaylistItemWithIndex(index) {
      let that = this;
      if (that._playlist)
        return that._playlist.getItemWithIndex(id);
      else
        return undefined;
    } 
        
    //Update playlist
    updatePlaylistPromise(items, options) {
      let that = this;
      if (options === undefined)
        options = {};
      
      return that._getConnectedPlayerPromise()
      .then (function (player) {return that._playerActionPromise ("queueUpdate", player.queueUpdate.bind(player, items, options));})
      .then(function () {return that.getStatusPromise(); });
    }
    
    //Insert in playlist - returns inserted itemIds in promise
    insertIntoPlaylistPromise(items, options) {
      let that = this;
      if (options === undefined)
        options = {};
        
      //Find out the index for the new items
      let firstInsertionIndex = (options && options.insertBefore) ?
                                that._playlist.getIndexForId(options.insertBefore) :
                                that._playlist.getAll().length - items.length; //items have been inserted already in the local playlist
      
      return that._getConnectedPlayerPromise()
      .then (function (player) {
        //Send insert
        let insertPromise = that._playerActionPromise ("queueInsert", player.queueInsert.bind(player, items, options));
        return insertPromise;
      })
      .then(function () {return that.getStatusPromise(); })
      .then(function () {
        
        //Calculate ItemIDs for inserted elements
        let itemIds = [];
        for (let i=firstInsertionIndex;  i < (firstInsertionIndex + items.length); i++) {
          itemIds.push(that._playlist.getItemWithIndex(i).itemId);
        }
        
        return Promise.resolve(itemIds);
      });
    }
    
    //Remove from playlist
    removeFromPlaylistPromise(itemIds, options) {
      let that = this;
      if (options === undefined)
        options = {};
      
      return that._getConnectedPlayerPromise()
      .then (function (player) {return that._playerActionPromise ("queueRemove", player.queueRemove.bind(player, itemIds, options));})
      .then(function () {return that.getStatusPromise(); });
    }
    
    //Reorder playlist
    reorderPlaylistPromise(itemIds, options) {
      let that = this;
      if (options === undefined)
        options = {};
      
      return that._getConnectedPlayerPromise()
      .then (function (player) {return that._playerActionPromise ("queueReorder", player.queueReorder.bind(player, itemIds, options));})
      .then(function () {return that.getStatusPromise(); });
    }
    
    //jump in playlist
    jumpInPlaylistPromise(jump) {
      let that = this;
      //let item = that.getItem(that.getCurrentItemId());
      return that.updatePlaylistPromise([],{jump:jump})
      .then(function () {return Promise.resolve(jump)});
    }

    //set repeatMode - REPEAT_OFF, REPEAT_ALL, REPEAT_SINGLE, REPEAT_ALL_AND_SHUFFLE
    setRepeatModePromise(repeatMode) {
      let that = this;
      //let item = that.getItem(that.getCurrentItemId());
      return that.updatePlaylistPromise([],{repeatMode:repeatMode})
      .then(function () {return Promise.resolve(repeatMode)});
    }
    
    //playAnnouncement
    playAnnouncementPromise (url, options) {
    
      let that = this;
      
      //Check if url is a JSON object
      let urlOptions = {}
      if (typeof url != "string" || url[0] == "{") {
        try{
          if (typeof url == "string")
            urlOptions = JSON.parse(url)
          else
            urlOptions = url; //Assume object
          if (urlOptions.url === undefined) {
            let error= "json does not contain url field"
            log.error("%s - Error parsing announcement URL as JSON: %s\nPassed URL: %s", that._name, error, url);
            return Promise.reject(error);
          }
          url = urlOptions.url;
        } catch (error) {
          log.error("%s - Error parsing announcement URL as JSON: %s\nPassed URL: %s", that._name, error, url);
          return Promise.reject(error)
          .then(function(playUrlPromise) {
            return new Promise(function (resolve, reject) {
              that.on(that.EVENT_STATUS, function(status) {
                if (status.media.contentId != url || (status.playerState != "PLAYING")) {
                  log.info ("%s - Finished playing announcement", that._name);
                  resolve(playUrlPromise);
                }
              });
            });
          });
        }
      }
      
      return that.getDefaultPlayerPromise()
      .then(function(){
        if (that.getStatus() === undefined || that.getCurrentPlaylistId() === undefined || that.getStatus().playerState == "IDLE")
          
          //currently not playing -> playUrl and wait for it to finish
          return that.playUrl (url, options);
        else {          
          
          //Currently playing -> insert announcement and wait for it to finish
          log.info ("%s - Try to play announcement - %s", that._name, JSON.stringify(url));
          
          let chunkItemIds = [];
          
          //Remember information on the current track position
          let currentTime = that.getStatus().currentTime;
          let currentVolume = that._client.getVolume();
          let currentURL = that.getStatus().media.contentId;
          let currentDuration = that.getStatus().media.duration;
          
          // Objective: current -> announcement -> remaining current (if not streaming)-> (nextItem)
          let playingStreaming = !(currentDuration > 0);
          
          //Calculate next track
          let nextItem;
          if (playingStreaming){
            nextItem = that.getCurrentPlaylistId(); //In streaming we come back to the current playlist
          } else {
            let nextItemIndex = that._playlist.getIndexForId(that.getCurrentPlaylistId()) + 1;
            nextItem = that._playlist.getItemWithIndex(nextItemIndex);
          }
          
          //If we are not streaming we add the current track again with the start set to the current location
          let remainingPromise = Promise.resolve([]);
          if (!playingStreaming) {
            
            let optionsPlaylistResume = {};
            //if (currentDuration && currentTime && currentTime <= currentDuration)
                optionsPlaylistResume.startTime = currentTime;          
          
            //First we add it locally
            remainingPromise = that._playlist.insertPromise(currentURL, optionsPlaylistResume, true)
            .then (function (items) {
            
              //Second: send it to the Chromecast
              let optionsResume = {};
              if (currentDuration && currentTime && currentTime <= currentDuration)
                optionsResume.startTime = currentTime;          
              if (nextItem)
                optionsResume.insertBefore = nextItem.itemId;
                
              return that.insertIntoPlaylistPromise(items, optionsResume);
            });
          }
          
          return remainingPromise
          .then (function (itemIds) {
          
            //Remember that we have to delete the chunk (if we are not streaming)
            chunkItemIds = itemIds;
                 
            //Now we can insert the actual announcement
            
            //First locally
            return that._playlist.insertPromise(url, options, true);
          })          
          .then (function (items) {
          
            //Insert into playlist and start playing
            let optionsAnnouncement = {};
            optionsAnnouncement.currentItemIndex = 0;
            optionsAnnouncement.insertBefore = playingStreaming ? that.getCurrentPlaylistId() : chunkItemIds[0];          
            
            //Second: send it to the Chromecast
            return that.insertIntoPlaylistPromise(items, optionsAnnouncement);
          })
          .then (function (anouncementIds) {
          
            //Set volume if required - we do it here to avoid a peak in the volume with the currently playing track
            if (urlOptions.volume) {            
              that._client.setVolumePromise(urlOptions.volume);
            }
            
            //Wait for the remaining current to start playing in order to remove the announcement and resume the volume
            return new Promise(function (resolve, reject) {
            
              //log.info("%s - Announcement playing:\n%s",that._name, util.inspect(that.getStatus(),{depth:null}));   
            
              //resumeAfterAnnouncement <- It will be called on every status update              
              let resumeAfterAnnouncement = function (status) {
                if  (anouncementIds.length > 0 && anouncementIds.indexOf(that.getCurrentPlaylistId()) < 0)
                {
                  //The item after the announcement has starting buffering -> restore original volume if required 
                  if (urlOptions && urlOptions.volume) {
                    that._client.setVolumePromise(currentVolume);
                    urlOptions = undefined; //So we not set it again on every status update
                  }
                  
                  if (that.getStatus().playerState != "BUFFERING") {
                    //The item after the announcement has starting playing -> remove announcement from list
                    log.info ("%s - Resumed after announcement", that._name);
                    that.removeFromPlaylistPromise(anouncementIds);
                    anouncementIds = [];
                    //Anouncement ended
                    return resolve(url);
                  }
                  
                }
                
                if
                (
                  anouncementIds.length === 0 /*Already completed announcement*/ &&
                  (
                    //Did we insert a chunk?
                    chunkItemIds.length === 0 ||
                    //Next item started playing ?
                    (nextItem && that.getCurrentPlaylistId() == nextItem.itemId && that.getStatus().playerState != "BUFFERING")                   
                  )
                )
                {
                  //The remaining current item we just inserted has starting playing -> remove
                  log.info ("%s - Back to regular playlist", that._name);
                  if (chunkItemIds.length > 0)
                    that.removeFromPlaylistPromise(chunkItemIds);
                  
                  //We are done
                  that.removeListener(that.EVENT_STATUS, resumeAfterAnnouncement);
                  return;
                }  
                
                //Sanity check - if all items disapear then this means that a new playlist was loaded
                let idsToCheck=anouncementIds.concat(chunkItemIds);
                let allGone = true;
                
                for (let i in idsToCheck) {
                  if (that._playlist.getItemWithId(idsToCheck[i]) != undefined)
                    allGone = false;
                    break;
                }
                if (allGone) {
                  log.warn("%s - remaining item to play after announcement not found in the playlist -> remove status handled", that._name);
                  that.removeListener(that.EVENT_STATUS, resumeAfterAnnouncement);
                  log.debug("%s - Player status:\n%s",that._name, util.inspect(that._status,{depth:null, colors:true}))
                }
                            
                //Not the status update we are waiting for       
              }
              
              that.on(that.EVENT_STATUS, resumeAfterAnnouncement);
              
              //Announcement playing
              //log.debug("%s - Announcement playing:\n%s",that._name, util.inspect(that.getStatus(),{depth:null, colors:true}));          
            });
          });
        }
      });
    }
    
    
    
    //Get default player - returns promise
    getDefaultPlayerPromise () {
      let that = this;
      
      //Is DefaultPlayer already loaded?
      if (that._player && that._currentApplicationId  == DefaultMediaReceiver.APP_ID){
        return Promise.resolve(that);
      }
      
      //detach and lunch DefaultPlayer
      that._detachPlayer();
      
      log.info("%s - Try to launch default player", that._name);
      return that._client.launchPromise(DefaultMediaReceiver)
      .then (function (p) {      
        that._currentApplicationId = DefaultMediaReceiver.APP_ID;
        
        that._playerConnected(p);
        log.info("%s - Default player lauched", that._name);;
        
        return Promise.resolve(that);
      });
    }
    
    queueLoadPromise (player, list, options)
    {
      return new Promise(function(resolve, reject) {
      
        let errorCallback = function(err) {
          err = err ? err: Error("Unexpected close");
          reject(err);
        }
        
        log.info("%s - Try to play playlist with %s items", player._name, list.length);
        //log.debug(util.inspect(list, {depth:null, colors:true}));
        player._player.queueLoad(
          list,
          options,
          function(err, status) {
            if (err) {
              errorCallback(err);
            } else {
              log.info("%s - Playing playlist with %s items", player._name, list.length);              
              player._playerStatus (status);
              resolve();
              player.removeListener(player.EVENT_DISCONNECTED, errorCallback);
            }
          }
        );
        
        player.once(player.EVENT_DISCONNECTED, errorCallback);
      });
    }
    
    
    


    /*
     * Private methods
     */  
    
    //_clientStatus
    _clientStatus (status) {
      let that = this;
      
      //log.debug("%s - Client status\n%s",that._name, util.inspect(status,{depth:null, colors:true}));
      
      //if the Chromecast has an application running then try to attach DefaultMediaReceiver
      //NOTE: this might fail in case the Chromecast is running a weird player
      //      It works fine with the TuneIn and Plex applications
      if ("applications" in status) {
        
        let currentApplicationId = status.applications[0].appId;
        
        if (!("namespaces" in status.applications[0]) || currentApplicationId == "MultizoneLeader") {
          //We cannot connect to the MultizoneLeader since it does not have namespaces nor transportId
          //adapter.log.info(name + ' currentApplicationObject ' + JSON.stringify(status));

          //{'applications':[{'appId':'MultizoneLeader',
          //                  'displayName':'Default Media Receiver',
          //                  'isIdleScreen':false,
          //                  'sessionId':'63533C2D-D0DC-4F9F-BE21-51D09A60F50B',
          //                  'statusText':'Now Casting: http://192.168.2.3/musica/test.mp3'}
          //                ],
          // 'volume':{'controlType':'attenuation',
          //           'level':0.1764705926179886,
          //           'muted':false,
          //           'stepInterval':0.05000000074505806}
          //}
          
          that._detachPlayer();
        } else {
          if (that._player === undefined || that._currentApplicationId  != currentApplicationId ) {
            //Updated APP ID -> re-attach
            that._currentApplicationId = currentApplicationId;
            that._joinPlayer(status.applications[0]);
          }          
        }
        that._currentApplicationId = currentApplicationId;
      } else {
          that._currentApplicationId = undefined;
          that._detachPlayer();
      }
    };
    
    
    //client disconnected
    _clientDisconnected () {
      let that = this;
      log.info("%s - client disconnected", that._name);
      that._detachPlayer();
    };
    
    
    //_joinPlayer
    _joinPlayer (currentApplicationObject) {
      let that = this;
      
      log.info("%s - Try to join player", that._name);
      
      that._detachPlayer();
            
      //We do not have a player object yet
      that._client.joinPromise(
        currentApplicationObject,
        DefaultMediaReceiver)
      .then( function (p){   
        that._playerConnected(p);
        log.info("%s - Player joint", that._name);
      })
      .catch (function (err) {
        log.error('%s - Failed to attach player: %s', that._name, err);
      });
    };
    
  
  //Detach the player
  _detachPlayer () {
      let that = this;
      //Remove player listener if there was one
      if (that._player) {

        if (that._getStatusTimeout)
          clearTimeout(that._getStatusTimeout);
        
        //Stop getting media info
        //MediaInformation.closeListener(name);
        
        //Try to close in case we triggered the close
        try{
          that._player.close();
        } catch (e) {};

        delete that._player;

        log.info("%s - Detached player", that._name);
        that._status = undefined;
        
        that.emit(that.EVENT_DISCONNECTED);
        that.emit(that.EVENT_STOPPED);
      }
    }
    
    //Register for events after a player connection  
    _playerConnected (p) {
    
      let that = this;
      
      log.info(that._name + " - Connected player");
      
      //We attached fine -> remember player object
      that._player = p;

      //Register for close events
      that._player.on("close", that._detachPlayer.bind(that));

      //Register for close events
      that._player.on("error", function (err) {
          log.error(that._name + " - Player - " + err);
          that._detachPlayer();
      });

      //Handle player status updates
      let getStatusHandler = function (err, pStatus) {
        if (err) {
          log.error(that._name + " - Could not get player status- " + err);
        } else {
          that._playerStatus(pStatus);
        }
      }  
      that._player.on('status', that._playerStatus.bind(that));
      //Trigger one now
      that._player.getStatus(getStatusHandler);
      //Query status if not queried in the last STATUS_QUERY_TIME mseconds
      if (that._getStatusTimeout)
        clearTimeout(that._getStatusTimeout);
      that._getStatusTimeout = setTimeout(function(){
        that._player.getStatus(getStatusHandler);
      }, STATUS_QUERY_TIME);
      
      //Send event
      that.emit(that.EVENT_CONNECTED);
    }
    
    
    _playerStatus (status) {
      let that = this;
      /*
       * { mediaSessionId: 1,
       *   playbackRate: 1,
       *   playerState: 'BUFFERING',
       *   currentTime: 0,
       *   supportedMediaCommands: 15,
       *   volume: { level: 1, muted: false },
       *   media: 
       *    { contentId: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/CastVideos/dash/BigBuckBunnyAudio.mp4',
       *      metadata: { title: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/CastVideos/dash/BigBuckBunnyAudio.mp4' },
       *      contentType: 'video/mp4',
       *      duration: 596.474195 },
       *   currentItemId: 1,
       *   items: 
       *    [ { itemId: 1,
       *        media: 
       *         { contentId: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/CastVideos/dash/BigBuckBunnyAudio.mp4',
       *           metadata: { title: 'http://commondatastorage.googleapis.com/gtv-videos-bucket/CastVideos/dash/BigBuckBunnyAudio.mp4' },
       *           contentType: 'video/mp4',
       *           duration: 596.474195 },
       *        autoplay: true,
       *        preloadTime: 3 } ],
       *   repeatMode: 'REPEAT_OFF' }
       */
      
      //log.debug("%s - Player status:\n%s",that._name, util.inspect(status,{depth:null, colors:true}));
      
      //Cache Player channel status
      that._previousStatus = that._status ? JSON.parse(JSON.stringify(that._status)): undefined; //Deep clone
      that._status = that._status ? Object.assign(that._status, status) : status;      

      //Emit events
      that.emit(that.EVENT_STATUS, that._status, that._previousStatus) 
      if (
        that._status &&
        (that._status.playerState == "PLAYING") && 
        (that._previousStatus === undefined || that._status.playerState != that._previousStatus.playerState)
      )
      {
        that.emit(that.EVENT_PLAYING, that._status.media.contentId);
        log.info("%s - Playing - %s", that._name, that._status.media.contentId);
      }
    }
    
    _getConnectedPlayerPromise () {
      let that = this;
      
      if (that._player)
        return Promise.resolve(that._player);
      
      return new Promise(function(resolve, reject) {
        //Set timeout to 10 seconds
        let timeout = setTimeout(reject.bind (Error("Could not connect after 10 seconds")), 10000);
        that.once(that.EVENT_CONNECTED, function() {
          //Received connected event
          clearTimeout(timeout);
          resolve(that._player);
        });        
      });
    }
    
    //playerAction
    _playerActionPromise (actionName, playerAction) {
      let that = this;
      return new Promise (function (resolve, reject) {
        playerAction(function (err, status) {
          if (err) {
            log.error ("%s - Rejected %s - %s", that._name, actionName, err);
            reject(err);
          } else {
            log.info ("%s - %s", that._name, actionName);
            resolve();
          }
        });
      });
    } 
    
  } //end of class  
    
  //Export PersistentPlayer class
  return PersistentPlayer;  
}
