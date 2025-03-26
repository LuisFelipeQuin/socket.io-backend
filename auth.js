const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('./users');

passport.use(new GoogleStrategy({
  clientID: "233272746185-id63st08kg73b59lj04nvc1p81io32ct.apps.googleusercontent.com",
  clientSecret: "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",
  callbackURL: "http://3.137.159.105:3000/auth/google/callback"
},
  async function (accessToken, refreshToken, profile, cb) {
    try {
      let user = await User.findOne({ googleId: profile.id });

      if (!user) {
        user = new User({
          googleId: profile.id,
          name: profile.displayName,
          email: profile.emails[0].value,
          profileImageUrl: profile.photos[0].value
        });

        await user.save();
      }
      return cb(null, user);
    } catch (err) {
      return cb(err);
    }
  }
));

passport.serializeUser(function (user, done) {
  done(null, user);
});

passport.deserializeUser(function (obj, done) {
  done(null, obj);
});

module.exports = passport;