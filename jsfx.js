(function(jsfx){
	'use strict';

	var chr = String.fromCharCode;
	var TAU = +Math.PI*2;
	var bitsPerSample = 16|0;
	var numChannels = 1|0;
	var sin = Math.sin;
	var pow = Math.pow;
	var abs = Math.abs;
	var EPSILON = 0.000001;

	jsfx.SampleRate = 0|0;
	jsfx.Sec = 0|0;

	jsfx.SetSampleRate = function(sampleRate){
		jsfx.SampleRate = sampleRate|0;
		jsfx.Sec = sampleRate|0;
	};
	jsfx.SetSampleRate(getDefaultSampleRate());

	jsfx.Module = {};

	var stage = jsfx.stage = {
		PhaseSpeed    : 0,
		PhaseSpeedMod : 10,
		Generator     : 20,
		SampleMod     : 30,
		Volume        : 40
	};

	jsfx.Composite = Composite;
	function Composite(params, modules){
		this.finished = false;

		this.state = {
			SampleRate: params.SampleRate || jsfx.SampleRate
		};

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

			// setup the state
			this.modules[i].setup(this.state, P);
		}
	}
	Composite.prototype = {
		//TODO: see whether this can be converted to a module
		generate: function(block){
			for(var i = 0|0; i < block.length; i += 1){
				block[i] = 0;
			}

			var $ = this.state,
				N = block.length|0;
			for(var i = 0; i < this.modules.length; i += 1){
				var M = this.modules[i];
				var n = M.process($, block.subarray(0,N))|0;
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
		name: 'Frequency',
		params: {
			Start: { L:20, H:2400, D:440  },

			Min: { L:20, H:2400, D:0    },
			Max: { L:20, H:2400, D:2000 },

			Slide:      { L:-1, H:1, D:0 },
			DeltaSlide: { L:-1, H:1, D:0 },

			RepeatSpeed:  { L:0, H: 3.0, D: 0 },

			ChangeAmount: { L:-12, H:12, D:0   },
			ChangeSpeed : { L:  0, H:1,  D:0.1 }
		},
		stage: stage.PhaseSpeed,
		setup: function($, P){
			var SR = $.SampleRate;

			$.phaseParams = P;

			$.phaseSpeed    = P.Start * TAU / SR;
			$.phaseSpeedMax = P.Max * TAU / SR;
			$.phaseSpeedMin = P.Min * TAU / SR;

			$.phaseSpeedMin = Math.min($.phaseSpeedMin, $.phaseSpeed);
			$.phaseSpeedMax = Math.max($.phaseSpeedMax, $.phaseSpeed);

			$.phaseSlide = 1.0 + pow(P.Slide, 3.0) * 64.0 / SR;
			$.phaseDeltaSlide = pow(P.DeltaSlide, 3.0) / (SR * 1000);

			$.repeatTime = 0;
			$.repeatLimit = Infinity;
			if(P.RepeatSpeed > 0){
				$.repeatLimit = P.RepeatSpeed * SR;
			}

			$.arpeggiatorTime = 0;
			$.arpeggiatorLimit = P.ChangeSpeed * SR;
			if(P.ChangeAmount == 0){
				$.arpeggiatorLimit = Infinity;
			}
			$.arpeggiatorMod = 1 + P.ChangeAmount / 12.0;
		},
		process: function($, block){
			var speed = +$.phaseSpeed,
				min   = +$.phaseSpeedMin,
				max   = +$.phaseSpeedMax,
				slide = +$.phaseSlide,
				deltaSlide = +$.phaseDeltaSlide;

			var repeatTime  = $.repeatTime,
				repeatLimit = $.repeatLimit;

			var arpTime  = $.arpeggiatorTime,
				arpLimit = $.arpeggiatorLimit,
				arpMod   = $.arpeggiatorMod;

			for(var i = 0; i < block.length; i++){
				slide += deltaSlide;
				speed *= slide;
				speed = speed < min ? min : speed > max ? max : speed;

				if(repeatTime > repeatLimit){
					this.setup($, $.phaseParams);
					return i + this.process($, block.subarray(i)) - 1;
				}
				repeatTime++;

				if(arpTime > arpLimit){
					speed *= arpMod;
					arpTime = 0;
				}
				arpTime++;

				block[i] += speed;
			}

			$.repeatTime = repeatTime;
			$.arpeggiatorTime = arpTime;

			$.phaseSpeed = speed;
			$.phaseSlide = slide;
			return block.length;
		}
	};

	// Vibrato
	jsfx.Module.Vibrato = {
		name: 'Vibrato',
		params: {
			Depth:      {L: 0, H:1, D:0},
			DepthSlide: {L:-1, H:1, D:0},

			Frequency:      {L:  0.01, H:48, D:8},
			FrequencySlide: {L: -1.00, H: 1, D:0}
		},
		stage: stage.PhaseSpeedMod,
		setup: function($, P){
			var SR = $.SampleRate;
			$.vibratoPhase = 0;
			$.vibratoDepth = P.Depth;
			$.vibratoPhaseSpeed = P.Frequency * TAU / SR;

			$.vibratoPhaseSpeedSlide = 1.0 + pow(P.FrequencySlide, 3.0) * 3.0 / SR;
			$.vibratoDepthSlide = P.DepthSlide / SR;
		},
		process: function($, block){
			var phase = +$.vibratoPhase,
				depth = +$.vibratoDepth,
				speed = +$.vibratoPhaseSpeed,
				slide = +$.vibratoPhaseSpeedSlide,
				depthSlide = +$.vibratoDepthSlide;

			if((depth == 0) && (depthSlide <= 0)){
				return block.length;
			}

			for(var i = 0; i < block.length; i++){
				phase += speed;
				if(phase > TAU){phase -= TAU};
				block[i] += block[i] * sin(phase) * depth;

				speed *= slide;
				depth += depthSlide;
				depth = clamp1(depth);
			}

			$.vibratoPhase = phase;
			$.vibratoDepth = depth;
			$.vibratoPhaseSpeed = speed;
			return block.length;
		}
	};

	// Generator
	jsfx.Module.Generator = {
		name: 'Generator',
		params: {
			// C = choose
			Func: {C: jsfx.G, D:'sine'},

			A: {L: 0, H: 1, D: 0.5},
			B: {L: 0, H: 1, D: 0.5},

			ASlide: {L: -1, H: 1, D: 0},
			BSlide: {L: -1, H: 1, D: 0}
		},
		stage: stage.Generator,
		setup: function($, P){
			$.generatorPhase = 0;

			if(typeof P.Func === 'string'){
				$.generator = jsfx.G[P.Func];
			} else {
				$.generator = P.Func;
			}
			assert(typeof $.generator === 'function', "generator must be a function")

			$.generatorA = P.A;
			$.generatorASlide = P.ASlide / $.SampleRate;
			$.generatorB = P.B;
			$.generatorBSlide = P.BSlide / $.SampleRate;
		},
		process: function($, block){
			var phase = +$.generatorPhase,
				A = +$.generatorA, ASlide = +$.generatorASlide,
				B = +$.generatorB, BSlide = +$.generatorBSlide;

			for(var i = 0; i < block.length; i++){
				phase += block[i];
				if(phase > TAU){ phase -= TAU };
				A += ASlide; B += BSlide;
				block[i] = $.generator(phase, A, B);
			}

			$.generatorPhase = phase;
			$.generatorA = A;
			$.generatorB = B;
			return block.length;
		}
	};

	// Karplus Strong algorithm for string sound
	var GuitarBufferSize = 1 << 16;
	jsfx.Module.Guitar = {
		name: 'Guitar',
		params: {
			A: {L:0.0, H:1.0, D: 1},
			B: {L:0.0, H:1.0, D: 1},
			C: {L:0.0, H:1.0, D: 1},
		},
		stage: stage.Generator,
		setup: function($, P){
			$.guitarA = P.A;
			$.guitarB = P.B;
			$.guitarC = P.C;

			$.guitarBuffer = new Float32Array(GuitarBufferSize);
			$.guitarHead = 0;
			var B = $.guitarBuffer;
			for(var i = 0; i < B.length; i++){
				B[i] = Math.random()*2 - 1;
			}
		},
		process: function($, block){
			var BS = GuitarBufferSize,
				BM = BS - 1;

			var A = +$.guitarA, B = +$.guitarB, C = +$.guitarC;
			var T = A + B + C;
			var h = $.guitarHead;

			var buffer = $.guitarBuffer;
			for(var i = 0; i < block.length; i++){
				// buffer size
				var n = (TAU / block[i])|0;
				n = n > BS ? BS : n;

				// tail
				var t = ((h - n) + BS) & BM;
				buffer[h] =
					(buffer[(t-0+BS)&BM]*A +
					 buffer[(t-1+BS)&BM]*B +
					 buffer[(t-2+BS)&BM]*C) / T;

				block[i] = buffer[h];
				h = (h + 1) & BM;
			}

			$.guitarHead = h;
			return block.length;
		}
	}

	// Low/High-Filter
	jsfx.Module.HLFilter = {
		name: 'HLFilter',
		params: {
			LP:          {L: 0, H:1, D:1},
			LPSlide:     {L:-1, H:1, D:0},
			LPResonance: {L: 0, H:1, D:0},
			HP:          {L: 0, H:1, D:0},
			HPSlide:     {L:-1, H:1, D:0}
		},
		stage: stage.SampleMod + 0,
		setup: function($, P){
			$.HLEnabled = (P.HP > EPSILON) || (P.LP < 1 - EPSILON);

			$.LPEnabled = P.LP < 1 - EPSILON;
			$.LP = pow(P.LP, 3.0) / 10;
			$.LPSlide = 1.0 + P.LPSlide * 100 / $.SampleRate;
			$.LPPos = 0;
			$.LPPosSlide = 0;

			$.LPDamping = 5.0 / (1.0 + pow(P.LPResonance, 2) * 20) * (0.01 + P.LP);
			$.LPDamping = 1.0 - Math.min($.LPDamping, 0.8);

			$.HP = pow(P.HP, 2.0) / 10;
			$.HPPos = 0;
			$.HPSlide = 1.0 + P.HPSlide * 100 / $.SampleRate;
		},
		enabled: function($){
			return $.HLEnabled;
		},
		process: function($, block){
			if(!this.enabled($)){ return block.length; }

			var lp         = +$.LP;
			var lpPos      = +$.LPPos;
			var lpPosSlide = +$.LPPosSlide;
			var lpSlide    = +$.LPSlide;
			var lpDamping  = +$.LPDamping;
			var lpEnabled  = +$.LPEnabled;

			var hp      = +$.HP;
			var hpPos   = +$.HPPos;
			var hpSlide = +$.HPSlide;

			for(var i = 0; i < block.length; i++){
				if((hp > EPSILON) || (hp < -EPSILON)){
					hp *= hpSlide;
					hp = hp < EPSILON ? EPSILON: hp > 0.1 ? 0.1 : hp;
				}

				var lpPos_ = lpPos;

				lp *= lpSlide;
				lp = lp < 0 ? lp = 0 : lp > 0.1 ? 0.1 : lp;

				var sample = block[i];
				if(lpEnabled){
					lpPosSlide += (sample - lpPos) * lp;
					lpPosSlide *= lpDamping;
				} else {
					lpPos = sample;
					lpPosSlide = 0;
				}
				lpPos += lpPosSlide;

				hpPos += lpPos - lpPos_;
				hpPos *= 1.0 - hp;

				block[i] = hpPos;
			}

			$.LPPos = lpPos;
			$.LPPosSlide = lpPosSlide;
			$.LP = lp;
			$.HP = hp;
			$.HPPos = hpPos;

			return block.length;
		}
	};

	// Phaser Effect
	var PhaserBufferSize = 1 << 10;
	jsfx.Module.Phaser = {
		name: 'Phaser',
		params: {
			Offset: {L:-1, H:1, D:0},
			Sweep:  {L:-1, H:1, D:0}
		},
		stage: stage.SampleMod + 1,
		setup: function($, P){
			$.phaserBuffer = new Float32Array(PhaserBufferSize);
			$.phaserPos  = 0;
			$.phaserOffset = pow(P.Offset, 2.0) * (PhaserBufferSize - 4);
			$.phaserOffsetSlide = pow(P.Sweep, 3.0) * 4000 / $.SampleRate;
		},
		enabled: function($){
			return (abs($.phaserOffsetSlide) > EPSILON) ||
				(abs($.phaserOffset) > EPSILON);
		},
		process: function($, block){
			if(!this.enabled($)){ return block.length; }

			var BS = PhaserBufferSize,
				BM = BS - 1;

			var buffer = $.phaserBuffer,
				pos    = $.phaserPos|0,
				offset = +$.phaserOffset,
				offsetSlide = +$.phaserOffsetSlide;

			for(var i = 0; i < block.length; i++){
				offset += offsetSlide;
				//TODO: check whether this is correct
				if(offset < 0){
					offset = -offset;
					offsetSlide = -offsetSlide;
				}
				if(offset > BM){
					offset = BM;
					offsetSlide = 0;
				}

				buffer[pos] = block[i];
				var p = (pos - (offset|0) + BS) & BM;
				block[i] += buffer[p];

				pos = ((pos + 1) & BM)|0;
			}

			$.phaserPos = pos;
			$.phaserOffset = offset;
			return block.length;
		}
	};

	// Volume dynamic control with Attack-Sustain-Decay
	//   ATTACK  | 0                     - Volume + SustainPunch
	//   SUSTAIN | Volume + SustainPunch - Volume
	//   DECAY   | Volume                - 0
	jsfx.Module.ASD = {
		name: 'ASD',
		params: {
			Volume:       { L: 0, H: 1, D: 0.5 },
			Attack:       { L: 0, H: 1, D: 0.1 },
			Sustain:      { L: 0, H: 2, D: 0.3 },
			SustainPunch: { L: 0, H: 3, D: 1.0 },
			Decay:        { L: 0, H: 2, D: 1.0 }
		},
		stage: stage.Volume,
		setup: function($, P){
			var SR = $.SampleRate;
			var V = P.Volume;
			var SP = V * (1 + P.SustainPunch);
			$.envelopes = [
				// S = start volume, E = end volume, N = duration in samples
				{S:  0, E:   V, N: (P.Attack  * SR)|0 }, // Attack
				{S: SP, E:   V, N: (P.Sustain * SR)|0 }, // Sustain
				{S:  V, E:   0, N: (P.Decay   * SR)|0 }  // Decay
			];
			// G = volume gradient
			$.envelopes.map(function(e){ e.G = (e.E - e.S) / e.N; })
		},
		process: function($, block){
			var i = 0;
			while(($.envelopes.length > 0) && (i < block.length)){
				var E = $.envelopes[0];
				var vol = E.S,
					grad = E.G;

				var N = Math.min(block.length - i, E.N)|0;
				var end = (i+N)|0;
				for(; i < end; i += 1){
					block[i] *= vol;
					vol += grad;
					vol = clamp(vol, 0, 10);
				}
				E.S = vol;
				E.N -= N;
				if(E.N <= 0){
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
		}
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
			if(phase > TAU){phase -= TAU};
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
		assert(data instanceof Float32Array, 'data must be an Float32Array');

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

		S('RIFF'); V(36 + data.length * 2, 4);

		S('WAVEfmt '); V(16, 4); V(1, 2);
		V(numChannels, 2); V(jsfx.SampleRate, 4);
		V(byteRate, 4); V(blockAlign, 2); V(bitsPerSample, 2);

		S('data'); V(data.length * 2, 4);
		CopyFToU8(output.subarray(p), data);

		return new Audio('data:audio/wav;base64,' + U8ToB64(output));
	};

	jsfx.DownloadAsFile = function(audio){
		assert(audio instanceof Audio, 'input must be an Audio object');
		document.location.href = audio.src;
	};

	// HELPERS
	jsfx.Util = {};

	// Copies array of Floats to a Uint8Array with 16bits per sample
	jsfx.Util.CopyFToU8 = CopyFToU8;
	function CopyFToU8(into, floats){
		assert(into.length/2 == floats.length,
			'the target buffer must be twice as large as the iinput');

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
		var CHUNK = 0x8000;
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

	function clamp(v, min, max){
		v = +v; min = +min; max = +max;
		if(v < min){ return +min; }
		if(v > max){ return +max; }
		return +v;
	}

	function clamp1(v){
		v = +v;
		if(v < +0.0){ return +0.0; }
		if(v > +1.0){ return +1.0; }
		return +v;
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