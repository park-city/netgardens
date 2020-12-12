'use strict';
let X_POS = 32;
let Y_POS = 128;
let X_TILESIZE = 128;
let Y_TILESIZE = 64;
let TIME_START = 0;

const COLORS = ['red', 'blue', 'cyan', 'green', 'purple', 'magenta', 'yellow', 'orange', 'teal', 'pink'];

// https://stackoverflow.com/a/24137301
Array.prototype.random = function () {
	return this[Math.floor((Math.random()*this.length))];
}

// get an array of tiles to be rendered onto the screen
function Tiles_MakeRandom(w, h)
{
	let map = [];
	for(y = 0; y < h; y += 1) {
		let row = [];
		for (x = 0; x < w; x += 1) {
			row.push(COLORS.random());
		}
		map.push(row);
	}
	console.log(map);
	return map;
}

// just a generic grid-like thing for now
function Render_Step_BG1(ctx, w, h)
{
	let x = 0;
	let y = h / 2;
	let xi = 0;
	let yi = 0;

	const tiles = Tiles_MakeRandom(6, 6);
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

			x += X_TILESIZE / 2;
			y -= Y_TILESIZE / 2;
			xi += 1;
		}
		x = ((yi+1) * X_TILESIZE / 2);
		y += (Y_TILESIZE / 2) * (xi + 1);
		xi = 0;
		yi += 1;
	}
}

// thing to do every frame
function Render_Step(timestamp)
{
	// primary canvas
	const canvas = document.getElementById('mapcanvas');
	if (!canvas.getContext) { return; }
	const ctx = canvas.getContext('2d', {alpha: false});
	// bg1 canvas
	const canvas_bg1 = document.getElementById('bg1');
	if (!canvas_bg1.getContext) { return; }
	const ctx_bg1 = canvas_bg1.getContext('2d');

	// timestamp
	let time = timestamp - TIME_START;

	// temporary motion thing
	X_POS = Math.cos(time / 1000) * 64;
	Y_POS = Math.sin(time / 1000) * 64;

	// blit background layer to composite canvas
	const bg1 = ctx_bg1.getImageData(X_POS, Y_POS, 512, 512);
	ctx.putImageData(bg1, 0, 0)

	window.requestAnimationFrame(Render_Step);
}

function Render_Init()
{
	TIME_START = performance.now();

	// bg1 canvas
	const canvas_bg1 = document.getElementById('bg1');
	if (!canvas_bg1.getContext) { return; }
	const ctx_bg1 = canvas_bg1.getContext('2d');
	// draw background layer
	Render_Step_BG1(ctx_bg1, 768, 768);

	// on each frame
	window.requestAnimationFrame(Render_Step);
}

Render_Init();