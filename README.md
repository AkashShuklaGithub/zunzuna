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

## Basic Example

NOTE: update event.time

```javascirpt
const Zunzuna = require('zunzuna');

const zunzuna = new Zunzuna();

const event = {
	"id" : "1234",
    "source": "Bengaluru Airport",
    "destination": "Soul Space Spirit, Bengaluru",
    "time":  "2016-05-04T02:33:17+05:30",
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

## Advance Example

```bash
node examples/messenger.js
```

Special Thanks to [node-wit](https://github.com/wit-ai/node-wit)

####Messenger API integration with wit.ai and zunzuna

We assume you have:
- a Wit.ai bot setup (https://wit.ai/docs/quickstart)
- a Messenger Platform setup (https://developers.facebook.com/docs/messenger-platform/quickstart)

You need to `npm install` the following dependencies: body-parser, express, request, node-wit, zunzuna

1. `npm install body-parser express request node-wit zunzuna`
2. Download and install ngrok from https://ngrok.com/download
3. `./ngrok -http 8080`
4. set following environment variables

	WIT_TOKEN=your_access_token 

	FB_PAGE_ID=your_page_id 

	FB_PAGE_TOKEN=your_page_token 

	FB_VERIFY_TOKEN=verify_token  

	GOOGLE_API_KEY=your_google_api_key

	UBER_API_KEY=your_uber_api_key 

	PORT=8080

5. Subscribe your page to the Webhooks using verify_token and `https://<your_ngrok_io>/fb` as callback URL.
6. Talk to your bot on Messenger!
7. You need to define the sories to get the appropriate context from [wit.ai](https://wit.ai)

For windows users, set the environment variables using `settoken.bat` file and run `settoken.bat` on cmd prompt

## How Zunzuna works?

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

