var algo = require('./algo');
var util = require('util');
var Q = require('q');
var moment = require('moment');
moment().format();

var event = algo.init("12.920397, 77.685605", "12.915002, 77.663941", moment().add(120, "minutes"), "awachat11vaibhav@gmail.com")
// algo.getTravelTime("12.920397, 77.685605", "12.915002, 77.663941");
// algo.getWaitingTime("12.920397,77.685605");
refreshInterval = setInterval(function() {
	event.then(function(event){
		if(moment(event.updateTravelTimeAt).isBefore(moment())){
			console.log("Google ==>  updateTravelTimeAt: " + moment(event.updateTravelTimeAt).format("HH:mm")+ " updateWaitingTimeAt: " + moment(event.updateWaitingTimeAt).format("HH:mm") + " waitingTime: " + event.waitingTime + ", currentTime: " +  moment().format("HH:mm") + ", notificationTime: " + moment(event.notificationTime).format("HH:mm") + ", startTravelAt: " + moment(event.startTravelAt).format("HH:mm")+ ", requestedAt: " + moment(event.requestedAt).format("HH:mm"));
			event = algo.updateEvent(event);
		}
		else{
			process.stdout.write("g")
		}
		return event;
	}).then(function(event) {
		if(moment(event.updateWaitingTimeAt).isBefore(moment())){
			console.log("Google ==>  updateTravelTimeAt: " + moment(event.updateTravelTimeAt).format("HH:mm")+ " updateWaitingTimeAt: " + moment(event.updateWaitingTimeAt).format("HH:mm") + " waitingTime: " + event.waitingTime + ", currentTime: " +  moment().format("HH:mm") + ", notificationTime: " + moment(event.notificationTime).format("HH:mm") + ", startTravelAt: " + moment(event.startTravelAt).format("HH:mm")+ ", requestedAt: " + moment(event.requestedAt).format("HH:mm"));
			event = algo.updateEventWithUber(event);
		}
		else{
			process.stdout.write("u")
		}
		return event;
	}).then(function(event){
		if( moment(event.notificationTime).isBefore(moment())){
			console.log("====================================")
			console.log("|==> notificationTime: " + moment(event.notificationTime).format("HH:mm") + ", currentTime: " + moment().format("HH:mm"));
			algo.sendNotification(event.email);
			clearInterval(refreshInterval);
			console.log("====================================")
		}
	}).done();
}, 10000);

