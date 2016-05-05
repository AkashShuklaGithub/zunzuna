'use strict'

var events = require('events');
var https = require('https');
var math = require('mathjs');
var moment = require('moment');
var poll = require('./poll.js');
var Q = require('q');
var request = require('request');

moment().format();

/*
 * Assume that the maximum deviation of driving times at any time of the day is 60 mins.
 * That means, if it takes 40 mins to drive from Koramangala to Hebbal now, it is assumed
 * that it's not more than 100 mins at any time of the day.
 */
const maxDeviationToTravelTime = 60;

/**
 * Addon time to tavel time + uber waiting time
 */
const maxBufferTime = 10;

/**
 * Assume that the maximum waiting time for uber at any time of the day is 60 mins.
 */
const maxWaitingTime = 20;

/**
 * Determine time to start uber polling from uber api.
 * startUberPolling (in mimuntes) is subtracted from ideal notification time during initialization of request.
 */
const startUberPolling = 10;

/**
 * Time (in minutes) interval to update uber cab avaibility
 */
const pollingInterval = 2;

const stopGooglePolling = 5;

const REFRESH_INTERVAL = 10000;

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
if (!GOOGLE_API_KEY) {
    throw new Error('missing GOOGLE_API_KEY');
}

const UBER_API_KEY = process.env.UBER_API_KEY;
if (!UBER_API_KEY) {
    throw new Error('missing UBER_API_KEY');
}

// set to true to enable logging
const debug = false;


function validateEvent(event) {
    if (typeof event !== 'object') {
        throw new Error("Event must be an object");
    }
    if (!event.id) {
        throw new Error("The event 'id' is missing.");
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


function logEvent(event, type) {
    if (debug)
        console.log("=> (" + type + ") " +
            " id: " + event.id +
            ", currentTime: " + moment().format("HH:mm") +
            ", notificationTime: " + moment(event.notificationTime).format("HH:mm") +
            ", startTravelAt: " + moment(event.startTravelAt).format("HH:mm") +
            ", updateTravelTimeAt: " + moment(event.updateTravelTimeAt).format("HH:mm") +
            ", updateWaitingTimeAt: " + moment(event.updateWaitingTimeAt).format("HH:mm") +
            ", waitingTme: " + event.waitingTime +
            ", travelTime: " + event.travelTime +
            ", source: " + event.source.formatted_address +
            ", destination: " + event.destination.formatted_address
        );
};

function logger(msg) {
    if (debug)
        console.log(msg);
};

function getMaxTravelTime(travelTime) {
    const maxTravelTime = math.add(travelTime, maxDeviationToTravelTime);
    return maxTravelTime;
};

function getGoogleGeocodeEndPoint(address) {
    return "https://maps.googleapis.com/maps/api/geocode/json?address=" + address.toString() + "&key=" + GOOGLE_API_KEY;
};

function getGoogleApiEndPoint(source, destination) {
    return "https://maps.googleapis.com/maps/api/distancematrix/json?origins=" + source.toString() + "&destinations=" + destination.toString() + "&key=" + GOOGLE_API_KEY;
};

function getUberApiEndPoint(source) {
    // source : latitude, longitude
    source = source.split(',');
    return "https://api.uber.com/v1/estimates/time?server_token=" + UBER_API_KEY + "&start_latitude=" + source[0] + "&start_longitude=" + source[1];
};

function getCoordinates(location) {
    var deffered = Q.defer();
    logger('|=> Retrieving coordinates from Human Redable Address');
    request(getGoogleGeocodeEndPoint(location), function(error, response, data) {
        if (!error && response.statusCode == 200) {
            deffered.resolve(parseGoogleGeocodeEndPoint(data));
        } else {
            logger("Error occured : < Google Geocode Api > " + error.message);
            deffered.reject(" Error occured while retrive coordinate from google api at " + new Date());
        }
    });
    return deffered.promise;
};


function parseGoogleGeocodeEndPoint(data) {
    let content = JSON.parse(data);
    content = content.results.map(function(address) {
        const location = address.geometry.location;
        return {
            formatted_address: address.formatted_address,
            location: location.lat + ", " + location.lng
        };
    });
    // logger(content);
    return content;
};

/*
 * Description parse data from google distance matix
 * @return time in minutes
 */
function parseGoogleDistanceMatixData(data) {
    var data = JSON.parse(data);
    return Math.round(math.divide(data.rows[0].elements[0].duration.value, 60));
};

/*
 * @return time in minutes
 */
function parseUberTimeDate(data) {
    var data = JSON.parse(data);
    var newData = data.times.map(function(cab) {
        if (cab.display_name === "uberGO")
            return cab.estimate;
    }).filter(function(element) {
        return element != undefined;
    });
    var minTimeForCab = newData.length > 0 ? Math.round(math.divide(newData[0], 60)) : maxWaitingTime;
    logger("|==> minTimeForCab : " + minTimeForCab + " mins");
    return minTimeForCab;
}

/**
 * @return the travel time to destination in minutes (as a promise)
 */
function getTravelTime(source, destination) {
    var deffered = Q.defer();
    logger('|=> starting to fetch Travel time (GOOGLE) at ' + new Date());
    request(getGoogleApiEndPoint(source, destination), function(error, response, data) {
        if (!error && response.statusCode == 200) {
            deffered.resolve(parseGoogleDistanceMatixData(data));
        } else {
            logger("Error occured : < Google Api > " + error.message);
            deffered.reject(" Error occured while retrive distance from google api at " + new Date());
        }
    });
    return deffered.promise;
};


//GET /v1/estimate/time
function getWaitingTime(source) {
    var deffered = Q.defer();
    logger('|=> starting to fetch Uber waiting time (UBER) at ' + new Date());
    request(getUberApiEndPoint(source), function(error, response, data) {
        if (!error && response.statusCode == 200) {
            deffered.resolve(parseUberTimeDate(data));
        } else {
            logger("Error occured : < UBER Api > " + error.message);
            deffered.reject(" Error occured while retrive estimate time from uber api at " + new Date());
        }
    })
    return deffered.promise;
};

function updateNotificationTime(startTravelAt, travelTime, waitingTime) {
    const notificationTime = moment(startTravelAt).subtract(maxBufferTime, "minutes").subtract(waitingTime, "minutes").subtract(travelTime, "minutes");
    logger("|=> notificationTime : " + moment(notificationTime).format("HH:mm"));
    return notificationTime;
};

function updateTravelTimeAt(startTravelAt, travelTime) {
    const maxTravelTime = getMaxTravelTime(travelTime);
    const updateTravelTimeAt = moment(startTravelAt).subtract(maxBufferTime, "minutes").subtract(maxWaitingTime, "minutes").subtract(maxTravelTime, "minutes");
    logger("|=> updateTravelTimeAt : " + moment(updateTravelTimeAt).format("HH:mm"));
    logger(" |=> maxTravelTime : " + maxTravelTime + " mins");
    return updateTravelTimeAt;
};

function addEvent(id, source, destination, startTravelAt, email, notificationTime, travelTime, updateTravelTimeAt, updateWaitingTimeAt) {
    const event = {
        destination: destination,
        email: email,
        id: id,
        notificationTime: notificationTime,
        requestedAt: moment(),
        source: source,
        startTravelAt: startTravelAt,
        travelTime: travelTime,
        updateTravelTimeAt: updateTravelTimeAt,
        updateWaitingTimeAt: updateWaitingTimeAt,
        waitingTime: maxWaitingTime
    };
    logEvent(event, "create");
    return event;
};

/**
 * setup reminder request
 * @params source, destination, startTravelAt, email
 * @see #maxDeviationToTravelTime
 */
function create(id, source, destination, startTravelAt, email) {
    logger("=> create()");
    // get the source and destination logitude and latitude
    return getCoordinates(source).then(function(source) {
        return [source, getCoordinates(destination)];
    }).spread(function(source, destination) {
        return getTravelTime(source[0].location, destination[0].location).then(function(travelTime) {

            // for the first time we will use maxWaitingTime to calculate notificationTime
            const notificationTime = updateNotificationTime(startTravelAt, travelTime, maxWaitingTime);
            const updateTravelTime = updateTravelTimeAt(startTravelAt, travelTime);

            // set the initial time to trigger uber api polling
            const updateWaitingTimeAt = moment(notificationTime).subtract(startUberPolling, "minutes");
            return addEvent(id, source[0], destination[0], startTravelAt, email, notificationTime, travelTime, updateTravelTime, updateWaitingTimeAt)
        });
    });
};

function updateTravelTime(event) {
    logger("=> updateTravelTimeAt()");
    return getTravelTime(event.source.location, event.destination.location).then(function(travelTime) {
        event.travelTime = travelTime;
        event.notificationTime = updateNotificationTime(event.startTravelAt, travelTime, event.waitingTime);
        event.updateTravelTimeAt = poll.heuristicPollingAt(event.notificationTime, stopGooglePolling);

        logger("|=> updateTravelTimeAt : " + moment(event.updateTravelTimeAt).format("HH:mm"));

        return event;
    });
};

function updateWaitingTime(event) {
    return getWaitingTime(event.source.location).then(function(waitingTime) {
        event.waitingTime = waitingTime;
        event.updateWaitingTimeAt = poll.intervalPollingAt(pollingInterval);
        event.notificationTime = updateNotificationTime(event.startTravelAt, event.travelTime, waitingTime);

        logger("|=> updateWaitingTimeAt : " + moment(event.updateWaitingTimeAt).format("HH:mm"));

        return event;
    });
};

function zunzuna() {
    // todo track events 

    events.EventEmitter.call(this);

    this.createEvent = (event) => {
         var self = this;
        event = validateEvent(event);
        const eventid = event.id;
        event = create(event.id, event.source, event.destination, event.time, event.emailid).then(function(event){
            self.emit("details", {
                eventid:eventid,
                event:event,
                msg : "Reminder set! :)"
            });
            return event;
        });
       
        // set the interval
        var refreshInterval = setInterval(function() {
            event.then(function(event) {
                try {
                    if (moment(event.updateTravelTimeAt).isBefore(moment(), 'minute')) {
                        logEvent(event, " Google ");
                        event = updateTravelTime(event);
                    } else {
                        if (debug)
                            process.stdout.write("g")
                    }
                    return event;
                } catch (e) {
                    logger("Error Occured: " + e.message);
                }
            }).then(function(event) {
                try {
                    if (moment(event.updateWaitingTimeAt).isBefore(moment(), 'minute')) {
                        logEvent(event, " Uber ");
                        event = updateWaitingTime(event);
                    } else {
                        if (debug)
                            process.stdout.write("u")
                    }
                    return event;
                } catch (e) {
                    logger("Error Occured: " + e.message);
                }
            }).then(function(event) {
                if (moment(event.notificationTime).isBefore(moment(), 'minute')) {
                    logger("====================================")
                    logger("=> notificationTime: " + moment(event.notificationTime).format("HH:mm:ss") + ", currentTime: " + moment().format("HH:mm:ss"));
                    clearInterval(refreshInterval);
                    self.emit("notify", {
                        eventid: eventid,
			event: event,	
                        msg: "Time to Book Uber!"
                    });
                    logger("====================================")
                }
            }).fail(function() {
                clearInterval(refreshInterval);
                logger("=> Event is failed. Try Again.");
                self.emit("notify", {
                    eventid: eventid,
                    msg: "Failed to set the reminder! Try again. :("
                });
            }).done();
        }, REFRESH_INTERVAL);
    }
};

zunzuna.prototype.__proto__ = events.EventEmitter.prototype;

module.exports = zunzuna;
