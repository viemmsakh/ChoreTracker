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

app.post('/register', db.userRegister);

app.post('/checkusername', db.checkUsername);

app.get('/test', db.test);

app.use(db.validateSession);

app.get('/logout', db.userLogout);
app.get('/logoutall', db.userLogoutAll);


app.get('/adoptioncodes', db.getAdoptionCodes);
app.get('/mychores', db.getChores);
app.get('/pendingchores', db.getPendingChores);
app.get('/familychores', db.getPersonChores);
app.get('/myfamily', db.getFamily);
app.get('/familycheck', db.familyCheck);
app.get('/myinfo', db.getMyInfo);
app.get('/perm', db.amIaParent);

app.post('/generateadoptioncode', db.generateAdoptionCodes)
;app.post('/generatefamily', db.generateFamily);
app.post('/chore', db.setChore);
app.post('/togglechore', db.toggleChore);
app.post('/verifychore', db.verifyChore);

app.get('/', (req, res) => {
    res.send('Hello World');
});


app.listen(PORT, () => console.log(`Server is running on PORT ${config.express.port}`));