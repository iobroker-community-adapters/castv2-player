"use strict"

module.exports = function (_logClass) {

  //includes
  var mdns                  = require('multicast-dns');
  var txt                   = require('dns-txt')();
  var find                  = require('array-find');

  var log = _logClass ? _logClass : require("./dummyLogClass")("Scanner");
  
  class Device {
    constructor (name, host, port, type){
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

  class Scanner {
  
    constructor(cb_new, options) {

      //Add options default
      if (options                === undefined) options               = {};
      //How often to trigger a discovery. Default: every 10 minutes
      if (options.scanInterval   === undefined) options.scanInterval  = 600000;
      //Only return device matching name. Default: accept any devices
      if (options.name           === undefined) options.name          = undefined;
      //Max of devices to find. Default: 1
      if (options.maxMatches     === undefined) options.maxMatches    = 1;

      //Search for a Chromecast
      var browser = mdns({});

      //Remember what devices we have already found
      var found_devices = {};

      browser.on('response', function(response) {

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
        var decoded_txt = txt.decode(txt_field.data);
        var name = decoded_txt.fn;
        var type = decoded_txt.md; //'Chromecast','Chromecast Audio','Google Cast Group'
        var port = srv_field.data.port;
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
            if (old_device.cb_update) {
              //Call callback and update it with return value
              old_device.cb_update(old_device);
            }
          }
        } else {
          //First time we see this device
          found_devices[name] = new Device(name, host, port, type);
          if (cb_new) {
            log.debug('found device %s (%s) at %s:%d', name, type, host, port);
            cb_new(found_devices[name]);          
          }
          //Do we want more devices?
          if (found_devices.length >= options.maxMatches)
            cb_new = undefined;
        }
      });
      //Send query to find Chromecasts
      function sendQuery() {
        //console.log("Sending query");
        browser.query({
          questions:[{
            name: '_googlecast._tcp.local',
            type: 'PTR'
          }]
        });
      }
      sendQuery();

      
      if (options.scanInterval > 0)
        //Trigger periodic scans
        setInterval(sendQuery, options.scanInterval);
      else
        //Destroy after 15 seconds after we found all devices
        setTimeout(function(){ browser.destroy() }, 15000);
    }
  }
  
  return Scanner;
}

