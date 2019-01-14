"use strict"

let mp3URL = "http://www.hubharp.com/web_sound/BachGavotteShort.mp3";
module.exports = {
  //deviceName: "audioBedroom",
  //deviceName: "VideoLivingroom",
  deviceName: "videoSmallKitchen",
  urls: {
    longSingle: "http://commondatastorage.googleapis.com/gtv-videos-bucket/CastVideos/dash/BigBuckBunnyAudio.mp4",
    shortSingle: mp3URL,
    mp3Streaming: "https://www.internet-radio.com/servers/tools/playlistgenerator/?u="+mp3URL+"&t=.mp3",
    mp3Streaming_firstItem: mp3URL,
    plsStreaming: "https://www.internet-radio.com/servers/tools/playlistgenerator/?u="+mp3URL+"&t=.pls",
    plsStreamin_firstItem: mp3URL,
    longPlaylist: "http://music.home.angelnu.com/Cantaautor/?option=recursive&action=playall",
    longPlaylist_firstItem: "http://music.home.angelnu.com:80/Cantaautor/BREL/BREL___JACQUES___LA_QU_TE.mp3",
    oggPlaylist: "http://music.home.angelnu.com/Pop/Juanes%20-%20Mi%20Sangre%20(Special%20Edition)/?option=recursive&action=playall",
    oggPlaylist_firstItem: "http://music.home.angelnu.com:80/Pop/Juanes%20-%20Mi%20Sangre%20(Special%20Edition)/01%20-%20Amame.ogg",
  }
}
