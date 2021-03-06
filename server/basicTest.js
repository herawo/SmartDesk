var GrovePi = require('../libs').GrovePi
var Commands = GrovePi.commands
var Board = GrovePi.board
var AccelerationI2cSensor = GrovePi.sensors.AccelerationI2C
var UltrasonicDigitalSensor = GrovePi.sensors.UltrasonicDigital
var AirQualityAnalogSensor = GrovePi.sensors.AirQualityAnalog
var SoundAnalogSensor = GrovePi.sensors.SoundAnalog
var DHTDigitalSensor = GrovePi.sensors.DHTDigital
var LightAnalogSensor = GrovePi.sensors.LightAnalog
var DigitalButtonSensor = GrovePi.sensors.DigitalButton
var LoudnessAnalogSensor = GrovePi.sensors.LoudnessAnalog
var RotaryAngleAnalogSensor = GrovePi.sensors.RotaryAnalog
var DustDigitalSensor = GrovePi.sensors.dustDigital
var VariableColorLedSensor  = GrovePi.sensors.VariableColorLedAnalog
var UVAnalogSensor  = GrovePi.sensors.UVAnalog

var board

var LoudnessAnalogSensorValue = '0'
var http = require("http"); 


var fs = require("fs");





http.createServer(function (request, response) {
	response.writeHead(200, {
			'Content-Type' : 'text/plain'
			});

	response.write(LoudnessAnalogSensorValue)
	response.end();
	console.log("Node.js server running on port 8080.");
}).listen(8080);



var testOptions = {
  acceleration: false,
  ultrasonic: false,
  airQuality: true,
  sound: true,
  dhtDigital: true,
  lightAnalog: false,
  digitalButton: false,
  loudnessAnalog: false,
  rotaryAngle: false,
  dust: false,
  customAccelerationReading: false,
  led : false,
  uv : false
}

var sound = [];
var airquality = [];
var temperature = [];

function start() {
  console.log('starting')

  board = new Board({
    debug: true,
    onError: function (err) {
      console.log('TEST ERROR')
      console.log(err)
    },
    onInit: function (res) {
      if (res) {

        console.log('GrovePi Version :: ' + board.version())

        if (testOptions.airQuality) {
          var airQualitySensor = new AirQualityAnalogSensor(0)
          // Analog Port 0
          // Air Quality Sensor
          console.log('AirQuality Analog Sensor (start watch)')
          airQualitySensor.on('change', function (res) {
            console.log('AirQuality onChange value=' + res);
				airquality.push(res);
				var jsonairquality = JSON.stringify(airquality);
				fs.writeFile("./airquality.json", jsonairquality , (err) => {
					if (err) {
						console.error(err);
						return;
					};
				});
          })
          airQualitySensor.watch()
        }

        if (testOptions.sound) {
			var soundSensor = new SoundAnalogSensor(1)
			// Analog Port 1
			// Sound Sensor
			console.log('Sound Analog Sensor (start watch)')
			soundSensor.on('change', function (res) {
				sound.push(res);
				var jsonsound = JSON.stringify(sound);
				fs.writeFile("./sound.json", jsonsound , (err) => {
					if (err) {
						console.error(err);
						return;
					};
				});
				console.log('Sound onChange value=' + res)
			})	

			soundSensor.watch()
			

        }

        if (testOptions.dhtDigital) {
          var dhtSensor = new DHTDigitalSensor(2, DHTDigitalSensor.VERSION.DHT11, DHTDigitalSensor.CELSIUS)
          // Digital Port 2
          // DHT Sensor
          console.log('DHT Digital Sensor (start watch)')
          dhtSensor.on('change', function (res) {
            console.log('DHT onChange value=' + res)
				temperature.push(res);
				var jsontemperature = JSON.stringify(temperature);
				fs.writeFile("./temperature.json", jsontemperature , (err) => {
					if (err) {
						console.error(err);
						return;
					};
				});
          })
          dhtSensor.watch(500) // milliseconds
        }
	  } else {
		console.log('TEST CANNOT START')
	  }
	}
  })
  board.init()
}

function readUVbatchValues(sensor, sum, curIter, nbIter) {
	var value=sensor.read();
        sum+=value;
        console.log(`val: ${value} \ iter: ${curIter}`);
	if(curIter < nbIter) {
		curIter++;
       		setTimeout(readUVbatchValues.bind(null, sensor, sum, curIter, nbIter), 200);
	} else {
		printUVResult(sum, nbIter);	
	}
}

function printUVResult(res, samples) {
	var meanVal = res/samples;  // get mean value
    	console.log("The current UV index is:");
    	console.log((meanVal*1000/4.3-83)/21);// get a detailed calculating expression for UV index in schematic files.
}

function loudnessSensorGetAvgMax(loudnessSensor) {
  var res = loudnessSensor.readAvgMax()
  LoudnessAnalogSensorValue = ""+res.avg;
  console.log('Loudness avg value=' + res.avg + ' and max value=' + res.max)
}

function dustSensorGetAvgMax(dustSensor) {
  var res = dustSensor.readAvgMax()
  //avg and max will be the same in this test
  //since we're gathering them over 30 seconds
  //but that's the same pediod this loop runs
  console.log('Dust avg value=' + res.avg + ' and max value=' + res.max)
}

function customAccelerationReading() {
  var write = board.writeBytes(Commands.acc_xyz.concat([Commands.unused, Commands.unused, Commands.unused]))
  if (write) {
    board.wait(100)
    board.readByte()
    var bytes = board.readBytes()
    if (bytes instanceof Buffer) {
      var x = bytes[1] > 32 ? -(bytes[1] - 224) : bytes[1]
      var y = bytes[2] > 32 ? -(bytes[2] - 224) : bytes[2]
      var z = bytes[3] > 32 ? -(bytes[3] - 224) : bytes[3]
      return [x, y, z]
    } else {
      return false
    }
  } else {
    return false
  }
}

function onExit(err) {
  console.log('ending')
  board.close()
  process.removeAllListeners()
  process.exit()
  if (typeof err != 'undefined')
    console.log(err)
}

// starts the test
start()
// catches ctrl+c event
process.on('SIGINT', onExit)
