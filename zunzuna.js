var algo = require('./algo');
var moment = require('moment');
var util = require('util')
moment().format();

var event = algo.init("Propulsive Pride+Bengaluru", "Ecoworld+Bengaluru", moment().add(30, "minutes"), "awachat11vaibhav@gmail.com")

event.then(function(event){ 
	setInterval(function() {
		console.log("|==> updateTravelTimeAt: " + moment(event.updateTravelTimeAt).format("HH:mm") + ", currentTime: " +  moment().format("HH:mm") + ", notificationTime: " + moment(event.notificationTime).format("HH:mm") + ", travelStartTime: " + moment(event.travelStartTime).format("HH:mm")+ ", requestAtTime: " + moment(event.requestAtTime).format("HH:mm"))

		if( moment(event.updateTravelTimeAt).format("HH:mm") == moment().format("HH:mm")){
			console.log("I am here!!")
			event = algo.getTravelTimeAt(event);
		}
		if( moment(event.notificationTime).format("HH:mm") == moment().format("HH:mm")){
			console.log("====================================")

			console.log("|==> notificationTime: " + moment(event.notificationTime).format("HH:mm") + ", currentTime: " + moment().format("HH:mm"));
			// var event = null;
			// exit();

			console.log("|==> Notification will be send at this point of time");
			console.log("====================================")

		}
	}, 10000);
}).done();
