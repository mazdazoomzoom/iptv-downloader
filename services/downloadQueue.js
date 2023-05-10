const axios = require('axios');
const fs = require('fs');
const path = require('path');

class DownloadQueue {
	constructor(queueFile) {
		this.queueFile = queueFile;
	}

	beginDownloadQueue = async () => {
		let queueItems = await this.getQueueItems();

		while (queueItems.length > 0) {
			try {
				const itemToDownload = queueItems[0];

				await downloadItem(itemToDownload.item, itemToDownload.type).then(() => {
					queueItems.shift();
					this.updateQueue(queueItems);
				});

				queueItems = await this.getQueueItems();
			} catch (error) {
				console.error('Error downloading item from download queue:', error);
			}
		}
	};

	getQueueItems = async () => {
		try {
			const queueItems = fs.readFileSync(queueFile, 'utf8');
			return JSON.parse(queueItems);
		} catch (error) {
			console.error('Error reading download queue file:', error);
			return [];
		}
	};

	updateQueue = async (queueItems) => {
		try {
			return fs.writeFileSync(queueFile, JSON.stringify(queueItems));
		} catch (error) {
			console.error('Error writing to download queue file:', error);
		}
	};

	addItem = async ({ item, type }) => {
		try {
			const queueItems = await this.getQueueItems();
			queueItems.push({ item, type });
			await this.updateQueue(queueItems);
		} catch (error) {
			console.error('Error adding item to download queue:', error);
		}
	};

	triggerDownloadQueue = async () => {
		await this.beginDownloadQueue().then(() => {
			console.log('Download queue finished');
			// wait 1 minute before checking again
			setTimeout(async () => {
				await this.triggerDownloadQueue();
			}, 60000);
		});
	};
}

const queueFile = path.join(__dirname, '../data/downloadQueue.json');
module.exports = new DownloadQueue(queueFile);

const downloadItem = (item, type) => {
	return new Promise(async (resolve, reject) => {
		try {
			const { url, name, season, tvShow } = item;
			const downloadPath = path.join(__dirname, '..', 'temp', `${name}.mkv`);

			console.log('Downloading file: ', name);

			const writer = fs.createWriteStream(downloadPath);
			const response = await axios({
				url,
				method: 'GET',
				responseType: 'stream',
			});
			response.data.pipe(writer);

			writer.on('error', (err) => {
				reject(`Error downloading ${name}:`, err);
			});

			writer.on('finish', () => {
				console.log('Downloaded file: ', name);
				if (type === 'tvShow') {
					const seasonFolder = path.join(process.env.MEDIA_LIBRARY, `TV Shows/${tvShow}/${season}`);
					if (!fs.existsSync(seasonFolder)) {
						fs.mkdirSync(seasonFolder);
					}

					fs.copyFileSync(downloadPath, path.join(seasonFolder, `${name}.mkv`));
					console.log('Copied file to media folder: ', name);
				} else if (type === 'movie') {
					const movieFolder = path.join(process.env.MEDIA_LIBRARY, `Movies/${name}`);
					if (!fs.existsSync(movieFolder)) {
						fs.mkdirSync(movieFolder);
					}

					fs.copyFileSync(downloadPath, path.join(movieFolder, `${name}.mkv`));
					console.log('Copied file to media folder: ', name);
				}

				resolve(fs.unlinkSync(downloadPath));
			});
		} catch (error) {
			reject(`Error downloading ${item.name}:`, error);
		}
	});
};
