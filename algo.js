var math = require('mathjs');
var util = require('util');
var request = require('request');
var Q = require('q');
var moment = require('moment');
moment().format();

module.exports = {

	/*
	* Assume that the maximum deviation of driving times at any time of the day is 60 mins.
	* That means, if it takes 40 mins to drive from Koramangala to Hebbal now, it is assumed
	* that it's not more than 100 mins at any time of the day.
	*/
	maxDeviationToTravelTime : function() { return 60; },
	maxBufferTime : function() { return 10; },
	maxWaitingTime : function() { return 0; },
	googleApiKey : function() { return "AIzaSyB6ky0s6kmaxH15hsxsNHKuZeI6n_OG2eA"; },

	/*
	* @description calculate notification time based on the alogrithm defined in algo module
	* @return some timestamp when to notify the user
	*/

	init : function(source, destination, travelStartTime, email){
		//var travelTime = this.getTravelTime(source, destination);
		/*
		* @params travelTime from source to destination when the request was made/ event was created
		* @return travelTime + maxDeviationToTravelTime
		*/
		var maxDeviationToTravelTime  = this.maxDeviationToTravelTime();
		var maxBufferTime = this.maxBufferTime();
		var maxWaitingTime = this.maxWaitingTime();

		var addEvent = function(source, destination, travelStartTime, email, notificationTime, travelTime, updateTravelTimeAt){
			var event = {
				source: source,
				destination: destination,
				travelStartTime: travelStartTime.format("HH:mm"),
				email: email,
				requestAtTime: moment().format("HH:mm"),
				notificationTime: notificationTime,
				travelTime : travelTime,
				updateTravelTimeAt : updateTravelTimeAt
			};
			console.log("Event object created ==>");
			console.log(util.inspect(event, false, null));
			console.log("Event object Creation Complete");
			return event;
		}
		var getMaxTravelTime = function(travelTime){
			return math.add(travelTime, maxDeviationToTravelTime);
		}

		var updateTravelTimeAt = function(travelTime){
			var deffered = Q.defer();
			var maxTravelTime = getMaxTravelTime(travelTime);
			// deffered.resolve(math.chain(travelStartTime).subtract(maxBufferTime).subtract(maxWaitingTime).subtract(maxTravelTime));
			// console.log(moment(travelStartTime).subtract(maxBufferTime, "minutes"))
			deffered.resolve(moment(travelStartTime).subtract(maxBufferTime, "minutes").subtract(maxWaitingTime, "minutes").subtract(maxTravelTime, "minutes"));
			return deffered.promise;
		};
		var notificationTime = function(travelTime){
			var deffered = Q.defer();
			deffered.resolve(moment(travelStartTime).subtract(maxBufferTime, "minutes").subtract(maxWaitingTime, "minutes").subtract(travelTime, "minutes"));
			return deffered.promise;
		};

		var createEvent = this.getTravelTime(source, destination).then(function(travelTime) {
			return Q.all([updateTravelTimeAt(travelTime), notificationTime(travelTime)]).spread(function(updateTravelTimeAt, notifiactionTime){
				console.log("Event Initialization complete.");
				addEvent(source, destination, travelStartTime, email, notifiactionTime.format("HH:mm"), travelTime, updateTravelTimeAt.format("HH:mm"))
			});
		}).done();
	},

	/*
	* @return some timstamp when to fetch the travel time to reach destination
	*/
	getTravelTimeAt: function(){
		return "some text";
	},

	getGoogleApiEndPoint: function(source, destination){
		return "https://maps.googleapis.com/maps/api/distancematrix/json?origins=" + source.toString() + "&destinations=" + destination.toString() + "&key=" + this.googleApiKey();
	},

	/*
	* @return the travel time to destination in minutes (as a promise)
	*/
	getTravelTime: function(source, destination){
		var deffered = Q.defer();
		console.log('starting to fetch Travel time at ' + new Date());
		request(this.getGoogleApiEndPoint(source, destination), function (error, response, data) {
			if (!error && response.statusCode == 200) {
				//console.log("Data Fetched from google: " + data.toString())
				deffered.resolve(10);
			}
			else{
				deffered.reject(" Error occured while retrive distance from google api at " + new Date());
			}
		})
		return deffered.promise;
	},

	sendNotificationAt : function(){
		return "some text";
	},

	sendNotification: function(email){
		return true;
	}
}