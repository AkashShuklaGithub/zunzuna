var algo = require('./algo');
var moment = require('moment');
var util = require('util')
moment().format();

var event = algo.init("Propulsive Pride+Bengaluru", "Ecoworld+Bengaluru", moment().add(30, "minutes"), "awachat11vaibhav@gmail.com")

event.then(function(event){ 
	setInterval(function() {
		if( event.updateTravelTimeAt === moment())
			algo.getTravelTimeAt(event);
		else
			algo.getTravelTimeAt(event);
	}, 5000);
}).done();



// setInterval(function() {
// 	if( event.notificationTime === moment().format("HH:mm") )
// 		console.log("send notification")
// 	else
// 		console.log("No Notification Action!")
// }, 3000);