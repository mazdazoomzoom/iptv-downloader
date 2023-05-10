let parsedM3uData = {};

module.exports = {
	get: () => {
		return parsedM3uData;
	},
	set: (data) => {
		parsedM3uData = data;
	},
};
