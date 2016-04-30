const Zunzuna = require('../').zunzuna;

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
})