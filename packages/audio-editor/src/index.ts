export { AudioEditor } from "./audio-editor"
export { EditorProvider, useEditor, type EditorState } from "./editor"
export {
  DEFAULT_PREFS,
  DEFAULT_SAMPLE_RATE,
  DEFAULT_TRACK_HEIGHT,
  HISTORY_LIMIT,
  PX_PER_SEC_MAX,
  PX_PER_SEC_MIN,
  TRACK_COLORS,
  makeDefaultProject,
  makeDefaultTrack,
  type Prefs,
} from "./editor/doc"
export type {
  Clip,
  Project,
  Selection,
  ToolId,
  Track,
  WaveformPeaks,
} from "./lib/types"
