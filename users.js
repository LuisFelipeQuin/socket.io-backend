const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  googleId: String, 
  name: String,
  email: String,
  profileImageUrl: String
});

const User = mongoose.model('User', UserSchema);

module.exports = User;

//client id:
// 233272746185-7gighf3v9t2010j378792eueht7otu81.apps.googleusercontent.com

//client secret:
// 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