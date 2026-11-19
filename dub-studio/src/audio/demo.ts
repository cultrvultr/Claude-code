// The demo song: "Let the Echo Repeat", made by the project's owner, split into six parts with htdemucs_6s
// (the app's own splitter model) and shipped as AAC files in public/demo/. The app downloads and loads them
// like any other song (cut into pieces, kept in the library), so the first play needs about 23 MB once.
export const DEMO = {
  id: 'demo-echo',
  title: 'Let the Echo Repeat (demo)',
  bpm: 68,
  dir: 'demo/let-the-echo-repeat/',
  parts: [['Drums', 'drums'], ['Bass', 'bass'], ['Other', 'other'], ['Vocals', 'vocals'], ['Guitar', 'guitar'], ['Keys', 'keys']] as [string, string][],
  old: ['demo', 'demo-zion'],   // earlier demo songs, removed from the library when this one is made
};
