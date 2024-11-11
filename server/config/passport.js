const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const ContractUser = require('../Models/userModel');

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await ContractUser.findById(id);
        done(null, user);
    } catch (error) {
        done(error);
    }
});

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:5001/auth/google/callback",
    proxy: true
}, async (accessToken, refreshToken, profile, done) => {
    try {
        console.log('Google profile:', profile);
        let user = await ContractUser.findOne({ googleId: profile.id });
        
        if (!user) {
            const email = profile.emails[0].value;
            if (!email.endsWith('@limitlessglobaltechnologies.com')) {
                return done(null, false, { message: 'Email domain not allowed' });
            }

            user = await ContractUser.create({
                googleId: profile.id,
                email: email,
                displayName: profile.displayName,
                firstName: profile.name.givenName,
                lastName: profile.name.familyName,
                profilePhoto: profile.photos[0].value
            });
        }
        
        done(null, user);
    } catch (error) {
        console.error('Google Strategy Error:', error);
        done(error);
    }
}));

module.exports = passport;