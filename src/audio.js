/*
 * Copyright 2014, Gregg Tavares.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Gregg Tavares. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
/* eslint-env browser */

import {jsfxlib} from '../3rdParty/jsfx/jsfxlib.js';

const WebAudioAPI = window.AudioContext;
/**
 * @typedef {Object} AudioManager~Options
 * @property {callback} startedOnTouchCallback: **DEPREICATED**
 *       Use `mgr.on(`started`)
 *
 * @property {callback} callback: **DEPRECATED** use
 *       mgr.on('loaded').
 */

/**
 * This can either be a path to a file OR jsfx data for sounds
 * generated at runtime. Example:
 *
 *     var sounds = {
 *       coin: { jsfx: ["square",0.0000,0.4000,0.0000,0.0240,0.4080,0.3480,20.0000,909.0000,2400.0000,0.0000,0.0000,0.0000,0.0100,0.0003,0.0000,0.2540,0.1090,0.0000,0.0000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000], },
 *       jump: { jsfx: ["square",0.0000,0.4000,0.0000,0.0960,0.0000,0.1720,20.0000,245.0000,2400.0000,0.3500,0.0000,0.0000,0.0100,0.0003,0.0000,0.0000,0.0000,0.5000,0.0000,0.0000,0.0000,0.0000,1.0000,0.0000,0.0000,0.0000,0.0000], },
 *       fire: { filename: "assets/fire.ogg", samples: 8,  },
 *       boom: { filename: "assets/explosion.ogg", samples: 8,  },
 *     };
 *
 *
 * Note Firefox doesn't support MP3s as far as I know so you'll need
 * to supply .ogg files for it. Conversely, Safari doesn't support .ogg.
 * The library handles loading .mp3 or .ogg files regardless of what you specify
 * when you init the library. In other words if you put `filename: "foo.mp3"`
 * the library will try to load `foo.mp3` or `foo.ogg` depending on if the
 * browser supports one or the other.
 *
 * @typedef {Object} AudioManager~Sound
 * @property {string?} filename path to the file to load
 * @property {number?} samples How many of this sound can play
 *           simultainously. Note: this is NOT needed when using
 *           the Web Audio API. It is only needed for legacy
 *           browsers like IE11 and below.
 * @property {Array?} jsfx Data from jsfx. See http://egonelbre.com/project/jsfx/
 */

/**
 * To use this include it with
 *
 *     <script src="audio.js"></script>
 *
 * Then give it a list of sounds like this
 *
 *     var audioMgr = new AudioManager({
 *       fire:      { filename: "assets/fire.ogg",      samples: 8, },
 *       explosion: { filename: "assets/explosion.ogg", samples: 6, },
 *       hitshield: { filename: "assets/hitshield.ogg", samples: 6, },
 *       launch:    { filename: "assets/launch.ogg",    samples: 2, },
 *       gameover:  { filename: "assets/gameover.ogg",  samples: 1, },
 *       play:      { filename: "assets/play.ogg",      samples: 1, },
 *     });
 *
 * After that you can play sounds with
 *
 *     audioMgr.playSound('explosion');
 *     audioMgr.playSound('fire');
 *
 * The signature for `playSound` is
 * `playSound(name, when, loop)` where when is the time to play
 * the sound and loop is whether or not to play the sound
 * continuously in a loop.
 *
 * Playsound returns an object you can use to control the sound
 * though this part of the API is still in flux.
 *
 * `samples` is how may of that sound you want to be able to play at
 * the same time. THIS IS NOT NEEDED for any browser that supports the
 * Web Audio API. In other words it's only needed for IE.
 *
 * Also note Firefox doesn't support MP3s as far as I know so you'll need
 * to supply .ogg files for it. Conversely, Safari doesn't support .ogg.
 * The library handles loading .mp3 or .ogg files regardless of what you specify
 * when you init the library. In other words if you put `filename: "foo.mp3"`
 * the library will try to load `foo.mp3` or `foo.ogg` depending on if the
 * browser supports one or the other.
 *
 * @constructor
 * @param {Object(string:AudioManager~Sound}} sounds The sounds
 *        to load
 * @param {AudioManager~Options} options Options
 * @fires AudioManager#loaded when all sounds have loaded
 * @fires AudioManager#started when the first sound has played.
 *       On iOS no sounds can be played unless at least one is
 *       first initiated during a use gesture event. This event
 *       is useful for situtations where sounds 'should' start
 *       right from the beginning even if the player as not
 *       touched the screen. For exampme we might put up a
 *       message, "touch the screen" and remove that message
 *       when we get this event
 */
export class AudioManager {
  constructor(sounds, options) {
    options = options || {};
    const g_eventEmitter = new EventTarget();
    let g_context;
    const g_soundBank = {};
    let g_canPlay = false;
    let g_canPlayOgg;
    let g_canPlayMp3;
    let g_canPlayWav;
    let G_createFromFileFn;
    let G_createFromJSFXFn;

    const changeExt = function(filename, ext) {
      return filename.substring(0, filename.length - 3) + ext;
    };

    this.on = g_eventEmitter.addEventListener.bind(g_eventEmitter);
    this.addListener = this.on;
    this.addEventListener = this.on;
    this.removeListener = g_eventEmitter.removeEventListener.bind(g_eventEmitter);
    this.removeEventListener = this.removeListener;

    if (options.callback) {
      console.warn('AudioManager: options.callback is deprecated. Use mgr.on(\'loaded\', ...)');
      this.on('loaded', options.callback);
    }

    if (options.startedOnTouchCallback) {
      console.warn('AudioManager: options.startedOnTouchCallback is deprecated. Use mgr.on(\'started\', ...)');
      this.on('started', options.callback);
    }

    const WebAudioBuffer = function() {
    };

    WebAudioBuffer.prototype.play = function(opt_when, opt_loop) {
      if (!this.buffer) {
        console.log(this.name, ' not loaded');
        return undefined;
      }
      const src = g_context.createBufferSource();
      src.buffer = this.buffer;
      src.loop = opt_loop || false;
      src.connect(g_context.destination);
      if (src.start) {
        src.start(opt_when || 0);
      } else {
        src.noteOn(opt_when || 0);
      }
      return src;
    };

    const WebAudioJSFX = function(name, data, samples, opt_callback) {
      this.buffer = jsfxlib.createAudioBuffer(g_context, data);
      if (opt_callback) {
        setTimeout(opt_callback, 0);
      }
    };

    WebAudioJSFX.prototype = new WebAudioBuffer();

    function WebAudioSound(name, filename, samples, opt_callback) {
      this.name = name;
      const that = this;
      const req = new XMLHttpRequest();
      req.open('GET', filename, true);
      req.responseType = 'arraybuffer';
      req.onload = function() {
        g_context.decodeAudioData(req.response, function onSuccess(decodedBuffer) {
          // Decoding was successful, do something useful with the audio buffer
          that.buffer = decodedBuffer;
          if (opt_callback) {
            opt_callback(false);
          }
        }, function onFailure() {
           console.error('failed to decoding audio buffer: ' + filename);
           if (opt_callback) {
             opt_callback(true);
           }
        });
      };
      req.addEventListener('error', function(e) {
        console.error('failed to load:', filename, ' : ', e.target.status);
      }, false);
      req.send();
    }

    WebAudioSound.prototype = new WebAudioBuffer();

    // const handleError = function(filename/*, audio*/) {
    //   return function(e) {
    //     console.error('can\'t load ', filename);
    //   };
    // };

    this.playSound = function(name, opt_when, opt_loop) {
      if (!g_canPlay) {
        return undefined;
      }
      const sound = g_soundBank[name];
      if (!sound) {
        console.error('audio: \'' + name + '\' not known.');
        return undefined;
      }
      return sound.play(opt_when, opt_loop);
    };

    this.getTime = function() {
      return g_context ? g_context.currentTime : Date.now() * 0.001;
    };

    const playSoundToStartAudio = (function() {
      let count = 0;
      return function() {
        ++count;
        if (count < 3) {
          // just playing any sound does not seem to work.
          const source = g_context.createOscillator();
          const gain = g_context.createGain();
          source.frequency.value = 1;
          source.connect(gain);
          gain.gain.value = 0;
          gain.connect(g_context.destination);
          if (source.start) {
            source.start(0);
          } else {
            source.noteOn(0);
          }
          setTimeout(function() {
            source.disconnect();
            playSoundToStartAudio();
          }, 100);
        }
        if (count === 3) {
          g_eventEmitter.dispatchEvent(new CustomEvent('started'));
        }
      };
    }());

    this.loadSound = function(soundName, filename, samples, opt_callback) {
      const ext = filename.substring(filename.length - 3);
      if (ext === 'ogg' && !g_canPlayOgg) {
        filename = changeExt(filename, 'mp3');
      } else if (ext === 'wav' && !g_canPlayWav) {
        filename = changeExt(filename, 'mp3');
      } else if (ext === 'mp3' && !g_canPlayMp3) {
        filename = changeExt(filename, 'ogg');
      }
      const s = new G_createFromFileFn(soundName, filename, samples, opt_callback);
      g_soundBank[soundName] = s;
      return s;
    };

    this.makeJSFXSound = function(soundName, data, samples, opt_callback) {
      const s = new G_createFromJSFXFn(soundName, data, samples, opt_callback);
      g_soundBank[soundName] = s;
      return s;
    };

    this.loadSounds = function(sounds, opt_callback) {
      let soundsPending = 1;
      const soundsLoaded = function() {
        --soundsPending;
        if (soundsPending === 0 && opt_callback) {
          opt_callback();
        }
      };

      Object.keys(sounds).forEach(function(sound) {
        const data = sounds[sound];
        ++soundsPending;
        if (data.jsfx) {
          this.makeJSFXSound(sound, data.jsfx, data.samples, soundsLoaded);
        } else {
          this.loadSound(sound, data.filename, data.samples, soundsLoaded);
        }
      }.bind(this));

      // so that we generate a callback even if there are no sounds.
      // That way users don't have to restructure their code if they have no sounds or if they
      // disable sounds by passing none in.
      setTimeout(soundsLoaded, 0);
    };

    this.init = function(sounds) {
      const a = new Audio();
      g_canPlayOgg = a.canPlayType('audio/ogg');
      g_canPlayMp3 = a.canPlayType('audio/mp3');
      g_canPlayWav = a.canPlayType('audio/wav');
      g_canPlay = g_canPlayOgg || g_canPlayMp3;
      if (!g_canPlay) {
        return;
      }

      if (WebAudioAPI) {
        console.log('Using Web Audio API');
        g_context = new WebAudioAPI();

        if (!g_context.createGain) {
          g_context.createGain = g_context.createGainNode.bind(g_context);
        }

        G_createFromFileFn = WebAudioSound;
        G_createFromJSFXFn = WebAudioJSFX;
      } else {
        console.error('No WebAudio API');
      }

      if (WebAudioAPI) {
        playSoundToStartAudio();
      }

      let soundsPending = 1;
      const soundsLoaded = function() {
        --soundsPending;
        if (soundsPending === 0) {
          g_eventEmitter.dispatchEvent(new CustomEvent('loaded'));
        }
      };

      if (sounds) {
        Object.keys(sounds).forEach(function(sound) {
          const data = sounds[sound];
          ++soundsPending;
          if (data.jsfx) {
            this.makeJSFXSound(sound, data.jsfx, data.samples, soundsLoaded);
          } else {
            this.loadSound(sound, data.filename, data.samples, soundsLoaded);
          }
        }.bind(this));
      }

      // so that we generate a callback even if there are no sounds.
      // That way users don't have to restructure their code if they have no sounds or if they
      // disable sounds by passing none in.
      setTimeout(soundsLoaded, 0);

    }.bind(this);
    this.init(sounds);

    this.getSoundIds = function() {
      return Object.keys(g_soundBank);
    };
  }
  hasWebAudio() {
    return WebAudioAPI !== undefined;
  }
}

