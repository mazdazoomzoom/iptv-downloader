const router = require('express').Router();
const fs = require('fs');

const getUserParsedM3UData = require('./utils/getUserParsedM3uData');
const downloadQueue = require('./services/downloadQueue');
const getUserSettings = require('./utils/getUserSettings');
const parsedM3UData = require('./utils/parsedM3UData');

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
        return res.render('group-movies', { title: group, m3uData: m3uData[group] });
    }

    const tvShows = Object.keys(m3uData[group]);
    res.render('group-tv-shows', { title: group, m3uData: m3uData[group], tvShows });
});

router.get('/parsed-m3u-data', async (req, res) => {
    const m3uData = await getUserParsedM3UData.fromStorage();
    res.json(m3uData);
});

router.get('/groups', async (req, res) => {
    const m3uData = await getUserParsedM3UData.fromStorage();

    const groups = Object.keys(m3uData);
    res.json(groups);
});

router.get('/downloads/clear', (req, res) => {
    downloadQueue.updateQueue([]);
    res.json({ message: 'Download queue cleared' });
});

module.exports = router;
