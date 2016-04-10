var algo = require('./algo');
var util = require('util');
var Q = require('q');
var moment = require('moment');
moment().format();

var event = algo.init("Propulsive Pride+Bengaluru", "Ecoworld+Bengaluru", moment().add(30, "minutes"), "awachat11vaibhav@gmail.com")

refreshInterval = setInterval(function() {
	event.then(function(event){
		//console.log("||==> updateTravelTimeAt: " + moment(event.updateTravelTimeAt).format("HH:mm") + ", currentTime: " +  moment().format("HH:mm") + ", notificationTime: " + moment(event.notificationTime).format("HH:mm") + ", startTravelAt: " + moment(event.startTravelAt).format("HH:mm")+ ", requestedAt: " + moment(event.requestedAt).format("HH:mm"));

		if(moment(event.updateTravelTimeAt).format("HH:mm") == moment().format("HH:mm")){
			console.log("==>  updateTravelTimeAt: " + moment(event.updateTravelTimeAt).format("HH:mm") + ", currentTime: " +  moment().format("HH:mm") + ", notificationTime: " + moment(event.notificationTime).format("HH:mm") + ", startTravelAt: " + moment(event.startTravelAt).format("HH:mm")+ ", requestedAt: " + moment(event.requestedAt).format("HH:mm"));
			event = algo.updateEvent(event);
		}
		else{
			process.stdout.write("*")
			//console.log("|==> No api request")
		}
		return event;
	}).then(function(event){
		if( moment(event.notificationTime).format("HH:mm") == moment().format("HH:mm")){
			console.log("====================================")
			console.log("|==> notificationTime: " + moment(event.notificationTime).format("HH:mm") + ", currentTime: " + moment().format("HH:mm"));
			algo.sendNotification(event.email);
			clearInterval(refreshInterval);
			console.log("====================================")
		}
	}).done();
}, 10000);

