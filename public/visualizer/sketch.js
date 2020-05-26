var mic;
var amplitude;

var prevLevels = new Array(60);


function setup() {
  c = createCanvas(windowWidth, windowHeight);
  background(0);
  noStroke();

  rectMode(CENTER);
  colorMode(HSB);

  mic = new p5.AudioIn();
  mic.start();

  getAudioContext().suspend();
  
  amplitude = new p5.Amplitude();
  amplitude.setInput(mic);
  amplitude.smooth(0.6);
}

function draw() {
  background(15);
  fill(255, 10)

  var level = amplitude.getLevel();

  // rectangle variables
  var spacing = 10;
  var w = width/ (prevLevels.length * spacing);

  var minHeight = 2;
  var roundness = 20;

  // add new level to end of array
  prevLevels.push(level);

  // remove first item in array
  prevLevels.splice(0, 1);

  // loop through all the previous levels
  for (var i = 0; i < prevLevels.length; i++) {

    var x = map(i, prevLevels.length, 0, width/2, width);
    var h = map(prevLevels[i], 0, 0.5, minHeight, height);

    var alphaValue = logMap(i, 0, prevLevels.length, 1, 250);

    var hueValue = map(h, minHeight, height, 200, 255);

    fill(hueValue, 255, 255, alphaValue);

    rect(x, height/2, w, h);
    rect(width - x, height/2, w, h);
  }

}

function mousePressed() {
  userStartAudio();
}