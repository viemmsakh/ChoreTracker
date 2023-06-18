module.exports = {
    dev: false,
    express: {
        port: 8000,
    },
    postgres: {
        conn: {
            host: '127.0.0.1',
            port: '5432',
            user: '',
            password: '',
            database: '',
        }
    },
    jwt: {
        secret: '',
    },
};