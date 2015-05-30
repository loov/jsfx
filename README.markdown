This is a JavaScript library for sound effect generation and is supported on
[most current browsers](http://caniuse.com/#feat=audio).

For short clips it can generate the audio in 30ms in a good browser. Might
be fast enough to do runtime generation of effects.

### How to use it?

Open demo/index.html page. This is the generators front-end
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

### Thanks...

This project was inspired by [sfxr](http://www.drpetter.se/project_sfxr.html)
and was used as a reference for some pieces.