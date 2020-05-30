var mic;
var amplitude;
var recording = false;
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
  background(0, 0, 6);
  fill(255, 10)

  var level = amplitude.getLevel();

  // rectangle variables
  var spacing = 10;
  var w = width/ (prevLevels.length * spacing);

  var minHeight = 2;
  // add new level to end of array
  prevLevels.push(level);

  // remove first item in array
  prevLevels.splice(0, 1);

  // loop through all the previous levels
  for (var i = 0; i < prevLevels.length; i++) {

    var x = map(i, prevLevels.length, 0, width/2, width);
    var h = map(prevLevels[i], 0, 0.5, minHeight, height - 220);

    var alphaValue = logMap(i, 0, prevLevels.length, 1, 250);

    fill(192, 61, 98, alphaValue);

    rect(x+74, height/2, w, h);
    rect(width -x-74, height/2, w, h);
  }

}

function mousePressed(e) {
  if(e.target.className.baseVal === "mic-svg mic-box") {
    if(recording) {
      getAudioContext().suspend();
    } else{
      userStartAudio();
    }
    recording = !recording;
  }
}