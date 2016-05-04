const Zunzuna = require('../');

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
})