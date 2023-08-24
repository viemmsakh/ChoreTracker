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
        let params = [username];
        let rows = await client.query(sql, params);
        if (rows.rows.length) {
            response.message = 'Username already in use'
        } else {
            await client.query('BEGIN');
            if (ip.substr(0, 7) === "::ffff:") {
                ip = ip.substr(7);
            }
            const hash = await bcrypt.hash(password, saltRounds);
            sql = `
                INSERT INTO auth (hash, ip)
                    VALUES ($1, $2)
                    RETURNING uuid;
            `;
            params = [hash, ip];
            rows = await client.query(sql, params);
            sql = `
                INSERT INTO users (uuid, username, name)
                    VALUES ($1, $2, $3);
            `;
            params = [rows.rows[0].uuid, username, name];
            rows = await client.query(sql, params);
            response.status = 200;
            response.message = 'Registered';
        }
    } catch (err) {
        await client.query('ROLLBACK');
        response.status = 500;
        response.message = err.message ? err.message : 'Unknown Error';
    } finally {
        await client.query('COMMIT');
        client.release();
    }
    res.status(response.status).send(response);
    return;
};

const changeDisplayName = async (req, res, next) => {
    const client = await pool.connect();
    const response = {
        status: 403,
        message: 'Cannot change display name',
    };

    const { uuid: user_uuid, new_display_name } = req.body;
    const { uuid, family_permission } = req;
    if (user_uuid && new_display_name) {
        if (user_uuid === uuid || (family_permission && family_permission === "P")) {
            let sql;
            let params;
            try {
                await client.query('BEGIN');
                sql = `
                    UPDATE users SET name = $1 WHERE uuid = $2;
                `;
                params = [new_display_name, user_uuid];
                let rows = await client.query(sql, params);
                response.status = 200;
                response.message = rows;
            } catch (err) {
                await client.query('ROLLBACK');
                response.status = 500;
                response.message = err.message ? err.message : 'Unknown Error';
            } finally {
                await client.query('COMMIT');
                client.release();
            }
        }
    }
    res.status(response.status).send(response);
    return;
}

const changePassword = async (req, res, next) => {
    const client = await pool.connect();
    const response = {
        status: 403,
        message: 'Cannot change password',
    };

    const { uuid: user_uuid, password } = req.body;
    const { uuid, family_permission } = req;
    if (user_uuid && password) {
        if (user_uuid === uuid || (family_permission && family_permission === "P")) {
            let sql;
            let params;
            try {
                await client.query('BEGIN');
                const hash = await bcrypt.hash(password, saltRounds);
                sql = `
                    UPDATE auth SET hash = $1 WHERE uuid = $2;
                `;
                params = [hash, user_uuid];
                let rows = await client.query(sql, params);
                response.status = 200;
                response.message = rows;
            } catch (err) {
                await client.query('ROLLBACK');
                response.status = 500;
                response.message = err.message ? err.message : 'Unknown Error';
            } finally {
                await client.query('COMMIT');
                client.release();
            }
        }
    }
    res.status(response.status).send(response);
    return;
}

const orphan = async (req, res, next) => {
    const client = await pool.connect();
    const response = {
        status: 403,
        message: 'Cannot orphan family member',
    };

    const { uuid: user_uuid } = req.body;
    const { uuid, family_permission } = req;
    if (user_uuid) {
        if (user_uuid === uuid || (family_permission && family_permission === "P")) {
            let sql;
            let params;
            try {
                await client.query('BEGIN');
                sql = `
                    UPDATE users SET family_unit = null, family_permission = null WHERE uuid = $1;
                `;
                params = [user_uuid];
                let rows = await client.query(sql, params);
                response.status = 200;
                response.message = rows;
            } catch (err) {
                await client.query('ROLLBACK');
                response.status = 500;
                response.message = err.message ? err.message : 'Unknown Error';
            } finally {
                await client.query('COMMIT');
                client.release();
            }
        }
    }
    res.status(response.status).send(response);
    return;
}

const orphanFamily = async (req, res, next) => {
    const client = await pool.connect();
    const response = {
        status: 403,
        message: 'Cannot orphan family',
    };

    const { uuid: user_uuid } = req.body;
    const { uuid, family_permission } = req;
    if (user_uuid) {
        if (family_permission && family_permission === "P") {
            // Get all family members and orphan them
            let sql;
            let params;
            let rows;
            try {
                await client.query('BEGIN');
                sql = `SELECT family_unit FROM users WHERE uuid = $1;`;
                params = [user_uuid];
                rows = await client.query(sql, params);
                if (rows.rows.length) {
                    const { family_unit } = rows.rows[0];
                    console.log('FAMILY UNIT', family_unit);
                    sql = `DELETE FROM family WHERE unit = $1;`;
                    params = [family_unit];
                    rows = await client.query(sql, params);
                    sql = `UPDATE users SET family_unit = null, family_permission = null WHERE family_unit = $1;`;
                    rows = await client.query(sql, params);
                    response.status = 200;
                    response.message = 'Family orphaned';
                }
            } catch (err) {
                await client.query('ROLLBACK');
                response.status = 500;
                response.message = err.message ? err.message : 'Unknown Error';
            } finally {
                await client.query('COMMIT');
                client.release();
            }
        }
    }
    res.status(response.status).send(response);
    return;
}

const checkUsername = async (req, res, next) => {
    const client = await pool.connect();
    const response = {
        status: 200,
    };
    const {
        username,
    } = req.body;
    try {
        const sql = `
            SELECT count(*) FROM users WHERE username = $1;
        `;
        const params = [username];
        const { rows } = await client.query(sql, params);
        if (rows && parseInt(rows[0].count) > 0) {
            response.message = 'Username not available';
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
                    LEFT JOIN family f ON (f.unit = u.family_unit)
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
                uuid
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

const joinFamily = async (req, res, next) => {
    const client = await pool.connect();
    const response = {
        status: 403,
        message: 'Cannot join family',
    };
    const { adoption_code } = req.body;
    const { uuid } = req;
    let sql;
    let params;
    try {
        if (adoption_code) {
            sql = 'SELECT * from adopt WHERE adoption_code = $1;';
            params = [adoption_code];
            let { rows } = await client.query(sql, params);
            const { family_unit, permission } = rows[0];
            sql = 'UPDATE users SET family_unit = $1, family_permission = $2 WHERE uuid = $3;';
            params = [family_unit, permission, uuid];
            rows = await client.query(sql, params);
            sql = 'DELETE FROM adopt WHERE adoption_code = $1;';
            params = [adoption_code];
            rows = await client.query(sql, params);
            response.status = 200;
            response.message = 'Family joined';
        }
    } catch (err) {
        await client.query('ROLLBACK');
        response.status = 500;
        response.message = err.message ? err.message : 'Unknown Error';
    } finally {
        await client.query('COMMIT');
        client.release();
    }
    res.status(response.status).send(response);
    return;
}

const generateFamily = async (req, res, next) => {
    const client = await pool.connect();
    const response = {
        status: 403,
        message: 'Cannot create family',
    };

    const { family_name } = req.body;
    const { uuid } = req;
    const unit = uuidv4();
    let sql;
    let params;
    try {
        if (family_name) {
            await client.query('BEGIN');
            sql = `
                INSERT INTO family (unit, family_name)
                    VALUES ($1, $2);
            `;
            params = [unit, family_name];
            let rows = await client.query(sql, params);
            sql = `
                UPDATE users SET family_unit = $1, family_permission = 'P' WHERE uuid = $2;
            `;
            params = [unit, uuid];
            rows = await client.query(sql, params);
            response.status = 200;
            response.message = rows;
        }
    } catch (err) {
        await client.query('ROLLBACK');
        response.status = 500;
        response.message = err.message ? err.message : 'Unknown Error';
    } finally {
        await client.query('COMMIT');
        client.release();
    }
    res.status(response.status).send(response);
    return;
}

const familyCheck = async (req, res, next) => {
    const client = await pool.connect();
    const response = {
        status: 403,
        message: [],
    };
    const { uuid, username } = req;
    try {
        const sql = `
            SELECT family_unit FROM users WHERE uuid = $1;
        `;
        const params = [uuid];
        const { rows } = await client.query(sql, params);
        response.status = 200;
        response.message = rows[0].family_unit ? true : false;
    } catch (err) {
        response.status = 500;
        response.message = err.message ? err.message : 'Unknown Error';
    } finally {
        client.release();
    }
    res.status(response.status).send(response);
    return;
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

const verifyChore = async (req, res, next) => {
    const client = await pool.connect();
    const response = {
        status: 401,
        message: 'Unauthorized',
    };
    try {
        const { family_permission } = req;
        if (family_permission && family_permission.toUpperCase() === 'P') {
            const { uuid, bool } = req.body;
            let sql;
            const params = [uuid];
            if (!bool) {
                sql = `
                    UPDATE chores SET chore_verified = CURRENT_TIMESTAMP WHERE chore = $1 RETURNING chore;
                `
            } else {
                sql = `
                    UPDATE chores SET chore_verified = null WHERE chore = $1 RETURNING chore;
                `
            }
            const { rows } = await client.query(sql, params);
            response.status = 200;
            response.message = `${rows.length} records updated`;
        }
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
    const { name, family_name, uuid, family_permission } = req;
    response.message = { name, family_name, uuid, family_permission };
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
        if (family_permission && family_permission.toUpperCase() === 'P') {
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
        }
    } catch (err) {
        response.status = 500;
        response.message = err.message ? err.message : 'Unknown Error';
    } finally {
        client.release();
    }
    res.status(response.status).send(response);
};

const getAdoptionCodes = async (req, res, next) => {
    const client = await pool.connect();
    const response = {
        status: 401,
        message: 'Unauthorized',
    };
    try {
        const { family_unit, family_permission } = req;
        if (family_permission && family_permission.toUpperCase() === 'P') {
            const sql = `
                SELECT * FROM adopt
                    WHERE family_unit = $1;
            `
            const params = [family_unit];
            const { rows } = await client.query(sql, params);
            response.status = 200;
            response.message = rows;
        }
    } catch (err) {
        response.status = 500;
        response.message = err.message ? err.message : 'Unknown Error';
    } finally {
        client.release();
    }
    res.status(response.status).send(response);
};

const generateAdoptionCodes = async (req, res, next) => {
    const client = await pool.connect();
    const response = {
        status: 401,
        message: 'Unauthorized',
    };
    try {
        await client.query('BEGIN');
        const { family_unit, family_permission } = req;
        const { intended, permission } = req.body;
        if (family_permission && family_permission.toUpperCase() === 'P') {
            const sql = `
                INSERT INTO adopt ( intended, permission, family_unit )
                    VALUES ($1, $2, $3);
            `;
            const params = [intended, permission ? 'P' : '', family_unit];
            const { rows } = await client.query(sql, params);
            response.status = 200;
            response.message = rows;
        }
    } catch (err) {
        await client.query('ROLLBACK');
        response.status = 500;
        response.message = err.message ? err.message : 'Unknown Error';
    } finally {
        await client.query('COMMIT');
        client.release();
    }
    res.status(response.status).send(response);
};

module.exports = {
    amIaParent,
    checkUsername,
    changeDisplayName,
    changePassword,
    orphan,
    orphanFamily,
    userLogin,
    userLogout,
    userLogoutAll,
    userRegister,
    validateSession,
    getAdoptionCodes,
    generateAdoptionCodes,
    getChores,
    getMyInfo,
    setChore,
    getPersonChores,
    getPendingChores,
    getFamily,
    familyCheck,
    generateFamily,
    joinFamily,
    toggleChore,
    verifyChore,
};
