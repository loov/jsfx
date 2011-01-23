var jsfx = {};
(function () {
    var Parameters = [];

    this.loadParameters = function () {
        var grp = 0;
        var ap = function (name, min, max, def, step) {
            if (step === undefined)
                step = (max - min) / 1000;
            var param = { name: name,
                          min: min, max: max, step:step, def: def, 
                          node: undefined, group: grp};
            Parameters.push(param);
        };
        
        ap("Master Volume",  0, 1, 0.4);
        grp++;
        
        ap("Attack Time",    0, 1, 0.1); // seconds
        ap("Sustain Time",   0, 2, 0.3); // seconds
        ap("Sustain Punch",  0, 3, 2);
        ap("Decay Time",     0, 2, 1); // seconds
        grp++;
        
        ap("Min Frequency",   20, 2400, 0, 1);
        ap("Start Frequency", 20, 2400, 440, 1);
        ap("Max Frequency",   20, 2400, 2000, 1);
        ap("Slide",           -1, 1, 0);
        ap("Delta Slide",     -1, 1, 0);
        
        grp++;
        ap("Vibrato Depth",     0, 1, 0);
        ap("Vibrato Frequency", 0.01, 48, 8);
        ap("Vibrato Depth Slide",   -0.3, 1, 0);
        ap("Vibrato Frequency Slide", -1, 1, 0);
        
        grp++;
        ap("Change Amount", -12, 12, 0);
        ap("Change Speed",  0, 2, 0.1);
        
        grp++;
        ap("Square Duty", 0, 0.5, 0);
        ap("Square Duty Sweep", -1, 1, 0);
        
        grp++;
        ap("Repeat Speed", 0, 0.8, 0);
        
        grp++;
        ap("Phaser Offset", -1, 1, 0);
        ap("Phaser Sweep", -1, 1, 0);
        
        grp++;
        ap("LP Filter Cutoff", 0, 1, 0);
        ap("LP Filter Cutoff Sweep", -1, 1, 0);
        ap("LP Filter Resonance",    0, 100, 50);
        ap("HP Filter Cutoff",       0, 1, 1);
        ap("HP Filter Cutoff Sweep", -1, 1, -0.5);
        
        grp++;
        ap("Super Sampling Quality", 0, 16, 0, 1);
    };
    
    this.generate = function(params){
        // useful consts
        var TAU = 2 * Math.PI;
        var SampleRate = audio.SampleRate;
        
        // super sampling
        var super_sampling_quality = params.SuperSamplingQuality | 0;
        if(super_sampling_quality < 1) super_sampling_quality = 1;
        SampleRate = SampleRate * super_sampling_quality;
        
        // useful functions
        var sin = Math.sin;
        
        // enveloping initialization
        var _ss = 1.0 + params.SustainPunch;
        var envelopes = [ {from: 0.0, to: 1.0, time: params.AttackTime},
                          {from: _ss, to: 1.0, time: params.SustainTime},
                          {from: 1.0, to: 0.0, time: params.DecayTime}];
        var envelopes_len = envelopes.length;
        
        // envelope sample calculation
        for(var i = 0; i < envelopes_len; i++){
            envelopes[i].samples = (envelopes[i].time * SampleRate) | 0
        }
        
        // envelope loop variables
        var envelope = undefined;
        var envelope_cur = 0.0;
        var envelope_idx = -1;
        var envelope_increment = 0.0;
        var envelope_last = -1;
        
        // count total samples
        var totalSamples = 0;
        for(var i = 0; i < envelopes_len; i++){
            totalSamples += envelopes[i].samples;
        }
        
        // out data samples
        var out = new Array(totalSamples);
        var sample = 0;
        
        // main generator        
        var generator = params.generator;
        var generator_A = 0;
        var generator_B = 0;
        
        // square generator
        generator_A = params.SquareDuty;
        square_slide = params.SquareDutySweep / SampleRate;
        
        // phase calculation
        var phase = 0;
        var phase_speed = params.StartFrequency * TAU / SampleRate;
        
        // phase slide calculation        
        var phase_slide = 1.0 + Math.pow(params.Slide, 3.0) * 3.0 / SampleRate;
        var phase_delta_slide = Math.pow(params.DeltaSlide, 3.0) / (SampleRate * 1000); 
        if (super_sampling_quality !== undefined)
            phase_delta_slide /= super_sampling_quality; // correction
        
        // frequency limiter
        if(params.MinFrequency > params.StartFrequency)
            params.MinFrequency = params.StartFrequency;
            
        if(params.MaxFrequency < params.StartFrequency)
            params.MaxFrequency = params.StartFrequency;
        
        var phase_min_speed = params.MinFrequency * TAU / SampleRate;
        var phase_max_speed = params.MaxFrequency * TAU / SampleRate;
        
        // frequency vibrato
        var vibrato_phase = 0;
        var vibrato_phase_speed = params.VibratoFrequency * TAU / SampleRate;
        var vibrato_amplitude = params.VibratoDepth;
        
        // frequency vibrato slide
        var vibrato_phase_slide = 1.0 + Math.pow(params.VibratoFrequencySlide, 3.0) * 3.0 / SampleRate;
        var vibrato_amplitude_slide = params.VibratoDepthSlide / SampleRate;
        
        // arpeggiator
        var arpeggiator_time = 0;
        var arpeggiator_limit = params.ChangeSpeed * SampleRate;
        var arpeggiator_mod   = 1 + (params.ChangeAmount | 0) / 12.0;
        
        // phaser
        var phaser_max = 1024;
        var phaser_mask = 1023;
        var phaser_buffer = new Array(phaser_max);
        for(var _i = 0; _i < phaser_max; _i++)
            phaser_buffer[_i] = 0;
        var phaser_pos = 0;
        var phaser_offset = Math.pow(params.PhaserOffset, 2.0) * (phaser_max - 4);
        var phaser_offset_slide = Math.pow(params.PhaserSweep, 3.0) * 4000 / SampleRate;
        var phaser_enabled = (Math.abs(phaser_offset_slide) > 0.00001) ||
                             (Math.abs(phaser_offset) > 0.00001);
        
        // lowpass filter
        var filters_enabled = (params.HPFilterCutoff < 0.99) || (params.LPFilterCutoff > 0.01);
        var lowpass_pos = 0;
        var lowpass_pos_slide = 0;
        var lowpass_cutoff = Math.pow(params.LPFilterCutoff, 3.0) / 10;
        var lowpass_cutoff_slide = 1.0;
        var lowpass_damping = 0.2;
        var lowpass_enabled = params.LPFilterCutoff < 0.99;
        
        // highpass filter
        var highpass_pos = 0;
        var highpass_cutoff = Math.pow(params.HPFilterCutoff, 2.0) * 0.1;
        var highpass_cutoff_slide = 1.0 + params.HPFilterCutoffSweep * 4 / SampleRate;
        
        // repeat
        var repeat_time  = 0;
        var repeat_limit = totalSamples;
        if (params.RepeatSpeed > 0){
            repeat_limit = Math.pow(1 - params.RepeatSpeed, 2.0) * SampleRate + 32;
        }
        
        // master volume controller
        var master_volume = params.MasterVolume;
        
        for(var i = 0; i < totalSamples; i++){
            // main generator
            sample = generator(phase, generator_A, generator_B);
            
            if( repeat_time > repeat_limit ){
                // phase reset
                var phase = 0;
                var phase_speed = params.StartFrequency * TAU / SampleRate;
                // phase slide reset
                var phase_slide = 1.0 + Math.pow(params.Slide, 3.0) * 3.0 / SampleRate;
                var phase_delta_slide = Math.pow(params.DeltaSlide, 3.0) / (SampleRate * 1000);
                if (super_sampling_quality !== undefined)
                    phase_delta_slide /= super_sampling_quality; // correction
                // arpeggiator reset
                var arpeggiator_time = 0;
                var arpeggiator_limit = params.ChangeSpeed * SampleRate;
                var arpeggiator_mod   = 1 + (params.ChangeAmount | 0) / 12.0;                
                // repeat reset
                repeat_time = 0;
            }
            repeat_time += 1;
            
            // square generator
            generator_A += square_slide;
            if(generator_A < 0.0){
                generator_A = 0.0;
            } else if (generator_A > 0.5){
                generator_A = 0.5;
            }
            
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
            } else if(phase_speed < phase_min_speed){
                phase_speed = phase_min_speed;
            }
            
            // frequency vibrato
            vibrato_phase += vibrato_phase_speed;
            var _vibrato_phase_mod = phase_speed * sin(vibrato_phase) * vibrato_amplitude;
            phase += _vibrato_phase_mod;
            
            // frequency vibrato slide
            vibrato_phase_speed *= vibrato_phase_slide;
            if(vibrato_amplitude_slide){
                vibrato_amplitude += vibrato_amplitude_slide;
                if(vibrato_amplitude < 0){
                    vibrato_amplitude = 0;
                    vibrato_amplitude_slide = 0;
                } else if (vibrato_amplitude > 1){
                    vibrato_amplitude = 1;
                    vibrato_amplitude_slide = 0;
                }
            }
            
            // phaser
            if (phaser_enabled) {
                phaser_offset += phaser_offset_slide;
                if( phaser_offset < 0){
                    phaser_offset = -phaser_offset;
                    phaser_offset_slide = -phaser_offset_slide;
                }
                if( phaser_offset > phaser_mask){
                    phaser_offset = phaser_mask;
                    phaser_offset_slide = 0;
                }
                
                phaser_buffer[phaser_pos] = sample;
                // phaser sample modification
                var _p = (phaser_pos - (phaser_offset|0) + phaser_max) & phaser_mask;
                sample += phaser_buffer[_p];
                phaser_pos = (phaser_pos + 1) & phaser_mask;
            }
            
            /*
            // filters
            if( filters_enabled ){
                
                var _lowpass_pos_old = lowpass_pos;
                lowpass_cutoff *= lowpass_cutoff_slide;
                if(lowpass_cutoff < 0.0){
                    lowpass_cutoff = 0.0;
                } else if ( lowpass_cutoff > 0.1 ){
                    lowpass_cutoff = 0.1;
                }
                if(lowpass_enabled){
                    lowpass_pos_slide += (sample - lowpass_pos) * lowpass_cutoff;
                    lowpass_pos_slide *= lowpass_damping;
                } else {
                    lowpass_pos = sample;
                    lowpass_pos_slide = 0;
                }
                lowpass_pos += lowpass_pos_slide;
                
                highpass_pos += lowpass_pos - _lowpass_pos_old;
                highpass_pos *= 1.0 - highpass_cutoff;
                sample = highpass_pos;
            }*/
            
            // envelope processing
            if( i > envelope_last ){
                envelope_idx += 1;
                if(envelope_idx < envelopes_len) // fault protection
                    envelope = envelopes[envelope_idx];
                envelope_cur = envelope.from;
                envelope_increment = (envelope.to - envelope.from) / envelope.samples;
                envelope_last += envelope.samples;
            }
            sample *= envelope_cur;
            envelope_cur += envelope_increment;
            
            // master volume controller
            sample *= master_volume;
            
            // prepare for next sample
            out[i] = sample;
        }
        
        // super sampling
        if(super_sampling_quality > 1){
            var smooth_totalSamples = (totalSamples/super_sampling_quality)|0;
            var smooth_out = new Array(smooth_totalSamples);
            for(var i = 0 ; i < smooth_totalSamples; i++){
                smooth_out[i] = 0;
                var b = i * super_sampling_quality;
                for(var z = 0; z < super_sampling_quality; z++)
                    smooth_out[i] += out[b + z];
                smooth_out[i] /= super_sampling_quality;
            }
            out = smooth_out;
        }
        
        return out;
    }
    
    this.createConfigurationPanel = function (id) {
        this.loadParameters();
        var frag = document.createDocumentFragment(),
            len = Parameters.length,
            lastgroup = undefined;
        var group;
        for (var i = 0; i < len; i += 1) {
            var param = Parameters[i],
                row = document.createElement("tr"),
                fld = document.createElement("td"),
                input = document.createElement("input");
            if (param.group !== lastgroup) {
                group = document.createElement("table");
                frag.appendChild(group);
                lastgroup = param.group;
            }
            // add caption
            fld.appendChild(document.createTextNode(param.name));
            row.appendChild(fld);
            // create sliders
            fld = document.createElement("td");
            input.type = "range";
            input.step = param.step;
            input.min  = param.min;
            input.max  = param.max;
            input.value = param.def;
            param.node = input;            
            fld.appendChild(input);
            row.appendChild(fld);            
            group.appendChild(row);
        }
        var confpanel = document.getElementById(id);
        confpanel.appendChild(frag);
    };

    var nameToParam = function(name){
        return name.replace(/ /g, "");
    }
    
    this.getParams = function () {
        var values = {},
            len = Parameters.length;
        for (var i = 0; i < len; i += 1) {
            var param = Parameters[i];
            values[nameToParam(param.name)] = parseFloat(param.node.value);
        }
        
        // hack
        var param = false;
        var generators = document.getElementById("generators").generator;
        for(var i = 0; i < generators.length; i++){
            if (generators[i].checked)
                param = generators[i].value;
        }
        
        values.generator = audio.generators[param]
        if(values.generator === undefined)
            values.generator = audio.generators.square;
        return values;
    };
    
    this.setParams = function (params) {
        var len = Parameters.length;
        for (var e in params){
            for (var i = 0; i < len; i += 1){
                var param = Parameters[i];
                if( nameToParam(param.name) === e ){
                    param.node.value = params[e];
                    break;
                }
            }
        }
    }
    
    this.randomize = function(){
        var len = Parameters.length;
        for (var i = 0; i < len; i++) {
            var param = Parameters[i];
            if( nameToParam(param.name) === "MasterVolume" ) continue;
            if( nameToParam(param.name) === "SuperSamplingQuality" ) continue;
            param.node.value = param.min + (param.max - param.min) * Math.random();
        }        
        
        // hack
        var generators = document.getElementById("generators").generator;        
        var i = (Math.random() * generators.length) | 0;
        generators[i].checked = true;
        
        this.play();
    }
    
    this.randomSample = function(id){
        // this should randomize based on some values
    }
    
    this.reset = function () {
        var len = Parameters.length;
        for (var i = 0; i < len; i += 1) {
            var param = Parameters[i];
            param.node.value = param.def;
        }
    }
    
    this.play = function(){
        var params = this.getParams();
        logreset();        
        var data = this.generate(params);
        log('generate');
        var wave = audio.make(data);
        log('make wave');
        wave.play();
        return wave;
    }
    
}).apply(jsfx);
