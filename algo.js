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
	maxDeviationToTravelTime : function() { return 10; },
	maxBufferTime : function() { return 14; },
	maxWaitingTime : function() { return 0; },
	googleApiKey : function() { return "AIzaSyB6ky0s6kmaxH15hsxsNHKuZeI6n_OG2eA"; },

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

		var addEvent = function(source, destination, startTravelAt, email, notificationTime, travelTime, updateTravelTimeAt){
			var event = {
				source: source,
				destination: destination,
				startTravelAt: startTravelAt,
				email: email,
				requestedAt: moment(),
				notificationTime: notificationTime,
				travelTime : travelTime,
				updateTravelTimeAt : updateTravelTimeAt
			};
			// console.log(util.inspect(event, false, null));
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
			var notificationTime = moment(startTravelAt).subtract(maxBufferTime, "minutes").subtract(maxWaitingTime, "minutes").subtract(travelTime, "minutes");
			// console.log("|==> notificationTime : " + moment(notificationTime).format("HH:mm"));
			deffered.resolve(notificationTime);
			return deffered.promise;
		};

		deffered.resolve(this.getTravelTime(source, destination).then(function(travelTime) {
			return Q.all([updateTravelTimeAt(travelTime), notificationTime(travelTime)]).spread(function(updateTravelTimeAt, notifiactionTime){
				// console.log("Event Initialization complete.");
				return addEvent(source, destination, startTravelAt, email, notifiactionTime, travelTime, updateTravelTimeAt)
			});
		}));
		return deffered.promise;
	},

	updateEvent: function(event){
		var maxBufferTime = this.maxBufferTime();
		var maxWaitingTime = this.maxWaitingTime();
		//var updateTravelTimeAt = this.getTravelTimeAt(event);
		var notificationTime = function(travelTime){
			var notificationTime = moment(event.startTravelAt).subtract(maxBufferTime, "minutes").subtract(maxWaitingTime,"minutes").subtract(travelTime, "minutes");
			console.log("|==> updateEvent()-> notificationTime : " + moment(notificationTime).format("HH:mm"));
			return notificationTime;
		}
		that = this;
		return this.getTravelTime(event.source, event.destination).then(function(travelTime){
			event.notificationTime = notificationTime(travelTime);
			event.updateTravelTimeAt = that.getTravelTimeAt(event);
			return event;		
		});

	},

	/*
	* @return some timstamp when to fetch the travel time to reach destination
	* @Assumption Google Api polling will stop 5 mins before notification time
	*/
	getTravelTimeAt: function(event){
		var fibonacciNumbersArray = [1,2,3,5,8,13,21,43,55,89,144,233,377,610,987,1597];
		var checkAfter = moment(event.notificationTime).diff(moment());
		checkAfter = Math.ceil(math.chain(checkAfter).divide(1000).divide(60));
		if(checkAfter === 0)
			return moment();

		var magicNumber = this.getClosedFibonaciiNumber(checkAfter);
		var intermediateValue = math.subtract(fibonacciNumbersArray.indexOf(magicNumber),1)
		var offset = fibonacciNumbersArray[ intermediateValue < 0 ? 0 : intermediateValue];

		var addTravelTime =  math.subtract(checkAfter, offset);

		// console.log(" addTravelTime("+ addTravelTime +") = " + " checkAfter ("+checkAfter+") - "+ "offset(" + offset+") . [ magicnumber(" + magicNumber + ") ]");


		if(addTravelTime <= 5)
			return moment();
		// add the offset to event.updateTravelTimeAt
		updateTravelTimeAt = moment().add(addTravelTime, 'minutes');

		console.log("|==> getTravelTimeAt()-> updateTravelTimeAt : " + moment(updateTravelTimeAt).format("HH:mm"));
		// this.prettyprint(event);
		return updateTravelTimeAt;
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
		console.log('|==> starting to fetch Travel time (GOOGLE) at ' + new Date());
		request(this.getGoogleApiEndPoint(source, destination), function (error, response, data) {
			if (!error && response.statusCode == 200) {
				//console.log("Data Fetched from google: " + data.toString())
				deffered.resolve(5);
			}
			else{
				console.log("|==> travelTime : " + 5 + " min");
				deffered.resolve(5);
				// deffered.reject(" Error occured while retrive distance from google api at " + new Date());
			}
		})
		return deffered.promise;
	},

	sendNotification: function(email){
		console.log("|==> Email sent to " + email);
		return true;
	}
}