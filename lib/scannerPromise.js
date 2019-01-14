"use strict"

module.exports = function (_logClass) {

  var Scanner     = require("..").Scanner(_logClass);

  var scannerPromise = function (name) {
    return new Promise ( function (resolve, reject) {

      let options = {
        scanInterval: 2000,
        name:         name,
        maxMatches:   1
      }
      new Scanner(function(device) {
        resolve(device);
      }, options);
    });
  }

  return scannerPromise;
}
