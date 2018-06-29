var config = {};

config.app = {};
config.telegram = {};

config.app.uri = process.env.APP_URL || 'https://aqueous-island-48302.herokuapp.com:443';
config.telegram.token = process.env.TELEGRAM_TOKEN || '553011091:AAHNN1kCFBOhCz18Qw9Rsf5gh1u3gOOloEc';
config.telegram.options = {
    webHook: {
        port: process.env.PORT
    }
};

module.exports = config;