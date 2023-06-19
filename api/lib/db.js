const { Pool } = require('pg');
const config = require('../config');
const pool = new Pool(config.postgres.conn);

const { v4: uuidv4 } = require('uuid');

const bcrypt = require('bcrypt');
const saltRounds = 10;

const jwt = require('jsonwebtoken');

const userLogin = async (req, res) => {
    const client = await pool.connect();
    const response = {
        status: 401,
        message: 'Unauthorized',
    };
    try {
        const { username, password } = req.body;
        if (username && password) {
            let sql = `
                SELECT a.hash, a.uuid FROM AUTH a
                    JOIN users u USING (uuid)
                    WHERE u.username = $1
                    LIMIT 1;
            `;
            let params = [ username ];
            
                let rows = await client.query(sql, params);
                if (rows.rows.length) {
                    const { hash, uuid: user_id } = rows.rows[0];
                    const authed = bcrypt.compareSync(password, hash);
                    if (authed) {
                        sql = `
                            INSERT INTO sessions (requested_by) VALUES($1) RETURNING uuid;
                        `;
                        params = [ user_id ];
                        rows = await client.query(sql, params);
                        if (rows.rows.length) {
                            const { uuid: session_uuid } = rows.rows[0];
                            const token = jwt.sign({
                                session_uuid
                            }, config.jwt.secret, { algorithm: 'HS256' });
                            response.status = 200;
                            response.message = 'Authorized';
                            response.token = token;
                        }
                    }
                }
        }
    } catch (err) {
        response.status = 500;
        response.message = err.message ? err.message : 'Unknown Error';
    } finally {
        client.release();
    }
    res.status(response.status).send(response);
    return;
};

const userLogout = async (req, res) => {
    const client = await pool.connect();
    const response = {
        status: 401,
        message: 'Unauthorized',
    };
    try {
        if (req.headers.authorization) {
            const token = req.headers.authorization;
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
            const { rows } = await client.query(sql, params);
            response.status = 200;
            response.message = 'User Logged Out';
        }
    } catch (err) {
        response.status = 500;
        response.message = err.message ? err.message : 'Unknown Error';
    } finally {
        client.release();
    }
    res.status(response.status).send(response);
    return;
}

const userLogoutAll = async (req, res) => {
    const client = await pool.connect();
    const response = {
        status: 401,
        message: 'Unauthorized',
    };
    try {
        if (req.headers.authorization) {
            const token = req.headers.authorization;
            const decoded = jwt.verify(token, config.jwt.secret, { algorithms: 'HS256' });
            const { session_uuid, username } = decoded;
            const sql = `
                UPDATE sessions s
                    SET invalidated = 'Y'
                    WHERE s.requested_by IN (
                        SELECT u.uuid FROM users u
                            JOIN sessions s ON (s.requested_by = u.uuid)
                            WHERE u.username = $1
                            AND s.uuid = $2
                            AND s.invalidated = 'N'
                    )
                    AND s.invalidated = 'N'
                    RETURNING invalidated;
            `;
            const params = [username, session_uuid];
            const { rows } = await client.query(sql, params);
            response.status = 200;
            response.message = 'User Logged Out Everywhere';
        }
    } catch (err) {
        response.status = 500;
        response.message = err.message ? err.message : 'Unknown Error';
    } finally {
        client.release();
    }
    res.status(response.status).send(response);
    return;
};

const userRegister = async (req, res) => {
    const client = await pool.connect();
    const response = {
        status: 409,
        message: 'Username Invalid',
    };
    try {
        let { username, password, name } = req.body;
        let ip = req.ip;
        let sql = `
            SELECT username FROM users
                WHERE username = $1;
        `;
        let rows = await client.query(sql, params);
        if (rows.rows.length) {
            response.message = 'Username already in use'
        } else {
            let params = [username];
            if (ip.substr(0, 7) === "::ffff:") {
                ip = ip.substr(7);
            }
            const hash = await bcrypt.hash(password, saltRounds);
            sql = `
                INSERT INTO auth (hash, ip)
                    VALUES ($1, $2)
                    RETURNING uuid;
            `;
            rows = await client.query(sql, params);
            if (rows.rows.length) {
                sql = `
                    INSERT INTO users (uuid, username, name)
                        VALUES ($1, $2, $3);
                `;
                params = [rows[0].uuid, username, name];
                rows = await client.query(sql, params);
                console.log(rows);
                response.status = 200;
                response.message = 'Registered';
            }
        }
    } catch (err) {
        response.status = 500;
        response.message = err.message ? err.message : 'Unknown Error';
    } finally {
        client.release();
    }
    res.status(response.status).send(response);
    return;
};

const validateSession = async (req, res, next) => {
    const client = await pool.connect();
    const response = {
        status: 401,
        message: 'Unauthorized',
    };
    try {
        if (req.headers.authorization) {
            const token = req.headers.authorization;
            const decoded = jwt.verify(token, config.jwt.secret, { algorithms: 'HS256' });
            const { session_uuid } = decoded;
            const sql = `
                SELECT u.username, u.name, u.uuid, u.family_unit, u.family_permission, f.family_name FROM users u
                    JOIN sessions s ON (s.requested_by = u.uuid)
                    JOIN family f ON (f.unit = u.family_unit)
                    WHERE s.uuid = $1
                    LIMIT 1;
            `;
            const params = [session_uuid];
            const { rows } = await client.query(sql, params);
            if (rows.length) {
                const { username, name, uuid, family_name, family_unit, family_permission } = rows[0];
                req.uuid = uuid;
                req.username = username;
                req.name = name;
                req.family_name = family_name,
                req.family_unit = family_unit;
                req.family_permission = family_permission;
                next();
                return;
            }
        }
    } catch (err) {
        response.status = 500;
        response.message = err.message ? err.message : 'Unknown Error';
    } finally {
        client.release();
    }
    res.status(response.status).send(response);
    return;
};

const test = async (req, res, next) => {
    const client = await pool.connect();
    const response = {
        status: 403,
        message: [],
    };
    try {
        const sql = `
            SELECT * FROM family LIMIT 1;
        `;
        const { rows } = await client.query(sql);
        response.status = 200;
        response.message = rows;
    } catch (err) {
        response.status = 500;
        response.message = err.message ? err.message : 'Unknown Error';
    } finally {
        client.release();
    }
    res.status(response.status).send(response);
    return;
};

const setChore = async (req, res, next) => {
    const client = await pool.connect();
    const response = {
        status: 403,
        message: [],
    };
    try {
        const { uuid, family_permission } = req;
        let {
            assigned,
            chore_name,
            chore_description,
            deadline,
            chore_id,
        } = req.body;
        let sql;
        let params;
        if (family_permission && !family_permission.toUpperCase() === 'P') {
            assigned = uuid;
        }
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
                uuid,
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
        const { rows } = await client.query(sql, params);
        response.status = 200;
        response.message = rows;
    } catch (err) {
        response.status = 500;
        response.message = err.message ? err.message : 'Unknown Error';
    } finally {
        client.release();
    }
    res.status(response.status).send(response);
};

const getChores = async (req, res, next) => {
    const client = await pool.connect();
    const response = {
        status: 200,
        message: [],
    };
    try {
        const { uuid } = req;
        const status = req.query.status ? req.query.status : 'incomplete';
        const date = req.query.on ? req.query.on : null;
        const sqlArr = [];
        const sqlParams = [uuid];
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
        const { rows } = await client.query(sqlArr.join(' '), sqlParams);
        if (rows.length) {
            response.message = rows;
        }
    } catch (err) {
        response.status = 500;
        response.message = err.message ? err.message : 'Unknown Error';
    } finally {
        client.release();
    }
    res.status(response.status).send(response);
}

const getPersonChores = async (req, res, next) => {
    const client = await pool.connect();
    const response = {
        status: 200,
        message: [],
    };
    try {
        const { id } = req.query;
        const { family_permission, uuid } = req;

        if (id) {
            let params;
            let sql;
            if (family_permission && family_permission.toUpperCase() === 'P') {
                params = [id];
                sql = `SELECT * FROM chores WHERE chore_member = $1 AND chore_verified IS NULL;`;
            } else if (id === uuid) {
                params = [id];
                sql = `SELECT * FROM chores WHERE chore_member = $1 AND chore_verified IS NULL;`;
            }
            const { rows } = await client.query(sql, params);
            if (rows.length) {
                response.message = rows;
            }
        }
    } catch (err) {
        response.status = 500;
        esponse.message = err.message ? err.message : 'Unknown Error';
    } finally {
        client.release();
    }
    res.status(response.status).send(response);
}

const getFamily = async (req, res, next) => {
    const client = await pool.connect();
    const response = {
        status: 200,
        message: [],
    };
    try {
        const { family_unit, family_permission, uuid } = req;
        let sql;
        let params;
        if (family_permission && family_permission.toUpperCase() === 'P') {
            sql = `
                SELECT u.uuid, u.username, u.name, u.family_permission,
                    coalesce(
                            (
                                SELECT COUNT(*)
                                    FROM chores
                                    WHERE chore_member = u.uuid
                                    AND chore_verified IS NULL
                                    GROUP BY chore_member
                            ), 0) as incomplete
                    FROM users u
                    WHERE u.family_unit = $1;
                `;
            params = [family_unit];       
        } else {
            sql = `
                SELECT u.uuid, u.username, u.name, u.family_permission,
                    coalesce(
                        (
                            SELECT COUNT(*)
                                FROM chores
                                WHERE chore_member = u.uuid
                                AND chore_verified IS NULL
                                GROUP BY chore_member
                        ), 0) as incomplete
                    FROM users u
                    WHERE u.uuid = $1;          
            `;
            params = [uuid];
        }
        const { rows } = await client.query(sql, params);
        if (rows.length) {
            response.message = rows;
        }
    } catch (err) {
        response.status = 500;
        response.message = err.message ? err.message : 'Unknown Error';
    } finally {
        client.release();
    }
    res.status(response.status).send(response);
}

const toggleChore = async (req, res, next) => {
    const client = await pool.connect();
    const response = {
        status: 401,
        message: 'Unauthorized',
    };
    try {
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
        const { rows } = await client.query(sql, params);
        response.status = 200;
        response.message = `${rows.length} records updated`;
    } catch (err) {
        response.status = 500;
        response.message = err.message ? err.message : 'Unknown Error';
    } finally {
        client.release();
    }
    res.status(response.status).send(response);
}

const amIaParent = async (req, res, next) => {
    const response = {
        status: 200,
        message: 'Unauthorized',
    };
    const { family_permission } = req;
    response.message = family_permission?.toUpperCase() === 'P' ? 'yes' : 'no';
    res.status(response.status).send(response);
}

const getMyInfo = async (req, res, next) => {
    const response = {
        status: 200,
        message: 'Unauthorized',
    };
    const { name, family_name } = req;
    response.message = { name, family_name };
    res.status(response.status).send(response);
};

const getPendingChores = async (req, res, next) => {
    const client = await pool.connect();
    const response = {
        status: 401,
        message: 'Unauthorized',
    };
    try {
        const { family_unit, family_permission } = req;
        if (family_permission && family_permission.toUpperCase() === 'P') {}
        const sql = `
            SELECT * FROM chores
                WHERE chore_verified IS NULL
                AND chore_completed IS NOT NULL
                AND chore_member IN (
                    SELECT uuid FROM USERS
                        WHERE family_unit = $1
                );
        `
        const params = [family_unit];
        const { rows } = await client.query(sql, params);
        response.status = 200;
        response.message = rows;
    } catch (err) {
        response.status = 500;
        response.message = err.message ? err.message : 'Unknown Error';
    } finally {
        client.release();
    }
    res.status(response.status).send(response);
};

module.exports = {
    test,
    amIaParent,
    userLogin,
    userLogout,
    userLogoutAll,
    userRegister,
    validateSession,
    getChores,
    getMyInfo,
    setChore,
    getPersonChores,
    getPendingChores,
    getFamily,
    toggleChore,
};
