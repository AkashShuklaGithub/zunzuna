var algo = require('./lib/algo');
var moment = require('moment');

moment().format();

function createEvent(event) {
    var event = algo.init(event.source, event.destination, event.time, event.emailid);

    // set the interval
    var refreshInterval = setInterval(function() {
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
            clearInterval(refreshInterval);
            console.log("Event is failed. Try Again.");
        }).done();
    }, 10000);
}


var log = function(event, type) {
    process.stdout.write("\n")
    console.log(type + " ==>  updateTravelTimeAt: " + moment(event.updateTravelTimeAt).format("HH:mm:ss") + " updateWaitingTimeAt: " + moment(event.updateWaitingTimeAt).format("HH:mm:ss") + " waitingTime: " + event.waitingTime + ", currentTime: " + moment().format("HH:mm:ss") + ", notificationTime: " + moment(event.notificationTime).format("HH:mm:ss") + ", startTravelAt: " + moment(event.startTravelAt).format("HH:mm:ss") + ", requestedAt: " + moment(event.requestedAt).format("HH:mm:ss"));
}

module.exports = {
    createEvent: createEvent
};