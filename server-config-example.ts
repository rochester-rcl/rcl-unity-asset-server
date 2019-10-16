const config: IServerConfig = {
    port: process.env.PORT || 3000,
    basename: process.env.BASENAME || '/',
    mongoUrl: process.env.MONGO_URL || 'mongodb://localhost:27017/UnityDB',
    privateKey: "secret"
}

export default config;