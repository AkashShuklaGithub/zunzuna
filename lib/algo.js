'use strict'

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

//replace with google distance matric api key
const googleApiKey = "update your api key here";
// replace with uber server_token
const uberApiKey = "update your api key here";

// set to false to disable logging
var debug = true;

function logEvent(event) {
    if (debug)
        console.log("Init ==>  updateTravelTimeAt: " + moment(event.updateTravelTimeAt).format("HH:mm") + " updateWaitingTimeAt: " + moment(event.updateWaitingTimeAt).format("HH:mm") + " waitingTme: " + event.waitingTime + ", currentTime: " + moment().format("HH:mm") + ", notificationTime: " + moment(event.notificationTime).format("HH:mm") + ", startTravelAt: " + moment(event.startTravelAt).format("HH:mm") + ", requestedAt: " + moment(event.requestedAt).format("HH:mm"));
};

function logger(msg) {
    if (debug)
        console.log(msg);
};

function getMaxTravelTime(travelTime) {
    var maxTravelTime = math.add(travelTime, maxDeviationToTravelTime);
    logger("|==> maxTravelTime : " + maxTravelTime + " mins");
    return maxTravelTime;
};

function getGoogleApiEndPoint(source, destination) {
    return "https://maps.googleapis.com/maps/api/distancematrix/json?origins=" + source.toString() + "&destinations=" + destination.toString() + "&key=" + googleApiKey;
};

function getUberApiEndPoint(source) {
    return "https://api.uber.com/v1/estimates/time?server_token=" + uberApiKey + "&start_latitude=" + source[0] + "&start_longitude=" + source[1];
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
    // logger(newData);
    var minTimeForCab = newData.length > 0 ? Math.round(math.divide(newData[0], 60)) : maxWaitingTime;
    logger("|==> minTimeForCab : " + minTimeForCab + " mins");
    return minTimeForCab;
}

/**
 * @return the travel time to destination in minutes (as a promise)
 */
function getTravelTime(source, destination) {
    var deffered = Q.defer();
    logger('|==> starting to fetch Travel time (GOOGLE) at ' + new Date());
    request(getGoogleApiEndPoint(source, destination), function(error, response, data) {
        if (!error && response.statusCode == 200) {
            deffered.resolve(parseGoogleDistanceMatixData(data));
        } else {
            console.log("Error occured : < Google Api > " + error.message);
            deffered.reject(" Error occured while retrive distance from google api at " + new Date());
        }
    });
    return deffered.promise;
};


//GET /v1/estimate/time

function getWaitingTime(source) {
    var deffered = Q.defer();
    logger('|==> starting to fetch Uber waiting time (UBER) at ' + new Date());
    request(getUberApiEndPoint(source.split(',')), function(error, response, data) {
        if (!error && response.statusCode == 200) {
            // logger("Data Fetched from Uber: " + data.toString())
            deffered.resolve(parseUberTimeDate(data));
        } else {
            console.log("Error occured : < UBER Api > " + error.message);
            deffered.reject(" Error occured while retrive estimate time from uber api at " + new Date());
        }
    })
    return deffered.promise;
};
/**
 * setup reminder request
 * @params source, destination, startTravelAt, email
 * @see #maxDeviationToTravelTime
 */
function init(source, destination, startTravelAt, email) {

    var addEvent = function(source, destination, startTravelAt, email, notificationTime, travelTime, updateTravelTimeAt, updateWaitingTimeAt) {
        var event = {
            destination: destination,
            email: email,
            notificationTime: notificationTime,
            requestedAt: moment(),
            source: source,
            startTravelAt: startTravelAt,
            travelTime: travelTime,
            updateTravelTimeAt: updateTravelTimeAt,
            updateWaitingTimeAt: updateWaitingTimeAt,
            waitingTime: maxWaitingTime
        };
        logEvent(event);
        return event;
    }

    var updateTravelTimeAt = function(travelTime) {
        var maxTravelTime = getMaxTravelTime(travelTime);
        var updateTravelTimeAt = moment(startTravelAt).subtract(maxBufferTime, "minutes").subtract(maxWaitingTime, "minutes").subtract(maxTravelTime, "minutes");
        return updateTravelTimeAt;
    };

    var updateNotificationTime = function(travelTime) {
        // for the first time we will use maxWaitingTime
        var notificationTime = moment(startTravelAt).subtract(maxBufferTime, "minutes").subtract(maxWaitingTime, "minutes").subtract(travelTime, "minutes");
        return notificationTime;
    };

    return getTravelTime(source, destination).then(function(travelTime) {
        var notificationTime = updateNotificationTime(travelTime);
        var updateTravelTime = updateTravelTimeAt(travelTime);
        // set the initial time to trigger uber api polling
        var updateWaitingTimeAt = moment(notificationTime).subtract(startUberPolling, "minutes");
        return addEvent(source, destination, startTravelAt, email, notificationTime, travelTime, updateTravelTime, updateWaitingTimeAt)
    });
};

function updateTravelTime(event) {
    var notificationTime = function(travelTime) {
        var notificationTime = moment(event.startTravelAt).subtract(maxBufferTime, "minutes").subtract(event.waitingTime, "minutes").subtract(travelTime, "minutes");
        logger("|==> Google updateEvent()-> notificationTime : " + moment(notificationTime).format("HH:mm"));
        return notificationTime;
    }
    return getTravelTime(event.source, event.destination).then(function(travelTime) {
        event.travelTime = travelTime;
        event.notificationTime = notificationTime(travelTime);
        event.updateTravelTimeAt = poll.heuristicPollingAt(event.notificationTime, 5);
        return event;
    });
};

function updateWaitingTime(event) {
    var notificationTime = function(waitingTime) {
        var notificationTime = moment(event.startTravelAt).subtract(maxBufferTime, "minutes").subtract(waitingTime, "minutes").subtract(event.travelTime, "minutes");
        logger("|==> updateEventWithUber()-> notificationTime : " + moment(notificationTime).format("HH:mm"));
        return notificationTime;
    }
    return getWaitingTime(event.source).then(function(waitingTime) {
        event.waitingTime = waitingTime;
        event.updateWaitingTimeAt = poll.intervalPollingAt(pollingInterval);
        logger("|==> updateEventWithUber()-> updateWaitingTimeAt : " + moment(event.updateWaitingTimeAt).format("HH:mm"));
        event.notificationTime = notificationTime(waitingTime);
        return event;
    });
};

function sendNotification(email) {
    logger("|==> Email sent to " + email);
    return true;
};

module.exports = {
    init: init,
    updateEvent: updateTravelTime,
    updateEventWithUber: updateWaitingTime,
    sendNotification: sendNotification
};