const mongoose = require('mongoose');

const Schema = mongoose.Schema({
	name: String,
	description: String,
	data: {},
	author: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'User'
	},
	moderators: [
		{
			type: mongoose.Schema.Types.ObjectId,
			sparse: true,
			ref: 'User'
		}
	]
});

Schema.methods.create = function (obj, user, waw) {
	this.author = user._id;

	this.moderators = [user._id];

	this.name = obj.name;

	this.description = obj.description;

	this.data = obj.data;
}

module.exports = mongoose.model('CNAME', Schema);
