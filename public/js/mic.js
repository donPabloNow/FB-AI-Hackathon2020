var mic = new Wit.Microphone(document.getElementById("microphone"));
var info = function (msg) {
  if(document.getElementById("info")){
    document.getElementById("info").innerHTML = msg;
  }
};
var error = function (msg) {
  if(document.getElementById("error")){
    document.getElementById("error").innerHTML = msg;
  }
};
mic.onready = function () {
  info("Click the microphone to record");
};
mic.onaudiostart = function () {
  info("Recording started");
  error("");
};
mic.onaudioend = function () {
  info("Recording stopped, processing started");
};
mic.onresult = function (intent, entities, res) {
  console.log(res.msg_body);
  if(res.msg_body) {
    $scope.search = res.msg_body;
    $scope.query()
  }
  document.getElementById("result").innerHTML = res.msg_body;
};
mic.onerror = function (err) {
  error("Error: " + err);
};
mic.onconnecting = function () {
  info("Microphone is connecting");
};
mic.ondisconnected = function () {
  info("Microphone is not connected");
  mic.connect("VF37BMDRZO74V4XNSGLDRCCR6LZS2MQD");
};

mic.connect("VF37BMDRZO74V4XNSGLDRCCR6LZS2MQD");