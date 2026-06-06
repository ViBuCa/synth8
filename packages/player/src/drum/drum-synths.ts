import * as Tone from "tone";

const kick = new Tone.MembraneSynth().toDestination();

const snare = new Tone.NoiseSynth({
  noise: { type: "white" },
  envelope: {
    attack: 0.001,
    decay: 0.15,
    sustain: 0
  }
}).toDestination();

const hihat = new Tone.MetalSynth({
  envelope: {
    attack: 0.001,
    decay: 0.05,
    release: 0.01
  },
  harmonicity: 5.1,
  modulationIndex: 32,
  resonance: 4000,
  octaves: 1.5
})
hihat.frequency.value = 300;
hihat.toDestination();

const clap = new Tone.NoiseSynth({
  noise: { type: "white" },
  envelope: {
    attack: 0.001,
    decay: 0.12,
    sustain: 0,
  },
}).toDestination();

const openhat = new Tone.MetalSynth({
  envelope: {
    attack: 0.001,
    decay: 0.35,
    release: 0.1,
  },
  harmonicity: 5.1,
  modulationIndex: 24,
  resonance: 5000,
  octaves: 1.5,
});
openhat.frequency.value = 350;
openhat.toDestination();

const tom = new Tone.MembraneSynth().toDestination();

const rim = new Tone.MetalSynth({
  envelope: {
    attack: 0.001,
    decay: 0.08,
    release: 0.01,
  },
});
rim.frequency.value = 800;
rim.toDestination();

const cowbell = new Tone.MetalSynth({
  envelope: {
    attack: 0.001,
    decay: 0.2,
    release: 0.02,
  },
  harmonicity: 1.5,
  modulationIndex: 20,
  resonance: 2000,
  octaves: 0.8,
})
cowbell.frequency.value = 540;
cowbell.toDestination();

export { kick, snare, hihat, clap, openhat, tom, rim, cowbell };