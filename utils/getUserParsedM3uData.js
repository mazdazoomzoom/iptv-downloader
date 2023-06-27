const parsedM3uData = require('./parsedM3UData');
const getUserSettings = require('./getUserSettings');

const getUserParsedM3UData = {
    fromStorage: async () => {
        const m3uData = { ...parsedM3uData.get() };
        const userSettings = await getUserSettings();

        for (const group in m3uData) {
            if (!userSettings.includes(group)) {
                delete m3uData[group];
            }
        }

        return m3uData;
    },

    fromImport: async (m3uData) => {
        const userSettings = await getUserSettings();

        for (const group in m3uData) {
            if (!userSettings.includes(group)) {
                delete m3uData[group];
            }
        }

        return m3uData;
    },
};

module.exports = getUserParsedM3UData;
