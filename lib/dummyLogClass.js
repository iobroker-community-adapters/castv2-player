"use strict"
module.exports = function(componentName){

  class DummyLogClass {
    
    constructor (componentName){
      this.componentName = componentName;
    };
  
    _addPrefix (orgArguments) {
      var orgArguments = Array.prototype.slice.call(orgArguments);
      orgArguments[0] = this.componentName + " - "+orgArguments[0]
      return orgArguments;
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
