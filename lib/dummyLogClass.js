"use strict"
module.exports = function(componentName){

  class DummyLogClass {

    constructor (componentName){
      this.componentName = componentName;
    };

    _addPrefix (orgArguments) {
      let args = Array.prototype.slice.call(orgArguments);
      args[0] = this.componentName + " - " + args[0]
      return args;
    }

    error () {
      console.error.apply(console, this._addPrefix(arguments));
    }
    warn () {
      console.error.apply(console, this._addPrefix(arguments));
    }
    info () {
      console.log.apply(console, this._addPrefix(arguments));
    }
    debug () {
      console.log.apply(console, this._addPrefix(arguments));
    }

  } // end of class

  return new DummyLogClass(componentName);
}
