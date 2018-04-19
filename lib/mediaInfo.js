"use strict"

//module initialization
module.exports = function (logClass) {

  //Constants
  const MIME_BLACKLIST = []; //["audio/ogg", "video/ogg"] <- they seem to work if contentType is specified

  //Includes
  var EventEmitter          = require('events').EventEmitter;
  var icy                   = require('icy');
  var url                   = require('url');
  var playlist_parsers      = require("playlist-parser");
  var http                  = require('http');
  var devnull               = require('dev-null');
  var util                  = require('util');
  var mime                  = require('mime-types');

  var log = logClass ? logClass : require("./dummyLogClass")("MediaInfo");
  
  //Playlist class
  class MediaInfo extends EventEmitter {
  
    constructor (name, url) {
    
      super()
      let that = this;
    
      that._name  = name;
      that._url   = url;
      that._items = [];
      
      //List of events triggered by MediaInfo:
      that.EVENT_UPDATE       = "mediaInfoUpdate";
          
    }
  
    /*
     * Public methods
     */
     
    getInfoPromise () {
    
      let that = this;
      
      return that._getIcyConnectionPromise()
      .then (function (res) { return that._parseIcyHeaderPromise (res);});
    }
    
    close () {
      let that = this;
      that._closeIcyConnection ();
    }
     
     
    
    /*
     * Private methods
     */
     
    _getIcyConnectionPromise () {
    
      let that = this;
        
      return new Promise (function (resolve, reject) {
       function  connect () {  
          try {
        
            let con = MediaInfo._getRequestOptions(that._url);
          
            that._icyConnection = icy.get(con, function (res) {
              if (res.statusCode >= 300 && res.statusCode < 400) {
                log.info("%s - Detected redirection (%d) to %s",that._name, res.statusCode, res.headers.location);
                that._url = res.headers.location;
                connect();
              } else {
                resolve([that._url, res]);
              }
            }); 
            that._icyConnection.on('error',    function (err) { that._closeIcyConnection; reject(Error(err));  });
          } catch (e) {
            reject(Error(e));
          }
        }
        connect();        
      });      
    }
    
    _closeIcyConnection () {
    
      let that = this;
      if (that._icyConnection) {
        try{
          that._icyConnection.abort();
        } catch (e){};
        delete that._icyConnection;
      }
    }
    
    static _getRequestOptions (theUrl) {
      //Create a header with user-agent: this is required by some servers
      //Apache musicindex mod crashes without it
      let con = url.parse(theUrl);
      con.headers = {
        'User-Agent': 'ChromecastPlayer'
      };
      return con;
    }
    
    _parseIcyHeaderPromise(args) {
      
      let baseUrl = args[0];
      let res = args[1];
      let that = this;
      
      /* 
       * Example from http://edge.live.mp3.mdn.newmedia.nacamar.net/ps-dieneue_rock/livestream_hi.mp3
       * 
       * {'accept-ranges': 'none',
       *  'content-type': 'audio/mpeg',
       *  'icy-br': '128',
       *  'ice-audio-info': 'ice-samplerate=44100;ice-bitrate=128;ice-channels=2',
       *  'icy-description': 'BESTER ROCK UND POP',
       *  'icy-genre': 'Rock',
       *  'icy-name': 'DIE NEUE 107.7',
       *  'icy-pub': '1',
       *  'icy-url': 'http://www.dieneue1077.de',
       *  server: 'Icecast 2.3.3-kh11',
       *  'cache-control': 'no-cache, no-store',
       *  pragma: 'no-cache',
       *  'access-control-allow-origin': '*',
       *  'access-control-allow-headers': 'Origin, Accept, X-Requested-With, Content-Type',
       *  'access-control-allow-methods': 'GET, OPTIONS, HEAD',
       *  connection: 'close',
       *  expires: 'Mon, 26 Jul 1997 05:00:00 GMT',
       *  'icy-metaint': '16000' }
       */
      
      // log the HTTP response headers
      log.debug("%s - Connected to %s\n%s",that._name, that._url, util.inspect(res.headers, {depth:null, colors:true}));
      
      //Remember content
      if ("content-type" in res.headers)
        that._contentType = res.headers["content-type"];
      else
        that._contentType = mime.lookup(that._url);
      log.debug("%s - Detected %s as contentType",that._name,that._contentType);
       
      //Check if this is a playlist
      let parser;
      if (that._contentType == "audio/x-mpegurl") {
        //This is a M3U playlist
        parser = playlist_parsers.M3U;
      } else if (that._contentType == "audio/x-scpls") {
        //This is a PLS playlist
        parser = playlist_parsers.PLS;
      } else if (
        (that._contentType == "video/x-ms-asf") ||
        (that._contentType == "video/x-ms-asx"))
      {
          //This is a ASX playlist
          parser = playlist_parsers.ASX;
      }
      
      if (parser)
      {      
        log.info("%s - Detected playlist -> parse", that._name);
        return that._parsePlaylistPromise(baseUrl, res, parser);
      }
      else if ("icy-name" in res.headers)
      {      
        //Try to get title from icy header
        let title = that._url;
        if ("icy-name" in res.headers)
          title = res.headers["icy-name"];
        
        that._addItem (that._url, that._contentType, {title: title});
        
        // log any "metadata" events that happen
        res.on('metadata', that._gotMetadata.bind(that, res)); 
        
        //Keep reading to get new metadata
        res.pipe(devnull());    
      }
      else
      {
        //This is not a playlist and we do not know how to parse it -> add it with some defaults
        that._addItem (that._url, that._contentType, {title: that._url});
        
        //Close connection
        that._closeIcyConnection();
      }
      
      return Promise.resolve(that._items);
    }
    
    static validContentType (contentType) {
      return (MIME_BLACKLIST.indexOf(contentType) < 0);
    }
    
    _addItem (url, contentType, metadata) {
      let that = this;
      
      if (MediaInfo.validContentType (contentType)) {
        that._items.push ({
          "url": url,
          "contentType": contentType,
          "metadata": metadata
        });
      } else
        log.error("%s - Not supported type (%s) for %s", that._name, contentType, url);
    }
    
    _updateMetadata (metadata) {
      let that = this;
      that._items[0].metadata = Object.assign(that._items[0].metadata, metadata);;
    }
       
    //parse playlist
    _parsePlaylistPromise (baseUrl, res, parser) {
      
      let that = this;
      
      return new Promise (function (resolve, reject) {
      
        let body = '';
        res.on('data', function (chunk) {
          body += chunk;
        });
        
        res.on('end', function () {
          
          //console.log('BODY: ' + body);
          
          //We will generate promises for each element in the list
          //The result value of the promise is not relevant -> the action directly add items to that._items
          let itemPromises = [];
          
          let playlist = parser.parse(body);          
          for (let i in playlist) {
            //log.info("Item: %s", util.inspect(playlist[i], {depth:null, colors:true}));
            let theUrl      = url.resolve(baseUrl, playlist[i].file);
            let title       = playlist[i].title ? playlist[i].title : playlist[i].file;
            let artist      = playlist[i].artist ? playlist[i].artist: "unknown";
            
            //Try to guess content type based on extension
            let contentType = mime.lookup(theUrl);
            
            
            if (contentType) {
              //Got content
              itemPromises.push(
                new Promise(function (resolve, reject) {
                  //Add current item directly
                  that._addItem(theUrl, contentType, {title: title, artist:artist});
                  resolve();
                })
              );
            }
            else {
              //It did not work -> we need to access the URL directly (slower)
              let itemMediaInfo = new MediaInfo(that._name, theUrl);
              itemPromises.push(
                //Full process to get the mediaInfo from this URL
                itemMediaInfo.getInfoPromise()
                .then(function (itemList) {
                  //Add all founf elements
                  that._items = that._items.concat(itemList);
                  return Promise.resolve();                  
                })
              );
            }
          }
          delete that._icyConnection;       
          
          //After all promises are executed then we can return that._items
          resolve(
            Promise.all(itemPromises)
            .then(function () {
              return Promise.resolve(that._items);
            })
          );
        });
        
        res.on('error', function (err) {
          reject(err);
          delete that._icyConnection;
        });
      });    
    }
    
    _gotMetadata (res, metadata) {
      let that = this;
      /*
       * { StreamTitle: 'BILLY IDOL - WHITE WEDDING',
       StreamUrl: '&artist=BILLY%20IDOL&title=WHITE%20WEDDING&album=&duration=&songtype=S&overlay=&buycd=&website=&picture' }
       */
      var parsed = icy.parse(metadata);
      log.debug("%s - ICY got metadata: \n%s", that._name, util.inspect(parsed, {depth:null}));

      //Get title (if any)
      let titte = that._url;
      if (parsed.StreamTitle)
        that._updateMetadata({title: parsed.StreamTitle});

      //Notify that media has been updated
      that.emit(that.EVENT_UPDATE);
    };

    
  } //MediaInfo class end 
  
 
  
  var getMediaInfo = function (name, url){
    //TBD: cache MediaInfo classes
    return new MediaInfo (name, url);
  }
  
  //Export MediaInfo factory
  return {"get": getMediaInfo};
}
