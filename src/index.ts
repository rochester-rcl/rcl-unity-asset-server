import express from 'express';
import passport from 'passport';
import session from 'express-session';
import config from '../server-config';
import initRouter from './routes/AssetBundleRoutes';
import bodyParser from 'body-parser';
import multer from 'multer';

// TODO will implement Mongo w/ GridFS for storage
const upload: multer.Instance = multer({ dest: 'tmp-files/'});
const app: express.Application = express();
app.use(session({ secret: config.privateKey, resave: false, saveUninitialized: true}));
app.use(passport.initialize());
app.use(passport.session());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(config.basename, initRouter(upload));
app.listen(config.port, () => console.log(`Asset Bundle Server running on port ${config.port}`));