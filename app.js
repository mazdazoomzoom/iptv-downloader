require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');

const updateM3U = require('./services/update-m3u');
const router = require('./router');

// Clear the application temp folder

const tempFolder = path.join(__dirname, 'temp');
if (fs.existsSync(tempFolder)) {
	fs.readdirSync(tempFolder).forEach((file) => {
		const curPath = path.join(tempFolder, file);
		fs.unlinkSync(curPath);
	});
}

updateM3U();
setInterval(updateM3U, 3600000);

const app = express();
app.use(router);

app.listen(process.env.PORT || 3000, () => {
	console.log(`Server is running on port ${process.env.PORT || 3000}`);
});
