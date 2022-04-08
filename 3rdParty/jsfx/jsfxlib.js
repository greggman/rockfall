/* eslint-env browser */

import {audio} from './audio.js';
import {jsfx} from './jsfx.js';

export const jsfxlib = {};
(function() {
    // takes object with param arrays
    // audiolib = {
    //   Sound : ["sine", 1, 2, 4, 1...
    // }
    //
    // returns object with audio samples
    // p.Sound.play()
    this.createWaves = function(lib){
        const sounds = {};
        for (const e in lib) {
            const data = lib[e];
            sounds[e] = this.createWave(data);
        }
        return sounds;
    };

    /* Create a single sound:
       var p = jsfxlib.createWave(["sine", 1,2,3, etc.]);
       p.play();
   */
    this.createWave = function(lib) {
        const params = this.arrayToParams(lib);
            const data = jsfx.generate(params);
            const wave = audio.make(data);

        return wave;
    };

    // takes object with param arrays
    //
    //     var audiolib = {
    //       someSound : ["sine", 1, 2, 4, 1...
    //     }
    //
    // returns object with AudioBuffers you can use
    // with the Web Audio API
    //
    //     var sounds = jsfxlib.createAudioBuffers(ctx, audiolib);
    //     var ctx = new AudioContext();
    //     var src = ctx.createBufferSource();
    //     src.buffer = sounds.someSound;
    //     src.connect(ctx.destination);
    //     src.start();
    this.createAudioBuffers = function(ctx, lib) {
        const sounds = {};
        for (const e in lib) {
            const data = lib[e];
            sounds[e] = this.createAudioBuffer(ctx, data);
        }
        return sounds;
    };

    // Create a single AudioBuffer
    //
    //     var buffer = jsfxlib.createAudioBuffer(ctx, ["sine", 1,2,3, etc.]);
    //     var ctx = new AudioContext();
    //     var src = ctx.createBufferSource();
    //     src.buffer = buffer;
    //     src.connect(ctx.destination);
    //     src.start();
    this.createAudioBuffer = function(ctx, lib) {
        const params = this.arrayToParams(lib);
            const data = jsfx.generate(params);
            const buffer = audio.makeAudioBuffer(ctx, data);

        return buffer;
    };

    this.paramsToArray = function(params){
        const pararr = [];
        const len = jsfx.Parameters.length;
        for (let i = 0; i < len; i++){
            pararr.push(params[jsfx.Parameters[i].id]);
        }
        return pararr;
    };

    this.arrayToParams = function(pararr){
        const params = {};
        const len = jsfx.Parameters.length;
        for (let i = 0; i < len; i++){
            params[jsfx.Parameters[i].id] = pararr[i];
        }
        return params;
    };
}).apply(jsfxlib);


