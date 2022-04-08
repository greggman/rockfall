/* eslint-env browser */

export const audio = {};
(function(samplerate){
    this.SampleRate = samplerate || 44100;
    const SampleRate = this.SampleRate;

    // Do not modify parameters without changing code!
    const BitsPerSample = 16;
    const NumChannels = 1;
    const BlockAlign = NumChannels * BitsPerSample >> 3;
    const ByteRate = SampleRate * BlockAlign;

    // helper functions
    const chr = String.fromCharCode; // alias for getting converting int to char

    //////////////////////
    // Wave            ///
    //////////////////////

    const waveTag = 'data:audio/wav;base64,';
    // constructs a wave from sample array
    const constructWave = function(data){
        let l;
        return pack( ['RIFF', 36 + (l = data.length), 'WAVEfmt ', 16, 1, NumChannels, SampleRate,
                       ByteRate, BlockAlign, BitsPerSample, 'data', l, data, ], 's4s4224422s4s');
    };

    // creates an audio object from sample data
    this.make = function(arr){
        return new Audio(waveTag + btoa(constructWave(arrayToData(arr))));
    };

    // creates a wave file for downloading
    this.makeWaveFile = function(arr){
        dataToFile(waveTag + btoa(constructWave(arrayToData(arr))));
    };

    this.makeAudioBuffer = function(ctx, data) {
        const buffer = ctx.createBuffer(1, data.length, SampleRate);
        const array = buffer.getChannelData(0);
        for (let i = 0; i < data.length; ++i) {
            array[i] = data[i];
        }
        return buffer;
    };

    //////////////////////
    // General stuff   ///
    //////////////////////

    // Converts an integer to String representation
    //   a - number
    //   i - number of bytes
    const istr = function(a, i){
        const m8 = 0xff; // 8 bit mask
        return i ? chr(a & m8) + istr(a >> 8, i - 1) : '';
    };

    // Packs array of data to a string
    //   data   - array
    //   format - s is for string, numbers denote bytes to store in
    const pack = function(data, format){
        let out = '';
        for (let i = 0; i < data.length; i++) {
          out += format[i] === 's' ? data[i] : istr(data[i], format.charCodeAt(i) - 48);
        }
        return out;
    };

    const dataToFile = function(data){
        document.location.href = data;
    };

    //////////////////////
    // Audio Processing ///
    //////////////////////

    // Utilities
    //////////////////////

    // often used variables (just for convenience)
    let count; let out; let i; let sfreq;
    const sin = Math.sin;
    const TAU = 2 * Math.PI;
    const Arr = function(c){
    return new Array(c | 0);
}; // alias for creating a new array

const clamp8bit  = function(a){
  return a < 0 ? 0 : a > 255 ? 255 : a;
};
const sample8bit = function(a){
  return clamp((a * 127 + 127) | 0);
};

    this.toTime    = function(a){
      return a / SampleRate;
    };
    this.toSamples = function(a){
    return a * SampleRate;
    };

    const arrayToData16bit = function(arr){
        let out = '';
        const len = arr.length;
        for ( i = 0; i < len; i++){
            let a = (arr[i] * 32767) | 0;
            a = a < -32768 ? -32768 : a > 32767 ? 32767 : a; // clamp
            a += a < 0 ? 65536 : 0;                       // 2-s complement
            out += String.fromCharCode(a & 255, a >> 8);
        }
        return out;
    };

    const arrayToData8bit = function(arr){
        let out = '';
        const len = arr.length;
        for ( i = 0; i < len; i++){
            let a = (arr[i] * 127 + 128) | 0;
            a = a < 0 ? 0 : a > 255 ? 255 : a;
            out += String.fromCharCode(a);
        }
        return out;
    };

    const arrayToData = function(arr){
        if ( BitsPerSample === 16 ) {
            return arrayToData16bit(arr);
        } else {
            return arrayToData8bit(arr);
        }
    };

    //////////////////////
    // Processing
    //////////////////////

    // adjusts volume of a buffer
    this.adjustVolume = function(data, v){
        for (let i = 0; i < data.length; i++) {
            data[i] *= v;
        }
        return data;
    };

    // Filters
    //////////////////////

    this.filter = function(data, func, from, to, A, B, C, D, E, F){
        from = from ? from : 1;
        to = to ? to : data.length;
        out = data.slice(0);
        for (i = from; i < to; i++) {
            out[i] = func(data, out, from, to, i, A, B, C, D, E, F);
        }
        return out;
    };
    const filter = this.filter;

    this.filters = {
        lowpass  :
            function(data, out, from, to, pos, A){
                return out[pos - 1] + A * (data[pos] - out[pos - 1]);
            },
        lowpassx :
            function(data, out, from, to, pos, A){
                return out[pos - 1] + A * (to - pos) / (to - from) * (data[pos] - out[pos - 1]);
            },
        highpass :
            function(data, out, from, to, pos, A){
                return A * (out[pos - 1] + data[pos] - data[pos - 1]);
            },
    };
    const filters = this.filters;

    this.f = {
        lowpass  : function(data, from, to, A){
            return filter(data, filters.lowpass, from, to, A);
        },
        lowpassx : function(data, from, to, A){
            return filter(data, filters.lowpassx, from, to, A);
        },
        highpass : function(data, from, to, A){
            return filter(data, filters.highpass, from, to, A);
        },
    };

    // Generators
    //////////////////////

    // general sound generation
    // example:
    // generate(3, 440, Math.sin);
    this.generate = function(count, freq, func, A, B, C, D, E, F){
        const sfreq = freq * TAU / SampleRate;
        const out = Arr(count);
        for (let i = 0; i < count; i++) {
          out[i] = func(i * sfreq, A, B, C, D, E, F);
        }
        return out;
    };

    let lastNoise = 0;

    const generate = this.generate;
    this.generators =  {
        noise  : function(phase){
                    if (phase % TAU < 4){
                        lastNoise = Math.random() * 2 - 1;
                    }
                    return lastNoise;
                },
        uninoise : Math.random,
        sine   : Math.sin,
        synth  : function(phase){
            return sin(phase) + .5 * sin(phase / 2) + .3 * sin(phase / 4);
        },
        saw    : function(phase){
            return 2 * (phase / TAU - ((phase / TAU + 0.5) | 0));
        },
        square : function(phase, A){
            return sin(phase) > A ? 1.0 : sin(phase) < A ? -1.0 : A;
        },
    };
    const generators = this.generators;

    this.g = {
        noise  : function(count){
            return generate(count, 0, generators.noise);
        },
        sine   : function(count, freq){
            return generate(count, freq, generators.sine);
        },
        synth  : function(count, freq){
            return generate(count, freq, generators.synth);
        },
        saw    : function(count, freq){
            return generate(count, freq, generators.saw);
        },
        square : function(count, freq, A){
            return generate(count, freq, generators.square, A);
        },
    };
}).apply(audio);
