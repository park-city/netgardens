'use strict';
let X_TILESIZE  = 128;
let Y_TILESIZE  = 128;

// init app
const app = new PIXI.Application({
    backgroundColor: 0x1099bb
});
document.body.appendChild(app.view);

// auto-resize to fill screen
app.renderer.view.style.position = "absolute";
app.renderer.view.style.display = "block";
app.renderer.autoResize = true;
app.renderer.resize(window.innerWidth, window.innerHeight);

// define debug font
const fon_debug = new PIXI.TextStyle({
    fontFamily: 'Arial',
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: 'normal',
    fill: '#fff',
    stroke: '#000',
    strokeThickness: 5,
    lineJoin: 'round'
});

// now just draw a whole bunch of triangles
const gfx = new PIXI.Graphics();
gfx.lineStyle(4, 0xffd900, 1);

function Render_Tri(x, y, w, h, flipped)
{
    if (flipped == true) {
        x += w;
        w = -w;
    }
    gfx.moveTo(x, y);
    gfx.lineTo(x, y+h);
    gfx.lineTo(x+w, y+(h/2));
    gfx.lineTo(x, y);
    gfx.closePath();
}

let flipped = false;
for (let y = 0; y < app.screen.height; y += (Y_TILESIZE / 2)) {
    for (let x = 0; x < app.screen.width; x += X_TILESIZE) {
        Render_Tri(x, y, X_TILESIZE, Y_TILESIZE, flipped)
        flipped = !flipped;
    }
    flipped = !flipped;
}
app.stage.addChild(gfx);


// draw a program identifier thingy
const richText = new PIXI.Text('netgardens.io demo', fon_debug);
richText.x = 8;
richText.y = 8;
app.stage.addChild(richText);