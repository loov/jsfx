var jsfxgui = {};
(function(){
    var Parameters = [];
    var logDiv = undefined;
    
    function log(txt){
        if(logDiv === undefined){
            return;
        } else {
            logDiv.innerHTML = txt + "<br />" + logDiv.innerHTML;
        }
    }
    
    function millis(){
        var d = new Date();
        return d.getTime();
    }
    
    this.sliderModified = function(){
        if(this.onvaluemodified !== undefined){
            window.setTimeout(this.onvaluemodified, 10);
        }
    }
    
    this.createConfigurationPanel = function (id) {
        Parameters = jsfx.getParameters();
        
        var frag = document.createDocumentFragment(),
            len = Parameters.length,
            lastgroup = undefined;
        var group;
        for (var i = 0; i < len; i += 1) {
            var param = Parameters[i],
                row = document.createElement("tr"),
                fld = document.createElement("td");
            if (param.group !== lastgroup) {
                group = document.createElement("table");
                frag.appendChild(group);
                lastgroup = param.group;
            }
            // add caption
            fld.appendChild(document.createTextNode(param.name));
            row.appendChild(fld);
            
            fld = document.createElement("td");
            
            if(param.type === "range"){
                // create slider
                var input = document.createElement("input");
                input.type = "range";
                input.step = param.step;
                input.min  = param.min;
                input.max  = param.max;
                input.value = param.def;
                input.setAttribute('onmouseup', 'jsfxgui.sliderModified()');
                input.setAttribute('onkeyup', 'jsfxgui.sliderModified()');
                param.node = input;
                fld.appendChild(input);
            } else if (param.type === "option") {
                // create options
                var j = 0,
                    lenj = param.options.length,
                    form = document.createElement("form");
                form.id = param.id;
                for(j = 0; j < lenj; j++){
                    var name  = param.options[j],
                        input = document.createElement("input")
                    input.type = "radio";
                    if( name === param.def )
                        input.checked = true;
                    input.id   = param.id + "_" + name;
                    input.name = param.id;
                    input.value = name;
                    
                    input.setAttribute('onmouseup', 'jsfxgui.sliderModified()');
                    input.setAttribute('onkeyup', 'jsfxgui.sliderModified()');
                    
                    var lbl = document.createElement("label");
                    lbl.setAttribute('for', input.id);
                    lbl.innerHTML = name;
                    form.appendChild(input);
                    form.appendChild(lbl);
                }
                param.node = form;
                fld.appendChild(form);
            }
            row.appendChild(fld);
            group.appendChild(row);
        }
        var confpanel = document.getElementById(id);
        confpanel.appendChild(frag);
    };
    
    this.getParams = function () {
        var values = {},
            len = Parameters.length;
        for (var i = 0; i < len; i += 1) {
            var param = Parameters[i];
            if(param.type === "range"){
                values[param.id] = parseFloat(param.node.value);
            } else if(param.type === "option"){
                var opts = param.node[param.id],
                    leno = opts.length;
                for(var o = 0; o < leno; o++){
                    if (opts[o].checked){
                        values[param.id] = opts[o].value;
                        break;
                    }
                }
            }
            
        }        
        return values;
    };
    
    this.setParams = function (params) {
        var len = Parameters.length;
        for (var e in params){
            for (var i = 0; i < len; i += 1){
                var param = Parameters[i];
                if( !(param.id === e) )
                    continue;
                
                if(param.type === "range"){
                    param.node.value = params[e];
                } else if (param.type === "option"){
                    var opts = param.node[param.id],
                        leno = opts.length;
                    for(var o = 0; o < leno; o++){
                        if (opts[o].value === params[e]){
                            opts[o].checked = true
                            break;
                        }
                    }
                }
                
                break;
            }
        }
    }
    
    this.randomize = function(){
        var len = Parameters.length;
        for (var i = 0; i < len; i++) {
            var param = Parameters[i];
            if( param.id === "MasterVolume" ) continue;
            if( param.id === "SuperSamplingQuality" ) continue;
            if( param.type === "range" ){
                param.node.value = param.min + (param.max - param.min) * Math.random();
            } else {
                var i = (Math.random() * param.options.length) | 0;
                param.node[param.id][i].checked = true;
            }
        }
        this.play();
    }
    
    this.getResetParams = function(){
        var p = {};
        p.Generator = "square";
        p.StartFrequency = 880.0;
        p.MinFrequency = 20.0;
        p.MaxFrequency = 2400.0;
        p.Slide = 0.0;
        p.DeltaSlide = 0.0;
        p.SquareDuty = 0.0;
        p.SquareDutySweep = 0.0;
        
        p.VibratoDepth = 0.0;
        p.VibratoFrequency = 0.0;
        p.VibratoDepthSlide = 0.0;
        p.VibratoFrequencySlide = 0.0;
        
        p.AttackTime = 0.0;
        p.SustainTime = 0.3;
        p.DecayTime = 0.4;
        p.SustainPunch = 0.0;
        
        p.LPFilterResonance = 0.0;
        p.LPFilterCutoff = 1.0;
        p.LPFilterCutoffSweep = 0.0;
        p.HPFilterCutoff = 0.0;
        p.HPFilterCutoffSweep = 0.0;
        
        p.PhaserOffset = 0.0;
        p.PhaserSweep = 0.0;
        
        p.RepeatSpeed = 0.0;
        
        p.ChangeAmount = 0.0;
        p.ChangeSpeed = 0.0;
        
        return p;
    }
    
    
    function r(scale, offset){
        var a = Math.random();
        if(scale !== undefined)
            a *= scale;
        if(offset !== undefined)
            a += offset;
        return a;
    };
    var gens = ["square", "saw", "sine", "noise"];
    
    this.SampleGenerators = {
        "Pickup/Coin" : function(p){
            p.StartFrequency = r(880, 660);
            p.SustainTime = r(0.1);
            p.DecayTime = r(0.4, 0.1)
            p.SustainPunch = r(0.3, 0.3);
            if(r() < 0.5){
                p.ChangeSpeed = r(0.2, 0.1);
                p.ChangeAmount = r(0.4, 0.2);
            }
            return p;
        },
        "Laser/Shoot" : function(p){
            var i = r(3)|0;
            if( (i === 2) && (r() < 0.5) )
                i = r(2)|0;
            p.Generator = gens[i];
            
            p.StartFrequency = r(1200, 440);
            p.MinFrequency = p.StartFrequency - r(880, 440);
            if(p.MinFrequency < 110)
                p.MinFrequency = 110;
                
            p.Slide = r(0.3, -1);
            
            if(r() < 0.33){
                p.StartFrequency = r(880, 440);
                p.MinFrequency = r(0.1);
                p.Slide = r(0.3, -0.8);
            }
            if(r() < 0.5){
                p.SquareDuty = r(0.5);
                p.SquareDutySweep = r(0.2);
            } else {
                p.SquareDuty = r(0.5, 0.4);
                p.SquareDutySweep -= r(0.7);
            }
            
            p.SustainTime = r(0.2, 0.1);
            p.DecayTime = r(0.4);
            if( r() < 0.5 )
                p.SustainPunch = r(0.3);
            if( r() < 0.33 ){
                p.PhaserOffset = r(0.2);
                p.PhaserSweep = r(0.2);
            }
            if( r() < 0.5 )
                p.HPFilterCutoff = r(0.3);
            return p;
        },
        "Explosion" : function(p){
            p.Generator = "noise";
            if(r() < 0.5){
                p.StartFrequency = r(440, 40);
                p.Slide = r(0.4, -0.1);
            } else {
                p.StartFrequency = r(1600, 220);
                p.Slide = r(-0.2, -0.2);
            }
            
            if( r() < 0.2 )
                p.Slide = 0;
            if( r() < 0.33 )
                p.RepeatSpeed = r(0.5, 0.3);
            
            p.SustainTime = r(0.3, 0.1);
            p.DecayTime = r(0.5);
            p.SustainPunch = r(0.6, 0.2);
            
            if(r() < 0.5){
                p.PhaserOffset = r(0.9, -0.3);
                p.PhaserSweep = r(-0.3);
            }
            
            if(r() < 0.33){
                p.ChangeSpeed = r(0.3, 0.6);
                p.ChangeAmount = r(-1.6, 0.8);
            }
            return p;
        },
        "Powerup" : function(p){
            if(r() < 0.5){
                p.Generator = 'saw'
            } else {
                p.SquareDuty = r(0.6);
            }
            
            p.StartFrequency = r(220, 440);
            if(r() < 0.5 ){
                p.Slide = r(0.5, 0.2);
                p.RepeatSpeed = r(0.4, 0.4);
            } else {
                p.Slide = r(0.2, 0.05);
                if (r() < 0.5){
                    p.VibratoDepth = r(0.6, 0.1);
                    p.VibratoFrequency = r(30,10);
                }
            }
            p.SustainTime = r(0.4);
            p.DecayTime = r(0.4, 0.1);
            return p;
        },
        "Hit/Hurt" : function(p){
            var i = r(3) | 0;
            if(i === 2)
                i = 3;
            else if( i === 0)
                p.SquareDuty = r(0.6);
            p.Generator = gens[i];
            
            p.StartFrequency = r(880, 220);
            p.Slide = -r(0.4, 0.3);
            
            p.SustainTime = r(0.1);
            p.DecayTime = r(0.2, 0.1);
            
            if(r() < 0.5)
                p.HPFilterCutoff = r(0.3);
            return p;
        },
        "Jump" : function(p){
            p.Generator = "square";
            
            p.SquareDuty = r(0.6);
            p.StartFrequency = r(330, 330);
            p.Slide = r(0.4, 0.2);
            
            p.SustainTime = r(0.3, 0.1);
            p.DecayTime = r(0.2, 0.1);
            
            if(r() < 0.5){
                p.HPFilterCutoff = r(0.3);
            }
            if(r() < 0.5){
                p.LPFilterCutoff = r(-0.6, 1);
            }
            return p;
        },
        "Blip/Select" : function(p){
            var i = r(2)|0;
            if(i === 0)
                p.SquareDuty = r(0.6);
            p.Generator = gens[i];
            p.StartFrequency = r(660, 220);
            
            p.SustainTime = r(0.1, 0.1);
            p.DecayTime = r(0.2);
            p.HPFilterCutoff = 0.1;
            return p;
        }
    };
    
    this.createSampleGenerators = function (id) {
        var frag = document.createDocumentFragment();
        for(var e in this.SampleGenerators){
          var btn = document.createElement("button");
          btn.setAttribute('onclick', "jsfxgui.randomSample('" + e + "')");
          btn.innerHTML = e;
          frag.appendChild(btn);
        }
        var panel = document.getElementById(id);
        panel.appendChild(frag);
    };
    
    this.randomSample = function(id){
        var p = this.getResetParams();
        var gen = this.SampleGenerators[id];
        p = gen(p);
        this.setParams(p);
        this.play();
    };
    
    this.play = function(){        
        var params = this.getParams();
        
        var start = millis();
        
        var data = jsfx.generate(params);
        if(typeof(wave) !== undefined)
            delete wave;
        var wave = audio.make(data);
        delete data;        
        
        var stop = millis();
        log("generate: " + (stop - start) + "ms");          
        wave.play();
        
        if(typeof(this.onplay) !== undefined){
            this.onplay();
        }
        
        return wave;
    };
        
    this.reset = function () {
        var len = Parameters.length;
        for (var i = 0; i < len; i += 1) {
            var param = Parameters[i];
            param.node.value = param.def;
        }
    };
    
    this.initLogging = function(id){
        logDiv = document.getElementById(id);
    }
    
    this.initLibrary = function(id){
        libDiv = document.getElementById(id);
        log('library initialized');
    }
    
    this.paramsToLibrary = function(){
        if(typeof(libDiv) === undefined) return;
        var p = this.getParams(),
            arr = jsfxlib.paramsToArray(p),
            len = arr.length;
        for(var i = 0; i < len; i++)
            if(typeof(arr[i]) === "number")
                arr[i] = arr[i].toFixed(4);
            else if(typeof(arr[i]) === "string")
                arr[i] = '"' + arr[i] + '"';
        libDiv.innerHTML += '['+ arr.toString() + ']' + "<br />";
    }
    
    this.initField = function(id){
        fldDiv = document.getElementById(id);
    }
    
    this.paramsToField = function(){
        if (typeof(fldDiv) === undefined) return;
        var p = this.getParams(),
            arr = jsfxlib.paramsToArray(p),
            len = arr.length;
        for(var i = 0; i < len; i++)
            if(typeof(arr[i]) === "number")
                arr[i] = arr[i].toFixed(4);
            else if(typeof(arr[i]) === "string")
                arr[i] = '"' + arr[i] + '"';
        fldDiv.value = '['+ arr.toString() + ']';
    }
    
    this.paramsFromField = function(){
      if (typeof(fldDiv) === undefined) return;
      var str = fldDiv.value,
          arr = str.replace(/\[|\]|\"/g,"").split(","),
          params = jsfxlib.arrayToParams(arr);
      this.setParams(params);
    }
    
    this.paramsFromFieldAndPlay = function(){
      if (typeof(fldDiv) === undefined) return;
      this.paramsFromField();
      this.play();
    }    
    
}).apply(jsfxgui);
