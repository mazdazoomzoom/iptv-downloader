const fs = require('fs');

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

module.exports = getMediaFolderTVShowContent;
