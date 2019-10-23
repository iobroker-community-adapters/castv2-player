"use strict"

//module initialization
module.exports = function (logClass) {

  //Includes
  var Client                = require('./persistentClient')(logClass);
  var Player                = require('./persistentPlayer')(logClass);
  var EventEmitter          = require('events').EventEmitter;

  //Default to dummyLogClass
  var log = logClass ? logClass : require("./dummyLogClass")("MediaPlayer");

  //MediaPlayer class
  class MediaPlayer extends EventEmitter {

    constructor (connection) {

      super();
      let that = this;

      that.connection = connection;
      that._name = connection.name;

      //Inherit from EventEmitter
      that.EVENT_CONNECTION          = "connection";
      that.EVENT_CLIENT_STATUS       = "clientStatus";
      that.EVENT_CLIENT_CONNECTED    = "clientConnected";
      that.EVENT_CLIENT_DISCONNECTED = "clientDisconnected";
      that.EVENT_PLAYER_STATUS       = "playerStatus";
      that.EVENT_PLAYER_PLAYING      = "playerPlaying";
      that.EVENT_PLAYER_STOPPED      = "playerStopped";

      log.debug("New device %s at %s:%s", that.connection.name, that.connection.host, that.connection.port);

      //Register for updates
      that.connection.registerForUpdates(that._updateDevice.bind(that));

      //Create client
      that._client = new Client(that.connection);

      //Forward some client events
      that._client.on(that._client.EVENT_STATUS,       that.emit.bind(that, that.EVENT_CLIENT_STATUS));
      that._client.on(that._client.EVENT_CONNECTED,    that.emit.bind(that, that.EVENT_CLIENT_CONNECTED));
      that._client.on(that._client.EVENT_DISCONNECTED, that.emit.bind(that, that.EVENT_CLIENT_DISCONNECTED));

      //Create player
      that._player = new Player(that._name, that._client);

      //Forward some player events
      that._player.on(that._player.EVENT_STATUS,  that.emit.bind(that, that.EVENT_PLAYER_STATUS));
      that._player.on(that._player.EVENT_PLAYING, that.emit.bind(that, that.EVENT_PLAYER_PLAYING));
      that._player.on(that._player.EVENT_STOPPED, that.emit.bind(that, that.EVENT_PLAYER_STOPPED));
    }

    /*
     * Public MediaPlayer methods
     */

    //playURL()
    playUrlPromise (url, options) {
      return this._player.playUrl(url, options);
    }

    //close
    close () {
      if (this._player) {
        this._player.close();
      }
      if (this._client) {
        this._client.close();
      }
    }

    //CLIENT ACTIONS

    //getVolume
    getVolume() {
      return this._client.getVolume();
    }

    //isMuted
    isMuted() {
      return this._client.getVolume().muted;
    }

    //getVolumePromise
    getVolumePromise() {
      return this._client.getVolumePromise();
    }

    //setVolumePromise
    setVolumePromise(volume) {

      return this._client.setVolumePromise(volume);
    }

    //mutePromise
    mutePromise(volume) {
      return this._client.mutePromise();
    }

    //unmutePromise
    unmutePromise(volume) {
      return this._client.unmutePromise();
    }

    //stopPromise
    stopClientPromise() {
      return this._client.stopPromise();
    }

    //getClientStatus <- returns cache
    getClientStatus() {
      return this._client.getStatus();
    }
    //getPreviousClientStatus <- returns cache
    getPreviousClientStatus() {
      return this._client.getPreviousStatus();
    }

    //PLAYER ACTIONS

    //pausePromise
    pausePromise() {
      return this._player.pausePromise();
    }

    //playPromise
    playPromise() {
      return this._player.playPromise();
    }

    //stopPromise
    stopPromise() {
      return this._player.stopPromise();
    }

    //seekPromise
    seekPromise(currentTime) {
      return this._player.seekPromise(currentTime);
    }

   getStatusPromise() {
     return this._player.getStatusPromise
   }

    //getPlayerStatus <- returns cache
    getPlayerStatus() {
      return this._player.getStatus();
    }

    //getPreviousPlayerStatus <- returns cache
    getPreviousPlayerStatus() {
      return this._player.getPreviousStatus();
    }

    //PLAYLIST ACTIONS
    //get current playlist index
    getCurrentPlaylistIndex() {
      return this._player.getCurrentPlaylistIndex();
    }

    //get current playlist itemID
    getCurrentPlaylistId() {
      return this._player.getCurrentPlaylistId();
    }

    //get full playlist
    getPlaylist(id) {
      return this._player.getPlaylist(id);
    }

    //get playlist item with itemID
    getPlaylistItemWithId(id) {
      return this._player.getPlaylistItemWithId(id);
    }

    //get playlist item with playlist index
    getPlaylistItemWithIndex(index) {
      return this._player.getPlaylistItemWithIndex(index);
    }


    //update playlist
    updatePlaylistPromise(items, options) {
      return this._player.updatePlaylistPromise(items, options);
    }

    //inser into playlist
    insertIntoPlaylistPromise(items, options) {
      return this._player.insertIntoPlaylistPromise(items, options);
    }

    //remove from playlist
    removeFromPlaylistPromise(itemIds, options) {
      return this._player.removeFromPlaylistPromise(itemIds, options);
    }

    //reorder playlist
    reorderPlaylistPromise(itemIds, options) {
      return this._player.reorderPlaylistPromise(itemIds, options);
    }

    //jump in playlist
    jumpInPlaylistPromise(jump) {
      return this._player.jumpInPlaylistPromise(jump);
    }

    //set repeatMode - REPEAT_OFF, REPEAT_ALL, REPEAT_SINGLE, REPEAT_ALL_AND_SHUFFLE
    setRepeatModePromise(repeatMode) {
      return this._player.setRepeatModePromise(repeatMode);
    }

    //playAnnouncementPromise
    playAnnouncementPromise (url, options) {
      return this._player.playAnnouncementPromise (url, options);
    }

    /*
     * Private methods
     */
    //update device
    _updateDevice (device) {

      let that = this;
      that.device  = device;

      that._client.updateDevice(device);

      //Emit new connection
      that.emit(that.EVENT_CONNECTION, device);
    }


  }

  //Export MediaPlayer class
  return MediaPlayer;
}
