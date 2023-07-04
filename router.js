const router = require('express').Router();
const fs = require('fs');

const getUserParsedM3UData = require('./utils/getUserParsedM3uData');
const downloadQueue = require('./services/downloadQueue');
const getUserSettings = require('./utils/getUserSettings');
const parsedM3UData = require('./utils/parsedM3UData');
const getMediaFolderMovieContent = require('./utils/getMediaFolderMovieContent');

router.get('/', async (req, res) => {
    let data = [];
    const m3uData = await getUserParsedM3UData.fromStorage();

    const groups = Object.keys(m3uData).filter((group) => !group.startsWith('Live'));
    groups.forEach((group) => {
        if (m3uData[group].length > 0) {
            data.push({ name: group, contentAmount: m3uData[group].length });
        } else {
            data.push({ name: group, contentAmount: Object.keys(m3uData[group]).length });
        }
    });

    res.render('home', { title: 'Home', data });
});

router.get('/settings', async (req, res) => {
    const userSettings = await getUserSettings();
    const m3uData = { ...parsedM3UData.get() };
    const groups = Object.keys(m3uData);

    res.render('settings', { title: 'Settings', userSettings, groups });
});

router.post('/settings', async (req, res) => {
    fs.writeFileSync(`${process.env.DATA_FOLDER}/userSettings.json`, JSON.stringify(req.body.groups, null, 4));
    res.redirect('/');
});

router.get('/groups/:group', async (req, res) => {
    const m3uData = await getUserParsedM3UData.fromStorage();
    const group = req.params.group;

    if (m3uData[group].length > 0) {
        const moviesInMediaFolder = (await getMediaFolderMovieContent()).map((movie) => movie.replace(/[:]/g, ''));
        return res.render('group-movies', { title: group, m3uData: m3uData[group], moviesInMediaFolder });
    }

    const tvShows = Object.keys(m3uData[group]);
    res.render('group-tv-shows', { title: group, m3uData: m3uData[group], tvShows });
});

router.get('/downloads', async (req, res) => {
    const queue = await downloadQueue.getQueueItems();
    res.render('downloads', { title: 'Downloads', queue });
});

router.get('/downloads/progress', async (req, res) => {
    const download = await downloadQueue.getCurrentDownload();
    res.json({ download });
});

router.get('/downloads/clear', (req, res) => {
    downloadQueue.updateQueue([]);
    res.redirect('/downloads');
});

router.post('/downloads/add-to-downloads', async (req, res) => {
    const triggerDownload = false;
    const queue = await downloadQueue.getQueueItems();

    if (queue.length === 0) {
        triggerDownload = true;
    }
    downloadQueue.addItem(req.body);

    if (triggerDownload) {
        downloadQueue.triggerDownloadQueue();
    }

    res.json({ success: true });
});

module.exports = router;
