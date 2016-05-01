'use strict'

var math = require('mathjs');
var moment = require('moment');
moment().format();

const fibonacciNumbersArray = [1, 2, 3, 5, 8, 13, 21, 43, 55, 89, 144, 233, 377, 610, 987, 1597];

const getClosedFibonaciiNumber = function(number) {
    let current = fibonacciNumbersArray[0];
    let difference = Math.abs(number - current);
    let index = fibonacciNumbersArray.length;
    while (index--) {
        let newDifference = Math.abs(number - fibonacciNumbersArray[index]);
        if (newDifference < difference) {
            difference = newDifference;
            current = fibonacciNumbersArray[index];
        }
    }
    return current;
};

/*
 * @return some timstamp when to fetch the travel time to reach destination
 * @disclaimer Google Api polling stopped 5 mins prior latest notification time
 */
const heuristicPollingAt = function(notificationTime, stopPollingBefore) {
    let checkAfter = moment(notificationTime).diff(moment());
    checkAfter = Math.ceil(math.chain(checkAfter).divide(1000).divide(60));

    if (checkAfter === 0)
        return moment();

    const magicNumber = getClosedFibonaciiNumber(checkAfter);
    const intermediateValue = math.subtract(fibonacciNumbersArray.indexOf(magicNumber), 1)
    const offset = fibonacciNumbersArray[intermediateValue < 0 ? 0 : intermediateValue];

    const addTravelTime = math.subtract(checkAfter, offset);

    // console.log(" addTravelTime("+ addTravelTime +") = " + " checkAfter ("+checkAfter+") - "+ "offset(" + offset+") . [ magicnumber(" + magicNumber + ") ]");

    if (addTravelTime <= stopPollingBefore)
        return moment();
    //console.log("|==> heuristicPollingAt()-> updateTravelTimeAt : " + moment().add(addTravelTime, 'minutes').format("HH:mm"));

    // add the offset to timestamp
    return moment().add(addTravelTime, 'minutes');
};

/*
 * @return timestamp for next polling
 */
const intervalPollingAt = function(interval) {
    //console.log("Interval Polling")
    return moment().add(interval, "minutes");
};

/*
 * @description Two approaches are presented to poll the required data. Heuristic approaches suggest a timestamp for next polling event based on fibonnacci Numbers. Whereas, intervalPolling adds a fixed interval/offset to given time and returns a timestamp for next polling event.
 */
module.exports = {
    heuristicPollingAt: heuristicPollingAt,
    intervalPollingAt: intervalPollingAt
}