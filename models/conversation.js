const mongoose = require("mongoose");

const conversationSchema = mongoose.Schema({
  members: {
    type: [String],
    require: true,
  },
});

const Conversation = mongoose.model("Conversation", conversationSchema);

module.exports = Conversation;
