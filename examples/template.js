const Zunzuna = require('../').zunzuna;

const zunzuna = new Zunzuna();

const event = '{"source": "12.925006, 76.663978", "destination": "12.481734, 76.657222", "time" : 20, "emailid": "test@test.com"}';

zunzuna.createEvent(JSON.parse(event));
zunzuna.on('remind', (text) => {
	console.log("Time to book Uber!");
})
