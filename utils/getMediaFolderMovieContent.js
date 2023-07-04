const fs = require('fs');

const getMediaFolderMovieContent = async () => {
    try {
        const mediaFolder = process.env.MEDIA_LIBRARY;
        const movies = fs.readdirSync(mediaFolder + '/Movies');

        return movies;
    } catch (error) {
        return Promise.reject(error);
    }
};

module.exports = getMediaFolderMovieContent;
