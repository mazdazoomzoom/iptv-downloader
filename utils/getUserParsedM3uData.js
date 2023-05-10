const parsedM3uData = require('../data/parsedM3UData');
const userSettings = require('../data/userSettings');

const getUserParsedM3UData = {
	fromStorage: () => {
		const m3uData = parsedM3uData.get();

		for (const group in m3uData) {
			if (!userSettings.groupsToKeep.vod.includes(group)) {
				delete m3uData[group];
			}
		}

		return m3uData;
	},

	fromImport: (m3uData) => {
		for (const group in m3uData) {
			if (!userSettings.groupsToKeep.vod.includes(group)) {
				delete m3uData[group];
			}
		}

		return m3uData;
	},
};

module.exports = getUserParsedM3UData;
