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
		var deffered = Q.defer();
		var maxDeviationToTravelTime  = this.maxDeviationToTravelTime();
		var maxBufferTime = this.maxBufferTime();
		var maxWaitingTime = this.maxWaitingTime();

		var addEvent = function(source, destination, travelStartTime, email, notificationTime, travelTime, updateTravelTimeAt){
			var event = {
				source: source,
				destination: destination,
				travelStartTime: travelStartTime,
				email: email,
				requestAtTime: moment(),
				notificationTime: notificationTime,
				travelTime : travelTime,
				updateTravelTimeAt : updateTravelTimeAt
			};
			// console.log("Event object created ==>");
			// console.log(util.inspect(event, false, null));
			console.log("Event object Creation Complete");
			return event;
		}
		var getMaxTravelTime = function(travelTime){
			return math.add(travelTime, maxDeviationToTravelTime);
		}

		var updateTravelTimeAt = function(travelTime){
			var deffered = Q.defer();
			var maxTravelTime = getMaxTravelTime(travelTime);
			deffered.resolve(moment(travelStartTime).subtract(maxBufferTime, "minutes").subtract(maxWaitingTime, "minutes").subtract(maxTravelTime, "minutes"));
			return deffered.promise;
		};
		
		var notificationTime = function(travelTime){
			var deffered = Q.defer();
			deffered.resolve(moment(travelStartTime).subtract(maxBufferTime, "minutes").subtract(maxWaitingTime, "minutes").subtract(travelTime, "minutes"));
			return deffered.promise;
		};

		deffered.resolve(this.getTravelTime(source, destination).then(function(travelTime) {
			return Q.all([updateTravelTimeAt(travelTime), notificationTime(travelTime)]).spread(function(updateTravelTimeAt, notifiactionTime){
				console.log("Event Initialization complete.");
				return addEvent(source, destination, travelStartTime, email, notifiactionTime, travelTime, updateTravelTimeAt)
			});
		}));
		return deffered.promise;
	},

	convertToObject: function(data){
		return JSON.parse(data);
	},

	convertToJson: function(data){
		return JSON.stringify(data);
	},

	/*
	* @return some timstamp when to fetch the travel time to reach destination
	*/
	getTravelTimeAt: function(event){
		array = [1,2,3,5,8,13,21,43,55,89,144,233,377,610,987,1597];
		var checkAfter = moment(event.notificationTime, "HH:mm").diff(moment(event.requestAtTime, "HH:mm"));
		if(checkAfter)
			checkAfter = math.chain(checkAfter).divide(1000).divide(60);
		else
			checkAfter = -1;
		var magicNumber = this.getClosedFibonaciiNumber(checkAfter);
		var offset = math.subtract(array.indexOf(magicNumber),1);
		offset = offset<0 ? 0 : offset;
		var offsetValue = array[offset];
		// add the offsetValue to event.updateTravelTimeAt
		event.updateTravelTimeAt = moment(event.updateTravelTimeAt).add(offsetValue, 'minutes');

		// recalculate notificationTime
		var newTravelTime = this.getTravelTime(event.source, event.destination).then(function(){
			console.log(travelTime.value)
			return travelTime.value;
		})
		event.notificationTime = moment(event.travelStartTime).subtract(this.maxBufferTime, "minutes").subtract(this.maxWaitingTime, "minutes").subtract(newTravelTime, "minutes");
		this.prettyprint(event);
		return event;
	},

	prettyprint: function(event){
		event.requestAtTime = moment(event.requestAtTime).format("HH:mm");
		event.notificationTime = moment(event.notificationTime).format("HH:mm");
		event.travelStartTime = moment(event.travelStartTime).format("HH:mm");
		event.updateTravelTimeAt = moment(event.updateTravelTimeAt).format("HH:mm");
		console.log(util.inspect(event, false, null));
	},

	getClosedFibonaciiNumber: function(number){
		array = [1,2,3,5,8,13,21,43,55,89,144,233,377,610,987,1597];
		var current = array[0];
		var difference = Math.abs(number - current);
		var index = array.length;
		while (index--) {
			var newDifference = Math.abs(number - array[index]);
			if (newDifference < difference) {
				difference = newDifference;
				current = array[index];
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
		console.log('starting to fetch Travel time (GOOGLE) at ' + new Date());
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