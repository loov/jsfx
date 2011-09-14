#  jsfx

[DEMO SITE](http://www.egonelbre.com/js/jsfx).

This is a javascript library (with frontend) for sound effect generation.
This needs WAV support from browser to work.

For short clips it can generate the audio in 30ms in a good browser. Might
be fast enough to do runtime generation of effects.

## How to use it in a game?

Open up the demo/index.html page. This is the generators front-end
it is advised to use some browser that has slider support (for example Chrome).
This makes it much easier to use. But you can always use random without effort...

Click "randomize" or any of the sample generator buttons until you find something
you like.

Now press "To Library". This will add a new parameter array to the library
section below the generator interface. This array can be used to generate the
audio at runtime, this means no audio downloads.

The basic setup for using the arrays is this:

    <script src="../lib/audio.js"></script>
    <script src="../lib/jsfx.js"></script>
    <script src="../lib/jsfxlib.js"></script>
    <script>
      // I didn't include the full array
      audioLibParams = {
        test : ["saw",0.0000,0.4000,0.5810,0.2640,2.1270......],
        explosion : ["noise",0.0000,0.4000,0.0000,0.2040......]
      };

      samples = jsfxlib.createWaves(audioLibParams);
      samples.test.play();
      samples.explosion.play();
    </script>

To create a single waveform use `jsfxlib.createWave()`:

    var sound = jsfxlib.createWave(["noise",0.0000,0.4000,0.0000,0.2040......]);
    sound.play();

## Projects using jsfx

* [HTML5 Drum Sequencer] (http://www11.plala.or.jp/sothicblue/html5drum-jsfx/)
* [DUBloom](https://github.com/dubharmonic/DUBloom)

## The generation is based on:

* [sfxr](http://www.drpetter.se/project_sfxr.html)

## License:

The MIT License

Copyright (c) 2011 Egon Elbre

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
