var math = require('mathjs');
var util = require('util');
var request = require('request');
var Q = require('q');
var poll = require('./poll.js');
var moment = require('moment');
var querystring = require('querystring');
moment().format();

module.exports = {

	/*
	* Assume that the maximum deviation of driving times at any time of the day is 60 mins.
	* That means, if it takes 40 mins to drive from Koramangala to Hebbal now, it is assumed
	* that it's not more than 100 mins at any time of the day.
	*/
	maxDeviationToTravelTime : function() { return 20; },
	maxBufferTime : function() { return 10; },
	maxWaitingTime : function() { return 20; },
	googleApiKey : function() { return "AIzaSyB6ky0s6kmaxH15hsxsNHKuZeI6n_OG2eA"; },
	uberApiKey: function() { return "BPehDhjfmMaomcn2ZbnWuyaqRzrZoTS1ezAMlZs1"},
	startUberPolling : function(){ return 10 },
	/*
	* @description calculate notification time based on the alogrithm defined in algo module
	* @return some timestamp when to notify the user
	*/

	init : function(source, destination, startTravelAt, email){
		//var travelTime = this.getTravelTime(source, destination);
		/*
		* @params travelTime from source to destination when the request was made/ event was created
		* @return travelTime + maxDeviationToTravelTime
		*/
		var deffered = Q.defer();
		var maxDeviationToTravelTime  = this.maxDeviationToTravelTime();
		var maxBufferTime = this.maxBufferTime();
		var maxWaitingTime = this.maxWaitingTime();

		var addEvent = function(source, destination, startTravelAt, email, notificationTime, travelTime, updateTravelTimeAt, updateWaitingTimeAt){
			var event = {
				source: source,
				destination: destination,
				startTravelAt: startTravelAt,
				email: email,
				requestedAt: moment(),
				notificationTime: notificationTime,
				travelTime : travelTime,
				waitingTime: maxWaitingTime,
				updateTravelTimeAt : updateTravelTimeAt,
				updateWaitingTimeAt: updateWaitingTimeAt
			};
			console.log("Google ==>  updateTravelTimeAt: " + moment(event.updateTravelTimeAt).format("HH:mm")+ " updateWaitingTimeAt: " + moment(event.updateWaitingTimeAt).format("HH:mm") + " waitingTme: " + event.waitingTime + ", currentTime: " +  moment().format("HH:mm") + ", notificationTime: " + moment(event.notificationTime).format("HH:mm") + ", startTravelAt: " + moment(event.startTravelAt).format("HH:mm")+ ", requestedAt: " + moment(event.requestedAt).format("HH:mm"));
			return event;
		}
		var getMaxTravelTime = function(travelTime){
			var maxTravelTime = math.add(travelTime, maxDeviationToTravelTime);
			console.log("|==> maxTravelTime : " + maxTravelTime + " mins");
			return maxTravelTime;
		}

		var updateTravelTimeAt = function(travelTime){
			var deffered = Q.defer();
			var maxTravelTime = getMaxTravelTime(travelTime);
			var updateTravelTimeAt = moment(startTravelAt).subtract(maxBufferTime, "minutes").subtract(maxWaitingTime, "minutes").subtract(maxTravelTime, "minutes");
			// console.log("|==> updateTravelTimeAt : " + (updateTravelTimeAt).format("HH:mm"));
			deffered.resolve(updateTravelTimeAt);
			return deffered.promise;
		};

		var notificationTime = function(travelTime){
			var deffered = Q.defer();
			// for the first time we will use maxWaitingTime
			var notificationTime = moment(startTravelAt).subtract(maxBufferTime, "minutes").subtract(maxWaitingTime, "minutes").subtract(travelTime, "minutes");
			// console.log("|==> notificationTime : " + moment(notificationTime).format("HH:mm"));
			deffered.resolve(notificationTime);
			return deffered.promise;
		};
		that = this;
		deffered.resolve(this.getTravelTime(source, destination).then(function(travelTime) {
			return Q.all([updateTravelTimeAt(travelTime), notificationTime(travelTime)]).spread(function(updateTravelTimeAt, notificationTime){
				// set the initial time to trigger uber api polling
				updateWaitingTimeAt = moment(notificationTime).subtract(that.startUberPolling(), "minutes");
				return addEvent(source, destination, startTravelAt, email, notificationTime, travelTime, updateTravelTimeAt, updateWaitingTimeAt)
			});
		}));
		return deffered.promise;
	},

	updateEvent: function(event){
		var maxBufferTime = this.maxBufferTime();
		var notificationTime = function(travelTime){
			var notificationTime = moment(event.startTravelAt).subtract(maxBufferTime, "minutes").subtract(event.waitingTime,"minutes").subtract(travelTime, "minutes");
			console.log("|==> updateEvent()-> notificationTime : " + moment(notificationTime).format("HH:mm"));
			return notificationTime;
		}
		that = this;
		return this.getTravelTime(event.source, event.destination).then(function(travelTime){
			event.travelTime = travelTime;
			event.notificationTime = notificationTime(travelTime);
			event.updateTravelTimeAt = poll.heuristicPollingAt(event.notificationTime, 5);
			return event;		
		});
	},

	updateEventWithUber: function(event){
		var maxBufferTime = this.maxBufferTime();

		var notificationTime = function(waitingTime){
			var notificationTime = moment(event.startTravelAt).subtract(maxBufferTime, "minutes").subtract(waitingTime,"minutes").subtract(event.travelTime, "minutes");
			console.log("|==> updateEventWithUber()-> notificationTime : " + moment(notificationTime).format("HH:mm"));
			return notificationTime;
		}
		that = this;
		return this.getWaitingTime(event.source).then(function(waitingTime){
			event.waitingTime = waitingTime;
			event.updateWaitingTimeAt = poll.intervalPollingAt(2);
			console.log("|==> updateEventWithUber()-> updateWaitingTimeAt : " + moment(event.updateWaitingTimeAt).format("HH:mm"));
			event.notificationTime = notificationTime(waitingTime);
			return event;		
		});
	},

	prettyprint: function(event){
		event.requestedAt = moment(event.requestedAt).format("HH:mm");
		event.notificationTime = moment(event.notificationTime.value).format("HH:mm");
		event.startTravelAt = moment(event.startTravelAt).format("HH:mm");
		event.updateTravelTimeAt = moment(event.updateTravelTimeAt).format("HH:mm");
		console.log(util.inspect(event, false, null));
	},

	getClosedFibonaciiNumber: function(number){
		fibonacciNumbersArray = [1,2,3,5,8,13,21,43,55,89,144,233,377,610,987,1597];
		var current = fibonacciNumbersArray[0];
		var difference = Math.abs(number - current);
		var index = fibonacciNumbersArray.length;
		while (index--) {
			var newDifference = Math.abs(number - fibonacciNumbersArray[index]);
			if (newDifference < difference) {
				difference = newDifference;
				current = fibonacciNumbersArray[index];
			}
		}
		return current;
	},

	getGoogleApiEndPoint: function(source, destination){
		return "https://maps.googleapis.com/maps/api/distancematrix/json?origins=" + source.toString() + "&destinations=" + destination.toString() + "&key=" + this.googleApiKey();
	},

	/*
	* @return the travel time to destination in minutes (as a promise)
	*/
	getTravelTime: function(source, destination){
		var deffered = Q.defer();
		that = this;
		console.log('|==> starting to fetch Travel time (GOOGLE) at ' + new Date());
		request(this.getGoogleApiEndPoint(source, destination), function (error, response, data) {
			if (!error && response.statusCode == 200) {
				// console.log("Data Fetched from google: " + data.toString())
				deffered.resolve(that.parseGoogleDistanceMatixData(data));
			}
			else{
				console.log(error)
				deffered.reject(" Error occured while retrive distance from google api at " + new Date());
			}
		})
		return deffered.promise;
	},

	/*
	* @return time in minutes
	*/
	parseGoogleDistanceMatixData : function(data){
		data = JSON.parse(data);
		return Math.round(math.divide(data.rows[0].elements[0].duration.value, 60));
	},

	getUberApiEndPoint: function(source){
		return "https://api.uber.com/v1/estimates/time?server_token=" + this.uberApiKey() + "&start_latitude="+ source[0] + "&start_longitude=" + source[1];
	},

	//GET /v1/estimate/time

	getWaitingTime: function(source){
		var deffered = Q.defer();
		console.log('|==> starting to fetch Uber waiting time (UBER) at ' + new Date());
		that = this;
		request(this.getUberApiEndPoint(source.split(',')), function (error, response, data) {
			if (!error && response.statusCode == 200) {
				// console.log("Data Fetched from Uber: " + data.toString())
				deffered.resolve(that.parseUberTimeDate(data));
			}
			else{
				console.log(error)
				deffered.reject(" Error occured while retrive estimate time from uber api at " + new Date());
			}
		})
		return deffered.promise;
	},
	/*
	* @return time in minutes
	*/
	parseUberTimeDate : function(data){
		data = JSON.parse(data);
		newData = data.times.map(function(cab){
			if(cab.display_name === "uberGO")
				return cab.estimate;
		}).filter(function(element){
			return element != undefined;
		});
		// console.log(newData);
		minTimeForCab = newData.length > 0 ? Math.round(math.divide(newData[0],60)) : this.maxWaitingTime();
		console.log("|==> minTimeForCab : " + minTimeForCab + " mins");
		return minTimeForCab;
	},

	sendNotification: function(email){
		console.log("|==> Email sent to " + email);
		return true;
	}
}