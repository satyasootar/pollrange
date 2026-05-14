import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import config from "./config.js";
import { User } from "../modules/user/user.model.js";

passport.use(
  new GoogleStrategy(
    {
      clientID: config.GOOGLE_CLIENT_ID,
      clientSecret: config.GOOGLE_CLIENT_SECRET,
      callbackURL: config.GOOGLE_CALLBACK_URL,
    },
    async (_accessToken, _refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value;

        if (!email) {
            return done(new Error("No email found in Google profile"), undefined);
        }

        // Check if user already exists
        let user = await User.findOne({ 
            $or: [
                { googleId: profile.id },
                { email: email }
            ]
        });

        if (user) {
          // If user exists but doesn't have a googleId, link it
          if (!user.googleId) {
            user.googleId = profile.id;
            
            const avatarUrl = profile.photos?.[0]?.value;
            if (avatarUrl) {
                user.avatarUrl = avatarUrl;
            }
            
            user.isEmailVerified = true; 
            await user.save();
          }
          return done(null, user);
        }

        // Create user object safely for Mongoose
        const userData: any = {
          name: profile.displayName,
          email: email,
          googleId: profile.id,
          isEmailVerified: true,
        };

        const avatarUrl = profile.photos?.[0]?.value;
        if (avatarUrl) {
            userData.avatarUrl = avatarUrl;
        }

        user = await User.create(userData);

        return done(null, user);
      } catch (error) {
        return done(error as Error, undefined);
      }
    }
  )
);

passport.serializeUser((user: any, done) => {
  done(null, user._id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
