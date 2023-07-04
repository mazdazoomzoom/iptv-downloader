const axios = require('axios');
const fs = require('fs');
const path = require('path');

class DownloadQueue {
    constructor(queueFile) {
        this.queueFile = queueFile;
        this.currentDownload = {};
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

    setCurrentDownload = async (item) => {
        this.currentDownload = item;
    };

    getCurrentDownload = async () => {
        return this.currentDownload;
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

const queueFile = path.join(`${process.env.DATA_FOLDER}`, `downloadQueue.json`);
const downloadQueue = new DownloadQueue(queueFile);
module.exports = downloadQueue;

const downloadItem = (item, type) => {
    return new Promise(async (resolve, reject) => {
        try {
            const { url, season, tvShow } = item;
            const name = item.name.replace(/[:]/g, '');
            const downloadPath = path.join(__dirname, '..', 'temp', `${name}.mkv`);

            console.log('Downloading file: ', name);

            const writer = fs.createWriteStream(downloadPath);
            const response = await axios({
                url,
                method: 'GET',
                responseType: 'stream',
                onDownloadProgress: (progressEvent) => {
                    const percentCompleted = Math.floor((progressEvent.loaded * 100) / progressEvent.total);
                    downloadQueue.setCurrentDownload({ name, percentCompleted });
                },
            });
            response.data.pipe(writer);

            writer.on('error', (err) => {
                reject(`Error downloading ${name}:`, err);
            });

            writer.on('finish', () => {
                console.log('Downloaded file: ', name);

                downloadQueue.setCurrentDownload({ name, percentCompleted: 100 });

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

                downloadQueue.setCurrentDownload({});

                resolve(fs.unlinkSync(downloadPath));
            });
        } catch (error) {
            reject(`Error downloading ${item.name}:`, error);
        }
    });
};
