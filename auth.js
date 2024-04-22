const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('./users');

passport.use(new GoogleStrategy({
    clientID: "233272746185-7gighf3v9t2010j378792eueht7otu81.apps.googleusercontent.com",
    clientSecret: "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",
    callbackURL: "http://localhost:3000/auth/google/callback"
  },
  async function(accessToken, refreshToken, profile, cb) {
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

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

module.exports = passport;