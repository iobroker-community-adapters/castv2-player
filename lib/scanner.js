"use strict"

module.exports = function (_logClass) {

  //includes
  var mdns                  = require('multicast-dns');
  var find                  = require('array-find');

  var log = _logClass ? _logClass : require("./dummyLogClass")("Scanner");

  class Device {
    constructor (id, name, host, port, type){
      this.id = id;
      this.name = name;
      this.host = host;
      this.port = port;
      this.type = type; //'Chromecast','Chromecast Audio','Google Cast Group'
    }

    registerForUpdates (callback){
      this.cb_update = callback;
    }

    isGroup () {
      return (type == 'Google Cast Group');
    }

    isAudio () {
      return (type == 'Chromecast Audio');
    }
  }

  //Taken from https://github.com/mafintosh/dns-discovery/blob/4710835fcf83b3e8ab00ae311dcffc63fab5faf1/index.js#L709
  function decodeTxt (bufs) {
    var data = {}

    for (var i = 0; i < bufs.length; i++) {
      var buf = bufs[i]
      var j = buf.indexOf(61) // '='
      if (j === -1) data[buf.toString()] = true
      else data[buf.slice(0, j).toString()] = buf.slice(j + 1).toString()
    }

    return data
  }

  class Scanner {

    constructor(cb_new, options) {
      this.intervalHandler = undefined;
      this.timeoutHandler = undefined;
      this.browser = mdns({});

      //Add options default
      if (options                === undefined) options               = {};
      //How often to trigger a discovery. Default: every 10 minutes
      if (options.scanInterval   === undefined) options.scanInterval  = 600000;
      //Only return device matching name. Default: accept any devices
      if (options.name           === undefined) options.name          = undefined;
      //Max of devices to find. Default: none
      if (options.maxMatches     === undefined) options.maxMatches    = undefined;

      //Remember what devices we have already found
      var found_devices = {};

      this.browser.on('response', function(response) {

        var txt_field = find(response.additionals, function (entry) {
          return entry.type === 'TXT';
        });

        var srv_field = find(response.additionals, function (entry) {
          return entry.type === 'SRV';
        });

        var a_field = find(response.additionals, function (entry) {
          return entry.type === 'A';
        });

        if (!txt_field || !srv_field || !a_field) {
          return;
        }

        var host = a_field.data;
        var decoded_txt = decodeTxt(txt_field.data);
        var name = decoded_txt.fn;
        var type = decoded_txt.md; //'Chromecast','Chromecast Audio','Google Cast Group'
        var id = decoded_txt.id;
        var port = srv_field.data.port;
        //log.debug('device %s (%s) at %s:%d: %s', name, type, host, port, JSON.stringify(decoded_txt, null, 2));
        if (!host || !name || !port) {
          return;
        }

        //If options.name is set ignore not matching devices
        if (options.name && options.name != name) return;

        if (name in found_devices) {
          //We have seen this device already
          let old_device = found_devices[name];
          if (old_device.host != host || old_device.port != port) {
            //device has changed
            old_device.host = host;
            old_device.port = port;
            log.debug('updated device %s (%s) at %s:%d', name, type, host, port);
          } else {
            log.debug('received keep-alive for device %s (%s) at %s:%d', name, type, host, port);
          }
          if (old_device.cb_update) {
            //Call callback and update it with return value
            old_device.cb_update(old_device);
          }
        } else {
          //First time we see this device
          found_devices[name] = new Device(id, name, host, port, type);
          if (cb_new) {
            log.debug('found device %s (%s) at %s:%d', name, type, host, port);
            cb_new(found_devices[name]);
          }
          //Do we want more devices?
          if (Object.keys(found_devices).length >= options.maxMatches) {
            this.destroy()
	  }
        }
      });

      this._sendQuery();


      if (options.scanInterval > 0)
        //Trigger periodic scans
        this.intervalHandler = setInterval(this._sendQuery.bind(this), options.scanInterval);
      else
        //Destroy after 15 seconds after we found all devices
        this.timeoutHandler = setTimeout(this.destroy.bind(this), 15000);
    }

    //Send query to find Chromecasts
    _sendQuery() {
      //console.log("Sending query");
      this.browser.query({
        questions:[{
          name: '_googlecast._tcp.local',
          type: 'PTR'
        }]
      });
    }
  
    destroy () {
      log.info("Destroying chromecast scanner");
      this.browser.removeAllListeners('response');
      this.browser.destroy();
      if (this.intervalHandler)
        clearInterval(this.intervalHandler);
      if (this.timeoutHandler)
        clearTimeout(this.timeoutHandler);
    }
  }

  return Scanner;
}
