const axios = require('axios');
const fs = require('fs');
const moment = require('moment');

const getUserParsedM3uData = require('../utils/getUserParsedM3uData');
const parsedM3uData = require('../data/parsedM3UData');
const downloadQueue = require('./downloadQueue');

const downloadM3u = async () => {
	try {
		const date = moment().format('YYYY-MM-DD HH-mm');
		console.log('Downloading M3u file...');
		const m3uData = await axios.get(process.env.M3U_URL);
		console.log('M3u file downloaded successfully.');
		fs.writeFileSync(`./data/m3u-files/${date}.m3u`, m3uData.data);
		console.log('M3u file saved successfully.');
		return date + '.m3u';
	} catch (error) {
		return Promise.reject(error);
	}
};

const checkM3u = async () => {
	try {
		let currentM3u = null;
		let oldM3uData = null;

		const currentM3uFiles = fs.readdirSync('./data/m3u-files');
		if (currentM3uFiles.length === 0) {
			currentM3u = await downloadM3u();
		} else {
			currentM3u = currentM3uFiles.find((file) => moment(file.split('.')[0], 'YYYY-MM-DD HH-mm').isValid());
			if (!currentM3u) {
				currentM3u = await downloadM3u();
			}
		}

		const currentM3uDate = moment(currentM3u.split('.')[0], 'YYYY-MM-DD HH-mm');
		const difference = moment().diff(currentM3uDate, 'minutes');
		if (difference >= 60) {
			oldM3uData = await parseM3u(fs.readFileSync(`./data/m3u-files/${currentM3u}`, 'utf8'));
			fs.unlinkSync(`./data/m3u-files/${currentM3u}`);
			currentM3u = await downloadM3u();
		}

		return { currentM3u, oldM3uData };
	} catch (error) {
		return Promise.reject(error);
	}
};

const getAttribute = (name, line) => {
	let regex = new RegExp(name + '="(.*?)"', 'gi');
	let match = regex.exec(line);

	return match && match[1] ? match[1] : '';
};

const parseM3u = async (M3uData) => {
	try {
		const m3uItems = [];

		const m3uLines = M3uData.split('\n');
		for (let x = 1; x < m3uLines.length; x++) {
			const line = m3uLines[x];
			if (line.startsWith('#EXTINF')) {
				let item = {
					tvg: {
						name: getAttribute('tvg-name', line),
						logo: getAttribute('tvg-logo', line),
						id: getAttribute('tvg-id', line),
					},
					group: {
						title: getAttribute('group-title', line),
					},
					url: m3uLines[x + 1].replace(/(\r\n|\n|\r)/gm, ''),
				};

				m3uItems.push(item);
			}
		}

		// Group M3u items by group title
		const groupedM3uItems = m3uItems.reduce((acc, item) => {
			acc[item.group.title] = acc[item.group.title] || [];
			acc[item.group.title].push(item);
			return acc;
		}, {});

		// If group includes Series:, group them as TV Series
		for (const group in groupedM3uItems) {
			let tvShows = {};
			if (group.includes('Series:')) {
				for (const item of groupedM3uItems[group]) {
					const regex = /S([0-9]{2})(.?)E([0-9]{2})/g;
					if (regex.test(item.tvg.name)) {
						const tvShowName = item.tvg.name.split(regex)[0].trim();
						const season = `Season ${parseInt(item.tvg.name.split(regex)[1])}`;

						tvShows[tvShowName] = tvShows[tvShowName] || {};
						tvShows[tvShowName][season] = tvShows[tvShowName][season] || [];
						tvShows[tvShowName][season].push(item);
					}
				}
			}

			if (Object.keys(tvShows).length > 0) {
				groupedM3uItems[group] = tvShows;
			}
		}

		return groupedM3uItems;
	} catch (error) {
		return Promise.reject(error);
	}
};

const checkForChanges = async (currentM3uUserParsed, oldM3uUserParsed) => {
	try {
		const newItems = [];
		for (const group in currentM3uUserParsed) {
			if (!group.includes('Series:')) {
				for (const item of currentM3uUserParsed[group]) {
					if (!oldM3uUserParsed[group] || !oldM3uUserParsed[group].find((i) => i.url === item.url)) {
						newItems.push(item);
					}
				}
			} else {
				for (const tvShow in currentM3uUserParsed[group]) {
					for (const season in currentM3uUserParsed[group][tvShow]) {
						for (const item of currentM3uUserParsed[group][tvShow][season]) {
							if (
								!oldM3uUserParsed[group] ||
								!oldM3uUserParsed[group][tvShow] ||
								!oldM3uUserParsed[group][tvShow][season] ||
								!oldM3uUserParsed[group][tvShow][season].find((i) => i.tvg.name === item.tvg.name)
							) {
								newItems.push(item);
							}
						}
					}
				}
			}
		}

		return newItems;
	} catch (error) {
		return Promise.reject(error);
	}
};

const notifyDiscordOfChanges = async (newItems) => {
	try {
		const newItemsToM3u = [];
		for (const item of newItems) {
			newItemsToM3u.push(item.tvg.name);
		}

		const discordWebhook = process.env.DISCORD_WEBHOOK;
		if (discordWebhook) {
			let params = {
				username: "New M3U VOD's",
				avatar_url: '',
				content: 'Hi, I found some new VODs for you. Check them out!',
			};
			params.content += `\n\n${newItemsToM3u.join('\n')}`;

			await axios.post(discordWebhook, params);
		}
	} catch (error) {
		return Promise.reject(error);
	}
};

const getMediaFolderTVShowContent = async () => {
	try {
		const mediaFolder = process.env.MEDIA_LIBRARY;
		const tvShows = fs.readdirSync(mediaFolder + '/TV Shows');

		const tvShowsContent = {};
		for (const tvShow of tvShows) {
			const seasons = fs.readdirSync(mediaFolder + '/TV Shows/' + tvShow);

			for (const season of seasons) {
				if (season.includes('Season') && !season.includes('.')) {
					let files = fs.readdirSync(mediaFolder + '/TV Shows/' + tvShow + '/' + season);
					files = files.filter((file) => !file.includes('._'));
					files = files.map((file) => file.replace(/\.[^/.]+$/, ''));
					if (files.length > 0) {
						tvShowsContent[tvShow] = tvShowsContent[tvShow] || {};
						tvShowsContent[tvShow][season] = tvShowsContent[tvShow][season] || [];
						tvShowsContent[tvShow][season] = files;
					}
				}
			}
		}

		return tvShowsContent;
	} catch (error) {
		return Promise.reject(error);
	}
};

const checkForNewTVShows = async (currentM3uUserParsed, mediaFolderTVShows) => {
	try {
		const newTVShows = {};
		for (const group in currentM3uUserParsed) {
			if (!group.includes('Series:')) {
				continue;
			}

			for (const tvShow in currentM3uUserParsed[group]) {
				if (mediaFolderTVShows[tvShow]) {
					for (const season in currentM3uUserParsed[group][tvShow]) {
						for (const episode of currentM3uUserParsed[group][tvShow][season]) {
							if (!mediaFolderTVShows[tvShow][season]) {
								newTVShows[tvShow] = newTVShows[tvShow] || {};
								newTVShows[tvShow][season] = newTVShows[tvShow][season] || [];
								newTVShows[tvShow][season].push({
									url: episode.url,
									name: episode.tvg.name,
								});
								continue;
							}

							if (!mediaFolderTVShows[tvShow][season].includes(episode.tvg.name)) {
								newTVShows[tvShow] = newTVShows[tvShow] || {};
								newTVShows[tvShow][season] = newTVShows[tvShow][season] || [];
								newTVShows[tvShow][season].push({
									url: episode.url,
									name: episode.tvg.name,
								});
								continue;
							}
						}
					}
				}
			}
		}

		return newTVShows;
	} catch (error) {
		return Promise.reject(error);
	}
};

const updateM3u = async () => {
	try {
		console.log('Updating M3u file...');

		const mediaFolderTVShows = await getMediaFolderTVShowContent();

		const { currentM3u, oldM3uData } = await checkM3u();
		const currentM3uData = fs.readFileSync(`./data/m3u-files/${currentM3u}`, 'utf8');
		if (currentM3uData) {
			parsedM3uData.set(await parseM3u(currentM3uData));
			const currentM3uUserParsed = getUserParsedM3uData.fromImport(parsedM3uData.get());

			// If the old M3u file exists, compare it with the new M3u file
			if (oldM3uData) {
				const oldM3uUserParsed = getUserParsedM3uData.fromImport(oldM3uData);

				const newItems = await checkForChanges(currentM3uUserParsed, oldM3uUserParsed);
				if (newItems.length > 0) {
					console.log('New items found: ', newItems.length);
					notifyDiscordOfChanges(newItems);
				}
			}

			// Download new TV Shows
			let newTVShows = await checkForNewTVShows(currentM3uUserParsed, mediaFolderTVShows);
			if (Object.keys(newTVShows).length > 0) {
				// Check if item is already in the download queue
				for (const tvShow in newTVShows) {
					for (const season in newTVShows[tvShow]) {
						for (const episode of newTVShows[tvShow][season]) {
							const itemsInQueue = await downloadQueue.getQueueItems();
							const isAlreadyInQueue = itemsInQueue.some((queueItem) => {
								return queueItem.item.name === episode.name && queueItem.item.url === episode.url;
							});
							if (!isAlreadyInQueue) {
								downloadQueue.addItem({
									item: {
										name: episode.name,
										url: episode.url,
										tvShow: tvShow,
										season: season,
									},
									type: 'tvShow',
								});
							}
						}
					}
				}
			}

			// Download any incomplete Downloaded TV Shows

			downloadQueue.triggerDownloadQueue();
		}
	} catch (error) {
		return Promise.reject(error);
	}
};

module.exports = updateM3u;
