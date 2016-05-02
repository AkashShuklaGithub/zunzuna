# zunzuna

Notify user when to book uber to reach destination on time. :)

## Install

In your node.js project, run:

```bash
npm install --save zunzuna
```

## Quickstart

Run in your terminal:

```bash
node examples/template.js
```

NOTE: set GOOGLE_API_KEY & UBER_API_KEY environment variables 

## Example

```javascirpt
const Zunzuna = require('zunzuna').zunzuna;

const zunzuna = new Zunzuna();

const event = {
    "id" : "someid",
    "source": "12.925006, 76.663978",
    "destination": "12.481734, 76.657222",
    "time": 20,
    "emailid": "test@test.com"
};

try {
    zunzuna.createEvent(event);
} catch (e) {
    console.log("Error occured: " + e.message);
}

zunzuna.on('notify', (params) => {
    console.log(params);
});
```

## How it works?
- Get at the source (event.source), destination (event.destination), travel start time (event.startTravelAt) and email id (event.email) of an user event (event).
- Fetch the total travel time (travelTime) to destination (destination) at this instance (event.requestedAt).
- Set the maximum travel time (maxTravelTime) to (travelTime + maxDeviationToTravelTime = 60 mins )
- Set the maximum buffer time (maxBufferTime = 10 mins)
- Set the maximum time for the uber to reach source (maxWaitingTime = 15 mins) 
- Calculate the best time to send a notification to user for booking cab (sendNotificationAt())
- Calculate the best time to fetch travel time from source to destination (getTravelTimeAt())

## Algorithm
1. set event.updateTravelTimeAt to currentTime and fetch the event.travelTime
2. Calculate maxTravelTime = event.travelTime @ event.requestedAt + maxDeviationToTravelTime
3. set event.updateTravelTimeAt to [event.startTravelAt - (maxBufferTime + maxTravelTime + maxWaitingTime)]
4. set event.notificationTime to [event.startTravelAt - (maxBufferTime + event.travelTime + maxWaitingTime)]
5. If the event.updateTravelTimeAt matches to currentTime, getTravelTime() [i.e update event.travelTime] and update event.notificationTime and calculate event.updateTravelTimeAt.
6. If the event.udpateWaitingTimeAt matches to currentTIme, getWaitingTime() [i.e update event.waitingTime] and update event.notificationTime and calculate event.updateWaitingTime.
7. If event.notificationTime matches to currentTime, send notification.

## Assumptions
- Google api polling will start at (maxTravelTime + maxWaitingTime + maxBufferTime)
- Uber api polling will start at (notificationTime - startUberPolling)
- Google api polling stops 5 mins prior to notificationTime
- Uber api polls every 2 mins till the notificationTime
- NOTE: Values can be changed from node_modules/zunzuna/lib/algo.js file

