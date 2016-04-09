# zunzuna
Notify user when to book uber to reach destination on time. :)

### How it works?
Get at the source (event.source), destination (event.destination), travel start time (event.travelStartTime) and email id (event.email) of an user event (event).

Fetch the total travel time (travelTime) to destination (destination) at this instance (event.requestAtTime).

Set the maximum travel time (maxTravelTime) to (travelTime + maxDeviationToTravelTime = 60 mins )

Set the maximum buffer time (maxBufferTime = 10 mins)

Set the maximum time for the uber to reach source (maxWaitingTime = 15 mins) 

Calculate the best time to send a notification to user for booking cab (sendNotificationAt())

Calculate the best time to fetch travel time from source to destination (getTravelTimeAt())

###NOTE
Travel time from source to destination is subjected to change as per Traffic.

###Important Formulae
initRequest()

1. set event.updateTravelTimeAt to currentTime and fetch the event.travelTime
2. Calculate maxTravelTime = event.travelTime @ event.requestAtTime + maxDeviationToTravelTime
3. set event.updateTravelTimeAt to [event.travelStartTime - (maxBufferTime + maxTravelTime + maxWaitingTime)]
4. set event.notificationTime to [event.travelStartTime - (maxBufferTime + event.travelTime + maxWaitingTime)]
5. If the event.updateTravelTimeAt matches to currentTime, getTravelTime() [i.e update event.travelTime] and update event.notificationTime (sendNotificationAt())
