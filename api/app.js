const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const config = require('./config');
const app = express();
const db = require('./lib/db');

const PORT = process.env.PORT || config.express.port;

app.use(cors());

app.use(
    bodyParser.json()
);

app.set('trust proxy', true);

app.post('/login', db.userLogin);

app.post('/reg', db.userRegister);

app.get('/test', db.test);

app.use(db.validateSession);

app.get('/logout', db.userLogout);
app.get('/logoutall', db.userLogoutAll);

app.post('/chore', db.setChore);
app.get('/mychores', db.getChores);
app.get('/familychores', db.getPersonChores);
app.get('/myfamily', db.getFamily);

app.post('/togglechore', db.toggleChore);

app.get('/', (req, res) => {
    res.send('Hello World');
});


app.listen(PORT, () => console.log(`Server is running on PORT ${config.express.port}`));