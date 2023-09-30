module.exports = async function(waw) {
	const Schema = waw.mongoose.Schema({
	name: String,
	description: String,
	data: {},
	author: {
		type: waw.mongoose.Schema.Types.ObjectId,
		ref: 'User'
	},
	moderators: [
		{
			type: waw.mongoose.Schema.Types.ObjectId,
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
	return waw.CNAME = waw.mongoose.model('CNAME', Schema);
}
