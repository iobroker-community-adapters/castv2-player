"use strict"
let vsprintf = require("sprintf-js").vsprintf
class LogWrapper {
  
  constructor (logger){
    this.logger = logger;
  }

  _wrapp (orgArguments) {
    let args = Array.prototype.slice.call(orgArguments);
    
    let firstArg = args[0];
    let restArgs = args.slice(1);
    console.log(vsprintf(firstArg, restArgs));
    return vsprintf(firstArg, restArgs);
  }
  
  error () {
    this.logger.error(this._wrapp(arguments));
  }
  warn () {
    this.logger.warn(this._wrapp(arguments));
  }
  info () {
    this.logger.info(this._wrapp(arguments));
  }
  debug () {
    this.logger.debug(this._wrapp(arguments));
  }
  
} // end of class

module.exports = LogWrapper;
