/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

define({
	Sleep: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	WakeUp: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	KeyA: {
		value: 'a',
		withShift: 'A',
		withAltGr: 'a',
		withShiftAltGr: 'A'
	},
	KeyB: {
		value: 'b',
		withShift: 'B',
		withAltGr: 'b',
		withShiftAltGr: 'B'
	},
	KeyC: {
		value: 'c',
		withShift: 'C',
		withAltGr: 'c',
		withShiftAltGr: 'C'
	},
	KeyD: {
		value: 'd',
		withShift: 'D',
		withAltGr: 'd',
		withShiftAltGr: 'D'
	},
	KeyE: {
		value: 'e',
		withShift: 'E',
		withAltGr: 'e',
		withShiftAltGr: 'E'
	},
	KeyF: {
		value: 'f',
		withShift: 'F',
		withAltGr: 'f',
		withShiftAltGr: 'F'
	},
	KeyG: {
		value: 'g',
		withShift: 'G',
		withAltGr: 'g',
		withShiftAltGr: 'G'
	},
	KeyH: {
		value: 'h',
		withShift: 'H',
		withAltGr: 'h',
		withShiftAltGr: 'H'
	},
	KeyI: {
		value: 'i',
		withShift: 'I',
		withAltGr: 'i',
		withShiftAltGr: 'I'
	},
	KeyJ: {
		value: 'j',
		withShift: 'J',
		withAltGr: 'j',
		withShiftAltGr: 'J'
	},
	KeyK: {
		value: 'k',
		withShift: 'K',
		withAltGr: 'k',
		withShiftAltGr: 'K'
	},
	KeyL: {
		value: 'l',
		withShift: 'L',
		withAltGr: 'l',
		withShiftAltGr: 'L'
	},
	KeyM: {
		value: 'm',
		withShift: 'M',
		withAltGr: 'm',
		withShiftAltGr: 'M'
	},
	KeyN: {
		value: 'n',
		withShift: 'N',
		withAltGr: 'n',
		withShiftAltGr: 'N'
	},
	KeyO: {
		value: 'o',
		withShift: 'O',
		withAltGr: 'o',
		withShiftAltGr: 'O'
	},
	KeyP: {
		value: 'p',
		withShift: 'P',
		withAltGr: 'p',
		withShiftAltGr: 'P'
	},
	KeyQ: {
		value: 'q',
		withShift: 'Q',
		withAltGr: 'q',
		withShiftAltGr: 'Q'
	},
	KeyR: {
		value: 'r',
		withShift: 'R',
		withAltGr: 'r',
		withShiftAltGr: 'R'
	},
	KeyS: {
		value: 's',
		withShift: 'S',
		withAltGr: 's',
		withShiftAltGr: 'S'
	},
	KeyT: {
		value: 't',
		withShift: 'T',
		withAltGr: 't',
		withShiftAltGr: 'T'
	},
	KeyU: {
		value: 'u',
		withShift: 'U',
		withAltGr: 'u',
		withShiftAltGr: 'U'
	},
	KeyV: {
		value: 'v',
		withShift: 'V',
		withAltGr: 'v',
		withShiftAltGr: 'V'
	},
	KeyW: {
		value: 'w',
		withShift: 'W',
		withAltGr: 'w',
		withShiftAltGr: 'W'
	},
	KeyX: {
		value: 'x',
		withShift: 'X',
		withAltGr: 'x',
		withShiftAltGr: 'X'
	},
	KeyY: {
		value: 'y',
		withShift: 'Y',
		withAltGr: 'y',
		withShiftAltGr: 'Y'
	},
	KeyZ: {
		value: 'z',
		withShift: 'Z',
		withAltGr: 'z',
		withShiftAltGr: 'Z'
	},
	Digit1: {
		value: '1',
		withShift: '!',
		withAltGr: '1',
		withShiftAltGr: '!'
	},
	Digit2: {
		value: '2',
		withShift: '@',
		withAltGr: '2',
		withShiftAltGr: '@'
	},
	Digit3: {
		value: '3',
		withShift: '#',
		withAltGr: '3',
		withShiftAltGr: '#'
	},
	Digit4: {
		value: '4',
		withShift: '$',
		withAltGr: '4',
		withShiftAltGr: '$'
	},
	Digit5: {
		value: '5',
		withShift: '%',
		withAltGr: '5',
		withShiftAltGr: '%'
	},
	Digit6: {
		value: '6',
		withShift: '^',
		withAltGr: '6',
		withShiftAltGr: '^'
	},
	Digit7: {
		value: '7',
		withShift: '&',
		withAltGr: '7',
		withShiftAltGr: '&'
	},
	Digit8: {
		value: '8',
		withShift: '*',
		withAltGr: '8',
		withShiftAltGr: '*'
	},
	Digit9: {
		value: '9',
		withShift: '(',
		withAltGr: '9',
		withShiftAltGr: '('
	},
	Digit0: {
		value: '0',
		withShift: ')',
		withAltGr: '0',
		withShiftAltGr: ')'
	},
	Enter: {
		value: '\r',
		withShift: '\r',
		withAltGr: '\r',
		withShiftAltGr: '\r'
	},
	Escape: {
		value: '\u001b',
		withShift: '\u001b',
		withAltGr: '\u001b',
		withShiftAltGr: '\u001b'
	},
	Backspace: {
		value: '\b',
		withShift: '\b',
		withAltGr: '\b',
		withShiftAltGr: '\b'
	},
	Tab: {
		value: '\t',
		withShift: '',
		withAltGr: '\t',
		withShiftAltGr: ''
	},
	Space: {
		value: ' ',
		withShift: ' ',
		withAltGr: ' ',
		withShiftAltGr: ' '
	},
	Minus: {
		value: '-',
		withShift: '_',
		withAltGr: '-',
		withShiftAltGr: '_'
	},
	Equal: {
		value: '=',
		withShift: '+',
		withAltGr: '=',
		withShiftAltGr: '+'
	},
	BracketLeft: {
		value: '[',
		withShift: '{',
		withAltGr: '[',
		withShiftAltGr: '{'
	},
	BracketRight: {
		value: ']',
		withShift: '}',
		withAltGr: ']',
		withShiftAltGr: '}'
	},
	Backslash: {
		value: '\\',
		withShift: '|',
		withAltGr: '\\',
		withShiftAltGr: '|'
	},
	Semicolon: {
		value: ';',
		withShift: ':',
		withAltGr: ';',
		withShiftAltGr: ':'
	},
	Quote: {
		value: '\'',
		withShift: '"',
		withAltGr: '\'',
		withShiftAltGr: '"'
	},
	Backquote: {
		value: '`',
		withShift: '~',
		withAltGr: '`',
		withShiftAltGr: '~'
	},
	Comma: {
		value: ',',
		withShift: '<',
		withAltGr: ',',
		withShiftAltGr: '<'
	},
	Period: {
		value: '.',
		withShift: '>',
		withAltGr: '.',
		withShiftAltGr: '>'
	},
	Slash: {
		value: '/',
		withShift: '?',
		withAltGr: '/',
		withShiftAltGr: '?'
	},
	CapsLock: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	F1: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	F2: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	F3: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	F4: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	F5: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	F6: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	F7: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	F8: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	F9: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	F10: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	F11: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	F12: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	PrintScreen: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	ScrollLock: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	Pause: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	Insert: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	Home: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	PageUp: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	Delete: {
		value: '',
		withShift: '',
		withAltGr: '',
		withShiftAltGr: ''
	},
	End: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	PageDown: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	ArrowRight: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	ArrowLeft: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	ArrowDown: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	ArrowUp: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	NumLock: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	NumpadDivide: {
		value: '/',
		withShift: '/',
		withAltGr: '/',
		withShiftAltGr: '/'
	},
	NumpadMultiply: {
		value: '*',
		withShift: '*',
		withAltGr: '*',
		withShiftAltGr: '*'
	},
	NumpadSubtract: {
		value: '-',
		withShift: '-',
		withAltGr: '-',
		withShiftAltGr: '-'
	},
	NumpadAdd: {
		value: '+',
		withShift: '+',
		withAltGr: '+',
		withShiftAltGr: '+'
	},
	NumpadEnter: {
		value: '\r',
		withShift: '\r',
		withAltGr: '\r',
		withShiftAltGr: '\r'
	},
	Numpad1: { value: '', withShift: '1', withAltGr: '', withShiftAltGr: '1' },
	Numpad2: { value: '', withShift: '2', withAltGr: '', withShiftAltGr: '2' },
	Numpad3: { value: '', withShift: '3', withAltGr: '', withShiftAltGr: '3' },
	Numpad4: { value: '', withShift: '4', withAltGr: '', withShiftAltGr: '4' },
	Numpad5: { value: '', withShift: '5', withAltGr: '', withShiftAltGr: '5' },
	Numpad6: { value: '', withShift: '6', withAltGr: '', withShiftAltGr: '6' },
	Numpad7: { value: '', withShift: '7', withAltGr: '', withShiftAltGr: '7' },
	Numpad8: { value: '', withShift: '8', withAltGr: '', withShiftAltGr: '8' },
	Numpad9: { value: '', withShift: '9', withAltGr: '', withShiftAltGr: '9' },
	Numpad0: { value: '', withShift: '0', withAltGr: '', withShiftAltGr: '0' },
	NumpadDecimal: { value: '', withShift: '.', withAltGr: '', withShiftAltGr: '.' },
	IntlBackslash: {
		value: '<',
		withShift: '>',
		withAltGr: '|',
		withShiftAltGr: '¦'
	},
	ContextMenu: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	Power: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	NumpadEqual: {
		value: '=',
		withShift: '=',
		withAltGr: '=',
		withShiftAltGr: '='
	},
	F13: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	F14: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	F15: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	F16: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	F17: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	F18: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	F19: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	F20: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	F21: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	F22: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	F23: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	F24: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	Open: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	Help: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	Select: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	Again: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	Undo: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	Cut: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	Copy: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	Paste: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	Find: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	AudioVolumeMute: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	AudioVolumeUp: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	AudioVolumeDown: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	NumpadComma: {
		value: '.',
		withShift: '.',
		withAltGr: '.',
		withShiftAltGr: '.'
	},
	IntlRo: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	KanaMode: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	IntlYen: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	Convert: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	NonConvert: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	Lang1: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	Lang2: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	Lang3: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	Lang4: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	Lang5: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	NumpadParenLeft: {
		value: '(',
		withShift: '(',
		withAltGr: '(',
		withShiftAltGr: '('
	},
	NumpadParenRight: {
		value: ')',
		withShift: ')',
		withAltGr: ')',
		withShiftAltGr: ')'
	},
	ControlLeft: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	ShiftLeft: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	AltLeft: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	MetaLeft: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	ControlRight: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	ShiftRight: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	AltRight: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	MetaRight: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	BrightnessUp: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	BrightnessDown: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	MediaPlay: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	MediaRecord: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	MediaFastForward: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	MediaRewind: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	MediaTrackNext: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	MediaTrackPrevious: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	MediaStop: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	Eject: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	MediaPlayPause: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	MediaSelect: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	LaunchMail: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	LaunchApp2: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	LaunchApp1: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	SelectTask: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	LaunchScreenSaver: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	BrowserSearch: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	BrowserHome: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	BrowserBack: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	BrowserForward: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	BrowserStop: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	BrowserRefresh: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	BrowserFavorites: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	MailReply: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	MailForward: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' },
	MailSend: { value: '', withShift: '', withAltGr: '', withShiftAltGr: '' }

});
//# sourceURL=file:///Users/advikar/Documents/architect/arch2/ArchIDE/src/vs/workbench/services/keybinding/test/node/linux_en_us.js