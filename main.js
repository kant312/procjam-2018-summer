/**
 * ////////////////////////////////////////////////////////////////////////////
 * // Init constants and main variables
 * ////////////////////////////////////////////////////////////////////////////
 */

const qs = document.querySelector.bind(document);
const qsa = document.querySelectorAll.bind(document);

const FRAMERATE = 30;
const maxBrushWidth = 100;
const brushes = [];
const commands = {
    cmdToggleGrayscaleMode,
    cmdTogglePaintMode,
    cmdToggleStroke,
    cmdChangeBrushShape,
    cmdChangeColors,
    cmdPlayPause,
    cmdShowHideToolbox,
    cmdChangeBrushesAmount,
    cmdChangeBrushSize,
    cmdChangeRotation,
    cmdShowHideHelp,
    cmdSaveCanvas
};
let count = 0;
let colors = [];
let brushShapes = ['circle', 'square'];
let brushShapeIdx = 0;
const switches = {
    grayscaleEnabled: false,
    paintModeEnabled: false,
    strokeEnabled: false,
    drawingEnabled: true,
    toolboxVisible: true,
    helpVisible: false
};
const ranges = {
    nbBrushes: 10,
    brushWidth: 10,
    rotation: 90
};

/**
 * ////////////////////////////////////////////////////////////////////////////
 * // Helper functions
 * ////////////////////////////////////////////////////////////////////////////
 */

function debounce(func, wait, immediate) {
	var timeout;
	return function() {
		var context = this, args = arguments;
		var later = function() {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};

// Make sure a value is within a defined range
function limits(actual, min, max) {
    return (actual < min) ? min : (actual > max) ? max : actual;
}

// Generator function to get a random color
function * getColor(r,g,b) {
    while(true) {
        // Grayscale strategy
        if (switches.grayscaleEnabled) {
            let color = limits(r + ((random(2) > 1) ? 1 : -1), 0,255);
            [r, g, b] = [color, color, color];
        }
        // RGB strategy
        else {
            [r, g, b] = [r,g,b].map( color => limits(color + ((random(2) > 1) ? 1 : -1), 0,255));
        }

        yield [r, g, b];
    }
}

// Return a random RGB color
function getRandomRgbColor() {
    return [
        round(random(255)),
        round(random(255)),
        round(random(255))
    ];
}

// Return a grayscale color
function getRandomGrayscaleColor() {
    let color = round(random(255));
    return [
        color,
        color,
        color
    ];
}

// Return a randome color, depending on the color mode
function getRandomColor() {
    return (switches.grayscaleEnabled) ? getRandomGrayscaleColor() : getRandomRgbColor();
}

// Return the size of a full-screen canvas while taking into account the margins
function getCanvasSize() {
    const css = getComputedStyle(canvas.parentElement),
        marginWidth  = round( float(css.marginLeft) + float(css.marginRight)  ),
        marginHeight = round( float(css.marginTop)  + float(css.marginBottom) );
    return {width: windowWidth - marginWidth, height: windowHeight - marginHeight};
}

// Fired when the window has been resized
function resizeWindow() {
    const canvasSize = getCanvasSize();
    resizeCanvas(canvasSize.width, canvasSize.height, true);
    setup();
}

const debouncedResize = debounce(resizeWindow, 150, false);

function windowResized() {
    debouncedResize();
}

// Export canvas
const exportImage = () => {
    const date = new Date();
    const formattedDate = date.getFullYear() + '-' + 
        ("0" + (date.getMonth()+1)).slice(-2) + '-' + 
        ("0" + date.getDay()).slice(-2) + 'T' + 
        ("0" + date.getHours()).slice(-2) + 
        ("0" + date.getMinutes()).slice(-2) + 
        ("0" + date.getSeconds()).slice(-2);
    saveCanvas('procedural_painter_' + formattedDate, 'png');
};


/**
 * ////////////////////////////////////////////////////////////////////////////
 * // Brush object
 * ////////////////////////////////////////////////////////////////////////////
 */
class Brush {
    constructor(x, y, w, color) {
        this.setColor(color);
        this.x = x;
        this.y = y;
        this.w = w;
    }

    draw() {
        [this.r, this.g, this.b] = this.colorGen.next().value;
        
        this.w += (random(2) > 1) ? 1 : -1;
        this.w = limits(this.w, 1, maxBrushWidth);

        this.x += (random(2) > 1) ? -1 : 1;
        let radius = this.w/2;
        this.x = limits(this.x, 0+radius, width-radius);
        this.y += (random(2) > 1) ? -1 : 1; 
        this.y = limits(this.y, 0+radius, height-radius);
        
        [this.r, this.g, this.b] = this.colorGen.next().value;
        fill(this.r, this.g, this.b);

        if (brushShapes[brushShapeIdx] === 'circle') {
            ellipse(this.x,this.y,this.w,this.w);
        }
        else {
            push();
            translate(this.x, this.y);
            rotate(ranges.rotationRad);
            rect(0, 0, this.w, this.w);
            pop();
        }
    }

    setWidth(w) {
        this.w = w;
    }

    setColor(color) {
        this.colorGen = getColor(...color);
    }
}

function addBrush() {
    let x = 100 + random(width - 200);
    let y = 50 + random(height - 100);
    let w = 1+ random(ranges.brushWidth-1);
    brushes.push(new Brush(x,y,w,colors));
}

initButtons();

/**
 * ////////////////////////////////////////////////////////////////////////////
 * // SETUP
 * ////////////////////////////////////////////////////////////////////////////
 */

function setup() {
    const canvasSize = getCanvasSize();
    createCanvas(canvasSize.width, canvasSize.height);
    frameRate(FRAMERATE);
    rectMode(CENTER);

    colors = getRandomColor();
    brushes.length = 0;

    updateTools();

    for (let i=0; i<ranges.nbBrushes; i++) {
        addBrush();
    }
}

/**
 * ////////////////////////////////////////////////////////////////////////////
 * // MAIN DRAW LOOP
 * ////////////////////////////////////////////////////////////////////////////
 */

function draw() {
    // Don't draw anything when system paused
    if (!switches.drawingEnabled) {
        return;
    }

    if (! switches.paintModeEnabled) {
        background('#111');
    }

    if (switches.strokeEnabled) {
        stroke(33);
        strokeWeight(1);
    }
    else {
        noStroke();
    }
    
    for(let brush of brushes) {
        if (typeof brush !== 'undefined') {
            brush.draw();
        }
    }
}

/**
 * ////////////////////////////////////////////////////////////////////////////
 * // TOOLS
 * ////////////////////////////////////////////////////////////////////////////
 */

function initButtons() {
    Array.from(qsa('[data-cmd]')).map( cmdTrigger => {
        cmdTrigger.addEventListener('click', e => {
            e.preventDefault();
            const commandName = cmdTrigger.getAttribute('data-cmd');
            commands[commandName].apply();
            updateTools();
        });
        
    } );

    Array.from(qsa('[data-range]')).map( rangeInput => {
        const rangeName = rangeInput.getAttribute('data-range');
        rangeInput.value = ranges[rangeName];
        rangeInput.addEventListener('change', e => {
            const cmdName = e.target.getAttribute('data-trigger-cmd');
            const cmd = commands[cmdName];
            cmd.apply(null, [rangeInput.value]);
            updateTools();
        });
    });
}

function updateTools() {
    // Brush icon
    let iconBrush = qs('.icon--brush');
    iconBrush.setAttribute('data-brush', brushShapes[brushShapeIdx]);
    
    //Switches
    let switchesIcons = Array.from(qsa('.icon--switch'));
    switchesIcons.map( switchIcon => {
        let swtch = switchIcon.getAttribute('data-switch');
        switchIcon.setAttribute('data-enabled', switches[swtch] ? 'on' : 'off');
    });

    // Colors
    let colorIcon = qs('.icon--color');
    colorIcon.style.backgroundColor = '#' + colors.map(c => c.toString(16)).join('');

    // Ranges
    Array.from(qsa('[data-range]')).map( rangeInput => {
        let rangeName = rangeInput.getAttribute('data-range');
        qs('[data-range-indicator=' + rangeName + ']').textContent = ranges[rangeName];
    });

}

/**
 * ////////////////////////////////////////////////////////////////////////////
 * // COMMANDS
 * ////////////////////////////////////////////////////////////////////////////
 */

function cmdChangeBrushesAmount(newAmount) {
    if(newAmount < 0) {
        return;
    }
    
    let delta = newAmount-ranges.nbBrushes;
    if (delta > 0) {
        for (let i=0; i<delta; i++) {
            addBrush();
        }
    }
    else if (delta < 0) {
        brushes.splice(newAmount);
    }
    ranges.nbBrushes = newAmount;
}

function cmdIncreaseBrushesAmount() {
    cmdChangeBrushesAmount(ranges.nbBrushes+1);
}

function cmdDecreaseBrushesAmount() {
    cmdChangeBrushesAmount(ranges.nbBrushes-1);
}

function cmdChangeBrushSize(newSize) {
    newSize = parseInt(newSize);

    if (newSize < 0) {
        newSize = 0;
    }
    
    ranges.brushWidth = newSize;
    brushes.map( s => s.setWidth(newSize) );
}

function cmdInreaseBrushSize() {
    cmdChangeBrushSize(ranges.brushWidth+1);
}

function cmdDecreaseBrushSize() {
    cmdChangeBrushSize(ranges.brushWidth-1);
}

function cmdToggleStroke() {
    switches.strokeEnabled = !switches.strokeEnabled;
}

function cmdRefreshScreen() {
    background('#111');
}

function cmdTogglePaintMode() {
    switches.paintModeEnabled = !switches.paintModeEnabled;
}

function cmdChangeColors() {
    colors = getRandomColor();
    brushes.map(s => s.setColor(colors));
}

function cmdToggleGrayscaleMode() {
    switches.grayscaleEnabled = !switches.grayscaleEnabled;
}

function cmdChangeBrushShape() {
    brushShapeIdx = (brushShapeIdx+1) % brushShapes.length;
}

function cmdChangeRotation(newAngleDeg) {
    ranges.rotation = newAngleDeg;
    ranges.rotationRad = newAngleDeg * (Math.PI / 180)
}

function cmdPlayPause() {
    switches.drawingEnabled = !switches.drawingEnabled;
}

function cmdShowHideToolbox() {
    switches.toolboxVisible = !switches.toolboxVisible;
    qs('.toolbar').setAttribute('data-visibility', switches.toolboxVisible ? 'visible' : 'invisible');
}

function cmdShowHideHelp() {
    switches.helpVisible = !switches.helpVisible;
    qs('.help').setAttribute('data-visibility', switches.helpVisible ? 'visible' : 'invisible');
    qs('.overlay').setAttribute('data-visibility', switches.helpVisible ? 'visible' : 'invisible');
}

function cmdSaveCanvas() {
    exportImage();
}

window.addEventListener('keydown', e => {
    let key = e.key;

    const keyMap = {
        // Brushes amount
        'j': cmdDecreaseBrushesAmount,
        'k': cmdIncreaseBrushesAmount,
        // Brush size
        'd': cmdDecreaseBrushSize,
        'f': cmdInreaseBrushSize,
        // Brush shape
        'b': cmdChangeBrushShape,
        // Stroke on/off
        's': cmdToggleStroke,
        // Refresh screen and paint mode
        'z': cmdRefreshScreen,
        'p': cmdTogglePaintMode,
        // Colors
        'c': cmdChangeColors,
        'g': cmdToggleGrayscaleMode,
        // Rotation
        'r': cmdChangeRotation,
        //Play/pause
        'o': cmdPlayPause,
        //Show/hide toolbox&help
        't': cmdShowHideToolbox,
        'h': cmdShowHideHelp
    };

    if (e.key in keyMap) {
        keyMap[e.key].apply();
        updateTools();
    }

});