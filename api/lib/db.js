const { Pool } = require('pg');
const config = require('../config');
const pool = new Pool(config.postgres.conn);

const { v4: uuidv4 } = require('uuid');

const bcrypt = require('bcrypt');
const saltRounds = 10;

const jwt = require('jsonwebtoken');

const userLogin = async (req, res) => {
    const response = {
        status: 401,
        message: 'Unauthorized',
    };
    const { username, password } = req.body;
    if (username && password) {
        let sql = `
            SELECT hash, uuid, name FROM AUTH
                WHERE username = $1
                LIMIT 1;
        `;
        let params = [ username ];
        let { rows } = await pool.query(sql, params);
        if (rows.length) {
            const { hash, uuid: user_id, name } = rows[0];
            const authed = bcrypt.compareSync(password, hash);
            if (authed) {
                response.me = { display_name: name, user_id };
                sql = `
                    SELECT * FROM family WHERE unit_member = $1;
                `;
                params = [user_id];
                let unit = await pool.query(sql, params);
                if (unit.rows.length) response.me = { ...response.me, acct_type: unit.rows[0].unit_permission };
                sql = `
                    INSERT INTO sessions (requested_by) VALUES($1) RETURNING uuid, init;
                `;
                let { rows } = await pool.query(sql, params);
                if (rows.length) {
                    const { uuid: session_uuid, init: session_initialized } = rows[0];
                    const token = jwt.sign({
                        session_uuid,
                        session_initialized,
                        username,
                    }, config.jwt.secret, { algorithm: 'HS256' });
                    response.status = 200;
                    response.message = 'Authorized';
                    response.token = token;
                }
            }
        }
    }
    res.status(response.status).send(response);
    return;
};

const userLogout = async (req, res) => {
    const response = {
        status: 401,
        message: 'Unauthorized',
    };
    if (req.headers.authorization) {
        const token = req.headers.authorization;
        try {
            const decoded = jwt.verify(token, config.jwt.secret, { algorithms: 'HS256' });
            const { session_uuid } = decoded;
            const sql = `
                UPDATE sessions
                    SET invalidated = 'Y'
                    WHERE uuid = $1
                    AND invalidated = 'N'
                    RETURNING invalidated;
            `;
            const params = [session_uuid];
            const { rows } = await pool.query(sql, params);
            if (rows.length) {
                response.status = 200;
                response.message = 'User Logged Out';
            }
        } catch (err) {
            console.log(Date.now(), '-', err.message);
        }
    }
    res.status(response.status).send(response);
    return;
}

const userLogoutAll = async (req, res) => {
    const response = {
        status: 401,
        message: 'Unauthorized',
    };
    if (req.headers.authorization) {
        const token = req.headers.authorization;
        try {
            const decoded = jwt.verify(token, config.jwt.secret, { algorithms: 'HS256' });
            const { session_uuid, username } = decoded;
            const sql = `
                UPDATE sessions s
                    SET invalidated = 'Y'
                    WHERE s.requested_by IN (
                        SELECT a.uuid FROM auth a
                            JOIN sessions s ON (s.requested_by = a.uuid)
                            WHERE a.username = $1
                            AND s.uuid = $2
                            AND s.invalidated = 'N'
                    )
                    AND s.invalidated = 'N'
                    RETURNING invalidated;
            `;
            const params = [username, session_uuid];
            const { rows } = await pool.query(sql, params);
            if (rows.length) {
                response.status = 200;
                response.message = 'User Logged Out Everywhere';
            }
        } catch (err) {
            console.log(Date.now(), '-', err.message);
        }
    }
    res.status(response.status).send(response);
    return;
};

const userRegister = async (req, res) => {
    const response = {
        status: 409,
        message: 'Username Invalid',
    };
    let { username, password } = req.body;
    let ip = req.ip;
    if (ip.substr(0, 7) === "::ffff:") {
        ip = ip.substr(7);
    }
    let sql = `
        SELECT username, (
            SELECT COUNT(ip) FROM auth
                WHERE ip = $1
                AND registered >= (NOW () - INTERVAL '1 minutes')
            )
            FROM auth
            WHERE ip = $1
    `;
    let params = [ ip ];
    let { rows } = await pool.query(sql, params);
    const find_user = rows.filter((f) => f.username === username);
    const count = rows.length ? rows[0].count : '0';
    if (!find_user.length && count === '0') {
        const hash = await bcrypt.hash(password, saltRounds);
        const unit = uuidv4();
        sql = `
            INSERT INTO family (unit, unit_member, unit_permission)
                VALUES ($4, $1, $5);
            INSERT INTO auth (username, hash, ip)
                VALUES ($1, $2, $3)
                RETURNING uuid;
        `;
        params = [username, hash, ip, unit, 'P'];
        const { rows } = await pool.query(sql, params);
        if (rows.length) {
            response.status = 200;
            response.message = 'Registered';
        }
    } else if (count) {
        response.status = 429;
        response.message = 'Too many registrations attempts';
    }
    res.status(response.status).send(response);
    return;
};

const validateSession = async (req, res, next) => {
    const response = {
        status: 401,
        message: 'Unauthorized',
    };
    if (req.headers.authorization) {
        const token = req.headers.authorization;
        try {
            const decoded = jwt.verify(token, config.jwt.secret, { algorithms: 'HS256' });
            const { session_uuid, username } = decoded;
            const sql = `
                SELECT s.uuid, a.uuid as user_id, f.unit FROM sessions s
                    JOIN auth a ON (s.requested_by = a.uuid)
                    JOIN family f ON (a.uuid = f.unit_member)
                    WHERE a.username = $1
                    AND s.uuid = $2
                    AND s.init >= (NOW () - INTERVAL '12 hours')
                    AND invalidated = 'N'
                    LIMIT 1;
            `;
            const params = [username, session_uuid];
            const { rows } = await pool.query(sql, params);
            if (rows.length) {
                const { uuid, user_id, unit } = rows[0];
                if (uuid === session_uuid) {
                    req.user_id = user_id;
                    req.unit = unit;
                    next();
                    return;
                }
            }
        } catch (err) {
            console.log(Date.now(), '-', err.message);
        }
    }
    res.status(response.status).send(response);
    return;
};

const test = async (req, res, next) => {
    const sql = `
        SELECT * FROM family LIMIT 1;
    `;
    const { rows } = await pool.query(sql);
    res.send(rows);
    return;
};
const setChore = async (req, res, next) => {
    const response = {
        status: 403,
        message: [],
    };
    const { user_id } = req;
    const {
        assigned,
        chore_name,
        chore_description,
        deadline,
        chore_id,
    } = req.body;
    let sql;
    let params;
    if (chore_id) {
        // Update
        sql = `
            UPDATE chores
                SET chore_member = $1,
                chore_name = $2,
                chore_description = $3,
                chore_deadline = $4,
                assigned_by = $5
                WHERE chore = $6 RETURNING chore;
        `;
        params = [
            assigned,
            chore_name,
            chore_description,
            deadline,
            user_id,
            chore_id
        ];
    } else {
        // Insert
        sql = `
            INSERT INTO chores
                (
                    chore_member,
                    chore_name,
                    chore_description,
                    chore_deadline,
                    assigned_by
                ) VALUES (
                    $1, $2, $3, $4, $5
                ) RETURNING chore;
        `;
        params = [
            assigned,
            chore_name,
            chore_description,
            deadline,
            user_id
        ];
    }
    try {
        const { rows } = await pool.query(sql, params);
        response.status = 200;
        response.message = rows;
    } catch (err) {
        console.log(Date.now(), '-', err.message);
    }
    res.status(response.status).send(response);
};

const getChores = async (req, res, next) => {
    const response = {
        status: 200,
        message: [],
    };
    const { user_id } = req;
    const status = req.query.status ? req.query.status : 'incomplete';
    const date = req.query.on ? req.query.on : null;
    const sqlArr = [];
    const sqlParams = [user_id];
    sqlArr.push('SELECT * FROM chores WHERE chore_member = $1');
    if(status === 'incomplete') {
        sqlArr.push('AND chore_verified IS NULL');
    } else if (status === 'completed') {
        sqlArr.push('AND chore_verified IS NOT NULL');
        if (date && date.test(/^(\d){4}-(\d){1,2}-(\d){1,2}$/)) {
            sqlArr.push('AND date_trunc("day", chore_completed) = $2)');
            sqlParams.push(date);
        }
    }
    try {
        const { rows } = await pool.query(sqlArr.join(' '), sqlParams);
        if (rows.length) {
            response.message = rows;
        }
    } catch (err) {
        console.log(Date.now(), '-', err.message);
    }
    res.status(response.status).send(response);
}

const getPersonChores = async (req, res, next) => {
    const response = {
        status: 200,
        message: [],
    };
    const { id } = req.query;

    if (id) {
        const params = [id];
        const sql = `SELECT * FROM chores WHERE chore_member = $1 AND chore_verified IS NULL;`;
        try {
            const { rows } = await pool.query(sql, params);
            if (rows.length) {
                response.message = rows;
            }
        } catch (err) {
            console.log(Date.now(), '-', err.message);
        }
    }
    res.status(response.status).send(response);
}

const getFamily = async (req, res, next) => {
    const response = {
        status: 200,
        message: [],
    };
    const { unit, user_id } = req;
    let sql = `
        SELECT unit_permission FROM family WHERE unit_member = $1 LIMIT 1;
    `;
    let params = [user_id];
    const unit_permission = await pool.query(sql, params);
    params = [unit];
    if ( unit_permission.rows[0].unit_permission === 'P') {
        sql = `
            SELECT a.uuid, a.username, a.name, f.unit_permission,
                 coalesce(
                         (
                             SELECT COUNT(*)
                                 FROM chores
                                 WHERE chore_member = a.uuid
                                 AND chore_verified IS NULL
                                 GROUP BY chore_member
                         ), 0) as incomplete
                FROM family f
                JOIN auth a ON (a.uuid = f.unit_member)
                WHERE f.unit = $1;
            `;        
    } else {
        sql = `
            SELECT a.uuid, a.username, a.name
                FROM family f
                JOIN auth a ON (a.uuid = f.unit_member)
                WHERE f.unit = $1
                AND a.uuid IN (
                    SELECT uuid
                        FROM family f
                        JOIN auth a ON (a.uuid = f.unit_member)
                        WHERE a.uuid = $2 OR f.unit_permission = 'P'
                )                
        `;
        params.push(user_id);
    }
    try {
        const { rows } = await pool.query(sql, params);
        if (rows.length) {
            response.message = rows;
        }
    } catch (err) {
        console.log(Date.now(), '-', err.message);
    }
    res.status(response.status).send(response);
}

const toggleChore = async (req, res, next) => {
    const response = {
        status: 401,
        message: 'Unauthorized',
    };
    const { uuid, bool } = req.body;
    let sql;
    const params = [uuid];
    if (!bool) {
        sql = `
            UPDATE chores SET chore_completed = CURRENT_TIMESTAMP WHERE chore = $1 RETURNING chore;
        `
    } else {
        sql = `
            UPDATE chores SET chore_completed = null WHERE chore = $1 RETURNING chore;
        `
    }
    try {
        const { rows } = await pool.query(sql, params);
        response.status = 200;
        response.message = `${rows.length} records updated`;
    } catch (err) {
        response.status = 500;
        response.message = err.message ? err.message : 'UNKNOWN ERROR';
    }
    res.status(response.status).send(response);
}

module.exports = {
    test,
    userLogin,
    userLogout,
    userLogoutAll,
    userRegister,
    validateSession,
    getChores,
    setChore,
    getPersonChores,
    getFamily,
    toggleChore,
};
