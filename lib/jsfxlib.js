var jsfxlib = {};
(function () {
    // takes object with param arrays
    // audiolib = {
    //   Sound : ["sine", 1, 2, 4, 1...
    // }
    //
    // returns object with audio samples
    // p.Sound.play()
    this.createWaves = function(lib){
        var sounds = {};
        for(var e in lib){
            var params = this.arrayToParams(lib[e]),
                data = jsfx.generate(params),
                wave = audio.make(data);
            sounds[e] = wave;
        }
        return sounds;
    }
    
    this.paramsToArray = function(params){
        var pararr = [];
        var len = jsfx.Parameters.length;
        for(var i = 0; i < len; i++){
            pararr.push(params[jsfx.Parameters[i].id]);
        }
        return pararr;
    }
    
    this.arrayToParams = function(pararr){
        var params = {};
        var len = jsfx.Parameters.length;
        for(var i = 0; i < len; i++){
            params[jsfx.Parameters[i].id] = pararr[i];
        }
        return params;
    }    
}).apply(jsfxlib);
