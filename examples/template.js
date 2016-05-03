const Zunzuna = require('../');

const zunzuna = new Zunzuna();

const event = {
	"id" : "1234",
    "source": "12.925006, 76.663978",
    "destination": "12.481734, 76.657222",
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
})