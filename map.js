'use strict';
let X_POS       = 0;
let Y_POS       = 0;
let X_TILESIZE  = 64;
let Y_TILESIZE  = 32;
let TIME_START  = 0;
let TIME_LAST   = 0;
let MOUSE_DOWN  = false;  // whether mouse is pressed
let MOUSE_START = [];     // 'grab' coordinates when pressing mouse
let MOUSE_LAST  = [0, 0]; // previous coordinates of mouse release
let MOUSE_POS_START = [0, 0];

//const COLORS = ['red', 'blue', 'cyan', 'green', 'purple', 'magenta', 'yellow', 'orange', 'teal', 'pink'];
const COLORS = [
	"#000022",
	"#000044",
	"#002266",
	"#003399",
	"#0022AA",
	"#1144CC",
	"#1155EE",
]

const NUM_BG = 1;
let CANVAS_BG = [];
let CTX_BG = [];

// https://stackoverflow.com/a/24137301
Array.prototype.random = function () {
	return this[Math.floor((Math.random()*this.length))];
}

// https://stackoverflow.com/a/17323608
function mod(n, m) {
	return ((n % m) + m) % m;
}

// https://stackoverflow.com/a/10215724
function resize_canvas(){
	// primary canvas
	const canvas = document.getElementById('mapcanvas');
	if (!canvas.getContext) { return; }
	// Make it visually fill the positioned parent
	canvas.style.width ='100%';
	canvas.style.height='100%';
	// ...then set the internal size to match
	canvas.width  = canvas.offsetWidth;
	canvas.height = canvas.offsetHeight;
}

// get an array of tiles to be rendered onto the screen
function Tiles_MakeRandom(w, h)
{
	let map = [];
	for(y = 0; y < h; y += 1) {
		let row = [];
		let color = COLORS.random();
		for (x = 0; x < w; x += 1) {
			row.push(color);
		}
		map.push(row);
	}
	return map;
}

// just a generic grid-like thing for now
function Render_Step_BG(ctx, w, h)
{
	let x = 0;
	let y = Math.floor((h / 2) - (Y_TILESIZE / 2));
	let xi = 0;
	let yi = 0;
	ctx.font = '8px monospace';

	const tiles = Tiles_MakeRandom(w / X_TILESIZE, h / Y_TILESIZE);
	for (const row of tiles) {
		for (const tile of row) {
			ctx.fillStyle = tile;

			// render isometric tile
			ctx.beginPath();
			ctx.moveTo(x, y+(Y_TILESIZE / 2));
			ctx.lineTo(x+(X_TILESIZE/2), y+(Y_TILESIZE));
			ctx.lineTo(x+(X_TILESIZE), y+(Y_TILESIZE/2));
			ctx.lineTo(x+(X_TILESIZE/2), y);
			ctx.closePath();
			ctx.fill();
			ctx.fillStyle = 'white';
			ctx.fillText(xi + ',' + yi, x, y);

			x += X_TILESIZE / 2;
			y -= Y_TILESIZE / 2;
			xi += 1;
		}
		x = Math.floor(((yi+1) * X_TILESIZE / 2));
		y += Math.floor((Y_TILESIZE / 2) * (xi + 1));
		xi = 0;
		yi += 1;
	}
}

// thing to do every frame
function Render_Step(timestamp)
{
	// timestamp
	let time = timestamp - TIME_START;

	// primary canvas
	const canvas = document.getElementById('mapcanvas');
	if (!canvas.getContext) { return; }
	const ctx = canvas.getContext('2d', {alpha: false});

	// temporary motion thing
	//X_POS = Math.cos(time / 2000) * 1024 - 512;
	//X_POS = 32;
	//Y_POS = Math.sin(time / 500) * 128;
	//Y_POS = 32;

	// blit background layer to composite canvas
	ctx.globalCompositeOperation = 'source-over';
	ctx.clearRect(0, 0, canvas.width, canvas.height); // temporary!

	let x_pos = Math.floor(mod(X_POS, CANVAS_BG[0].width));// - (CANVAS_BG[0].width / 2));
	let y_pos = Math.floor(mod(Y_POS, CANVAS_BG[0].height));// - (CANVAS_BG[0].height / 2));

	const x_off = [
		(x_pos + (CANVAS_BG[0].width) / 2),   // top-left
		(x_pos - (CANVAS_BG[0].width) / 2),   // top-right
		(x_pos - CANVAS_BG[0].width * 1),         // far-left
		(x_pos),                              // center
		(x_pos - CANVAS_BG[0].width),         // far-right
		(x_pos + (CANVAS_BG[0].width) / 2),   // bottom-left
		(x_pos - (CANVAS_BG[0].width) / 2),   // bottom-right
		(x_pos + (CANVAS_BG[0].width) / 2),   // far-bottom-left
		(x_pos),                              // far-bottom
		(x_pos - (CANVAS_BG[0].width) / 2),   // far-bottom-right
	];
	const y_off = [
		(y_pos + (CANVAS_BG[0].height) / 2),   // top-left
		(y_pos + (CANVAS_BG[0].height) / 2),   // top-right
		(y_pos - CANVAS_BG[0].height),                               // far-left
		(y_pos),                               // center
		(y_pos),                               // far-right
		(y_pos - (CANVAS_BG[0].height) / 2),   // bottom-left
		(y_pos - (CANVAS_BG[0].height) / 2),   // bottom-right
		(y_pos - CANVAS_BG[0].height * 1.5),   // far-bottom-left
		(y_pos - CANVAS_BG[0].height),         // far-bottom
		(y_pos - CANVAS_BG[0].height * 1.5)    // far-bottom-right
	];
	const num_off = 10;

	for(let i = 0; i < num_off; i += 1) {
		ctx.drawImage(
			CANVAS_BG[0],
			x_off[i], y_off[i],                    // src x, y
			canvas.width, canvas.height,           // src w, h
			0, 0, canvas.width, canvas.height      // dst x, y, w, h
		);
	}

	// print some debug info
	ctx.fillStyle = 'black';
	ctx.fillRect(0, 0, 160, 90);
	ctx.fillRect(canvas.width - 100, 0, 100, 30);
	ctx.font = '14px monospace';
	ctx.fillStyle = 'white';
	ctx.fillText('X:          ' + X_POS, 10, 20);
	ctx.fillText('X % width:  ' + x_pos, 10, 40);
	ctx.fillText('Y:          ' + Y_POS, 10, 60);
	ctx.fillText('Y % height: ' + y_pos, 10, 80);
	
	// print fps too
	let fps = Math.round(1/((timestamp - TIME_LAST) / 1000));
	ctx.fillText("FPS: " + fps, canvas.width - 80, 20);

	TIME_LAST = timestamp;
	window.requestAnimationFrame(Render_Step);
}

function Render_Init()
{
	// primary canvas
	const canvas = document.getElementById('mapcanvas');
	if (!canvas.getContext) { return; }

	// register canvas events
	canvas.onmousedown = function(e) {
		MOUSE_DOWN = true;
		MOUSE_START = [
			e.offsetX,
			e.offsetY
		];
		MOUSE_POS_START = [X_POS, Y_POS];
	};

	canvas.onmouseup   = function(e) {
		MOUSE_DOWN = false;
		MOUSE_LAST = [
			e.offsetX - MOUSE_START[0],
			e.offsetY - MOUSE_START[1]
		];
	};

	canvas.onmousemove = function(e)
	{
		if(!MOUSE_DOWN) return; // don't pan if mouse is not pressed

		var x = e.offsetX;
		var y = e.offsetY;
		MOUSE_LAST = [
			e.offsetX - MOUSE_START[0],
			e.offsetY - MOUSE_START[1]
		];

		console.log(MOUSE_POS_START, MOUSE_LAST);
		X_POS = MOUSE_POS_START[0] - MOUSE_LAST[0];
		Y_POS = MOUSE_POS_START[1] - MOUSE_LAST[1];
	}

	TIME_START = performance.now();
	TIME_LAST = TIME_START;

	// get BG canvas
	CANVAS_BG[0] = document.getElementById('bg0');
	CTX_BG[0] = CANVAS_BG[0].getContext('2d');
	// draw background layers
	Render_Step_BG(CTX_BG[0], CANVAS_BG[0].width, CANVAS_BG[0].height);

	resize_canvas();

	// on each frame
	window.requestAnimationFrame(Render_Step);
}

Render_Init();