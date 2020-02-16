/**
 * left outlet   (0): pitches
 * middle outlet (1): frequencies
 * right outlet  (2): bang for clearing notes 
 */
outlets = 3;

Array.prototype.includes = function(e) {
    for (var i = 0; i < this.length; i++) {
        if (this[i] === e) return true;
    }
    return false;
}

var combineBy = {
    sum: function(a, b) { return a + b },
    difference: function(a, b) { return a - b }
};
var pitches = [];
var prevCombTones = [];
var combineFn = combineBy.difference;


// ======== MAX HANDLERS ========

function clear() {
	pitches = [];
	prevCombTones = [];
}

/**
 * Change the type of combination tone calculated. 0 = difference, 1 = sum;
 */
function mode(index) {
    switch (index) {
        case 0: combineFn = combineBy.difference;
        break;
        case 1: combineFn = combineBy.sum;
        break;
    }
}


// add or remove a pitch 
function note(pitch, velocity) {
    if (velocity == 0) pitches = pitches.filter(function (p) {
        return p != pitch;
    });
    else pitches.push(pitch);

    // get combination tones
    var combinationTones = calculateCombinationTones(pitches, combineFn);
    outputFreqs(combinationTones);
    prevCombTones = updateNotesOn(prevCombTones, combinationTones);

	// force note-offs to stp notes from getting stuck
    if (pitches.length === 0) outlet(2, "bang");
}

//checks whether an array of floating-point MIDI pitches contains a pitch with 
// the same int value as a floating-point MIDI pitch
function hasMIDINote(arr, pitch) {
    for (var i = 0; i < arr.length; i++) {
        if (Math.round(arr[i]) == Math.round(pitch)) return true;
    }
    return false;
}

// ======== PRIVATE FUNCTIONS ========

// compares two sets of pitches, sending the proper notes on and off as pitch-velocity commands
function updateNotesOn(prev, curr) {
    // send note offs
    for (var i = 0; i < prev.length; i++) {
        if (!hasMIDINote(curr, prev[i])) outlet(0, [prev[i], 0]);
    }
    // send note ons
    for (var i = 0; i < curr.length; i++) {
        if (!hasMIDINote(prev, curr[i])) outlet(0, [curr[i], 60]);
    }
    return curr;
}

function outputFreqs(pitches) {
	if (!pitches.length) return outlet(1, "");
    outlet(1, pitches.map(function (f) { 
        return Math.round(Util.ETToFreq(f));
    }));
}

/**
 * Calculate all combination tones in the array of pitches.
 * `combineFn(number, number)` may be specified to change
 * how two frequencies are to be combined. Its default is subtraction (difference tones).
 */
function calculateCombinationTones(arr, combineFn) {
    combineFn = combineFn || function(a, b) { return a - b; };
    var combinationTones = [];
  
    for (var i = 0; i < arr.length - 1; i++) {
        for (var j = i + 1; j < arr.length; j++) {
            var f1 = Util.ETToFreq(arr[i]),
                f2 = Util.ETToFreq(arr[j]),
                result = Math.abs(combineFn(f1, f2));

            if (result !== 0) combinationTones.push(Util.freqToET(result));
        }
    }

    return combinationTones;
}

var Util = {
    refA: 440, // A = 440 Hz = MIDI pitch #69
    ETToFreq: function ETToFreq(pitch) {
      var base = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 12;
      return Util.refA * Math.pow(2, pitch / base - 69 / 12);
    },
    freqToET: function freqToET(freq) {
      var base = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : 12;
      return base * (Util.log2(freq / Util.refA) + 69 / 12);
    },
    log: function log(n, base) {
      return Math.log(n) / Math.log(base);
    },
    log2: function log2(n) {
      return Util.log(n, 2);
    }
};