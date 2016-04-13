var algo = require('./algo');
var util = require('util');
var Q = require('q');
var moment = require('moment');
moment().format();

var event = algo.init("12.920397, 77.685605", "12.915002, 77.663941", moment().add(120, "minutes"), "awachat11vaibhav@gmail.com");

event.then(function(event) {
    if (moment(event.updateTravelTimeAt).isBefore(moment(), 'minute')) {
        log(event, " Google ");
        event = algo.updateEvent(event);
    } else {
        process.stdout.write("g")
    }
    return event;
}).then(function(event) {
    if (moment(event.updateWaitingTimeAt).isBefore(moment(), 'minute')) {
        log(event, " Uber ");
        event = algo.updateEventWithUber(event);
    } else {
        process.stdout.write("u")
    }
    return event;
}).then(function(event) {
    if (moment(event.notificationTime).isBefore(moment(), 'minute')) {
        console.log("====================================")
        console.log("|==> notificationTime: " + moment(event.notificationTime).format("HH:mm:ss") + ", currentTime: " + moment().format("HH:mm:ss"));
        algo.sendNotification(event.email);
        clearInterval(refreshInterval);
        console.log("====================================")
    }
}).fail(function() {
    console.log("Failed. Try Again.")
    process.exit(1);
}).done();
}, 10000);

var log = function(event, type) {
    process.stdout.write("\n")
    console.log(type + " ==>  updateTravelTimeAt: " + moment(event.updateTravelTimeAt).format("HH:mm:ss") + " updateWaitingTimeAt: " + moment(event.updateWaitingTimeAt).format("HH:mm:ss") + " waitingTime: " + event.waitingTime + ", currentTime: " + moment().format("HH:mm:ss") + ", notificationTime: " + moment(event.notificationTime).format("HH:mm:ss") + ", startTravelAt: " + moment(event.startTravelAt).format("HH:mm:ss") + ", requestedAt: " + moment(event.requestedAt).format("HH:mm:ss"));
}