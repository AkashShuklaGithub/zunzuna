'user strict'

var algo = require('./lib/algo');
var moment = require('moment');
var events = require('events');

moment().format();

const debug = true;
const REFRESH_INTERVAL = 10000;
const validateEvent = (event) => {
    if (typeof event !== 'object') {
        throw new Error("Event must be an object");
    }
    if (!event.source) {
        throw new Error("The 'source' is missing.");
    }
    if (!event.destination) {
        throw new Error("The 'destination' is missing.");
    }
    if (!event.time) {
        throw new Error("The 'time' is missing.");
    }
    if (!event.emailid) {
        event.emailid = null;
    }
    return event;
};

const zunzuna = function() {
    // todo List of subscribers
    // let subscribers = [{subcriberid: ##, eventid:##}];
    events.EventEmitter.call(this);

    this.createEvent = (event) => {
        var event = validateEvent(event);
        event = algo.init(event.source, event.destination, event.time, event.emailid);
        var self = this;
        // set the interval
        var refreshInterval = setInterval(function() {
            event.then(function(event) {
                if (moment(event.updateTravelTimeAt).isBefore(moment(), 'minute')) {
                    log(event, " Google ");
                    event = algo.updateEvent(event);
                } else {
                    if (debug)
                        process.stdout.write("g")
                }
                return event;
            }).then(function(event) {
                if (moment(event.updateWaitingTimeAt).isBefore(moment(), 'minute')) {
                    log(event, " Uber ");
                    event = algo.updateEventWithUber(event);
                } else {
                    if (debug)
                        process.stdout.write("u")
                }
                return event;
            }).then(function(event) {
                if (moment(event.notificationTime).isBefore(moment(), 'minute')) {
                    algo.log("====================================")
                    algo.log("|==> notificationTime: " + moment(event.notificationTime).format("HH:mm:ss") + ", currentTime: " + moment().format("HH:mm:ss"));
                    clearInterval(refreshInterval);
                    self.emit("remind", "Time to Book Uber!");
                    algo.log("====================================")
                }
            }).fail(function() {
                clearInterval(refreshInterval);
                algo.log("Event is failed. Try Again.");
            }).done();
        }, REFRESH_INTERVAL);
    }
}

zunzuna.prototype.__proto__ = events.EventEmitter.prototype;


var log = function(event, type) {
    process.stdout.write("\n")
    algo.log(type + " ==>  updateTravelTimeAt: " + moment(event.updateTravelTimeAt).format("HH:mm:ss") + " updateWaitingTimeAt: " + moment(event.updateWaitingTimeAt).format("HH:mm:ss") + " waitingTime: " + event.waitingTime + ", currentTime: " + moment().format("HH:mm:ss") + ", notificationTime: " + moment(event.notificationTime).format("HH:mm:ss") + ", startTravelAt: " + moment(event.startTravelAt).format("HH:mm:ss") + ", requestedAt: " + moment(event.requestedAt).format("HH:mm:ss"));
}

module.exports = {
    zunzuna: zunzuna
};