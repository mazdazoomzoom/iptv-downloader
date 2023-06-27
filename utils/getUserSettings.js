const fs = require('fs');

const getUserSettings = async () => {
    const userSettings = fs.readFileSync(
        `${process.env.DATA_FOLDER}/userSettings.json`,
        'utf8'
    );
    return JSON.parse(userSettings);
};

module.exports = getUserSettings;
