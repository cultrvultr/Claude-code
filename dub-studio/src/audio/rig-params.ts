// Shared between the main thread and the worklet.
export interface SirenParams { base: number; mode: number; beat: number; vol: number; trig: boolean }
export interface DrumParams { hz: number; dec: number; wob: number; level: number }
export interface RigParams {
  rep: number;        // repeats 0..10 (runaway past 9)
  delayMs: number;    // echo time
  width: number;      // 0 mono, 1 stereo, 2 ping-pong
  bass: number;       // echo bass -5..+5
  treb: number;       // echo treble -5..+5
  mix: number;        // instruments dry/wet 0..10 (5 = both)
  sir: SirenParams; sirSig: boolean; sirSwoop: boolean;
  syn: DrumParams;
}
export const DEFAULT_RIG: RigParams = {
  rep: 6, delayMs: 300, width: 0, bass: 0, treb: 0, mix: 6.5,
  sir: { base: 1, mode: 0, beat: 1, vol: 0.7, trig: false }, sirSig: false, sirSwoop: false,
  syn: { hz: 210, dec: 0.25, wob: 0, level: 0.5 },
};
