/* eslint-env browser */

import {audio} from './audio.js';

export const jsfx = {};
(function() {
    this.Parameters = []; // will be constructed in the end

    this.Generators = {
        square : audio.generators.square,
        saw    : audio.generators.saw,
        sine   : audio.generators.sine,
        noise  : audio.generators.noise,
        synth  : audio.generators.synth,
    };

    this.getGeneratorNames = function(){
        const names = [];
        for (const e in this.Generators) {
            names.push(e);
        }
        return names;
    };

    const nameToParam = function(name){
        return name.replace(/ /g, '');
    };

    this.getParameters = function() {
        const params = [];

        let grp = 0;

        // add param
        const ap = function(name, min, max, def, step) {
            if (step === undefined) {
                step = (max - min) / 1000;
            }
            const param = { name: name, id: nameToParam(name),
                          min: min, max: max, step:step, def: def,
                          type: 'range', group: grp, };
            params.push(param);
        };

        // add option
        const ao = function(name, options, def){
            const param = {name: name, id: nameToParam(name),
                         options: options, def: def,
                         type: 'option', group: grp, };
            params.push(param);
        };

        const gens = this.getGeneratorNames();
        ao('Generator', gens, gens[0]);
        ap('Super Sampling Quality', 0, 16, 0, 1);
        ap('Master Volume',  0, 1, 0.4);
        grp++;

        ap('Attack Time',    0, 1, 0.1); // seconds
        ap('Sustain Time',   0, 2, 0.3); // seconds
        ap('Sustain Punch',  0, 3, 2);
        ap('Decay Time',     0, 2, 1); // seconds
        grp++;

        ap('Min Frequency',   20, 2400, 0, 1);
        ap('Start Frequency', 20, 2400, 440, 1);
        ap('Max Frequency',   20, 2400, 2000, 1);
        ap('Slide',           -1, 1, 0);
        ap('Delta Slide',     -1, 1, 0);

        grp++;
        ap('Vibrato Depth',     0, 1, 0);
        ap('Vibrato Frequency', 0.01, 48, 8);
        ap('Vibrato Depth Slide',   -0.3, 1, 0);
        ap('Vibrato Frequency Slide', -1, 1, 0);

        grp++;
        ap('Change Amount', -1, 1, 0);
        ap('Change Speed',  0, 1, 0.1);

        grp++;
        ap('Square Duty', 0, 0.5, 0);
        ap('Square Duty Sweep', -1, 1, 0);

        grp++;
        ap('Repeat Speed', 0, 0.8, 0);

        grp++;
        ap('Phaser Offset', -1, 1, 0);
        ap('Phaser Sweep', -1, 1, 0);

        grp++;
        ap('LP Filter Cutoff', 0, 1, 1);
        ap('LP Filter Cutoff Sweep', -1, 1, 0);
        ap('LP Filter Resonance',    0, 1, 0);
        ap('HP Filter Cutoff',       0, 1, 0);
        ap('HP Filter Cutoff Sweep', -1, 1, 0);

        return params;
    };


    /**
     * Input params object has the same parameters as described above
     * except all the spaces have been removed
     *
     * This returns an array of float values of the generated audio.
     *
     * To make it into a wave use:
     *    data = jsfx.generate(params)
     *    audio.make(data)
     */
    this.generate = function(params){
        // useful consts/functions
        const TAU = 2 * Math.PI;
            const sin = Math.sin;
            const cos = Math.cos;
            const pow = Math.pow;
            const abs = Math.abs;
        let SampleRate = audio.SampleRate;

        // super sampling
        let super_sampling_quality = params.SuperSamplingQuality | 0;
        if (super_sampling_quality < 1) {
            super_sampling_quality = 1;
        }
        SampleRate = SampleRate * super_sampling_quality;

        // enveloping initialization
        const _ss = 1.0 + params.SustainPunch;
        const envelopes = [
          {from: 0.0, to: 1.0, time: params.AttackTime},
          {from: _ss, to: 1.0, time: params.SustainTime},
          {from: 1.0, to: 0.0, time: params.DecayTime},
        ];
        const envelopes_len = envelopes.length;

        // envelope sample calculation
        for (let i = 0; i < envelopes_len; i++){
            envelopes[i].samples = 1 + ((envelopes[i].time * SampleRate) | 0);
        }
        // envelope loop variables
        let envelope;
        let envelope_cur = 0.0;
        let envelope_idx = -1;
        let envelope_increment = 0.0;
        let envelope_last = -1;

        // count total samples
        let totalSamples = 0;
        for (let i = 0; i < envelopes_len; i++){
            totalSamples += envelopes[i].samples;
        }

        // fix totalSample limit
        if ( totalSamples < SampleRate / 2){
            totalSamples = SampleRate / 2;
        }

        const outSamples = (totalSamples / super_sampling_quality) | 0;

        // out data samples
        const out = new Array(outSamples);
        let sample = 0;
        let sample_accumulator = 0;

        // main generator
        let generator = jsfx.Generators[params.Generator];
        if (generator === undefined) {
            generator = this.Generators.square;
        }
        let generator_A = 0;
        const generator_B = 0;

        // square generator
        generator_A = params.SquareDuty;
        const square_slide = params.SquareDutySweep / SampleRate;

        // phase calculation
        let phase = 0;
        let phase_speed = params.StartFrequency * TAU / SampleRate;

        // phase slide calculation
        let phase_slide = 1.0 + pow(params.Slide, 3.0) * 64.0 / SampleRate;
        let phase_delta_slide = pow(params.DeltaSlide, 3.0) / (SampleRate * 1000);
        if (super_sampling_quality !== undefined) {
            phase_delta_slide /= super_sampling_quality;
        } // correction

        // frequency limiter
        if (params.MinFrequency > params.StartFrequency) {
            params.MinFrequency = params.StartFrequency;
        }

        if (params.MaxFrequency < params.StartFrequency) {
            params.MaxFrequency = params.StartFrequency;
        }

        const phase_min_speed = params.MinFrequency * TAU / SampleRate;
        const phase_max_speed = params.MaxFrequency * TAU / SampleRate;

        // frequency vibrato
        let vibrato_phase = 0;
        let vibrato_phase_speed = params.VibratoFrequency * TAU / SampleRate;
        let vibrato_amplitude = params.VibratoDepth;

        // frequency vibrato slide
        const vibrato_phase_slide = 1.0 + pow(params.VibratoFrequencySlide, 3.0) * 3.0 / SampleRate;
        let vibrato_amplitude_slide = params.VibratoDepthSlide / SampleRate;

        // arpeggiator
        let arpeggiator_time = 0;
        let arpeggiator_limit = params.ChangeSpeed * SampleRate;
        let arpeggiator_mod   = pow(params.ChangeAmount, 2);
        if (params.ChangeAmount > 0) {
            arpeggiator_mod = 1 + arpeggiator_mod * 10;
        } else {
            arpeggiator_mod = 1 - arpeggiator_mod * 0.9;
        }

        // phaser
        const phaser_max = 1024;
        const phaser_mask = 1023;
        const phaser_buffer = new Array(phaser_max);
        for (let _i = 0; _i < phaser_max; _i++) {
            phaser_buffer[_i] = 0;
        }
        let phaser_pos = 0;
        let phaser_offset = pow(params.PhaserOffset, 2.0) * (phaser_max - 4);
        let phaser_offset_slide = pow(params.PhaserSweep, 3.0) * 4000 / SampleRate;
        const phaser_enabled = (abs(phaser_offset_slide) > 0.00001) ||
                             (abs(phaser_offset) > 0.00001);

        // lowpass filter
        const filters_enabled = (params.HPFilterCutoff > 0.001) || (params.LPFilterCutoff < 0.999);

        let lowpass_pos = 0;
        let lowpass_pos_slide = 0;
        let lowpass_cutoff = pow(params.LPFilterCutoff, 3.0) / 10;
        const lowpass_cutoff_slide = 1.0 + params.HPFilterCutoffSweep / 10000;
        let lowpass_damping = 5.0 / (1.0 + pow(params.LPFilterResonance, 2) * 20 ) *
                                    (0.01 + params.LPFilterCutoff);
        if ( lowpass_damping > 0.8) {
            lowpass_damping = 0.8;
        }
        lowpass_damping = 1.0 - lowpass_damping;
        const lowpass_enabled = params.LPFilterCutoff < 0.999;

        // highpass filter
        let highpass_accumulator = 0;
        let highpass_cutoff = pow(params.HPFilterCutoff, 2.0) / 10;
        const highpass_cutoff_slide = 1.0 + params.HPFilterCutoffSweep / 10000;

        // repeat
        let repeat_time  = 0;
        let repeat_limit = totalSamples;
        if (params.RepeatSpeed > 0){
            repeat_limit = pow(1 - params.RepeatSpeed, 2.0) * SampleRate + 32;
        }

        // master volume controller
        const master_volume = params.MasterVolume;

        let k = 0;
        for (let i = 0; i < totalSamples; i++){
            // main generator
            sample = generator(phase, generator_A, generator_B);

            // square generator
            generator_A += square_slide;
            if (generator_A < 0.0){
                generator_A = 0.0;
            } else if (generator_A > 0.5){
                generator_A = 0.5;
            }

            if ( repeat_time > repeat_limit ){
                // phase reset
                phase = 0;
                phase_speed = params.StartFrequency * TAU / SampleRate;
                // phase slide reset
                phase_slide = 1.0 + pow(params.Slide, 3.0) * 3.0 / SampleRate;
                phase_delta_slide = pow(params.DeltaSlide, 3.0) / (SampleRate * 1000);
                if (super_sampling_quality !== undefined) {
                    phase_delta_slide /= super_sampling_quality;
                } // correction
                // arpeggiator reset
                arpeggiator_time = 0;
                arpeggiator_limit = params.ChangeSpeed * SampleRate;
                arpeggiator_mod   = 1 + (params.ChangeAmount | 0) / 12.0;
                // repeat reset
                repeat_time = 0;
            }
            repeat_time += 1;

            // phase calculation
            phase += phase_speed;

            // phase slide calculation
            phase_slide += phase_delta_slide;
            phase_speed *= phase_slide;

            // arpeggiator
            if ( arpeggiator_time > arpeggiator_limit ){
                phase_speed *= arpeggiator_mod;
                arpeggiator_limit = totalSamples;
            }
            arpeggiator_time += 1;

            // frequency limiter
            if (phase_speed > phase_max_speed){
                phase_speed = phase_max_speed;
            } else if (phase_speed < phase_min_speed){
                phase_speed = phase_min_speed;
            }

            // frequency vibrato
            vibrato_phase += vibrato_phase_speed;
            const _vibrato_phase_mod = phase_speed * sin(vibrato_phase) * vibrato_amplitude;
            phase += _vibrato_phase_mod;

            // frequency vibrato slide
            vibrato_phase_speed *= vibrato_phase_slide;
            if (vibrato_amplitude_slide){
                vibrato_amplitude += vibrato_amplitude_slide;
                if (vibrato_amplitude < 0){
                    vibrato_amplitude = 0;
                    vibrato_amplitude_slide = 0;
                } else if (vibrato_amplitude > 1){
                    vibrato_amplitude = 1;
                    vibrato_amplitude_slide = 0;
                }
            }

            // filters
            if ( filters_enabled ){

                if ( abs(highpass_cutoff) > 0.001){
                    highpass_cutoff *= highpass_cutoff_slide;
                    if (highpass_cutoff < 0.00001){
                        highpass_cutoff = 0.00001;
                    } else if (highpass_cutoff > 0.1){
                        highpass_cutoff = 0.1;
                    }
                }

                const _lowpass_pos_old = lowpass_pos;
                lowpass_cutoff *= lowpass_cutoff_slide;
                if (lowpass_cutoff < 0.0){
                    lowpass_cutoff = 0.0;
                } else if ( lowpass_cutoff > 0.1 ){
                    lowpass_cutoff = 0.1;
                }
                if (lowpass_enabled){
                    lowpass_pos_slide += (sample - lowpass_pos) * lowpass_cutoff;
                    lowpass_pos_slide *= lowpass_damping;
                } else {
                    lowpass_pos = sample;
                    lowpass_pos_slide = 0;
                }
                lowpass_pos += lowpass_pos_slide;

                highpass_accumulator += lowpass_pos - _lowpass_pos_old;
                highpass_accumulator *= 1.0 - highpass_cutoff;
                sample = highpass_accumulator;
            }

            // phaser
            if (phaser_enabled) {
                phaser_offset += phaser_offset_slide;
                if ( phaser_offset < 0){
                    phaser_offset = -phaser_offset;
                    phaser_offset_slide = -phaser_offset_slide;
                }
                if ( phaser_offset > phaser_mask){
                    phaser_offset = phaser_mask;
                    phaser_offset_slide = 0;
                }

                phaser_buffer[phaser_pos] = sample;
                // phaser sample modification
                const _p = (phaser_pos - (phaser_offset | 0) + phaser_max) & phaser_mask;
                sample += phaser_buffer[_p];
                phaser_pos = (phaser_pos + 1) & phaser_mask;
            }

            // envelope processing
            if ( i > envelope_last ){
                envelope_idx += 1;
                if (envelope_idx < envelopes_len) { // fault protection
                    envelope = envelopes[envelope_idx];
                } else { // the trailing envelope is silence
                    envelope = {from: 0, to: 0, samples: totalSamples};
                }
                envelope_cur = envelope.from;
                envelope_increment = (envelope.to - envelope.from) / (envelope.samples + 1);
                envelope_last += envelope.samples;
            }
            sample *= envelope_cur;
            envelope_cur += envelope_increment;

            // master volume controller
            sample *= master_volume;

            // prepare for next sample
            if (super_sampling_quality > 1){
                sample_accumulator += sample;
                if ( (i + 1) % super_sampling_quality === 0){
                    out[k] = sample_accumulator / super_sampling_quality;
                    k += 1;
                    sample_accumulator = 0;
                }
            } else {
                out[i] = sample;
            }
        }

        // return out;

        // add padding 10ms
        const len = (SampleRate / 100) | 0;
        const padding = new Array(len);
        for (let i = 0; i < len; i++) {
            padding[i] = 0;
        }
        return padding.concat(out).concat(padding);
    };

    this.Parameters = this.getParameters();

}).apply(jsfx);

