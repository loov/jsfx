(function(jsfx){
	"use strict";
	"use asm";

	const chr = String.fromCharCode;
	const TAU = 6.283185307179586;
	const TAU_100 = TAU * 100;
	const bitsPerSample = 16;
	const numChannels = 1;
	const sin = Math.sin;

	jsfx.SampleRate = 0;
	jsfx.Sec = 0;

	jsfx.SetSampleRate = function(sampleRate){
		jsfx.SampleRate = sampleRate;
		jsfx.Sec = sampleRate;
	};
	jsfx.SetSampleRate(getDefaultSampleRate());



	jsfx.Module = {};
	var unit = jsfx.unit = {
		Second: { suffix: "s"  },
		Hz:     { suffix: "hz" },
	};

	var stage = jsfx.stage = {
		PhaseSpeed    : 0,
		PhaseSpeedMod : 1,
		Phase         : 2,
		PhaseMod      : 3,
		Generator     : 4,
		SampleMod     : 5,
		Volume        : 6
	};

	jsfx.Composite = Composite;
	function Composite(params, modules){
		this.finished = false;

		this.state = {
			SampleRate: params.SampleRate || jsfx.SampleRate
		};
		this.params = [];

		// sort modules
		modules.sort(function(a,b){ return a.stage - b.stage; })
		this.modules = modules;

		// setup modules
		for(var i = 0; i < this.modules.length; i += 1){
			var M = this.modules[i];
			var P = params[M.name] || {};

			// add missing parameters
			map_object(M.params, function(def, name){
				P[name] = P[name] || def.D;
			});

			this.params.push(P);
			// setup the state
			this.modules[i].setup(this.state, this.params[i]);
		}
	}
	Composite.prototype = {
		// convert this into a module
		generate: function(block){
			var $ = this.state;
			var N = block.length;
			for(var i = 0; i < this.modules.length; i += 1){
				var M = this.modules[i],
					P = this.params[i];
				var n = M.process($, P, block);
				N = Math.min(N, n);
			}
			if(N < block.length){
				this.finished = true;
			}
			for(var i = N; i < block.length; i++){
				block[i] = 0;
			}
		}
	};

	// Frequency
	jsfx.Module.Frequency = {
		name: "Frequency",
		params: {
			Start: { L:20, H:2400, D:440  },

			Min:   { L:20, H:2400, D:0    },
			Max:   { L:20, H:2400, D:2000 },

			RepeatAfter:  { L: 0, H: 0.8, D: 0},
			Repeats: { L: 0, H: 0.8, D: 0},
		},
		stage: stage.PhaseSpeed,
		setup: function($, P){

		},
		process: function($, block){

		}
	};

	// Vibrato
	jsfx.Module.Vibrato = {
		name: "Vibrato",
		params: {
			Depth:      {L: 0,     H:1, D:0},
			DepthSlide: {L: -0.3,  H:1, D:0},

			Frequency:      {L: 0.01, H:48, D:8},
			FrequencySlide: {L: -1,   H:1,  D:0},
		},
		stage: stage.PhaseSpeedMod,
		setup: function($, P){

		},
		process: function($, block){

		}
	};

	// Phase
	jsfx.Module.Phase = {
		name: "Phase",
		params: {},
		stage: stage.Phase,
		setup: function($, P){

		},
		process: function($, block){

		}
	};

	// Low/High-Filter
	jsfx.Module.HLFilter = {
		name: "HLFilter",
		params: {},
		stage: stage.SampleMod,
		setup: function($, P){

		},
		process: function($, block){

		}
	};

	// Phaser Effect
	jsfx.Module.Phaser = {
		name: "Phaser",
		params: {
			Offset: {L:-1, H:1, D:0},
			Sweep:  {L:-1, H:1, D:0},
		},
		stage: stage.SampleMod,
		setup: function($, P){

		},
		process: function($, block){

		}
	};

	// Generator
	jsfx.Module.Generator = {
		name: "Generator",
		params: {},
		stage: stage.Generator,
		setup: function($, P){

		},
		process: function($, block){

		}
	};

	// Volume dynamic control with Attack-Sustain-Decay
	//   ATTACK  | 0                     - Volume + SustainPunch
	//   SUSTAIN | Volume + SustainPunch - Volume
	//   DECAY   | Volume                - 0
	jsfx.Module.ASD = {
		name: "ASD",
		params: {
			Volume:       { L: 0, H: 1, D: 0.4},
			Attack:       { L: 0, H: 1, D: 0.1, u: unit.Second},
			Sustain:      { L: 0, H: 2, D: 0.3, u: unit.Second},
			SustainPunch: { L: 0, H: 3, D: 2.0},
			Decay:        { L: 0, H: 2, D: 1.0, u: unit.Second},
		},
		stage: stage.VolumeControl,
		setup: function($, P){
			var SR = $.SampleRate;
			var V = P.Volume;
			var SP = V + P.SustainPunch;
			$.envelopes = [
				// S = start volume, E = end volume, N = duration in samples
				{S:  0, E: SP, N: (P.Attack  * SR)|0 },
				{S: SP, E:  V, N: (P.Sustain * SR)|0 },
				{S:  V, E:  0, N: (P.Decay   * SR)|0 },
			];
			// G = volume gradient
			$.envelopes.map(function(e){ e.G = (e.E - e.S) / e.N; })
		},
		process: function($, block){
			var i = 0;
			while(($.envelopes.length > 0) && (i < block.length)){
				var E = $.envelope;
				var Vol = E.S, Grad = E.G;
				var N = Math.min(block.length - i, i + E.N);
				var end = i + N;
				for(; i < end; i += 1){
					block[i] *= Vol;
					Vol += Grad;
				}
				E.S = Vol;
				E.N -= N;
				if(E.N == 0){
					$.envelopes.shift();
				}
			}
			return i;
		}
	};

	// STATELESS GENERATORS
	jsfx.G = {
		// uniform noise
		unoise: Math.random,
		// sine wave
		sine: Math.sin,
		// saw wave
		saw: function(phase){
			return 2*(phase/TAU - ((phase/TAU + 0.5)|0));
		},
		// triangle wave
		triangle: function(phase){
			return Math.abs(4 * ((phase/TAU - 0.25)%1) - 2) - 1;
		},
		// square wave
		square: function(phase, A){
			var s = sin(phase);
			return s > A ? 1.0 : s < A ? -1.0 : A;
		},
		// simple synth
		synth: function(phase){
			return sin(phase) + .5*sin(phase/2) + .3*sin(phase/4);
		},
	};

	// Generates samples using given frequency and generator
	jsfx.Generate = Generate;
	function Generate(frequency, sampleCount, gen, A, B){
		var data = new Float32Array(sampleCount|0);
		var phase = 0;
		var phaseStep = frequency * TAU / jsfx.SampleRate;
		for(var i = 0; i < data.length; i++){
			data[i] = gen(phase, A, B);
			phase += phaseStep;
			if(phaseStep > TAU_100){
				phaseStep -= TAU_100;
			}
		}
		return data;
	}

	// Convenience method for using stateless generators
	map_object(jsfx.G, function(gen, name){
		jsfx.G[name].generate = function(frequency, sampleCount, A, B){
			return Generate(frequency, sampleCount, gen, A, B);
		};
	});

	// WAVE SUPPORT

	// Creates an Audio element from audio data [-1.0 .. 1.0]
	jsfx.CreateAudio = CreateAudio;
	function CreateAudio(data){
		assert(data instanceof Float32Array, "data must be an Float32Array");

		var blockAlign = numChannels * bitsPerSample >> 3;
		var byteRate = jsfx.SampleRate * blockAlign;

		var output = new Uint8Array(8 + 36 + data.length * 2);
		var p = 0;

		// emits string to output
		function S(value){
			for(var i = 0; i < value.length; i += 1){
				output[p] = value.charCodeAt(i); p++;
			}
		}

		// emits integer value to output
		function V(value, nBytes){
			if(nBytes <= 0){ return; }
			output[p] = value & 0xFF; p++;
			V(value >> 8, nBytes - 1);
		}

		S("RIFF"); V(36 + data.length * 2, 4);

		S("WAVEfmt "); V(16, 4); V(1, 2);
		V(numChannels, 2); V(jsfx.SampleRate, 4);
		V(byteRate, 4); V(blockAlign, 2); V(bitsPerSample, 2);

		S("data"); V(data.length * 2, 4);
		CopyFToU8(output.subarray(p), data);

		return new Audio("data:audio/wav;base64," + U8ToB64(output));
	};

	jsfx.DownloadAsFile = function(audio){
		assert(audio instanceof Audio, "input must be an Audio object");
		document.location.href = audio.src;
	};

	// HELPERS
	jsfx.Util = {};

	// Copies array of Floats to a Uint8Array with 16bits per sample
	jsfx.Util.CopyFToU8 = CopyFToU8;
	function CopyFToU8(into, floats){
		assert(into.length/2 == floats.length,
			"the target buffer must be twice as large as the iinput");

		var k = 0;
		for(var i = 0; i < floats.length; i++){
			var v = +floats[i];
			var	a = (v * 0x7FFF)|0;
			a = a < -0x8000 ? -0x8000 : 0x7FFF < a ? 0x7FFF : a;
			a += a < 0 ? 0x10000 : 0;
			into[k] = a & 0xFF; k++;
			into[k] = a >> 8; k++;
		}
	}

	function U8ToB64(data){
		const CHUNK = 0x8000;
		var result = '';
		for(var start = 0; start < data.length; start += CHUNK){
			var end = Math.min(start + CHUNK, data.length);
			result += String.fromCharCode.apply(null, data.subarray(start, end));
		}
		return btoa(result);
	}

	// uses AudioContext sampleRate or 44100;
	function getDefaultSampleRate(){
		if(typeof AudioContext !== 'undefined'){
			return (new AudioContext()).sampleRate;
		}
		return 44100;
	}

	// for checking pre/post conditions
	function assert(condition, message){
		if(!condition){ throw new Error(message); }
	}

	function map_object(obj, fn){
		var r = {};
		for(var name in obj){
			if(obj.hasOwnProperty(name)){
				r[name] = fn(obj[name], name);
			}
		}
		return r;
	}
})(this.jsfx = {});