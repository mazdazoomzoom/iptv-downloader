const router = require('express').Router();
const getUserParsedM3UData = require('./utils/getUserParsedM3uData');

router.get('/', (req, res) => {
	res.send('Hello World!');
});

router.get('/parsed-m3u-data', (req, res) => {
	const m3uData = getUserParsedM3UData.fromStorage();
	res.json(m3uData);
});

router.get('/groups', (req, res) => {
	const m3uData = getUserParsedM3UData.fromStorage();

	const groups = Object.keys(m3uData);
	res.json(groups);
});

module.exports = router;
