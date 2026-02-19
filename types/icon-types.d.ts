/**
 * Icon Types for Harmony Design System
 * 
 * Defines all available icon names as TypeScript types for type safety
 * and autocomplete support when using the harmony-icon component.
 * 
 * @module types/icon-types
 * @see {@link ../primitives/icon/harmony-icon.js} - Icon component implementation
 * @see {@link ../DESIGN_SYSTEM.md#icons} - Icon usage guidelines
 */

/**
 * Union type of all available icon names in the Harmony Design System.
 * 
 * Icons are organized by category:
 * - Transport: Playback controls (play, pause, stop, etc.)
 * - Media: Recording and media controls
 * - Navigation: UI navigation (arrows, chevrons)
 * - Editing: Cut, copy, paste, undo, redo
 * - Audio: Volume, mute, waveform
 * - File: Save, open, export, import
 * - View: Layout and visibility controls
 * - Tools: Selection, zoom, pencil
 * - Status: Success, error, warning, info
 * - Social: Share, like, comment
 * 
 * @example
 * ```typescript
 * const iconName: IconName = 'play';
 * const icon = document.createElement('harmony-icon');
 * icon.setAttribute('name', iconName);
 * ```
 */
export type IconName =
  // Transport Controls
  | 'play'
  | 'pause'
  | 'stop'
  | 'record'
  | 'fast-forward'
  | 'rewind'
  | 'skip-forward'
  | 'skip-backward'
  | 'repeat'
  | 'repeat-once'
  | 'shuffle'
  | 'loop'
  
  // Media Controls
  | 'microphone'
  | 'microphone-off'
  | 'speaker'
  | 'speaker-off'
  | 'headphones'
  | 'volume-up'
  | 'volume-down'
  | 'volume-mute'
  | 'volume-off'
  
  // Navigation
  | 'arrow-up'
  | 'arrow-down'
  | 'arrow-left'
  | 'arrow-right'
  | 'chevron-up'
  | 'chevron-down'
  | 'chevron-left'
  | 'chevron-right'
  | 'caret-up'
  | 'caret-down'
  | 'caret-left'
  | 'caret-right'
  | 'menu'
  | 'more-vertical'
  | 'more-horizontal'
  
  // Editing
  | 'cut'
  | 'copy'
  | 'paste'
  | 'delete'
  | 'trash'
  | 'undo'
  | 'redo'
  | 'edit'
  | 'pencil'
  
  // File Operations
  | 'file'
  | 'folder'
  | 'folder-open'
  | 'save'
  | 'download'
  | 'upload'
  | 'export'
  | 'import'
  | 'add-file'
  | 'add-folder'
  
  // View Controls
  | 'eye'
  | 'eye-off'
  | 'expand'
  | 'collapse'
  | 'fullscreen'
  | 'exit-fullscreen'
  | 'maximize'
  | 'minimize'
  | 'grid'
  | 'list'
  
  // Tools
  | 'zoom-in'
  | 'zoom-out'
  | 'zoom-fit'
  | 'search'
  | 'filter'
  | 'settings'
  | 'sliders'
  | 'tool'
  | 'cursor'
  | 'hand'
  | 'scissors'
  
  // Audio Specific
  | 'waveform'
  | 'equalizer'
  | 'mixer'
  | 'fader'
  | 'knob'
  | 'metronome'
  | 'tempo'
  | 'midi'
  | 'audio-track'
  | 'instrument'
  | 'plugin'
  | 'effects'
  
  // Status & Feedback
  | 'check'
  | 'check-circle'
  | 'x'
  | 'x-circle'
  | 'alert-circle'
  | 'alert-triangle'
  | 'info'
  | 'help'
  | 'question'
  | 'bell'
  | 'bell-off'
  
  // User & Social
  | 'user'
  | 'users'
  | 'share'
  | 'link'
  | 'external-link'
  | 'mail'
  | 'message'
  | 'comment'
  | 'heart'
  | 'star'
  
  // System
  | 'home'
  | 'calendar'
  | 'clock'
  | 'lock'
  | 'unlock'
  | 'key'
  | 'shield'
  | 'refresh'
  | 'sync'
  | 'loading'
  | 'power'
  
  // Miscellaneous
  | 'add'
  | 'minus'
  | 'close'
  | 'cancel'
  | 'checkmark'
  | 'dot'
  | 'circle'
  | 'square'
  | 'triangle'
  | 'diamond'
  | 'tag'
  | 'bookmark'
  | 'pin'
  | 'flag';

/**
 * Enum version of IconName for environments that prefer enums over unions.
 * Provides the same icon names with dot-notation access.
 * 
 * @example
 * ```typescript
 * import { IconNameEnum } from './types/icon-types';
 * const iconName = IconNameEnum.Play;
 * ```
 */
export enum IconNameEnum {
  // Transport Controls
  Play = 'play',
  Pause = 'pause',
  Stop = 'stop',
  Record = 'record',
  FastForward = 'fast-forward',
  Rewind = 'rewind',
  SkipForward = 'skip-forward',
  SkipBackward = 'skip-backward',
  Repeat = 'repeat',
  RepeatOnce = 'repeat-once',
  Shuffle = 'shuffle',
  Loop = 'loop',
  
  // Media Controls
  Microphone = 'microphone',
  MicrophoneOff = 'microphone-off',
  Speaker = 'speaker',
  SpeakerOff = 'speaker-off',
  Headphones = 'headphones',
  VolumeUp = 'volume-up',
  VolumeDown = 'volume-down',
  VolumeMute = 'volume-mute',
  VolumeOff = 'volume-off',
  
  // Navigation
  ArrowUp = 'arrow-up',
  ArrowDown = 'arrow-down',
  ArrowLeft = 'arrow-left',
  ArrowRight = 'arrow-right',
  ChevronUp = 'chevron-up',
  ChevronDown = 'chevron-down',
  ChevronLeft = 'chevron-left',
  ChevronRight = 'chevron-right',
  CaretUp = 'caret-up',
  CaretDown = 'caret-down',
  CaretLeft = 'caret-left',
  CaretRight = 'caret-right',
  Menu = 'menu',
  MoreVertical = 'more-vertical',
  MoreHorizontal = 'more-horizontal',
  
  // Editing
  Cut = 'cut',
  Copy = 'copy',
  Paste = 'paste',
  Delete = 'delete',
  Trash = 'trash',
  Undo = 'undo',
  Redo = 'redo',
  Edit = 'edit',
  Pencil = 'pencil',
  
  // File Operations
  File = 'file',
  Folder = 'folder',
  FolderOpen = 'folder-open',
  Save = 'save',
  Download = 'download',
  Upload = 'upload',
  Export = 'export',
  Import = 'import',
  AddFile = 'add-file',
  AddFolder = 'add-folder',
  
  // View Controls
  Eye = 'eye',
  EyeOff = 'eye-off',
  Expand = 'expand',
  Collapse = 'collapse',
  Fullscreen = 'fullscreen',
  ExitFullscreen = 'exit-fullscreen',
  Maximize = 'maximize',
  Minimize = 'minimize',
  Grid = 'grid',
  List = 'list',
  
  // Tools
  ZoomIn = 'zoom-in',
  ZoomOut = 'zoom-out',
  ZoomFit = 'zoom-fit',
  Search = 'search',
  Filter = 'filter',
  Settings = 'settings',
  Sliders = 'sliders',
  Tool = 'tool',
  Cursor = 'cursor',
  Hand = 'hand',
  Scissors = 'scissors',
  
  // Audio Specific
  Waveform = 'waveform',
  Equalizer = 'equalizer',
  Mixer = 'mixer',
  Fader = 'fader',
  Knob = 'knob',
  Metronome = 'metronome',
  Tempo = 'tempo',
  Midi = 'midi',
  AudioTrack = 'audio-track',
  Instrument = 'instrument',
  Plugin = 'plugin',
  Effects = 'effects',
  
  // Status & Feedback
  Check = 'check',
  CheckCircle = 'check-circle',
  X = 'x',
  XCircle = 'x-circle',
  AlertCircle = 'alert-circle',
  AlertTriangle = 'alert-triangle',
  Info = 'info',
  Help = 'help',
  Question = 'question',
  Bell = 'bell',
  BellOff = 'bell-off',
  
  // User & Social
  User = 'user',
  Users = 'users',
  Share = 'share',
  Link = 'link',
  ExternalLink = 'external-link',
  Mail = 'mail',
  Message = 'message',
  Comment = 'comment',
  Heart = 'heart',
  Star = 'star',
  
  // System
  Home = 'home',
  Calendar = 'calendar',
  Clock = 'clock',
  Lock = 'lock',
  Unlock = 'unlock',
  Key = 'key',
  Shield = 'shield',
  Refresh = 'refresh',
  Sync = 'sync',
  Loading = 'loading',
  Power = 'power',
  
  // Miscellaneous
  Add = 'add',
  Minus = 'minus',
  Close = 'close',
  Cancel = 'cancel',
  Checkmark = 'checkmark',
  Dot = 'dot',
  Circle = 'circle',
  Square = 'square',
  Triangle = 'triangle',
  Diamond = 'diamond',
  Tag = 'tag',
  Bookmark = 'bookmark',
  Pin = 'pin',
  Flag = 'flag',
}

/**
 * Icon size variants supported by the harmony-icon component.
 */
export type IconSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | number;

/**
 * Icon color variants that map to design tokens.
 */
export type IconColor = 
  | 'primary'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'error'
  | 'info'
  | 'neutral'
  | 'inherit'
  | string; // Allow custom CSS color values

/**
 * Props interface for the harmony-icon component.
 * Use this for TypeScript type checking when creating icons programmatically.
 * 
 * @example
 * ```typescript
 * const iconProps: IconProps = {
 *   name: 'play',
 *   size: 'md',
 *   color: 'primary',
 *   ariaLabel: 'Play audio'
 * };
 * ```
 */
export interface IconProps {
  /** The icon name to render */
  name: IconName;
  /** Size of the icon (preset or pixel value) */
  size?: IconSize;
  /** Color of the icon (design token or CSS color) */
  color?: IconColor;
  /** Accessible label for screen readers */
  ariaLabel?: string;
  /** Additional CSS classes */
  className?: string;
  /** Inline styles */
  style?: Partial<CSSStyleDeclaration>;
}

/**
 * Type guard to check if a string is a valid IconName.
 * 
 * @param value - The value to check
 * @returns True if the value is a valid icon name
 * 
 * @example
 * ```typescript
 * const userInput = 'play';
 * if (isIconName(userInput)) {
 *   // TypeScript now knows userInput is IconName
 *   icon.setAttribute('name', userInput);
 * }
 * ```
 */
export function isIconName(value: unknown): value is IconName {
  if (typeof value !== 'string') return false;
  
  const validIcons: IconName[] = [
    'play', 'pause', 'stop', 'record', 'fast-forward', 'rewind',
    'skip-forward', 'skip-backward', 'repeat', 'repeat-once', 'shuffle', 'loop',
    'microphone', 'microphone-off', 'speaker', 'speaker-off', 'headphones',
    'volume-up', 'volume-down', 'volume-mute', 'volume-off',
    'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right',
    'chevron-up', 'chevron-down', 'chevron-left', 'chevron-right',
    'caret-up', 'caret-down', 'caret-left', 'caret-right',
    'menu', 'more-vertical', 'more-horizontal',
    'cut', 'copy', 'paste', 'delete', 'trash', 'undo', 'redo', 'edit', 'pencil',
    'file', 'folder', 'folder-open', 'save', 'download', 'upload',
    'export', 'import', 'add-file', 'add-folder',
    'eye', 'eye-off', 'expand', 'collapse', 'fullscreen', 'exit-fullscreen',
    'maximize', 'minimize', 'grid', 'list',
    'zoom-in', 'zoom-out', 'zoom-fit', 'search', 'filter', 'settings',
    'sliders', 'tool', 'cursor', 'hand', 'scissors',
    'waveform', 'equalizer', 'mixer', 'fader', 'knob', 'metronome',
    'tempo', 'midi', 'audio-track', 'instrument', 'plugin', 'effects',
    'check', 'check-circle', 'x', 'x-circle', 'alert-circle', 'alert-triangle',
    'info', 'help', 'question', 'bell', 'bell-off',
    'user', 'users', 'share', 'link', 'external-link', 'mail',
    'message', 'comment', 'heart', 'star',
    'home', 'calendar', 'clock', 'lock', 'unlock', 'key', 'shield',
    'refresh', 'sync', 'loading', 'power',
    'add', 'minus', 'close', 'cancel', 'checkmark', 'dot', 'circle',
    'square', 'triangle', 'diamond', 'tag', 'bookmark', 'pin', 'flag',
  ];
  
  return validIcons.includes(value as IconName);
}

/**
 * Get all available icon names as an array.
 * Useful for generating icon galleries or documentation.
 * 
 * @returns Array of all icon names
 * 
 * @example
 * ```typescript
 * const allIcons = getAllIconNames();
 * allIcons.forEach(iconName => {
 *   const icon = document.createElement('harmony-icon');
 *   icon.setAttribute('name', iconName);
 *   gallery.appendChild(icon);
 * });
 * ```
 */
export function getAllIconNames(): IconName[] {
  return Object.values(IconNameEnum);
}

/**
 * Get icons by category for organized display.
 * 
 * @returns Object mapping category names to icon name arrays
 */
export function getIconsByCategory(): Record<string, IconName[]> {
  return {
    transport: ['play', 'pause', 'stop', 'record', 'fast-forward', 'rewind', 
                'skip-forward', 'skip-backward', 'repeat', 'repeat-once', 'shuffle', 'loop'],
    media: ['microphone', 'microphone-off', 'speaker', 'speaker-off', 'headphones',
            'volume-up', 'volume-down', 'volume-mute', 'volume-off'],
    navigation: ['arrow-up', 'arrow-down', 'arrow-left', 'arrow-right',
                 'chevron-up', 'chevron-down', 'chevron-left', 'chevron-right',
                 'caret-up', 'caret-down', 'caret-left', 'caret-right',
                 'menu', 'more-vertical', 'more-horizontal'],
    editing: ['cut', 'copy', 'paste', 'delete', 'trash', 'undo', 'redo', 'edit', 'pencil'],
    file: ['file', 'folder', 'folder-open', 'save', 'download', 'upload',
           'export', 'import', 'add-file', 'add-folder'],
    view: ['eye', 'eye-off', 'expand', 'collapse', 'fullscreen', 'exit-fullscreen',
           'maximize', 'minimize', 'grid', 'list'],
    tools: ['zoom-in', 'zoom-out', 'zoom-fit', 'search', 'filter', 'settings',
            'sliders', 'tool', 'cursor', 'hand', 'scissors'],
    audio: ['waveform', 'equalizer', 'mixer', 'fader', 'knob', 'metronome',
            'tempo', 'midi', 'audio-track', 'instrument', 'plugin', 'effects'],
    status: ['check', 'check-circle', 'x', 'x-circle', 'alert-circle', 'alert-triangle',
             'info', 'help', 'question', 'bell', 'bell-off'],
    social: ['user', 'users', 'share', 'link', 'external-link', 'mail',
             'message', 'comment', 'heart', 'star'],
    system: ['home', 'calendar', 'clock', 'lock', 'unlock', 'key', 'shield',
             'refresh', 'sync', 'loading', 'power'],
    misc: ['add', 'minus', 'close', 'cancel', 'checkmark', 'dot', 'circle',
           'square', 'triangle', 'diamond', 'tag', 'bookmark', 'pin', 'flag'],
  };
}