import express from 'express';
import passport from 'passport';
import session from 'express-session';
import config from '../server-config';
import initRouter from './routes/AssetBundleRoutes';

const app: express.Application = express();
app.use(session({ secret: config.privateKey, resave: false, saveUninitialized: true}));
app.use(passport.initialize());
app.use(passport.session());
app.use(config.basename, initRouter());
app.listen(config.port, () => console.log(`Asset Bundle Server running on port ${config.port}`));