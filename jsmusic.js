(function(jsmusic){
	var scale = "c d ef g ha bC D EF G HA B";

	jsmusic.Simple = Simple;
	function Simple(songtext, instrument, bpm, modules){
		var tokens = songtext.split("");
		var notes = [];
		for(var i = 0; i < tokens.length; i+=1){
			var note = scale.indexOf(tokens[i]) + 3;

			var more = true;
			while(more){
				switch(tokens[i+1]){
					case "+": i++; note +=  1; break;
					case "-": i++; note -=  1; break;
					case "^": i++; note += 12; break;
					case ".": i++; note -= 12; break;
					default:
						more = false;
				}
			}
			var freq = 220 * Math.pow(2, 1 + note/12);
			notes.push({Frequency: { Start: freq }});
		}
		return GenerateSong(notes, instrument, bpm, modules);
	};


	function GenerateSong(notes, instrument, bpm, modules){
		bpm = bpm || 120;
		var processor = new jsfx.Processor(instrument, modules);
		var sampleRate = processor.state.SampleRate;

		var beatSamples = sampleRate / (bpm / 60);
		var songSamples = notes.length * beatSamples;

		var beatBuffer = jsfx._createFloatArray(beatSamples);
		var playing = [];

		var songBuffer = jsfx._createFloatArray(songSamples + processor.getSamplesLeft());
		var currentStart = 0;

		// fill the beats
		for(var i = 0; i < notes.length; i += 1){
			var note = notes[i];
			var params = MergeParams(instrument, note);
			var proc = new jsfx.Processor(params, modules);
			playing.push(proc);

			playing.map(function(proc){
				proc.generate(beatBuffer);
				for(var i = 0; i < beatBuffer.length; i++){
					songBuffer[currentStart + i] += beatBuffer[i];
				};
			});
			currentStart += beatBuffer.length;
			playing = playing.filter(function(proc){ return !proc.finished; });
		}

		// fill the decay
		while(currentStart < songBuffer.length){
			if(playing.length == 0){break;}
			playing.map(function(proc){
				proc.generate(beatBuffer);
				var N = Math.min(beatBuffer.length, songBuffer.length - currentStart);
				for(var i = 0; i < N; i++){
					songBuffer[currentStart + i] += beatBuffer[i];
				};
			});
			currentStart += beatBuffer.length;
			playing = playing.filter(function(proc){ return !proc.finished; });
		}

		return jsfx.CreateAudio(songBuffer);
	}


	// modifies the override
	function MergeParams(base, override){
		if(typeof base === 'function'){
			base = base();
		} else {
			base = JSON.parse(JSON.stringify(base));
		}

		if(typeof override === 'function'){
			override = override();
		}

		for(var name in override){
			if(typeof base[name] === 'undefined'){
				base[name] = {};
			}
			for(var param in override[name]){
				base[name][param] = override[name][param];
			}
		}

		return base;
	}


})(this.jsmusic = {});
