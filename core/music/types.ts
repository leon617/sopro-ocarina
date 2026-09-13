export interface Pitch { step: string; alter: number; octave: number; midi: number }
export interface MusicEvent { id: string; pitch: Pitch | null; start: number; duration: number; measure: number; measureLabel: string; voice: string; type: string; dots: number; tuplet?: string; tieStart: boolean; tieStop: boolean; fingering?: number[]; outOfRange?: boolean; sourceId?: string }
export interface Measure { index: number; label: string; start: number; duration: number; beats: number; beatType: number; fifths: number; implicit: boolean; repeatStart: boolean; repeatEnd: number; endings: number[] }
export interface Tempo { at: number; bpm: number }
export interface Part { id: string; name: string; instrument: string; events: MusicEvent[]; measures: Measure[]; tempos: Tempo[]; voices: string[] }
export interface Score { title: string; composer: string; parts: Part[]; warnings: string[] }
export interface SongSettings { partId: string; voice: string; policy: 'voice'|'highest'|'lowest'; transpose: number; speed: number; lastIndex: number; adaptation?: 'original'|'strict'|'balanced'|'flexible'; simplify?: boolean }
export interface Song { id: string; title: string; composer: string; xml: string; score: Score; settings: SongSettings; favorite: boolean; createdAt: number; lastPractice?: number; source?: string; sourceName?: string; collection?: string; category?: string; license?: string; status?: 'learning'|'almost'|'mastered' }
export interface Melody { events: MusicEvent[]; measures: Measure[]; tempos: Tempo[]; warnings: string[]; transformation: string; analysis?: {preserved: number; octaveChanges: number; removed: number; transpose: number} }
