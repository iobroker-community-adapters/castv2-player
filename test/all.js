"use strict"
const log = require('why-is-node-running') // should be your first require
var basic     = require("../examples/basic");
var streaming = require("../examples/streaming");
describe('Basic functions', function() {
  it('Single file', function(done) {
      this.timeout(20000); //It usually takes 7 seconds
      basic(done)
      .then  (function(){ done(0); })
      .catch (function(){ done(1); });
  });
  it('Streaming', function(done) {
      this.timeout(20000); //It usually takes 12 seconds
      streaming(done)
      .then  (function(){ done(0); })
      .catch (function(){ done(1); });
  });
});

var basePlaylist             = require("../examples/basePlaylist");
var announcement             = require("../examples/announcement");
var announcementInStreaming  = require("../examples/announcementInStreaming");
describe('Playlist', function() {
  it('Basic Streaming', function(done) {
      this.timeout(20000); //It usually takes 7 seconds
      basePlaylist(done)
      .then  (function(){ done(0); })
      .catch (function(){ done(1); });
  });
  it('Announcement', function(done) {
      this.timeout(60000); //It usually takes 45 seconds
      announcement(done)
      .then  (function(){ done(0); })
      .catch (function(){ done(1); });
  });
  it('Announcement during streaming', function(done) {
      this.timeout(45000); //It usually takes 25 seconds
      announcementInStreaming(done)
      .then  (function(){ done(0); })
      .catch (function(){ done(1); });
  });
});

// setTimeout(function () {
//   log() // logs out active handles that are keeping node running
// }, 10000)
